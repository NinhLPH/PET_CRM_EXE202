import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { AuditEvent } from '../../api/types';
import { Button, Card, Empty, Input, Notice, Pager, QueryState, Title, dateTime, money } from '../../app/ui';

const todayVN = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const rate = (value:number|null, numerator:number, denominator:number) => value===null ? 'Không áp dụng (mẫu số 0)' : `${(value*100).toFixed(1)}% (${numerator}/${denominator})`;
const localInput = (iso:string) => iso && Number.isFinite(Date.parse(iso)) ? new Date(Date.parse(iso)+7*3600000).toISOString().slice(0,16) : '';

export function AdminReports(){
  const [from,setFrom]=useState(todayVN()); const [to,setTo]=useState(todayVN()); const [windowDays,setWindowDays]=useState(30);
  const [applied,setApplied]=useState({from:todayVN(),to:todayVN(),windowDays:30}); const [error,setError]=useState('');
  const bookings=useQuery({queryKey:['admin','reports','bookings',applied.from,applied.to],queryFn:({signal})=>api.admin.bookingReport(applied.from,applied.to,signal)});
  const value=useQuery({queryKey:['admin','reports','value',applied.from,applied.to],queryFn:({signal})=>api.admin.valueReport(applied.from,applied.to,signal)});
  const care=useQuery({queryKey:['admin','reports','care',applied.from,applied.to,applied.windowDays],queryFn:({signal})=>api.admin.careReport(applied.from,applied.to,applied.windowDays,signal)});
  const apply=(event:FormEvent)=>{event.preventDefault();if(to<from){setError('Ngày kết thúc phải từ ngày bắt đầu trở đi.');return;}if((Date.parse(to)-Date.parse(from))/86400000>90){setError('Khoảng ngày tối đa 90 ngày.');return;}setError('');setApplied({from,to,windowDays});};
  return <><Title>Báo cáo vận hành</Title><form onSubmit={apply} className="flex flex-wrap items-end gap-3 mb-5"><Input label="Từ ngày" type="date" required value={from} onChange={event=>setFrom(event.target.value)}/><Input label="Đến ngày" type="date" required value={to} onChange={event=>setTo(event.target.value)}/><Input label="Cửa sổ chăm sóc (ngày)" type="number" min={1} max={90} required value={windowDays} onChange={event=>setWindowDays(Number(event.target.value))}/><Button type="submit">Xem báo cáo</Button></form><Notice error={error||undefined}/><p className="text-sm text-text-secondary mb-5">Kỳ {applied.from} → {applied.to}, theo ngày Việt Nam. Các tổng lấy từ máy chủ trên toàn kỳ, không cộng từ trang danh sách đang mở.</p>
  <div className="grid lg:grid-cols-3 gap-4"><Card><h2 className="font-serif text-xl mb-3">Lịch hẹn</h2><QueryState loading={bookings.isLoading} error={bookings.error} retry={()=>void bookings.refetch()}>{bookings.data&&<div className="space-y-2 text-sm"><p>Cơ sở ngày: <b>Ngày hẹn</b> · Tính đến {dateTime(bookings.data.asOf)}</p><p>Tổng: <b>{bookings.data.total}</b></p><p>Chờ duyệt: {bookings.data.pending} · Xác nhận: {bookings.data.confirmed}</p><p>Hoàn thành: {bookings.data.completed} · Hủy: {bookings.data.cancelled}</p><p>Không đến: {bookings.data.noShow} (nằm trong nhóm hủy)</p><p>Tỷ lệ hủy: {rate(bookings.data.cancellationRate,bookings.data.cancelled,bookings.data.total)}</p><p>Tỷ lệ không đến: {rate(bookings.data.noShowRate,bookings.data.noShow,bookings.data.total)}</p><Link className="underline" to={`/admin/bookings?from=${applied.from}&to=${applied.to}&dateBasis=bookingDate`}>Mở lịch trong kỳ</Link></div>}</QueryState></Card>
  <Card><h2 className="font-serif text-xl mb-3">Giá trị dịch vụ</h2><QueryState loading={value.isLoading} error={value.error} retry={()=>void value.refetch()}>{value.data&&<div className="space-y-2 text-sm"><p>Cơ sở ngày: <b>Ngày hoàn thành</b> · Tính đến {dateTime(value.data.asOf)}</p><p>Lịch hoàn thành: {value.data.completedCount}</p><p>Giá trị gốc: {money(value.data.originalTotal)}</p><p>Tổng delta trên lịch hoàn thành trong kỳ: {money(value.data.deltaTotal)}</p><p><b>Giá trị hiện tại: {money(value.data.adjustedTotal)}</b></p><p>Delta ghi nhận trong kỳ: {money(value.data.adjustmentsRecordedInPeriod)}</p><p className="text-text-secondary">Điều chỉnh sau kỳ vẫn làm thay đổi giá trị hiện tại của kỳ hoàn thành gốc. Đây là giá trị dịch vụ, không phải tiền đã thu.</p><Link className="underline" to={`/admin/bookings?status=COMPLETED&from=${applied.from}&to=${applied.to}&dateBasis=completedAt`}>Mở lịch hoàn thành trong kỳ</Link></div>}</QueryState></Card>
  <Card><h2 className="font-serif text-xl mb-3">Chăm sóc lại</h2><QueryState loading={care.isLoading} error={care.error} retry={()=>void care.refetch()}>{care.data&&<div className="space-y-2 text-sm"><p>Cơ sở ngày: <b>Ngày liên hệ</b> · Tính đến {dateTime(care.data.asOf)}</p><p>Nhóm đã liên hệ: {care.data.contacted}</p><p>Đủ {care.data.windowDays} ngày: {care.data.matured} · Chưa đủ: {care.data.immature}</p><p>Quan sát tất cả: tạo mới {care.data.observed.created}, xác nhận {care.data.observed.confirmed}, hoàn thành {care.data.observed.completed}</p><p>Nhóm đủ thời gian: tạo mới {care.data.mature.created}, xác nhận {care.data.mature.confirmed}, hoàn thành {care.data.mature.completed}</p><p>Tỷ lệ tạo mới: {rate(care.data.rates.created,care.data.mature.created,care.data.matured)}</p><p>Tỷ lệ xác nhận: {rate(care.data.rates.confirmed,care.data.mature.confirmed,care.data.matured)}</p><p>Tỷ lệ hoàn thành: {rate(care.data.rates.completed,care.data.mature.completed,care.data.matured)}</p><p className="text-text-secondary">Ghép pet và dịch vụ trong cửa sổ N ngày; đây là quan sát sau liên hệ, không chứng minh nguyên nhân.</p></div>}</QueryState></Card></div></>;
}

const safeKeys = new Set(['status','oldStatus','newStatus','bookingDate','scheduledEnd','oldStart','newStart','finalTotal','delta','adjustedTotal','amount','discount','source','targetStatus','customerId','petId','serviceId','reminderId','bookingId','reversalRef','reason','before','after','old','new','result','capacity','slotStep','intervals','weekday','date','localDate','price','durationMinutes','reminderDays']);
function safeChange(value: unknown): unknown {
  if(Array.isArray(value))return value.map(safeChange);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).filter(([key])=>safeKeys.has(key)).map(([key,item])=>[key,safeChange(item)]));
  return value;
}
function objectLink(item:AuditEvent){
  switch(item.objectType){
    case 'BOOKING': return `/admin/bookings/${item.objectId}`;
    case 'CUSTOMER': return `/admin/customers/${item.objectId}`;
    case 'REMINDER': return `/admin/reminders/${item.objectId}`;
    case 'PET': return '/admin/customers';
    case 'WORKING_SCHEDULE': case 'DATE_EXCEPTION': return '/admin/settings/schedule';
    default: return null;
  }
}
export function AdminAudit(){
  const [params,setParams]=useSearchParams(); const page=Math.max(1,Number(params.get('page'))||1);
  const filters={actorId:params.get('actorId')||'',action:params.get('action')||'',objectType:params.get('objectType')||'',objectId:params.get('objectId')||'',from:params.get('from')||'',to:params.get('to')||'',page};
  const [draft,setDraft]=useState({...filters,from:localInput(filters.from),to:localInput(filters.to)});
  const list=useQuery({queryKey:['admin','audit',filters],queryFn:({signal})=>api.admin.audit(filters,signal)});
  return <><Title>Nhật ký thao tác</Title><p className="text-sm text-text-secondary mb-4">Dữ liệu chỉ đọc. Chi tiết chỉ hiển thị các trường nghiệp vụ được phép; liên kết đối tượng vẫn kiểm tra quyền truy cập riêng.</p><form onSubmit={event=>{event.preventDefault();setParams({...draft,from:draft.from?new Date(draft.from+'+07:00').toISOString():'',to:draft.to?new Date(draft.to+'+07:00').toISOString():'',page:'1'});}} className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5"><Input label="Actor ID" value={draft.actorId} onChange={event=>setDraft({...draft,actorId:event.target.value})}/><Input label="Action" value={draft.action} onChange={event=>setDraft({...draft,action:event.target.value.toUpperCase()})}/><Input label="Loại đối tượng" value={draft.objectType} onChange={event=>setDraft({...draft,objectType:event.target.value.toUpperCase()})}/><Input label="Object ID" value={draft.objectId} onChange={event=>setDraft({...draft,objectId:event.target.value})}/><Input label="Từ thời điểm" type="datetime-local" value={draft.from} onChange={event=>setDraft({...draft,from:event.target.value})}/><Input label="Đến thời điểm" type="datetime-local" value={draft.to} onChange={event=>setDraft({...draft,to:event.target.value})}/><div className="self-end"><Button type="submit">Lọc</Button></div></form><QueryState loading={list.isLoading} error={list.error} retry={()=>void list.refetch()}>{list.data?.items.length?<div className="space-y-3">{list.data.items.map(item=>{const href=objectLink(item);const change=safeChange(item.change);return <Card key={item.id}><div className="flex flex-wrap gap-x-4 text-sm"><b>{item.action}</b><span>{item.objectType} #{item.objectId}</span><span>Actor #{item.actorId}</span><span>{dateTime(item.createdAt)}</span></div>{href&&<Link className="underline text-sm" to={href}>Mở đối tượng</Link>}{item.reason&&<p className="text-sm mt-2">Lý do: {item.reason}</p>}{typeof change==='object'&&change!==null&&Object.keys(change).length>0&&<details className="mt-2 text-sm"><summary className="cursor-pointer underline">Chi tiết thay đổi đã lọc</summary><pre className="whitespace-pre-wrap break-all mt-2 p-3 bg-muted-surface">{JSON.stringify(change,null,2)}</pre></details>}</Card>;})}</div>:<Empty>Chưa có sự kiện theo bộ lọc.</Empty>}<Pager page={page} setPage={next=>setParams({...Object.fromEntries(params),page:String(next)})} data={list.data}/></QueryState></>;
}

const readinessItems = [
  {code:'IDENTITY_OPERATOR',label:'Nhân viên xác minh danh tính',to:'/admin/identity'},
  {code:'ACTIVE_SERVICE_PRICE_DURATION_REMINDER',label:'Dịch vụ ACTIVE có giá, thời lượng và chu kỳ nhắc',to:'/admin/services'},
  {code:'WORKING_SCHEDULE',label:'Giờ làm việc và sức chứa',to:'/admin/settings/schedule'},
  {code:'LEGACY_CONFIRMED_END',label:'Lịch CONFIRMED cũ thiếu giờ kết thúc',to:'/admin/bookings?status=CONFIRMED'},
];
export function AdminReadiness(){
  const health=useQuery({queryKey:['admin','readiness'],queryFn:({signal})=>api.admin.readiness(signal),retry:false});
  const codes=health.error instanceof ApiError ? (health.error.errors||[]).filter((item):item is string=>typeof item==='string') : [];
  const ready=health.data?.status==='ready';
  return <><Title>Sẵn sàng vận hành</Title><div className="max-w-3xl space-y-5"><Card><h2 className="font-serif text-xl mb-3">Kiểm tra cấu hình máy chủ</h2>{health.isLoading?<p>Đang kiểm tra…</p>:ready?<p role="status">Các điều kiện cấu hình tự động hiện đã đạt.</p>:<Notice error={health.error||new Error('Chưa xác nhận trạng thái cấu hình.')}/>}<div className="mt-4 space-y-3">{readinessItems.map(item=><p key={item.code} className="border-t border-border-custom pt-3 text-sm"><b>{ready?'Đạt':codes.includes(item.code)?'Cần xử lý':'Chưa xác minh'}:</b> {item.label} · <Link className="underline" to={item.to}>Mở màn hình liên quan</Link></p>)}</div><Button variant="secondary" onClick={()=>void health.refetch()}>Kiểm tra lại</Button></Card>
    <Card><h2 className="font-serif text-xl mb-3">Bàn giao dữ liệu và vận hành</h2><p className="text-sm mb-3">Import, migration và thử khôi phục do công cụ vận hành có quyền thực hiện. Kết quả cần ghi theo nguồn, số bản ghi thành công/lỗi từng nhóm, backfill ước lượng, thời điểm và người xác nhận; trạng thái API ready chưa thay thế các bằng chứng này.</p><ul className="list-disc pl-5 text-sm space-y-2"><li>Đối soát kết quả import và các bản ghi lỗi với Ops.</li><li>Kiểm tra restore trên môi trường kiểm thử và lưu bằng chứng.</li><li>Chạy UAT J01–J06 bằng tài khoản Customer/Admin riêng và ghi kết quả thực tế.</li><li>Kiểm tra cookie, CORS và deep link trên domain phát hành.</li><li>Chỉ chuyển sang pilot sau khi người phụ trách ký xác nhận G4.</li></ul></Card>
  </div></>;
}
