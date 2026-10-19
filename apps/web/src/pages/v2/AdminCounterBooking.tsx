import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { CustomerInput, PetInput } from '../../api/types';
import { OperationBanner, useOperation } from '../../app/operations';
import { Button, Card, Input, Notice, Pager, QueryState, Select, TextArea, Title, dateTime, money } from '../../app/ui';

const todayVN = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());

export function AdminBookingNew() {
  const navigate=useNavigate(); const client=useQueryClient(); const [params]=useSearchParams();
  const [search,setSearch]=useState(''); const [q,setQ]=useState(''); const [customerId,setCustomerId]=useState(params.get('customerId')||'');
  const [customerForm,setCustomerForm]=useState<CustomerInput>({fullName:'',phone:'',address:''});
  const [petForm,setPetForm]=useState<PetInput>({name:'',species:'DOG',weight:''});
  const [petId,setPetId]=useState(params.get('petId')||''); const [serviceId,setServiceId]=useState(params.get('serviceId')||''); const [servicePage,setServicePage]=useState(1);
  const [date,setDate]=useState(todayVN()); const [slot,setSlot]=useState('');
  const [source,setSource]=useState<'COUNTER'|'PHONE'|'ZALO'|'OTHER'>('COUNTER');
  const [targetStatus,setTargetStatus]=useState<'PENDING'|'CONFIRMED'>('CONFIRMED');
  const [note,setNote]=useState(''); const [error,setError]=useState<unknown>(); const [busy,setBusy]=useState(false);
  const [priceChange,setPriceChange]=useState<{old:number;next:number}|null>(null); const [priceAccepted,setPriceAccepted]=useState(false);
  const matches=useQuery({queryKey:['admin','customers','counter',q],queryFn:({signal})=>api.admin.customers(q,1,signal),enabled:q.length>=2});
  const customer=useQuery({queryKey:['admin','customer',customerId],queryFn:({signal})=>api.admin.customer(customerId,signal),enabled:!!customerId});
  const services=useQuery({queryKey:['admin','services','counter',servicePage],queryFn:({signal})=>api.admin.services(servicePage,signal)});
  const pet=customer.data?.pets.find(item=>item.id===petId);
  const quote=useQuery({queryKey:['quote',serviceId,pet?.species,pet?.weight],queryFn:({signal})=>api.services.quote(serviceId,pet!.species!,pet!.weight!,signal),enabled:!!serviceId&&!!pet});
  const availability=useQuery({queryKey:['availability',serviceId,date],queryFn:({signal})=>api.bookings.availability(serviceId,date,signal),enabled:!!serviceId&&!!date});
  const createCustomer=useOperation('customer:create',key=>api.admin.resourceOperation(key));
  const createPet=useOperation(`customer:${customerId}:pet:create`,key=>api.admin.resourceOperation(key));
  const createBooking=useOperation('booking:counter:create',key=>api.admin.bookingOperation(key));
  const saveCustomer=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError(undefined);try{const created=await createCustomer.execute(key=>api.admin.createCustomer({...customerForm,fullName:customerForm.fullName.trim()},key));await client.invalidateQueries({queryKey:['admin','customers']});setCustomerId(created.id);setCustomerForm({fullName:'',phone:'',address:''});}catch(cause){setError(cause);}finally{setBusy(false);}};
  const savePet=async(event:FormEvent)=>{event.preventDefault();setBusy(true);setError(undefined);try{const created=await createPet.execute(key=>api.admin.createPet(customerId,petForm,key));await client.invalidateQueries({queryKey:['admin','customer',customerId]});setPetId(created.id);setPetForm({name:'',species:'DOG',weight:''});}catch(cause){setError(cause);}finally{setBusy(false);}};
  const saveBooking=async(event:FormEvent)=>{
    event.preventDefault(); if(!customerId||!pet||!quote.data||!slot||priceChange&&!priceAccepted)return;
    const available=availability.data?.slots.some(item=>item.start===slot&&item.available);
    if(!available){setError(new Error('Hãy chọn giờ còn trống.'));return;}
    if(!window.confirm(`Tạo lịch cho ${customer.data?.fullName} · ${pet.name} lúc ${dateTime(slot)} · ${money(priceChange?.next??quote.data.basePrice)} · ${targetStatus}?`))return;
    setBusy(true);setError(undefined);
    try{
      const result=await createBooking.execute(key=>api.admin.createBooking({customerId,petId,serviceId,bookingDate:slot,expectedBasePrice:priceChange?.next??quote.data.basePrice,source,targetStatus,...(note.trim()?{note:note.trim()}:{})},key));
      void client.invalidateQueries({queryKey:['admin','bookings']}); navigate(`/admin/bookings/${result.id}`);
    }catch(cause){setError(cause);if(cause instanceof ApiError&&cause.code==='PRICE_CHANGED'&&cause.currentQuote){setPriceChange({old:quote.data.basePrice,next:cause.currentQuote.basePrice});setPriceAccepted(false);}if(cause instanceof ApiError&&cause.code==='SLOT_UNAVAILABLE')void availability.refetch();}
    finally{setBusy(false);}
  };
  return <><Title>Tạo lịch tại quầy</Title><p className="mb-5 text-text-secondary">Tìm hồ sơ trước khi tạo mới. Lịch chờ xác nhận chưa giữ chỗ; lịch xác nhận chiếm giờ ngay.</p><div className="max-w-3xl space-y-5"><Notice error={error}/>
    <OperationBanner operation={createCustomer} onResolved={result=>{const resource=result.result as {id?:string};if(resource.id)setCustomerId(resource.id);}}/>
    <OperationBanner operation={createPet} onResolved={result=>{const resource=result.result as {id?:string};if(resource.id)setPetId(resource.id);void customer.refetch();}}/>
    <OperationBanner operation={createBooking} onResolved={result=>{const booking=result.result as {id?:string};navigate(`/admin/bookings/${result.bookingId||booking.id}`);}}/>
    <Card><h2 className="font-serif text-xl mb-3">1. Khách hàng</h2><form onSubmit={event=>{event.preventDefault();setQ(search.trim());}} className="flex gap-3 items-end mb-3"><div className="flex-1"><Input label="Tìm tên hoặc số điện thoại" value={search} onChange={event=>setSearch(event.target.value)}/></div><Button type="submit">Tìm</Button></form>
      <QueryState loading={matches.isLoading} error={matches.error} retry={()=>void matches.refetch()}>{matches.data?.items.map(item=><button key={item.id} type="button" onClick={()=>{setCustomerId(item.id);setPetId('');}} className={`block text-left w-full border-b border-border-custom py-2 text-sm ${customerId===item.id?'font-bold':''}`}>{item.fullName} · {item.phone} · #{item.id}</button>)}</QueryState>
      {matches.data?.items.length===0&&q&&<p className="text-sm mb-3">Không thấy hồ sơ phù hợp. Kiểm tra lại số điện thoại trước khi tạo mới.</p>}
      {customer.data&&<p className="my-3 text-sm">Đã chọn: <b>{customer.data.fullName}</b> · {customer.data.phone} · <Link className="underline" to={`/admin/customers/${customerId}`}>Xem CRM</Link></p>}
      <details><summary className="cursor-pointer underline text-sm">Tạo hồ sơ CRM mới</summary><form onSubmit={saveCustomer} className="space-y-3 mt-3"><Input label="Họ tên" required maxLength={100} value={customerForm.fullName} onChange={event=>setCustomerForm({...customerForm,fullName:event.target.value})}/><Input label="Số điện thoại" required pattern="0[0-9]{9}" value={customerForm.phone} onChange={event=>setCustomerForm({...customerForm,phone:event.target.value})}/><Input label="Địa chỉ" value={customerForm.address} onChange={event=>setCustomerForm({...customerForm,address:event.target.value})}/><Button type="submit" disabled={busy||!!createCustomer.active}>Tạo CRM</Button></form></details>
    </Card>
    {customer.data&&<Card><h2 className="font-serif text-xl mb-3">2. Thú cưng</h2><Select label="Chọn thú cưng" value={petId} onChange={event=>{setPetId(event.target.value);setPriceChange(null);setPriceAccepted(false);}} options={[{value:'',label:'Chọn thú cưng'},...customer.data.pets.map(item=>({value:item.id,label:`${item.name} · ${item.species} · ${item.weight} kg`}))]}/><details className="mt-3"><summary className="cursor-pointer underline text-sm">Thêm thú cưng cho khách</summary><form onSubmit={savePet} className="space-y-3 mt-3"><Input label="Tên thú cưng" required value={petForm.name} onChange={event=>setPetForm({...petForm,name:event.target.value})}/><Select label="Loài" value={petForm.species} onChange={event=>setPetForm({...petForm,species:event.target.value as PetInput['species']})} options={[{value:'DOG',label:'Chó'},{value:'CAT',label:'Mèo'}]}/><Input label="Cân nặng kg" type="number" min="0.1" step="0.01" required value={petForm.weight} onChange={event=>setPetForm({...petForm,weight:event.target.value})}/><Button type="submit" disabled={busy||!!createPet.active}>Thêm thú cưng</Button></form></details></Card>}
    {pet&&<Card><h2 className="font-serif text-xl mb-3">3. Dịch vụ và giờ hẹn</h2><div className="space-y-3"><QueryState loading={services.isLoading} error={services.error} retry={()=>void services.refetch()}><Select label="Dịch vụ" value={serviceId} onChange={event=>{setServiceId(event.target.value);setSlot('');setPriceChange(null);setPriceAccepted(false);}} options={[{value:'',label:'Chọn dịch vụ'},...(services.data?.items||[]).filter(item=>item.status==='ACTIVE').map(item=>({value:item.id,label:item.serviceName}))]}/><Pager page={servicePage} setPage={setServicePage} data={services.data}/></QueryState><Input label="Ngày hẹn (giờ Việt Nam)" type="date" min={todayVN()} required value={date} onChange={event=>{setDate(event.target.value);setSlot('');}}/><QueryState loading={availability.isLoading} error={availability.error} retry={()=>void availability.refetch()}>{availability.data?.unavailableReason&&<p className="text-red-800">{availability.data.unavailableReason}</p>}<Select label="Giờ còn trống" value={slot} onChange={event=>setSlot(event.target.value)} options={[{value:'',label:'Chọn giờ'},...(availability.data?.slots||[]).filter(item=>item.available).map(item=>({value:item.start,label:`${dateTime(item.start)} → ${dateTime(item.end)}`}))]}/></QueryState><Notice error={quote.error}/><p>Giá tạm tính: <b>{money(priceChange?.next??quote.data?.basePrice)}</b></p>{priceChange&&<div className="bg-amber-50 p-3 text-sm"><p>Giá cũ {money(priceChange.old)} → giá mới {money(priceChange.next)}.</p><Button variant="secondary" onClick={()=>setPriceAccepted(true)}>{priceAccepted?'Đã đồng ý':'Đồng ý giá mới'}</Button></div>}</div></Card>}
    {pet&&serviceId&&<Card><h2 className="font-serif text-xl mb-3">4. Kiểm tra và tạo lịch</h2><form onSubmit={saveBooking} className="space-y-3"><Select label="Nguồn tiếp nhận" value={source} onChange={event=>setSource(event.target.value as typeof source)} options={['COUNTER','PHONE','ZALO','OTHER'].map(item=>({value:item,label:item}))}/><Select label="Trạng thái tạo" value={targetStatus} onChange={event=>setTargetStatus(event.target.value as typeof targetStatus)} options={[{value:'CONFIRMED',label:'Xác nhận ngay, chiếm giờ'},{value:'PENDING',label:'Chờ xác nhận, chưa giữ giờ'}]}/><TextArea label="Ghi chú" value={note} onChange={event=>setNote(event.target.value)}/><p className="text-sm">{customer.data?.fullName} · {pet.name} · {dateTime(slot)} · {money(priceChange?.next??quote.data?.basePrice)} · {targetStatus}</p><Button type="submit" disabled={busy||!!createBooking.active||!quote.data||!slot||!!priceChange&&!priceAccepted}>Tạo lịch</Button></form></Card>}
  </div></>;
}
