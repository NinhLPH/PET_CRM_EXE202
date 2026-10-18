import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, Clock3, PawPrint } from 'lucide-react';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { BookingInput } from '../../api/types';
import { clearPendingBooking, readPendingBooking, writePendingBooking, type PendingBooking } from '../../app/pendingBooking';
import { Back, Button, Empty, Input, Notice, Pager, QueryState, Select, TextArea, Title, bookingLabel, bookingPrice, dateTime, firstService, money, vietnameseBookingDate } from '../../app/ui';

export function CustomerBookingNew() {
  const navigate = useNavigate(); const client = useQueryClient(); const [params] = useSearchParams();
  const [pagePets, setPagePets] = useState(1); const [pageServices, setPageServices] = useState(1);
  const pets = useQuery({ queryKey: ['pets', 'mine', pagePets], queryFn: ({ signal }) => api.pets.mine(pagePets, 20, signal) });
  const services = useQuery({ queryKey: ['services', pageServices], queryFn: ({ signal }) => api.services.list(pageServices, 20, signal) });
  const preselectedPet = params.get('petId');
  const [restored] = useState(readPendingBooking);
  const [petId, setPetId] = useState(restored?.body.petId || preselectedPet || ''); const [serviceId, setServiceId] = useState(restored?.body.serviceId || '');
  const [dateLocal, setDateLocal] = useState(() => restored ? new Date(Date.parse(restored.body.bookingDate) + 7 * 3600000).toISOString().slice(0, 16) : ''); const [note, setNote] = useState(restored?.body.note || '');
  const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  const [pendingBooking, setPendingBooking] = useState<PendingBooking | null>(restored);
  const [priceAccepted, setPriceAccepted] = useState(false);
  const [priceChange, setPriceChange] = useState<{ basePrice: number; servicePriceId: string } | null>(null);
  const petDetail = useQuery({ queryKey: ['pets', petId], queryFn: ({ signal }) => api.pets.get(petId, signal), enabled: !!petId && !pendingBooking });
  const quote = useQuery({ queryKey: ['quote', serviceId, petDetail.data?.species, petDetail.data?.weight], queryFn: ({ signal }) => api.services.quote(serviceId, petDetail.data!.species, petDetail.data!.weight, signal), enabled: !!serviceId && !!petDetail.data && !pendingBooking, retry: false });
  const setPet = (value: string) => { setPetId(value); setPriceChange(null); setError(undefined); };
  const setService = (value: string) => { setServiceId(value); setPriceChange(null); setError(undefined); };
  const submitBody = async (request: PendingBooking) => {
    setPending(true); setError(undefined);
    try { const booking = await api.bookings.create(request.body, request.key); clearPendingBooking(); setPendingBooking(null); await client.invalidateQueries({ queryKey: ['bookings'] }); navigate(`/app/bookings/${booking.id}`, { replace: true }); }
    catch (e) {
      if (e instanceof ApiError && e.code === 'PRICE_CHANGED' && e.currentQuote) { clearPendingBooking(); setPendingBooking(null); setPriceChange(e.currentQuote); setPriceAccepted(false); }
      else if (e instanceof ApiError && e.status >= 400 && e.status < 500) { clearPendingBooking(); setPendingBooking(null); }
      setError(e);
    }
    finally { setPending(false); }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (pending || (priceChange && !priceAccepted)) return;
    if (pendingBooking) { void submitBody(pendingBooking); return; }
    if (!quote.data || !petDetail.data) { setError(new Error('Chưa có báo giá hợp lệ.')); return; }
    const bookingDate = vietnameseBookingDate(dateLocal);
    if (!dateLocal || new Date(bookingDate).getTime() <= Date.now()) { setError(new Error('Ngày giờ hẹn phải ở tương lai theo giờ Việt Nam.')); return; }
    const body: BookingInput = { petId, serviceId, bookingDate, expectedBasePrice: priceChange?.basePrice ?? quote.data.basePrice, ...(note.trim() ? { note: note.trim() } : {}) };
    const request = { body, key: crypto.randomUUID(), customerId: petDetail.data.customerId };
    try { writePendingBooking(request); } catch (e) { setError(e); return; }
    setPendingBooking(request); void submitBody(request);
  };
  const confirmPrice = () => { if (priceChange) { setPriceAccepted(true); setError(undefined); } };
  return <><Title>Đặt lịch grooming</Title><p className="text-text-secondary mb-6 max-w-2xl">Chọn một thú cưng, một dịch vụ và thời gian mong muốn. Cửa hàng sẽ duyệt yêu cầu.</p><div className="grid lg:grid-cols-[minmax(0,1fr)_280px] gap-7 items-start"><div className="min-w-0"><Notice error={error} />{pendingBooking && <div className="border-l-2 border-muted-accent bg-muted-surface/60 px-4 py-3 mb-5 text-sm"><p>Yêu cầu trước chưa có kết quả xác nhận: pet #{pendingBooking.body.petId}, dịch vụ #{pendingBooking.body.serviceId}, lúc {dateTime(pendingBooking.body.bookingDate)}. Thử lại dùng cùng mã gửi; bạn cũng có thể xem danh sách lịch hẹn trước.</p><Link className="text-plum-noir underline" to="/app/bookings">Xem lịch hẹn</Link></div>}{priceChange && <div className="border-l-2 border-muted-accent bg-muted-surface/60 px-4 py-3 mb-5 text-sm"><p className="mb-2">Giá mới: <b>{money(priceChange.basePrice)}</b>. Vui lòng xác nhận lại trước khi đặt.</p><Button variant="secondary" onClick={confirmPrice}>Tôi đã xem giá mới</Button></div>}<form onSubmit={submit} className="space-y-0">{pets.error && <Notice error={pets.error} />}{services.error && <Notice error={services.error} />}{petDetail.error && <Notice error={petDetail.error} />}<section className="border-t border-border-custom pt-5 pb-5"><h2 className="font-serif text-lg font-semibold mb-4">Thú cưng và dịch vụ</h2><div className="space-y-4"><Select label="1. Thú cưng" value={petId} disabled={!!pendingBooking} onChange={e => setPet(e.target.value)} options={[{ value: '', label: 'Chọn thú cưng' }, ...(pets.data?.items.map(p => ({ value: p.id, label: `${p.name} · ${p.weight} kg` })) ?? []), ...(petDetail.data && !pets.data?.items.some(p => p.id === petDetail.data?.id) ? [{ value: petDetail.data.id, label: `${petDetail.data.name} · ${petDetail.data.weight} kg` }] : [])]} />{pets.data?.total === 0 && <p className="text-sm">Chưa có thú cưng. <Link className="underline" to="/app/pets">Thêm thú cưng</Link> rồi quay lại.</p>}<Pager page={pagePets} setPage={setPagePets} data={pets.data} /><Select label="2. Dịch vụ" value={serviceId} disabled={!!pendingBooking} onChange={e => setService(e.target.value)} options={[{ value: '', label: 'Chọn dịch vụ' }, ...(services.data?.items.map(s => ({ value: s.id, label: s.serviceName })) ?? [])]} /><Pager page={pageServices} setPage={setPageServices} data={services.data} /></div></section><section className="border-t border-border-custom pt-5 pb-5"><h2 className="font-serif text-lg font-semibold mb-4">Thời gian và ghi chú</h2><div className="space-y-4"><Input label="3. Ngày giờ (giờ Việt Nam)" type="datetime-local" required value={dateLocal} disabled={!!pendingBooking} onChange={e => setDateLocal(e.target.value)} /><TextArea label="Ghi chú (tùy chọn)" value={note} disabled={!!pendingBooking} onChange={e => setNote(e.target.value)} /></div></section><section className="border-t border-border-custom pt-5"><h2 className="font-serif text-lg font-semibold mb-3">Kiểm tra và xác nhận</h2>{petDetail.isLoading || quote.isLoading ? <p role="status">Đang lấy giá…</p> : quote.error ? <Notice error={quote.error} /> : quote.data ? <div className="border border-border-custom rounded-panel bg-surface p-4 mb-5"><b>Giá tạm tính: {money(priceChange?.basePrice ?? quote.data.basePrice)}</b><p className="text-sm text-text-secondary mt-1">Giá cuối có thể thay đổi khi hoàn thành dịch vụ.</p></div> : null}<Button type="submit" disabled={pending || (!pendingBooking && (!quote.data || !!quote.error || (!!priceChange && !priceAccepted)))}>{pending ? 'Đang gửi…' : pendingBooking ? 'Thử lại yêu cầu trước' : 'Xác nhận đặt lịch'}</Button></section></form></div><aside className="hidden lg:block lg:sticky lg:top-24 border border-border-custom bg-surface px-4 py-5 rounded-panel"><h2 className="font-serif text-lg font-semibold mb-4">Tóm tắt yêu cầu</h2><div className="space-y-3 text-sm"><p className="flex items-start gap-2"><PawPrint aria-hidden="true" size={17} className="shrink-0 text-muted-accent" /><span>{petDetail.data?.name || 'Chưa chọn thú cưng'}</span></p><p>{services.data?.items.find(s => s.id === serviceId)?.serviceName || 'Chưa chọn dịch vụ'}</p><p className="flex items-center gap-2"><Clock3 aria-hidden="true" size={17} className="text-muted-accent" />{dateLocal ? dateLocal.replace('T', ' · ') : 'Chưa chọn thời gian'}</p><p className="border-t border-border-custom pt-3 font-semibold">{quote.data ? money(priceChange?.basePrice ?? quote.data.basePrice) : 'Giá sau khi chọn dịch vụ'}</p></div></aside></div></>;
}

export function CustomerBookings() {
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['bookings', 'mine', page, 20], queryFn: ({ signal }) => api.bookings.mine(page, 20, signal) });
  return <><Title>Lịch hẹn và lịch sử</Title><QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()}>{list.data?.items.length ? <div className="border-t border-border-custom">{list.data.items.map(b => <Link to={`/app/bookings/${b.id}`} key={b.id} className="block border-b border-border-custom py-4 hover:bg-surface"><div className="flex flex-wrap justify-between gap-2"><b className="font-semibold">{b.pet?.name || `Pet #${b.petId}`} · {firstService(b)}</b><span className="text-sm text-plum-noir">{bookingLabel[b.status]}</span></div><p className="text-sm text-text-secondary mt-1 flex flex-wrap items-center gap-x-3 gap-y-1"><span className="inline-flex items-center gap-1"><CalendarDays aria-hidden="true" size={15} />{dateTime(b.bookingDate)}</span><span>{b.status === 'COMPLETED' ? 'Giá cuối' : 'Giá tạm tính'} {money(bookingPrice(b))}</span></p></Link>)}</div> : <Empty>Chưa có lịch hẹn.</Empty>}<Pager page={page} setPage={setPage} data={list.data} /></QueryState></>;
}

export function CustomerBookingDetail() {
  const { bookingId = '' } = useParams();
  const booking = useQuery({ queryKey: ['bookings', bookingId], queryFn: ({ signal }) => api.bookings.get(bookingId, signal), enabled: !!bookingId });
  const b = booking.data;
  return <><Back to="/app/bookings" /><Title>Chi tiết lịch hẹn</Title><QueryState loading={booking.isLoading} error={booking.error} retry={() => void booking.refetch()}>{b && <div className="max-w-2xl"><div className="flex flex-wrap justify-between gap-3 border-b border-border-custom pb-4 mb-3"><div><p className="text-sm text-text-secondary">Lịch hẹn #{b.id}</p><h2 className="font-serif text-xl font-semibold mt-1">{b.pet?.name || b.petId} · {firstService(b)}</h2></div><span className="text-sm font-semibold text-plum-noir">{bookingLabel[b.status]}</span></div><dl className="text-sm">{[['Ngày giờ', dateTime(b.bookingDate)], ['Ghi chú', b.note || '—'], ['Giá tạm tính', money(b.estimatedTotal)]].map(([label, value]) => <div key={label} className="grid grid-cols-[120px_1fr] gap-3 border-b border-border-custom py-3"><dt className="text-text-secondary">{label}</dt><dd className="min-w-0 break-words">{value}</dd></div>)}</dl>{b.status === 'COMPLETED' && <section className="border-b border-border-custom py-5 space-y-2 text-sm"><h2 className="font-serif font-semibold text-lg">Tóm tắt thanh toán</h2>{b.surcharges?.map(s => <p key={s.id}>{s.surchargeName}: +{money(s.amount)}</p>)}<p>Giảm giá: −{money(b.discountAmount)}</p><p className="font-semibold">Giá cuối: {money(b.finalTotal)}</p></section>}{b.status === 'CANCELLED' && b.cancellationReason && <p className="py-4 text-sm"><b>Lý do hủy:</b> {b.cancellationReason}</p>}</div>}</QueryState></>;
}
