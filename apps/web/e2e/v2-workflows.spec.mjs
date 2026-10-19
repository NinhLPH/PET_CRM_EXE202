import { test, expect } from '@playwright/test';

const origin='http://localhost:3000';
const pageOf=items=>({items,total:items.length,page:1,limit:20});
const context=(role='ADMIN')=>({role,userId:role==='ADMIN'?'1':'11',customerId:role==='ADMIN'?null:'101',capabilities:{canVerifyIdentity:role==='ADMIN'}});

test('Customer detail renders safe v2 service, surcharge, adjustment and timeline fields',async({page})=>{
  await page.route(`${origin}/**`,route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/auth/context')return route.fulfill({json:context('CUSTOMER')});
    if(path==='/bookings/501')return route.fulfill({json:{id:'501',customerId:'101',bookingDate:'2026-11-02T02:00:00.000Z',scheduledEnd:'2026-11-02T03:00:00.000Z',status:'COMPLETED',note:null,estimatedTotal:100000,finalTotal:110000,discountAmount:0,adjustedTotal:90000,pet:{id:'201',name:'Milo',species:'DOG'},services:[{serviceId:'301',serviceName:'Tắm',basePrice:100000,durationMinutes:60}],surcharges:[{name:'Lông dày',amount:10000}],adjustments:[{id:'601',delta:-20000,reason:'Điều chỉnh sau dịch vụ',createdAt:'2026-11-03T00:00:00Z'}],events:[{action:'COMPLETE',oldStatus:'CONFIRMED',newStatus:'COMPLETED',createdAt:'2026-11-02T03:00:00Z'}]}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/app/bookings/501');
  await expect(page.getByRole('heading',{name:'Milo · Tắm'})).toBeVisible();
  await expect(page.getByText('Lông dày:',{exact:false})).toBeVisible();
  await expect(page.getByText('Điều chỉnh sau dịch vụ')).toBeVisible();
  await expect(page.getByText('COMPLETE',{exact:false})).toBeVisible();
  await expect(page.getByText('90.000',{exact:false})).toBeVisible();
});

test('Unknown CRM create survives reload and resolves with same operation key',async({page})=>{
  let key='';let creates=0;
  await page.route(`${origin}/**`,route=>{
    const req=route.request();const path=new URL(req.url()).pathname;
    if(path==='/auth/context')return route.fulfill({json:context()});
    if(path==='/admin/customers'&&req.method()==='GET')return route.fulfill({json:pageOf([])});
    if(path==='/admin/customers'&&req.method()==='POST'){creates++;key=req.headers()['idempotency-key'];return route.fulfill({status:503,json:{code:'TEMPORARY',message:'Mất phản hồi sau commit'}});}
    if(path===`/admin/operations/${key}`)return route.fulfill({json:{operation:'CREATE_CUSTOMER',resourceId:'501',result:{id:'501',fullName:'Khách thử'},createdAt:'2026-10-19T00:00:00Z'}});
    if(path==='/admin/customers/501')return route.fulfill({json:{id:'501',fullName:'Khách thử',phone:'0900000001',address:null,note:null,pets:[],bookings:[],activities:[]}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/admin/customers');
  await page.getByRole('button',{name:'Thêm khách hàng'}).click();
  await page.getByLabel('Họ tên').fill('Khách thử');
  await page.getByLabel('Số điện thoại').fill('0900000001');
  await page.getByRole('button',{name:'Lưu khách hàng'}).click();
  await expect(page.getByText('Kết quả thao tác trước chưa xác định',{exact:false})).toBeVisible();
  await page.reload();
  await expect(page.getByText('Kết quả thao tác trước chưa xác định',{exact:false})).toBeVisible();
  await page.getByRole('button',{name:'Tra cứu kết quả'}).click();
  await expect(page).toHaveURL(/\/admin\/customers\/501$/);
  expect(key).toMatch(/^[0-9a-f-]{36}$/);expect(creates).toBe(1);
});

test('Counter booking searches CRM, previews confirmed status and sends selected UTC slot',async({page})=>{
  page.on('dialog',dialog=>dialog.accept());
  let submitted;
  await page.route(`${origin}/**`,route=>{
    const req=route.request();const url=new URL(req.url());const path=url.pathname;
    if(path==='/auth/context')return route.fulfill({json:context()});
    if(path==='/admin/customers'&&req.method()==='GET')return route.fulfill({json:pageOf([{id:'101',fullName:'Khách thử',phone:'0900000001',userId:null}])});
    if(path==='/admin/customers/101')return route.fulfill({json:{id:'101',fullName:'Khách thử',phone:'0900000001',pets:[{id:'201',name:'Milo',species:'DOG',weight:'4.5'}],bookings:[],activities:[]}});
    if(path==='/admin/services')return route.fulfill({json:pageOf([{id:'301',serviceName:'Tắm',status:'ACTIVE'}])});
    if(path==='/services/301/quote')return route.fulfill({json:{serviceId:'301',basePrice:100000,servicePriceId:'401'}});
    if(path==='/availability')return route.fulfill({json:{date:url.searchParams.get('date'),slots:[{start:'2026-11-02T02:00:00.000Z',end:'2026-11-02T03:00:00.000Z',available:true}]}});
    if(path==='/admin/bookings'&&req.method()==='POST'){submitted={body:req.postDataJSON(),key:req.headers()['idempotency-key']};return route.fulfill({status:201,json:{id:'501'}});}
    if(path==='/admin/bookings/501')return route.fulfill({json:{id:'501',customerId:'101',petId:'201',bookingDate:'2026-11-02T02:00:00.000Z',status:'CONFIRMED',note:null,services:[{serviceId:'301',basePrice:100000}],surcharges:[]}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/admin/bookings/new');
  await page.getByLabel('Tìm tên hoặc số điện thoại').fill('0900000001');
  await page.getByRole('button',{name:'Tìm',exact:true}).click();
  await page.getByRole('button',{name:/Khách thử · 0900000001/}).click();
  await page.getByRole('combobox',{name:'Chọn thú cưng'}).selectOption('201');
  await page.getByRole('combobox',{name:'Dịch vụ'}).selectOption('301');
  await page.getByLabel('Ngày hẹn (giờ Việt Nam)').fill('2026-11-02');
  await page.getByRole('combobox',{name:'Giờ còn trống'}).selectOption('2026-11-02T02:00:00.000Z');
  await page.getByRole('button',{name:'Tạo lịch',exact:true}).click();
  await expect(page).toHaveURL(/\/admin\/bookings\/501$/);
  expect(submitted.body).toMatchObject({customerId:'101',petId:'201',serviceId:'301',bookingDate:'2026-11-02T02:00:00.000Z',expectedBasePrice:100000,source:'COUNTER',targetStatus:'CONFIRMED'});
  expect(submitted.key).toMatch(/^[0-9a-f-]{36}$/);
});

test('Readiness lists concrete missing setup without claiming release approval',async({page})=>{
  await page.route(`${origin}/**`,route=>{
    const path=new URL(route.request().url()).pathname;
    if(path==='/auth/context')return route.fulfill({json:context()});
    if(path==='/health/ready')return route.fulfill({status:503,json:{code:'NOT_READY',message:'Cấu hình chưa sẵn sàng',errors:['WORKING_SCHEDULE','LEGACY_CONFIRMED_END']}});
    return route.fulfill({status:404,json:{code:'NOT_FOUND',message:'Not found'}});
  });
  await page.goto('/admin/readiness');
  await expect(page.getByText('Cần xử lý: Giờ làm việc và sức chứa')).toBeVisible();
  await expect(page.getByText('Cần xử lý: Lịch CONFIRMED cũ thiếu giờ kết thúc')).toBeVisible();
  await expect(page.getByText('Import, migration và thử khôi phục',{exact:false})).toBeVisible();
});
