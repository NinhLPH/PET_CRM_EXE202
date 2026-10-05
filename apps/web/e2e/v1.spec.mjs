import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { adminLogin, call, context, future, login, makeDue, newBooking, origin, out, password, phone, records, remember, runId, save, setScenario, submit, web } from './support.mjs';

let admin, customer, other, guest, a, b, pet, service, dogPrice;
const credentials = { phone: phone(), password };
const secondCredentials = { phone: phone(), password };
const contexts = [];
async function pageFor(ctx, path) { const page = await ctx.newPage(); await page.goto(path); return page; }
async function petFields(page, name, weight = '4.5') {
  await page.getByLabel('Tên thú cưng').fill(name);
  await page.getByLabel('Cân nặng (kg)').fill(weight);
}
async function bookingForm(page, at = future()) {
  await page.goto('/app/bookings/new');
  await page.getByLabel('1. Thú cưng').selectOption(pet.id);
  await page.getByLabel('2. Dịch vụ').selectOption(service.id);
  await expect(page.getByText('Giá tạm tính:', { exact: false })).toBeVisible();
  await page.getByLabel('3. Ngày giờ (giờ Việt Nam)').fill(at);
  await page.getByLabel('Ghi chú (tùy chọn)').fill(runId);
}

test.beforeAll(async ({ browser }) => {
  test.setTimeout(120000);
  [admin, customer, other, guest] = await Promise.all(Array.from({ length: 4 }, () => context(browser)));
  contexts.push(admin, customer, other, guest);
  const ad = await admin.newPage();
  await login(ad, adminLogin);
  const spec = await (await guest.request.get(`${origin}/openapi-json`)).json();
  writeFileSync(`${out}/operations.json`, JSON.stringify(Object.entries(spec.paths).flatMap(([path, methods]) => Object.keys(methods).filter(m => /^(get|post|patch|delete|put)$/.test(m)).map(method => `${method.toUpperCase()} ${path}`)), null, 2));
  // Existing CRM link is exercised by registering the same fixture phone through the UI.
  a = remember('customers', await call(admin, 'POST', '/admin/customers', { fullName: `${runId}_CRM`, phone: credentials.phone }));
  for (const [ctx, creds, suffix] of [[customer, credentials, 'A'], [other, secondCredentials, 'B']]) {
    const page = await pageFor(ctx, '/register');
    await page.getByLabel('Họ tên').fill(`${runId}_${suffix}`);
    await page.getByLabel('Số điện thoại').fill(creds.phone);
    await page.getByLabel('Mật khẩu', { exact: true }).fill(creds.password);
    await page.getByLabel('Nhập lại mật khẩu').fill(creds.password);
    await submit(page, 'Tạo tài khoản', '/auth/register');
    await expect(page).toHaveURL(/registered=1/);
    await login(page, creds);
  }
  const profileA = await call(customer, 'GET', '/me/profile');
  expect(profileA.id).toBe(a.id);
  b = remember('customers', await call(other, 'GET', '/me/profile'));
  pet = remember('pets', await call(customer, 'POST', '/pets', { name: `${runId}_Dog`, species: 'DOG', weight: '4.5' }));
  service = remember('services', await call(admin, 'POST', '/admin/services', { serviceName: `${runId}_Groom`, description: 'E2E fixture', estimatedDuration: 30 }));
  dogPrice = remember('prices', await call(admin, 'POST', `/admin/services/${service.id}/prices`, { species: 'DOG', minWeight: '0', maxWeight: '5', price: 100000 }));
  remember('prices', await call(admin, 'POST', `/admin/services/${service.id}/prices`, { species: 'DOG', minWeight: '5', price: 200000 }));
  await call(admin, 'PUT', `/admin/services/${service.id}/reminder-config`, { reminderDays: 8 });
  await call(admin, 'PATCH', `/admin/services/${service.id}/status`, { status: 'ACTIVE' });
  for (const ctx of contexts) for (const page of ctx.pages()) await page.close();
});
test.beforeEach(({}, info) => setScenario(info.title));
test.afterEach(async ({}, info) => {
  let i = 0;
  for (const ctx of contexts) for (const page of ctx.pages()) {
    if (info.status !== info.expectedStatus) {
      await page.screenshot({ path: `${out}/failure-${info.title.split(' ')[0]}-${i++}.png`, fullPage: true }).catch(() => {});
    }
    await page.close();
  }
  save();
});
test.afterAll(async () => {
  setScenario('cleanup');
  if (admin) {
    // Admin cleanup is independent of Customer sessions expired deliberately by tests.
    for (const id of records.bookings) {
      const booking = await call(admin, 'GET', `/admin/bookings/${id}`);
      if (!records.customers.includes(booking.customerId)) throw new Error('Refuse non-fixture cleanup');
      if (['PENDING', 'CONFIRMED'].includes(booking.status)) {
        await call(admin, 'POST', `/admin/bookings/${id}/cancel`, { reason: `${runId} cleanup` });
        records.cleanup.push(`Cancelled booking ${id}`);
      }
      for (const reminder of booking.reminders || []) remember('reminders', reminder);
    }
    for (const id of records.services) {
      await call(admin, 'PATCH', `/admin/services/${id}/status`, { status: 'INACTIVE' });
      records.cleanup.push(`Deactivated service ${id}`);
    }
    for (const id of records.pets) {
      if (records.deleted.includes(`pet ${id}`)) continue;
      const response = await admin.request.delete(`${origin}/admin/pets/${id}`);
      if (response.status() === 200) records.deleted.push(`pet ${id}`);
      else records.cleanup.push(`Retained pet ${id} (HTTP ${response.status()})`);
    }
  }
  save();
  for (const ctx of contexts) {
    await ctx.request.post(`${origin}/auth/logout`, { headers: { Origin: web }, data: {} }).catch(() => {});
    await ctx.close();
  }
});

test('01 auth registration, role isolation, reload, cookies and validation', async () => {
  const page = await pageFor(customer, '/app');
  await expect(page.getByRole('heading', { name: new RegExp(runId) })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: new RegExp(runId) })).toBeVisible();
  const cookies = await customer.cookies(origin);
  expect(cookies.find(c => c.name === 'petcare_session')?.httpOnly).toBe(true);
  expect(await page.evaluate(() => document.cookie)).not.toContain('petcare_session');
  await page.goto('/admin'); await expect(page).toHaveURL(/forbidden/);
  await call(customer, 'GET', '/admin/dashboard', undefined, 403);
  await call(admin, 'GET', '/me/profile', undefined, 403);
  await call(guest, 'GET', '/me/profile', undefined, 401);
  await call(guest, 'POST', '/auth/register', { fullName: runId, ...credentials, confirmPassword: password }, 409);
  await call(guest, 'POST', '/auth/register', { fullName: '', phone: '123', password: 'x', confirmPassword: 'y' }, 400);
  const g = await pageFor(guest, '/login');
  await g.getByLabel('Số điện thoại').fill(credentials.phone);
  await g.getByLabel('Mật khẩu', { exact: true }).fill('incorrect-password');
  await submit(g, 'Đăng nhập', '/auth/login', 'POST', 401);
  await expect(g.getByRole('alert')).toContainText('không đúng');
  const badOrigin = await guest.request.post(`${origin}/auth/login`, { headers: { Origin: 'https://untrusted.example' }, data: credentials });
  expect(badOrigin.status()).toBe(403);
});

test('02 profile and Customer pet create edit clear delete validation ownership', async () => {
  const page = await pageFor(customer, '/app/profile');
  await expect(page.getByLabel('Số điện thoại')).toHaveAttribute('readonly', '');
  await page.getByLabel('Địa chỉ').fill(`${runId} address`);
  await submit(page, 'Lưu thay đổi', '/me/profile', 'PATCH', 200);
  expect((await call(customer, 'GET', '/me/profile')).address).toBe(`${runId} address`);
  await page.getByLabel('Địa chỉ').fill(''); await submit(page, 'Lưu thay đổi', '/me/profile', 'PATCH', 200);
  await page.goto('/app/pets'); await page.getByRole('button', { name: 'Thêm thú cưng', exact: true }).click();
  await petFields(page, `${runId}_Temporary`, '0');
  await page.getByRole('button', { name: 'Lưu thú cưng' }).click();
  await expect(page.getByRole('alert')).toContainText('Cân nặng');
  await page.getByLabel('Cân nặng (kg)').fill('3.25');
  await page.getByLabel('Giống (tùy chọn)').fill('Poodle');
  const created = remember('pets', await submit(page, 'Lưu thú cưng', '/pets'));
  await page.getByRole('link', { name: new RegExp(`${runId}_Temporary`) }).click();
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Giống (tùy chọn)').fill('');
  await submit(page, 'Lưu thú cưng', `/pets/${created.id}`, 'PATCH', 200);
  expect((await call(customer, 'GET', `/pets/${created.id}`)).breed || '').toBe('');
  await call(other, 'GET', `/pets/${created.id}`, undefined, 403);
  await call(other, 'PATCH', `/pets/${created.id}`, { name: 'invalid owner' }, 403);
  await call(other, 'DELETE', `/pets/${created.id}`, undefined, 403);
  await submit(page, 'Xóa', `/pets/${created.id}`, 'DELETE', 200); records.deleted.push(`pet ${created.id}`);
  await call(customer, 'GET', `/pets/${created.id}`, undefined, 404);
  for (const weight of ['0', '-1', '1000', '1.234']) await call(customer, 'POST', '/pets', { name: runId, species: 'DOG', weight }, 400);
  await call(customer, 'POST', '/pets', { name: runId, species: 'BIRD', weight: '1' }, 400);
});

test('03 CRM customer and Admin pet CRUD, notes, linked account restrictions', async () => {
  const page = await pageFor(admin, '/admin/customers');
  await page.getByRole('button', { name: 'Thêm khách hàng' }).click();
  await page.getByLabel('Họ tên').fill(`${runId}_TemporaryCRM`);
  await page.getByLabel('Số điện thoại').fill(phone());
  const c = remember('customers', await submit(page, 'Lưu khách hàng', '/admin/customers'));
  await expect(page).toHaveURL(new RegExp(`/customers/${c.id}$`));
  await page.getByRole('button', { name: 'Chỉnh sửa' }).click();
  await page.getByLabel('Địa chỉ').fill('Fixture only');
  await submit(page, 'Lưu khách hàng', `/admin/customers/${c.id}`, 'PATCH', 200);
  await page.getByRole('button', { name: 'Thú cưng', exact: true }).click();
  await page.getByRole('button', { name: 'Thêm thú cưng' }).click(); await petFields(page, `${runId}_AdminPet`);
  const p = remember('pets', await submit(page, 'Lưu thú cưng', `/admin/customers/${c.id}/pets`));
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByLabel('Cân nặng (kg)').fill('6'); await submit(page, 'Lưu thú cưng', `/admin/pets/${p.id}`, 'PATCH', 200);
  await call(admin, 'DELETE', `/admin/customers/${c.id}`, undefined, 409);
  await submit(page, 'Xóa', `/admin/pets/${p.id}`, 'DELETE', 200); records.deleted.push(`pet ${p.id}`);
  await page.getByRole('button', { name: 'Thông tin', exact: true }).click();
  await submit(page, 'Xóa', `/admin/customers/${c.id}`, 'DELETE', 200); records.deleted.push(`customer ${c.id}`);
  await page.getByLabel('Tìm theo tên hoặc SĐT').fill(credentials.phone); await page.getByRole('button', { name: 'Tìm', exact: true }).click();
  await page.getByRole('link', { name: new RegExp(`${runId}_A`) }).click();
  await expect(page.getByText('Đã liên kết', { exact: false })).toBeVisible();
  await call(admin, 'DELETE', `/admin/customers/${a.id}`, undefined, 409);
  await call(admin, 'PATCH', `/admin/customers/${a.id}`, { phone: phone() }, 409);
  await call(admin, 'POST', '/admin/customers', { fullName: runId, phone: credentials.phone }, 409);
  await page.getByRole('button', { name: 'Hoạt động', exact: true }).click();
  await page.getByLabel('Nội dung').fill(`${runId}_general`); await submit(page, 'Lưu ghi chú', `/admin/customers/${a.id}/activities`);
  await page.getByLabel('Nội dung').fill(`${runId}_petNote`); await page.getByLabel('Thú cưng liên quan (tùy chọn)').selectOption(pet.id);
  await submit(page, 'Lưu ghi chú', `/admin/customers/${a.id}/activities`);
  await expect(page.getByText(`${runId}_petNote`, { exact: true })).toBeVisible();
  await call(admin, 'POST', `/admin/customers/${b.id}/activities`, { type: 'NOTE', content: runId, petId: pet.id }, 400);
  const noted = remember('pets', await call(customer, 'POST', '/pets', { name: `${runId}_NotedPet`, species: 'DOG', weight: '1' }));
  await call(admin, 'POST', `/admin/customers/${a.id}/activities`, { type: 'NOTE', content: runId, petId: noted.id });
  await call(customer, 'DELETE', `/pets/${noted.id}`, undefined, 409);
  await call(admin, 'DELETE', `/admin/pets/${noted.id}`, undefined, 409);
});

test('04 services price rules state boundaries and reminder configuration through UI', async () => {
  const page = await pageFor(admin, '/admin/services');
  await page.getByRole('button', { name: 'Thêm dịch vụ' }).click();
  await page.getByLabel('Tên dịch vụ').fill(`${runId}_UIservice`); await page.getByLabel('Thời lượng dự kiến (phút)').fill('30');
  const s = remember('services', await submit(page, 'Lưu dịch vụ', '/admin/services'));
  await expect(page.getByRole('heading', { name: s.serviceName, exact: true })).toBeVisible();
  await submit(page, 'Mở bán', `/admin/services/${s.id}/status`, 'PATCH', 409);
  await page.getByRole('button', { name: 'Sửa', exact: true }).click();
  await page.getByLabel('Mô tả', { exact: true }).fill('Updated fixture');
  await submit(page, 'Lưu dịch vụ', `/admin/services/${s.id}`, 'PATCH', 200);
  await page.getByRole('button', { name: 'Thêm khoảng giá' }).click();
  await page.getByLabel('Đến trước (kg), bỏ trống nếu vô hạn').fill('5'); await page.getByLabel('Giá cơ bản (VND)').fill('150000');
  const p = remember('prices', await submit(page, 'Lưu khoảng giá', `/admin/services/${s.id}/prices`));
  await submit(page, 'Mở bán', `/admin/services/${s.id}/status`, 'PATCH', 200);
  await page.getByRole('button', { name: 'Sửa', exact: true }).last().click();
  await page.getByLabel('Giá cơ bản (VND)').fill('160000');
  await submit(page, 'Lưu khoảng giá', `/admin/services/${s.id}/prices/${p.id}`, 'PATCH', 200);
  await page.getByRole('button', { name: 'Cấu hình', exact: true }).click(); await page.getByLabel('Số ngày (8–364)').fill('8');
  await submit(page, 'Lưu', `/admin/services/${s.id}/reminder-config`, 'PUT', 200);
  for (const days of [7, 365, 8.5]) await call(admin, 'PUT', `/admin/services/${s.id}/reminder-config`, { reminderDays: days }, 400);
  await call(admin, 'PUT', `/admin/services/${s.id}/reminder-config`, { reminderDays: 364 });
  await call(admin, 'POST', `/admin/services/${s.id}/prices`, { species: 'DOG', minWeight: '4', maxWeight: '6', price: 1000 }, 409);
  await call(admin, 'POST', `/admin/services/${s.id}/prices`, { species: 'DOG', minWeight: '6', maxWeight: '5', price: 1000 }, 400);
  await call(admin, 'POST', `/admin/services/${s.id}/prices`, { species: 'CAT', minWeight: '0', price: 1.5 }, 400);
  expect((await call(guest, 'GET', `/services/${service.id}/quote?species=DOG&weight=4.99`)).basePrice).toBe(100000);
  expect((await call(guest, 'GET', `/services/${service.id}/quote?species=DOG&weight=5`)).basePrice).toBe(200000);
  await call(guest, 'GET', `/services/${service.id}/quote?species=CAT&weight=5`, undefined, 409);
  await submit(page, 'Ngừng', `/admin/prices/${p.id}/status`, 'PATCH', 200);
  await call(admin, 'PATCH', `/admin/prices/${p.id}/status`, { status: 'ACTIVE' }); // v1 list has no inactive rules.
  await submit(page, 'Ngừng bán', `/admin/services/${s.id}/status`, 'PATCH', 200);
  const active = await call(guest, 'GET', '/services?status=ACTIVE&limit=100');
  expect(active.items.some(item => item.id === s.id)).toBe(false);
});

test('05 Customer booking to Admin completion, snapshot, totals, dashboard and reminder', async () => {
  const countersBefore = await call(admin, 'GET', '/admin/dashboard');
  const cp = await customer.newPage(); await bookingForm(cp);
  const booking = remember('bookings', await submit(cp, 'Xác nhận đặt lịch', '/bookings'));
  expect((await call(admin, 'GET', '/admin/dashboard')).pending).toBe(countersBefore.pending + 1);
  await expect(cp).toHaveURL(new RegExp(`/bookings/${booking.id}$`)); await expect(cp.getByText('Chờ duyệt', { exact: false })).toBeVisible();
  await call(other, 'GET', `/bookings/${booking.id}`, undefined, 403);
  await call(customer, 'DELETE', `/pets/${pet.id}`, undefined, 409);
  await call(admin, 'DELETE', `/admin/pets/${pet.id}`, undefined, 409);
  await call(admin, 'POST', `/admin/bookings/${booking.id}/complete`, { surcharges: [], discount: 0 }, 409);
  const ap = await pageFor(admin, `/admin/bookings?status=PENDING&date=${future().slice(0, 10)}`);
  await ap.locator(`a[href="/admin/bookings/${booking.id}"]`).click();
  await submit(ap, 'Xác nhận lịch', `/admin/bookings/${booking.id}/confirm`);
  expect((await call(admin, 'GET', '/admin/dashboard')).pending).toBe(countersBefore.pending);
  await call(admin, 'POST', `/admin/bookings/${booking.id}/confirm`, {}, 409);
  await call(admin, 'PATCH', `/admin/services/${service.id}/prices/${dogPrice.id}`, { species: 'DOG', minWeight: '0', maxWeight: '5', price: 120000 });
  try {
    await ap.getByRole('button', { name: 'Thêm phụ phí' }).click();
    await ap.getByLabel('Tên phụ phí').fill('Fixture surcharge'); await ap.getByLabel('Số tiền VND').fill('25000');
    await ap.getByLabel('Giảm giá (VND)').fill('999999'); await expect(ap.getByRole('button', { name: 'Chốt hoàn thành', exact: true })).toBeDisabled();
    await ap.getByLabel('Giảm giá (VND)').fill('5000');
    const completed = await submit(ap, 'Chốt hoàn thành', `/admin/bookings/${booking.id}/complete`);
    expect(completed.finalTotal).toBe(120000); expect(completed.services[0].basePrice).toBe(100000);
    const reminder = remember('reminders', completed.reminders[0]);
    const localCompleted = new Date(new Date(reminder.completedDate).getTime() + 7 * 3600000).toISOString().slice(0, 10);
    expect(new Date(reminder.reminderDate).getTime() - Date.parse(`${localCompleted}T00:00:00+07:00`)).toBe(8 * 86400000);
    await cp.reload(); await expect(cp.getByText('Giá cuối:', { exact: false })).toContainText('120.000');
    await expect(cp.getByText('Fixture surcharge:', { exact: false })).toBeVisible();
    await cp.goto('/app');
    await expect(cp.locator(`main a[href="/app/bookings/${booking.id}"]`)).toContainText('120.000');
    await call(admin, 'POST', `/admin/bookings/${booking.id}/cancel`, {}, 409);
    await call(admin, 'POST', `/admin/bookings/${booking.id}/complete`, { surcharges: [], discount: 0 }, 409);
    const dash = await call(admin, 'GET', '/admin/dashboard');
    await ap.goto('/admin');
    await expect(ap.getByRole('link', { name: new RegExp(`Chờ duyệt ${dash.pending}$`) })).toBeVisible();
    await ap.screenshot({ path: `${out}/desktop-dashboard.png`, fullPage: true });
  } finally { await call(admin, 'PATCH', `/admin/services/${service.id}/prices/${dogPrice.id}`, { species: 'DOG', minWeight: '0', maxWeight: '5', price: 100000 }); }
});

test('06 cancellation pending confirmed and simultaneous confirmation', async () => {
  for (const confirmed of [false, true]) {
    const booking = await newBooking(customer, pet.id, service.id, 100000, confirmed ? 2 : 1);
    if (confirmed) {
      const responses = await Promise.all([admin.request.post(`${origin}/admin/bookings/${booking.id}/confirm`, { data: {} }), admin.request.post(`${origin}/admin/bookings/${booking.id}/confirm`, { data: {} })]);
      expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
    }
    const page = await pageFor(admin, `/admin/bookings/${booking.id}`);
    await page.getByRole('button', { name: 'Hủy lịch', exact: true }).click(); await page.getByLabel('Lý do hủy (tùy chọn)').fill(runId);
    await submit(page, 'Xác nhận hủy', `/admin/bookings/${booking.id}/cancel`);
    expect((await call(customer, 'GET', `/bookings/${booking.id}`)).cancellationReason).toBe(runId);
  }
});

test('07 lost create response reload retry is idempotent and keeps draft', async () => {
  const page = await customer.newPage(); await bookingForm(page, future(3));
  const before = await call(customer, 'GET', '/bookings/mine');
  await page.route(`${origin}/bookings`, async route => { const response = await route.fetch(); expect(response.status()).toBe(201); remember('bookings', await response.json()); await route.abort('failed'); }, { times: 1 });
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
  await expect(page.getByRole('alert')).toContainText('Không kết nối');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Thử lại yêu cầu trước' })).toBeEnabled();
  const replay = remember('bookings', await submit(page, 'Thử lại yêu cầu trước', '/bookings'));
  await expect(page).toHaveURL(new RegExp(`/bookings/${replay.id}$`));
  expect((await call(customer, 'GET', '/bookings/mine')).total).toBe(before.total + 1);
});

test('08 price changed after restored draft requires confirmation and preserves fields', async () => {
  const page = await customer.newPage(); const at = future(4); await bookingForm(page, at);
  await page.route(`${origin}/bookings`, route => route.abort('failed'), { times: 1 });
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await page.reload();
  await call(admin, 'PATCH', `/admin/services/${service.id}/prices/${dogPrice.id}`, { species: 'DOG', minWeight: '0', maxWeight: '5', price: 110000 });
  try {
    await submit(page, 'Thử lại yêu cầu trước', '/bookings', 'POST', 409);
    await expect(page.getByLabel('1. Thú cưng')).toHaveValue(pet.id);
    await expect(page.getByLabel('2. Dịch vụ')).toHaveValue(service.id);
    await expect(page.getByLabel('3. Ngày giờ (giờ Việt Nam)')).toHaveValue(at);
    await expect(page.getByRole('button', { name: 'Xác nhận đặt lịch' })).toBeDisabled();
    await page.getByRole('button', { name: 'Tôi đã xem giá mới' }).click();
    const booking = remember('bookings', await submit(page, 'Xác nhận đặt lịch', '/bookings'));
    expect(booking.estimatedTotal).toBe(110000);
  } finally { await call(admin, 'PATCH', `/admin/services/${service.id}/prices/${dogPrice.id}`, { species: 'DOG', minWeight: '0', maxWeight: '5', price: 100000 }); }
});

test('09 booking validation, idempotency key conflict and atomic completion validation', async () => {
  const body = { petId: pet.id, serviceId: service.id, expectedBasePrice: 100000, bookingDate: future(5) + ':00+07:00' };
  await call(customer, 'POST', '/bookings', body, 400);
  await call(other, 'POST', '/bookings', body, 403, { 'Idempotency-Key': randomUUID() });
  for (const date of ['2020-01-01T10:00:00+07:00', future(5)]) await call(customer, 'POST', '/bookings', { ...body, bookingDate: date }, 400, { 'Idempotency-Key': randomUUID() });
  const key = randomUUID();
  const booking = remember('bookings', await call(customer, 'POST', '/bookings', body, 201, { 'Idempotency-Key': key }));
  expect((await call(customer, 'POST', '/bookings', body, 201, { 'Idempotency-Key': key })).id).toBe(booking.id);
  await call(customer, 'POST', '/bookings', { ...body, note: 'different' }, 409, { 'Idempotency-Key': key });
  await call(admin, 'POST', `/admin/bookings/${booking.id}/confirm`, {});
  for (const body of [{ surcharges: [], discount: 100001 }, { surcharges: [{ name: 'x', amount: -1 }], discount: 0 }, { surcharges: [{ name: 'x', amount: 9999999999 }], discount: 0 }, { surcharges: Array.from({ length: 51 }, () => ({ name: 'x', amount: 1 })), discount: 0 }]) await call(admin, 'POST', `/admin/bookings/${booking.id}/complete`, body, 400);
  const unchanged = await call(admin, 'GET', `/admin/bookings/${booking.id}`);
  expect(unchanged.status).toBe('CONFIRMED'); expect(unchanged.reminders).toHaveLength(0); expect(unchanged.surcharges).toHaveLength(0);
});

test('10 reminder due filters contact methods replacement and CRM activity refresh', async () => {
  await call(admin, 'POST', `/admin/customers/${a.id}/activities`, { type: 'NOTE', content: `${runId}_beforeContact` });
  let previous;
  for (const [index, method] of ['PHONE', 'ZALO', 'OTHER', null, null].entries()) {
    const booking = await newBooking(customer, pet.id, service.id, 100000, 10 + index);
    await call(admin, 'POST', `/admin/bookings/${booking.id}/confirm`, {});
    const completed = await call(admin, 'POST', `/admin/bookings/${booking.id}/complete`, { surcharges: [], discount: 0 });
    const r = remember('reminders', completed.reminders[0]);
    if (previous) expect((await call(admin, 'GET', `/admin/reminders/${previous.id}`)).status).toBe(previous.contactMethod ? 'CONTACTED' : 'DISMISSED');
    if (method) {
      const dueBefore = (await call(admin, 'GET', '/admin/dashboard')).remindersDue;
      await makeDue(r.id, a.id);
      expect((await call(admin, 'GET', '/admin/dashboard')).remindersDue).toBe(dueBefore + 1);
      const page = await pageFor(admin, `/admin/customers/${a.id}`);
      await page.getByRole('button', { name: 'Hoạt động', exact: true }).click();
      await expect(page.getByText(`${runId}_beforeContact`, { exact: true })).toBeVisible();
      // SPA navigation keeps query cache alive; then back must show the new activity.
      await page.getByRole('link', { name: 'Cần nhắc', exact: true }).click();
      await page.locator(`a[href="/admin/reminders/${r.id}"]`).click();
      await page.getByLabel('Phương thức').selectOption(method); await page.getByLabel('Ghi chú (tùy chọn)').fill(`${runId}_${method}`);
      await submit(page, 'Đã liên hệ', `/admin/reminders/${r.id}/contact`);
      await expect(page).toHaveURL(/\/admin\/reminders$/);
      await page.getByRole('link', { name: 'Khách hàng', exact: true }).click();
      await page.getByLabel('Tìm theo tên hoặc SĐT').fill(credentials.phone); await page.getByRole('button', { name: 'Tìm', exact: true }).click();
      await page.locator(`a[href="/admin/customers/${a.id}"]`).click(); await page.getByRole('button', { name: 'Hoạt động', exact: true }).click();
      await expect(page.getByText(`${runId}_${method}`, { exact: true })).toBeVisible({ timeout: 5000 });
      previous = await call(admin, 'GET', `/admin/reminders/${r.id}`); expect(previous.status).toBe('CONTACTED');
      expect((await call(admin, 'GET', '/admin/dashboard')).remindersDue).toBe(dueBefore);
      await call(admin, 'POST', `/admin/reminders/${r.id}/contact`, { method }, 409);
      const activities = await call(admin, 'GET', `/admin/customers/${a.id}/activities`);
      expect(activities.items.filter(item => item.reminderId === r.id)).toHaveLength(1);
    } else previous = r;
  }
  await call(admin, 'GET', '/admin/reminders?due=false');
  await call(admin, 'GET', '/admin/reminders?due=invalid', undefined, 400);
});

test('11 pagination over 20 pets activities bookings and distinct home list cache', async () => {
  test.setTimeout(240_000);
  for (let i = 0; i < 21; i++) {
    remember('pets', await call(other, 'POST', '/pets', { name: `${runId}_Page_${i}`, species: 'DOG', weight: '2' }));
    await call(admin, 'POST', `/admin/customers/${b.id}/activities`, { type: 'NOTE', content: `${runId}_Page_${i}` });
  }
  const bp = await pageFor(other, '/app/pets');
  await expect(bp.getByText('Trang 1 / 2', { exact: true })).toBeVisible();
  await bp.getByRole('button', { name: 'Tiếp', exact: true }).click(); await expect(bp.getByText('Trang 2 / 2', { exact: true })).toBeVisible();
  const ap = await pageFor(admin, `/admin/customers/${b.id}`); await ap.getByRole('button', { name: 'Hoạt động', exact: true }).click();
  // There are independent pagers for the pet selector and activity list.
  await ap.getByRole('button', { name: 'Tiếp', exact: true }).last().click(); await expect(ap.getByText('Trang 2 / 2', { exact: true })).toBeVisible();
  for (let i = 0; i < 21; i++) await newBooking(other, records.pets.at(-1), service.id, 100000, 50 + i);
  await bp.goto('/app');
  await expect(bp.locator('main a[href^="/app/bookings/"]').filter({ hasNotText: 'Đặt lịch' })).toHaveCount(5);
  await bp.getByRole('link', { name: 'Lịch hẹn', exact: true }).click();
  await expect(bp.locator('main a[href^="/app/bookings/"]')).toHaveCount(20, { timeout: 5000 });
  await expect(bp.getByText('Trang 1 / 2', { exact: true })).toBeVisible();
  await bp.getByRole('button', { name: 'Tiếp', exact: true }).click(); await expect(bp.locator('main a[href^="/app/bookings/"]')).toHaveCount(1);
});

test('12 invalid JSON, network 5xx validation errors preserve form and retry', async () => {
  const page = await pageFor(customer, '/app/profile');
  await page.getByLabel('Địa chỉ').fill(`${runId}_retry`);
  for (const mode of ['html', 'offline', 'server']) {
    await page.route(`${origin}/me/profile`, route => mode === 'offline' ? route.abort('failed') : route.fulfill({ status: mode === 'html' ? 200 : 500, contentType: mode === 'html' ? 'text/html' : 'application/json', body: mode === 'html' ? '<html>proxy error</html>' : JSON.stringify({ message: 'Fixture server unavailable' }) }), { times: 1 });
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Địa chỉ')).toHaveValue(`${runId}_retry`);
  }
  await submit(page, 'Lưu thay đổi', '/me/profile', 'PATCH', 200);
  await expect(page.getByRole('status')).toContainText('Đã cập nhật');
  await page.goto('/app/pets/999999999999'); await expect(page.getByRole('alert')).toBeVisible();
});

test('13 mobile and alternate timezone display and v2 routes hidden', async ({ browser }) => {
  await newBooking(customer, pet.id, service.id, 100000, 200);
  const ctx = await context(browser, { viewport: { width: 390, height: 844 }, timezoneId: 'America/Los_Angeles', storageState: await customer.storageState() }); contexts.push(ctx);
  const page = await pageFor(ctx, '/app/bookings');
  await expect(page.getByRole('heading', { name: 'Lịch hẹn và lịch sử' })).toBeVisible();
  await expect(page.locator('main a[href^="/app/bookings/"]').first()).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${out}/mobile-bookings.png`, fullPage: true });
  const expectedDate = new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh', dateStyle: 'short', timeStyle: 'short' }).format(new Date('2027-01-01T18:00:00Z'));
  const actual = await page.evaluate(async () => { const ui = await import('/src/app/ui.tsx'); return ui.dateTime('2027-01-01T18:00:00Z'); });
  expect(actual).toBe(expectedDate);
  for (const path of ['/shop', '/cart', '/checkout', '/admin/products', '/admin/orders', '/app/medical-records', '/app/loyalty']) {
    await page.goto(path); await expect(page.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeVisible();
  }
});

test('14 logout session expiry and account switch clear unresolved booking', async ({ browser }) => {
  const ctx = await context(browser); contexts.push(ctx);
  const page = await ctx.newPage(); await login(page, credentials); await bookingForm(page, future(99));
  await page.route(`${origin}/bookings`, route => route.abort('failed'), { times: 1 });
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click(); await expect(page.getByRole('alert')).toBeVisible();
  await page.getByRole('button', { name: 'Đăng xuất', exact: true }).click();
  await expect(page).toHaveURL(/login/);
  expect(await page.evaluate(() => sessionStorage.getItem('petcare_pending_booking_v1'))).toBeNull();
  await login(page, secondCredentials); await page.goto('/app/bookings/new');
  await expect(page.getByRole('button', { name: 'Thử lại yêu cầu trước' })).toHaveCount(0);
  await ctx.clearCookies(); await page.goto('/app/profile'); await expect(page).toHaveURL(/login/);
  await call(ctx, 'GET', '/me/profile', undefined, 401);
});

test('16 timeout and disabled session storage preserve form without creating bookings', async () => {
  const page = await pageFor(customer, '/app/profile');
  await page.getByLabel('Địa chỉ').fill(`${runId}_timeout`);
  let held;
  await page.route(`${origin}/me/profile`, route => { held = route; }, { times: 1 });
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('alert')).toContainText('phản hồi quá lâu', { timeout: 35000 });
  await expect(page.getByLabel('Địa chỉ')).toHaveValue(`${runId}_timeout`);
  await held.abort().catch(() => {});
  await submit(page, 'Lưu thay đổi', '/me/profile', 'PATCH', 200);
  await bookingForm(page, future(100));
  const before = await call(customer, 'GET', '/bookings/mine');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Disabled', 'SecurityError'); }; });
  await page.getByRole('button', { name: 'Xác nhận đặt lịch' }).click();
  await expect(page.getByRole('alert')).toContainText('Không thể lưu yêu cầu');
  expect((await call(customer, 'GET', '/bookings/mine')).total).toBe(before.total);
});

test('17 missing reminder configuration, CAT quote, timezone date filtering and concurrent completion', async () => {
  const s = remember('services', await call(admin, 'POST', '/admin/services', { serviceName: `${runId}_NoConfig` }));
  remember('prices', await call(admin, 'POST', `/admin/services/${s.id}/prices`, { species: 'CAT', minWeight: '0', price: 80000 }));
  await call(admin, 'PATCH', `/admin/services/${s.id}/status`, { status: 'ACTIVE' });
  const cat = remember('pets', await call(customer, 'POST', '/pets', { name: `${runId}_Cat`, species: 'CAT', weight: '2.5' }));
  const page = await pageFor(customer, '/app/bookings/new');
  await page.getByLabel('1. Thú cưng').selectOption(cat.id); await page.getByLabel('2. Dịch vụ').selectOption(service.id);
  await expect(page.getByRole('alert')).toContainText('Chưa có giá');
  await expect(page.getByRole('button', { name: 'Xác nhận đặt lịch' })).toBeDisabled();
  await page.getByLabel('2. Dịch vụ').selectOption(s.id);
  await expect(page.getByText('Giá tạm tính:', { exact: false })).toContainText('80.000');
  const date = future().slice(0, 10);
  await page.getByLabel('3. Ngày giờ (giờ Việt Nam)').fill(`${date}T00:30`);
  const booking = remember('bookings', await submit(page, 'Xác nhận đặt lịch', '/bookings'));
  const list = await call(admin, 'GET', `/admin/bookings?date=${date}&limit=100`);
  expect(list.items.some(item => item.id === booking.id)).toBe(true);
  await call(admin, 'POST', `/admin/bookings/${booking.id}/confirm`, {});
  const ap = await pageFor(admin, `/admin/bookings/${booking.id}`);
  await expect(ap.getByRole('button', { name: 'Chốt hoàn thành', exact: true })).toBeDisabled();
  await call(admin, 'POST', `/admin/bookings/${booking.id}/complete`, { surcharges: [], discount: 0 }, 409);
  expect((await call(admin, 'GET', `/admin/bookings/${booking.id}`)).status).toBe('CONFIRMED');
  await call(admin, 'PUT', `/admin/services/${s.id}/reminder-config`, { reminderDays: 8 });
  const responses = await Promise.all([admin.request.post(`${origin}/admin/bookings/${booking.id}/complete`, { data: { surcharges: [], discount: 80000 } }), admin.request.post(`${origin}/admin/bookings/${booking.id}/complete`, { data: { surcharges: [], discount: 80000 } })]);
  expect(responses.map(r => r.status()).sort()).toEqual([201, 409]);
  const completed = await call(admin, 'GET', `/admin/bookings/${booking.id}`);
  expect(completed.finalTotal).toBe(0); expect(completed.reminders).toHaveLength(1); remember('reminders', completed.reminders[0]);
});

test('18 completion response loss reconciles saved state before another submission', async () => {
  const booking = await newBooking(customer, pet.id, service.id, 100000, 102);
  await call(admin, 'POST', `/admin/bookings/${booking.id}/confirm`, {});
  const page = await pageFor(admin, `/admin/bookings/${booking.id}`);
  await page.route(`${origin}/admin/bookings/${booking.id}/complete`, async route => {
    const response = await route.fetch(); expect(response.status()).toBe(201); await route.abort('failed');
  }, { times: 1 });
  await page.getByRole('button', { name: 'Chốt hoàn thành', exact: true }).click();
  await expect(page.locator('p').filter({ hasText: /^Trạng thái:/ })).toContainText('Hoàn thành');
  await expect(page.getByRole('button', { name: 'Chốt hoàn thành', exact: true })).toHaveCount(0);
  const result = await call(admin, 'GET', `/admin/bookings/${booking.id}`);
  expect(result.reminders).toHaveLength(1); remember('reminders', result.reminders[0]);
});

test('19 CRM customer pagination and empty search', async () => {
  test.setTimeout(180000);
  const created = [];
  try {
    for (let i = 0; i < 21; i++) created.push(remember('customers', await call(admin, 'POST', '/admin/customers', { fullName: `${runId}_PagedCRM_${i}`, phone: phone() })));
    const page = await pageFor(admin, '/admin/customers');
    await page.getByLabel('Tìm theo tên hoặc SĐT').fill(`${runId}_PagedCRM`); await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await expect(page.getByText('Trang 1 / 2', { exact: true })).toBeVisible();
    await expect(page.locator('main a[href^="/admin/customers/"]')).toHaveCount(20);
    await page.getByRole('button', { name: 'Tiếp', exact: true }).click(); await expect(page.locator('main a[href^="/admin/customers/"]')).toHaveCount(1);
    await page.getByLabel('Tìm theo tên hoặc SĐT').fill(`${runId}_Nobody`); await page.getByRole('button', { name: 'Tìm', exact: true }).click();
    await expect(page.getByText('Không tìm thấy khách hàng.', { exact: true })).toBeVisible();
  } finally {
    for (const c of created) { await call(admin, 'DELETE', `/admin/customers/${c.id}`); records.deleted.push(`customer ${c.id}`); }
  }
});

test('20 guest landing booking CTA logs in and returns to booking form', async ({ browser }) => {
  const ctx = await context(browser);
  contexts.push(ctx);
  const page = await pageFor(ctx, '/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Chăm chút mỗi ngày');
  await page.getByRole('link', { name: 'Đặt lịch chăm sóc', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fbookings%2Fnew$/);
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(credentials.password);
  await submit(page, 'Đăng nhập', '/auth/login');
  await expect(page).toHaveURL(/\/app\/bookings\/new$/);
  await expect(page.getByLabel('1. Thú cưng')).toBeVisible();
  await expect(page.getByLabel('2. Dịch vụ')).toBeVisible();
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Chăm chút mỗi ngày');
  await expect(page).toHaveURL(web + '/');
});

test('99 authentication throttles actual repeated failures and UI shows 429', async () => {
  const page = await pageFor(guest, '/login');
  let limited = false;
  for (let i = 0; i < 11; i++) {
    const response = await guest.request.post(`${origin}/auth/login`, { data: { phone: credentials.phone, password: 'invalid-password' } });
    if (response.status() === 429) { limited = true; break; }
    expect(response.status()).toBe(401);
  }
  expect(limited).toBe(true);
  await page.getByLabel('Số điện thoại').fill(credentials.phone); await page.getByLabel('Mật khẩu', { exact: true }).fill('invalid-password');
  await submit(page, 'Đăng nhập', '/auth/login', 'POST', 429);
  await expect(page.getByRole('alert')).toContainText('Quá nhiều');
});
