import { useEffect, useState, type FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { OperationBanner, useOperation } from '../../app/operations';
import { Button, Card, Input, Notice, Select, TextArea, dateTime, money } from '../../app/ui';

const todayVN = () => new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh', year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date());

export function AdminBookingExtras() {
  const { bookingId = '' } = useParams();
  const client = useQueryClient();
  const booking = useQuery({queryKey:['admin','booking',bookingId],queryFn:({signal})=>api.admin.booking(bookingId,signal),enabled:!!bookingId});
  const [date,setDate] = useState(todayVN());
  const [slot,setSlot] = useState('');
  const [reason,setReason] = useState('');
  const [delta,setDelta] = useState('');
  const [adjustReason,setAdjustReason] = useState('');
  const [reversalRef,setReversalRef] = useState('');
  const [error,setError] = useState<unknown>();
  const [success,setSuccess] = useState('');
  const [now,setNow] = useState(0);
  useEffect(() => { const update = () => setNow(Date.now()); update(); const timer = window.setInterval(update, 60_000); return () => window.clearInterval(timer); }, []);
  const b = booking.data;
  const serviceId = b?.services?.[0]?.serviceId || '';
  const availability = useQuery({queryKey:['admin','booking',bookingId,'availability',date],queryFn:({signal})=>api.admin.rescheduleAvailability(bookingId,date,signal),enabled:!!serviceId&&!!date&&!!b&&(b.status==='PENDING'||b.status==='CONFIRMED')});
  const reschedule = useOperation(`reschedule:${bookingId}`,key=>api.admin.bookingOperation(key));
  const noShow = useOperation(`no-show:${bookingId}`,key=>api.admin.bookingOperation(key));
  const adjustment = useOperation(`adjustment:${bookingId}`,key=>api.admin.bookingOperation(key));
  const blocked = !!(reschedule.active||noShow.active||adjustment.active);
  const busy = reschedule.busy||noShow.busy||adjustment.busy;
  const refresh = async () => {
    await client.invalidateQueries({queryKey:['admin','booking',bookingId]});
    for (const key of [['admin','bookings'],['admin','dashboard'],['admin','reports'],['admin','audit']]) void client.invalidateQueries({queryKey:key});
  };
  const run = async (task: () => Promise<unknown>) => {
    setError(undefined); setSuccess('');
    try { await task(); await refresh(); setSuccess('Đã lưu thao tác.'); }
    catch (cause) { setError(cause); await refresh(); }
  };
  if (!b) return null;
  const duration = b.scheduledEnd ? Math.round((Date.parse(b.scheduledEnd)-Date.parse(b.bookingDate))/60_000) : b.services?.[0]?.durationMinutes || 0;
  const newEnd = slot && duration > 0 ? new Date(Date.parse(slot)+duration*60_000).toISOString() : '';
  const original = b.adjustedTotal ?? b.finalTotal ?? 0;
  const amount = Number(delta);
  const projected = original+amount;
  const validAdjustment = Number.isSafeInteger(amount)&&amount!==0&&Number.isSafeInteger(projected)&&projected>=0&&!!adjustReason.trim();
  const reversible = b.adjustments?.filter(item=>!b.adjustments?.some(reverse=>reverse.reversalRef===item.id)) || [];
  return <div className="max-w-4xl mt-6 space-y-5">
    <Notice error={error} success={success}/>
    <OperationBanner operation={reschedule} onResolved={()=>void refresh()}/>
    <OperationBanner operation={noShow} onResolved={()=>void refresh()}/>
    <OperationBanner operation={adjustment} onResolved={()=>void refresh()}/>
    {(b.status==='PENDING'||b.status==='CONFIRMED')&&<Card>
      <h2 className="font-serif text-xl mb-3">Dời lịch</h2>
      <p className="text-sm mb-3">Hiện tại: {dateTime(b.bookingDate)} → {dateTime(b.scheduledEnd)}. Thời lượng đã lưu: {duration} phút.</p>
      <form onSubmit={(event:FormEvent)=>{event.preventDefault();if(!slot||!window.confirm(`Dời lịch từ ${dateTime(b.bookingDate)} sang ${dateTime(slot)}?`))return;void run(()=>reschedule.execute(key=>api.admin.reschedule(bookingId,slot,reason.trim(),key)));}} className="space-y-3">
        <Input label="Ngày mới (giờ Việt Nam)" type="date" min={todayVN()} required value={date} onChange={event=>{setDate(event.target.value);setSlot('');}}/>
        <Notice error={availability.error}/>
        {availability.data?.unavailableReason&&<p className="text-red-800 text-sm">{availability.data.unavailableReason}</p>}
        <Select label="Giờ bắt đầu còn trống" value={slot} onChange={event=>setSlot(event.target.value)} options={[{value:'',label:'Chọn giờ'},...(availability.data?.slots||[]).filter(item=>item.available).map(item=>({value:item.start,label:`${dateTime(item.start)} → ${dateTime(item.end)}`}))]}/>
        {slot&&<p className="text-sm">Sau dời: <b>{dateTime(slot)} → {dateTime(newEnd)}</b> theo thời lượng đã lưu. Máy chủ sẽ kiểm tra lại giờ trống khi lưu.</p>}
        <TextArea label="Lý do dời" required maxLength={255} value={reason} onChange={event=>setReason(event.target.value)}/>
        <Button type="submit" disabled={busy||blocked||!slot||!reason.trim()||availability.isFetching}>Dời lịch</Button>
      </form>
    </Card>}
    {b.status==='CONFIRMED'&&b.scheduledEnd&&Date.parse(b.scheduledEnd)<=now&&<Card>
      <h2 className="font-serif text-xl mb-3">Khách không đến</h2>
      <p className="text-sm mb-3">Chỉ ghi nhận sau khi thời điểm kết thúc đã lưu trôi qua. Lịch sẽ chuyển sang hủy với lý do không đến.</p>
      <Button variant="danger" disabled={busy||blocked} onClick={()=>{if(window.confirm('Ghi nhận khách không đến?'))void run(()=>noShow.execute(key=>api.admin.noShow(bookingId,key)));}}>Ghi nhận không đến</Button>
    </Card>}
    {b.status==='COMPLETED'&&<Card>
      <h2 className="font-serif text-xl mb-3">Điều chỉnh giá trị dịch vụ</h2>
      <p className="text-sm mb-3">Giá hoàn thành gốc: {money(b.finalTotal)} · Giá trị hiện tại: <b>{money(original)}</b>. Giá trị dịch vụ không phải tiền đã thu.</p>
      <form onSubmit={(event:FormEvent)=>{event.preventDefault();if(!validAdjustment||!window.confirm(`Điều chỉnh từ ${money(original)} thành ${money(projected)}?`))return;void run(()=>adjustment.execute(key=>api.admin.adjust(bookingId,{delta:amount,reason:adjustReason.trim(),...(reversalRef?{reversalRef}:{})},key)));}} className="space-y-3">
        <Select label="Bù cho điều chỉnh (tùy chọn)" value={reversalRef} onChange={event=>{const value=event.target.value;setReversalRef(value);if(value){const previous=b.adjustments?.find(item=>item.id===value);if(previous)setDelta(String(-previous.delta));}}} options={[{value:'',label:'Điều chỉnh mới'},...reversible.map(item=>({value:item.id,label:`#${item.id} · ${money(item.delta)} · ${item.reason}`}))]}/>
        <Input label="Chênh lệch VND (+ tăng, − giảm)" type="number" step={1} required value={delta} onChange={event=>setDelta(event.target.value)}/>
        <TextArea label="Lý do điều chỉnh" required maxLength={255} value={adjustReason} onChange={event=>setAdjustReason(event.target.value)}/>
        <p className="font-semibold">Trước: {money(original)} → Sau: {validAdjustment?money(projected):'—'}</p>
        <Button type="submit" disabled={busy||blocked||!validAdjustment}>Ghi điều chỉnh</Button>
      </form>
      {b.adjustments?.length?<div className="mt-5 border-t border-border-custom pt-3"><h3 className="font-semibold mb-2">Lịch sử điều chỉnh</h3>{b.adjustments.map(item=><p key={item.id} className="text-sm py-1">#{item.id} · {dateTime(item.createdAt)} · {money(item.delta)} · {item.reason}{item.reversalRef?` · Bù cho #${item.reversalRef}`:''}</p>)}</div>:null}
    </Card>}
    {b.events?.length?<Card><h2 className="font-serif text-xl mb-3">Lịch sử lịch hẹn</h2>{b.events.map((item,index)=><p key={item.id||index} className="text-sm border-t border-border-custom py-2">{dateTime(item.createdAt)} · {item.action}{item.reason?` · ${item.reason}`:''}</p>)}</Card>:null}
    {b.status==='CANCELLED'&&<Link className="underline text-sm" to={`/admin/audit?objectType=BOOKING&objectId=${bookingId}`}>Xem nhật ký lịch hẹn</Link>}
  </div>;
}
