import {test, expect} from '@playwright/test';

const api = 'http://localhost:3000';
const pageOf = items => ({items,total:items.length,page:1,limit:20});

test('Customer selects a backend slot and sends its UTC start with an idempotency key', async ({page}) => {
  let submitted;
  await page.route(`${api}/**`, async route => {
    const request=route.request();const url=new URL(request.url());const path=url.pathname;
    if(path==='/auth/context') return route.fulfill({json:{role:'CUSTOMER',userId:'11',customerId:'101',capabilities:{canVerifyIdentity:false}}});
    if(path==='/pets/mine') return route.fulfill({json:pageOf([{id:'201',customerId:'101',name:'Milo',species:'DOG',weight:'4.50'}])});
    if(path==='/pets/201') return route.fulfill({json:{id:'201',customerId:'101',name:'Milo',species:'DOG',weight:'4.50'}});
    if(path==='/services') return route.fulfill({json:pageOf([{id:'301',serviceName:'Tắm',status:'ACTIVE'}])});
    if(path==='/services/301/quote') return route.fulfill({json:{serviceId:'301',species:'DOG',weight:'4.50',servicePriceId:'401',basePrice:100000}});
    if(path==='/availability') return route.fulfill({json:{date:url.searchParams.get('date'),slots:[{start:'2026-11-02T02:00:00.000Z',end:'2026-11-02T03:00:00.000Z',available:true}]}});
    if(path==='/bookings'&&request.method()==='POST'){submitted={body:request.postDataJSON(),key:request.headers()['idempotency-key']};return route.fulfill({status:201,json:{id:'501'}});}
    if(path==='/bookings/501') return route.fulfill({json:{id:'501',customerId:'101',petId:'201',bookingDate:'2026-11-02T02:00:00.000Z',status:'PENDING',estimatedTotal:100000}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/app/bookings/new');
  await page.getByRole('combobox',{name:'Thú cưng'}).selectOption('201');
  await page.getByRole('combobox',{name:'Dịch vụ'}).selectOption('301');
  await page.getByLabel('Ngày hẹn (giờ Việt Nam)').fill('2026-11-02');
  await page.getByLabel('Giờ bắt đầu · kết thúc').selectOption('2026-11-02T02:00:00.000Z');
  await page.getByRole('button',{name:'Đặt lịch',exact:true}).click();
  await expect(page).toHaveURL(/\/app\/bookings\/501$/);
  expect(submitted.body.bookingDate).toBe('2026-11-02T02:00:00.000Z');
  expect(submitted.body.expectedBasePrice).toBe(100000);
  expect(submitted.key).toMatch(/^[0-9a-f-]{36}$/);
});

test('Admin reports distinguish service value and mature care cohort', async ({page}) => {
  await page.route(`${api}/**`, async route => {
    const path=new URL(route.request().url()).pathname;
    if(path==='/auth/context') return route.fulfill({json:{role:'ADMIN',userId:'1',customerId:null,capabilities:{canVerifyIdentity:true}}});
    if(path==='/admin/dashboard') return route.fulfill({json:{pending:1,confirmedToday:2,remindersDue:3}});
    if(path==='/admin/reports/bookings') return route.fulfill({json:{from:'2026-10-19',to:'2026-10-19',asOf:'2026-10-19T00:00:00Z',total:2,pending:1,confirmed:1,completed:0,cancelled:0,noShow:0,cancellationRate:0,noShowRate:0}});
    if(path==='/admin/reports/value') return route.fulfill({json:{from:'2026-10-19',to:'2026-10-19',asOf:'2026-10-19T00:00:00Z',completedCount:1,originalTotal:100000,deltaTotal:-10000,adjustedTotal:90000,adjustmentsRecordedInPeriod:-10000}});
    if(path==='/admin/reports/care') return route.fulfill({json:{from:'2026-10-19',to:'2026-10-19',asOf:'2026-10-19T00:00:00Z',windowDays:30,contacted:2,matured:0,immature:2,observed:{created:1,confirmed:0,completed:0},mature:{created:0,confirmed:0,completed:0},rates:{created:null,confirmed:null,completed:null}}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/admin/reports');
  await expect(page.getByText('Giá trị dịch vụ',{exact:true})).toBeVisible();
  await expect(page.getByText('Giá trị dịch vụ, không phải tiền đã thu.',{exact:false})).toBeVisible();
  await expect(page.getByText('Không áp dụng (mẫu số 0)',{exact:false}).first()).toBeVisible();
});

test('Recovery uses staff token without exposing whether the phone exists', async ({page}) => {
  let recovery;
  await page.route(`${api}/**`, route => {
    const path=new URL(route.request().url()).pathname;
    if(path==='/auth/context') return route.fulfill({status:401,json:{code:'UNAUTHORIZED',message:'Login required'}});
    if(path==='/auth/recovery/request') return route.fulfill({json:{message:'Nếu cần khôi phục, vui lòng liên hệ nhân viên cửa hàng để xác minh'}});
    if(path==='/auth/recover'){recovery=route.request().postDataJSON();return route.fulfill({status:201,json:{success:true}});}
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/recover');
  await page.getByLabel('Số điện thoại').fill('0900000001');
  await page.getByRole('button',{name:'Xem hướng dẫn'}).click();
  await expect(page.getByRole('status')).toContainText('liên hệ nhân viên');
  await page.getByLabel('Mã khôi phục').fill('staff-token');
  await page.getByLabel('Mật khẩu mới').fill('new-password-123');
  await page.getByLabel('Nhập lại mật khẩu').fill('new-password-123');
  await page.getByRole('button',{name:'Đổi mật khẩu'}).click();
  await expect(page).toHaveURL(/\/login\?recovered=1/);
  expect(recovery).toEqual({phone:'0900000001',verificationToken:'staff-token',newPassword:'new-password-123',confirmPassword:'new-password-123'});
});

test('Schedule conflict shows affected confirmed booking IDs', async ({page}) => {
  page.on('dialog',dialog=>dialog.accept());
  await page.route(`${api}/**`, route => {
    const path=new URL(route.request().url()).pathname;
    if(path==='/auth/context') return route.fulfill({json:{role:'ADMIN',userId:'1',customerId:null,capabilities:{canVerifyIdentity:true}}});
    if(path==='/admin/dashboard') return route.fulfill({json:{pending:0,confirmedToday:0,remindersDue:0}});
    if(path==='/admin/schedule/weekly'&&route.request().method()==='GET') return route.fulfill({json:[{weekday:1,intervals:[{start:'08:00',end:'12:00'}],capacity:2,slotStep:30}]});
    if(path==='/admin/schedule/exceptions') return route.fulfill({json:[]});
    if(path==='/admin/schedule/weekly/1'&&route.request().method()==='PUT') return route.fulfill({status:409,json:{code:'SCHEDULE_HAS_CONFIRMED',message:'Cấu hình ảnh hưởng lịch đã xác nhận',bookingIds:['42'],requestId:'req-1'}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/admin/settings/schedule');
  await page.getByRole('button',{name:'Thứ hai'}).click();
  await page.getByRole('button',{name:'Lưu cấu hình'}).click();
  await expect(page.getByRole('link',{name:'#42'})).toHaveAttribute('href','/admin/bookings/42');
});
