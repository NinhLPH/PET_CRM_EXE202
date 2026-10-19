import { test, expect } from '@playwright/test';
import { adminLogin, context, login, origin } from './support.mjs';

test.skip(!process.env.E2E_REAL_API, 'Run with E2E_REAL_API=1 and an updated local API.');

test('Real API: Admin session, role isolation, readiness, schedule, reports and audit', async ({browser}) => {
  const ctx=await context(browser);
  try{
    const page=await ctx.newPage();
    await login(page,adminLogin);
    await expect(page.getByRole('heading',{name:'Tổng quan cửa hàng'})).toBeVisible();
    const session=await page.evaluate(async apiOrigin=>{const response=await fetch(`${apiOrigin}/auth/context`,{credentials:'include'});return {status:response.status,body:await response.json()};},origin);
    expect(session.status).toBe(200);
    const actor=session.body;
    expect(actor.role).toBe('ADMIN');
    expect(actor.userId).toMatch(/^\d+$/);
    await page.reload();
    await expect(page.getByRole('heading',{name:'Tổng quan cửa hàng'})).toBeVisible();
    await page.goto('/admin/settings/schedule');
    await expect(page.getByRole('heading',{name:'Cấu hình giờ làm việc'})).toBeVisible();
    await page.getByRole('button',{name:'Thứ hai'}).click();
    await expect(page.getByLabel('Sức chứa đồng thời')).toHaveValue(/^[1-9]/);
    await page.goto('/admin/reports');
    await expect(page.getByRole('heading',{name:'Báo cáo vận hành'})).toBeVisible();
    await expect(page.getByText('Cơ sở ngày:',{exact:false}).first()).toBeVisible();
    await page.goto('/admin/audit');
    await expect(page.getByRole('heading',{name:'Nhật ký thao tác'})).toBeVisible();
    await page.goto('/admin/readiness');
    await expect(page.getByRole('heading',{name:'Sẵn sàng vận hành'})).toBeVisible();
    await expect(page.getByText('Các điều kiện cấu hình tự động hiện đã đạt.')).toBeVisible();
    await page.goto('/app');
    await expect(page).toHaveURL(/\/forbidden$/);
  }finally{await ctx.close();}
});
