import { test, expect } from '@playwright/test';

const services = [
  { id: 'g1', serviceName: 'Tắm và vệ sinh', description: 'Chăm sóc bộ lông và vệ sinh cho bé.', estimatedDuration: 45 },
  { id: 'g2', serviceName: 'Cắt tỉa lông', description: 'Gọn gàng, dễ chịu cho lần chăm sóc tiếp theo.', estimatedDuration: 60 },
  { id: 'g3', serviceName: 'Chăm sóc toàn diện', description: null, estimatedDuration: null },
].map(service => ({ ...service, status: 'ACTIVE', createdAt: '2026-10-01', updatedAt: '2026-10-01' }));
const envelope = items => ({ items, total: items.length, page: 1, limit: 20 });
const apiOrigin = process.env.E2E_API_ORIGIN || 'http://localhost:3000';
async function guest(page, serviceReply = route => route.fulfill({ json: envelope(services) })) {
  await page.route(`${apiOrigin}/**`, async route => {
    if (new URL(route.request().url()).pathname === '/services') return serviceReply(route);
    return route.fulfill({ status: 401, json: { code: 'UNAUTHORIZED', message: 'Chưa đăng nhập' } });
  });
}

for (const width of [375, 768, 1024, 1440]) {
  test(`guest landing at ${width}px has readable content and no overflow`, async ({ page }, info) => {
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await guest(page);
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Chăm chút mỗi ngày,yêu thương trọn vẹn.');
    await expect(page.locator('.guest-service h3')).toHaveText(services.map(service => service.serviceName));
    await expect(page.getByText('Thời lượng dự kiến: 45 phút')).toBeVisible();
    await expect(page.locator('.guest-duration')).toHaveCount(2);
    expect(await page.locator('.guest-service-grid').evaluate(el => getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width < 768 ? 1 : width < 1024 ? 2 : 3);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(await page.locator('.guest-hero img').evaluate(img => img.complete && img.naturalWidth > 0)).toBe(true);
    await page.screenshot({ path: info.outputPath(`landing-${width}.png`), fullPage: true });
    await page.locator('.guest-service h3').first().evaluate(el => { el.textContent = 'Dịch vụ chăm sóc thú cưng với tên rất dài '.repeat(8) + 'A'.repeat(120); });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  });
}

test('guest keyboard menu, anchors, FAQ and booking login destination', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await guest(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Đến nội dung chính' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const menu = page.getByRole('button', { name: 'Mở menu' });
  await menu.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Đóng menu' })).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toBeFocused();
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  expect(await menu.evaluate(el => getComputedStyle(el).outlineStyle)).not.toBe('none');
  await menu.click();
  await page.getByRole('navigation', { name: 'Điều hướng trên điện thoại' }).getByRole('link', { name: 'Dịch vụ', exact: true }).click();
  await expect(page).toHaveURL(/#dich-vu$/);
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  const question = page.locator('summary').first();
  await question.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('details').first()).toHaveAttribute('open', '');
  await expect(page.getByText('Có. Bạn cần đăng nhập', { exact: false })).toBeVisible();
  await page.getByRole('link', { name: 'Đặt lịch chăm sóc', exact: true }).first().click();
  await expect(page).toHaveURL(/\/login\?returnTo=%2Fapp%2Fbookings%2Fnew$/);
  await expect(page.getByLabel('Số điện thoại')).toBeVisible();
});

test('guest services handle loading, error, retry and empty without hiding landing', async ({ page }) => {
  let state = 'loading';
  await guest(page, async route => {
    if (state === 'loading') { await new Promise(resolve => setTimeout(resolve, 1200)); }
    return state === 'empty' ? route.fulfill({ json: envelope([]) }) : route.fulfill({ status: 503, json: { message: 'Dịch vụ tạm thời chưa tải được.' } });
  });
  await page.goto('/');
  await expect(page.getByRole('status')).toContainText('Đang tải dữ liệu');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  state = 'error';
  await expect(page.getByRole('alert')).toContainText('Dịch vụ tạm thời chưa tải được.');
  await expect(page.locator('#guest-faq-title')).toBeVisible();
  state = 'empty';
  await page.getByRole('button', { name: 'Thử lại' }).click();
  await expect(page.getByText('Chưa có dịch vụ đang mở bán. Bạn hãy quay lại sau nhé.')).toBeVisible();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Đặt lịch chăm sóc', exact: true })).toHaveCount(3);
});

test('landing preserves the existing active service query and all 20 records', async ({ page }) => {
  const items = Array.from({ length: 20 }, (_, i) => ({ ...services[0], id: `long-${i}`, serviceName: `Dịch vụ ${i + 1}` }));
  await guest(page, route => {
    const params = new URL(route.request().url()).searchParams;
    expect(Object.fromEntries(params)).toEqual({ status: 'ACTIVE', page: '1', limit: '20' });
    return route.fulfill({ json: envelope(items) });
  });
  await page.goto('/');
  await expect(page.locator('.guest-service h3')).toHaveText(items.map(item => item.serviceName));
});
