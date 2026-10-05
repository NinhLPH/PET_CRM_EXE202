import { expect } from '@playwright/test';
import { createRequire } from 'node:module';
import { mkdirSync, appendFileSync, writeFileSync, readFileSync } from 'node:fs';
import { randomInt, randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const requireApi = createRequire(new URL('../../api/package.json', import.meta.url));
const { parse } = requireApi('dotenv');
const local = parse(readFileSync(new URL('../../api/.env', import.meta.url)));
export const web = process.env.E2E_WEB_ORIGIN || 'http://localhost:5173';
export const origin = process.env.E2E_API_ORIGIN || 'http://localhost:3000';
export const adminLogin = { phone: process.env.E2E_ADMIN_PHONE || local.ADMIN_PHONE, password: process.env.E2E_ADMIN_PASSWORD || local.ADMIN_PASSWORD };
export const runId = `E2E_V1_${Date.now()}_${randomInt(1000, 9999)}`;
export const out = fileURLToPath(new URL(`../e2e-artifacts/${runId}/`, import.meta.url));
mkdirSync(out, { recursive: true });
export const records = { runId, customers: [], pets: [], services: [], prices: [], bookings: [], reminders: [], deleted: [], cleanup: [] };
export function save() { writeFileSync(`${out}/fixtures.json`, JSON.stringify(records, null, 2)); }
export function remember(kind, item) { if (item?.id && !records[kind].includes(item.id)) records[kind].push(item.id); save(); return item; }
let scenario = 'setup';
export function setScenario(name) { scenario = name; }
export function record(method, url, status, source) {
  const path = new URL(url, origin).pathname;
  appendFileSync(`${out}/network.jsonl`, JSON.stringify({ scenario, method, path, status, source }) + '\n');
}
export async function call(ctx, method, path, body, status = method === 'POST' ? 201 : 200, headers = {}) {
  const response = await ctx.request.fetch(`${origin}${path}`, { method, ...(body === undefined ? {} : { data: body }), headers: { Origin: web, ...headers } });
  record(method, response.url(), response.status(), 'API');
  // Do not include request bodies/credentials in assertion output.
  expect(response.status(), `${method} ${path.split('?')[0]}`).toBe(status);
  return response.json();
}
export async function context(browser, options = {}) {
  const ctx = await browser.newContext({ baseURL: web, timezoneId: 'Asia/Ho_Chi_Minh', viewport: { width: 1440, height: 900 }, ...options });
  ctx.setDefaultTimeout(15_000);
  ctx.setDefaultNavigationTimeout(30_000);
  ctx.on('page', page => {
    page.on('dialog', dialog => dialog.accept());
    page.on('response', response => {
      if (response.url().startsWith(origin + '/')) record(response.request().method(), response.url(), response.status(), 'UI');
    });
    page.on('pageerror', error => appendFileSync(`${out}/page-errors.log`, `${scenario}: ${error.message}\n`));
  });
  return ctx;
}
export async function login(page, credentials) {
  await page.goto('/login');
  await page.getByLabel('Số điện thoại').fill(credentials.phone);
  await page.getByLabel('Mật khẩu', { exact: true }).fill(credentials.password);
  await page.getByRole('button', { name: 'Đăng nhập', exact: true }).click();
  await expect(page).toHaveURL(/\/(app|admin)$/);
}
export async function submit(page, button, path, method = 'POST', status = 201) {
  const wait = page.waitForResponse(r => new URL(r.url()).pathname === path && r.request().method() === method);
  await page.getByRole('button', { name: button, exact: true }).click();
  const response = await wait;
  expect(response.status(), `${method} ${path}`).toBe(status);
  return response.json();
}
export function phone() { return `0${randomInt(100000000, 999999999)}`; }
export const password = `Test_${randomUUID()}!`;
export function future(offset = 0) { return new Date(Date.now() + 86400000 * 30 + offset * 60000).toISOString().slice(0, 16); }
export async function newBooking(customer, petId, serviceId, price = 100000, offset = 0) {
  return remember('bookings', await call(customer, 'POST', '/bookings', { petId, serviceId, expectedBasePrice: price, bookingDate: future(offset) + ':00+07:00', note: runId }, 201, { 'Idempotency-Key': randomUUID() }));
}
export async function makeDue(reminderId, customerId) {
  // Only IDs created by this run, additionally guarded by the fixture customer's exact name.
  if (!records.reminders.includes(reminderId) || !records.customers.includes(customerId)) throw new Error('Refuse to alter non-fixture reminder');
  const { Client } = requireApi('pg');
  const db = new Client({ connectionString: process.env.E2E_DATABASE_URL || local.DATABASE_URL });
  await db.connect();
  try {
    const result = await db.query(`UPDATE pet_reminders r SET reminder_date = CURRENT_TIMESTAMP - INTERVAL '1 day' FROM customers c WHERE r.reminder_id = $1 AND r.customer_id = $2 AND c.customer_id = r.customer_id AND c.full_name LIKE $3 RETURNING r.reminder_id`, [reminderId, customerId, `${runId}%`]);
    expect(result.rowCount).toBe(1);
    records.cleanup.push(`Adjusted reminder_date for fixture reminder ${reminderId}`); save();
  } finally { await db.end(); }
}
