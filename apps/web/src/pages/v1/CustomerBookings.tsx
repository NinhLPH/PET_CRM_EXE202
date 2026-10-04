import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { BookingInput } from '../../api/types';
import { clearPendingBooking, readPendingBooking, writePendingBooking, type PendingBooking } from '../../app/pendingBooking';
import { Back, Button, Card, Empty, Input, Notice, Pager, QueryState, Select, TextArea, Title, bookingLabel, bookingPrice, dateTime, firstService, money, vietnameseBookingDate } from '../../app/ui';

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
  return <><Title>Đặt lịch grooming</Title><p className="text-text-secondary mb-5">Chọn một thú cưng, một dịch vụ và thời gian mong muốn. Cửa hàng sẽ duyệt yêu cầu.</p><Card className="max-w-2xl"><Notice error={error} />{pendingBooking && <div className="bg-yellow-50 p-4 rounded-lg mb-4"><p>Yêu cầu trước chưa có kết quả xác nhận: pet #{pendingBooking.body.petId}, dịch vụ #{pendingBooking.body.serviceId}, lúc {dateTime(pendingBooking.body.bookingDate)}. Thử lại dùng cùng mã gửi; bạn cũng có thể xem danh sách lịch hẹn trước.</p><Link className="underline" to="/app/bookings">Xem lịch hẹn</Link></div>}{priceChange && <div className="bg-yellow-50 p-4 rounded-lg mb-4"><p>Giá mới: <b>{money(priceChange.basePrice)}</b>. Vui lòng xác nhận lại trước khi đặt.</p><Button variant="secondary" onClick={confirmPrice}>Tôi đã xem giá mới</Button></div>}<form onSubmit={submit} className="space-y-5">{pets.error && <Notice error={pets.error} />}{services.error && <Notice error={services.error} />}{petDetail.error && <Notice error={petDetail.error} />}<Select label="1. Thú cưng" value={petId} disabled={!!pendingBooking} onChange={e => setPet(e.target.value)} options={[{ value: '', label: 'Chọn thú cưng' }, ...(pets.data?.items.map(p => ({ value: p.id, label: `${p.name} · ${p.weight} kg` })) ?? []), ...(petDetail.data && !pets.data?.items.some(p => p.id === petDetail.data?.id) ? [{ value: petDetail.data.id, label: `${petDetail.data.name} · ${petDetail.data.weight} kg` }] : [])]} />{pets.data?.total === 0 && <p className="text-sm">Chưa có thú cưng. <Link className="underline" to="/app/pets">Thêm thú cưng</Link> rồi quay lại.</p>}<Pager page={pagePets} setPage={setPagePets} data={pets.data} /><Select label="2. Dịch vụ" value={serviceId} disabled={!!pendingBooking} onChange={e => setService(e.target.value)} options={[{ value: '', label: 'Chọn dịch vụ' }, ...(services.data?.items.map(s => ({ value: s.id, label: s.serviceName })) ?? [])]} /><Pager page={pageServices} setPage={setPageServices} data={services.data} />{petDetail.isLoading || quote.isLoading ? <p>Đang lấy giá…</p> : quote.error ? <Notice error={quote.error} /> : quote.data ? <div className="bg-plum-pale p-4 rounded-lg"><b>Giá tạm tính: {money(priceChange?.basePrice ?? quote.data.basePrice)}</b><p className="text-sm">Giá cuối có thể thay đổi khi hoàn thành dịch vụ.</p></div> : null}<Input label="3. Ngày giờ (giờ Việt Nam)" type="datetime-local" required value={dateLocal} disabled={!!pendingBooking} onChange={e => setDateLocal(e.target.value)} /><TextArea label="Ghi chú (tùy chọn)" value={note} disabled={!!pendingBooking} onChange={e => setNote(e.target.value)} /><Button type="submit" disabled={pending || (!pendingBooking && (!quote.data || !!quote.error || (!!priceChange && !priceAccepted)))}>{pending ? 'Đang gửi…' : pendingBooking ? 'Thử lại yêu cầu trước' : 'Xác nhận đặt lịch'}</Button></form></Card></>;
}

export function CustomerBookings() {
  const [page, setPage] = useState(1);
  const list = useQuery({ queryKey: ['bookings', 'mine', page, 20], queryFn: ({ signal }) => api.bookings.mine(page, 20, signal) });
  return <><Title>Lịch hẹn và lịch sử</Title><QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()}>{list.data?.items.length ? <div className="space-y-3">{list.data.items.map(b => <Link to={`/app/bookings/${b.id}`} key={b.id} className="block"><Card><div className="flex flex-wrap justify-between gap-2"><b>{b.pet?.name || `Pet #${b.petId}`} · {firstService(b)}</b><span>{bookingLabel[b.status]}</span></div><p className="text-sm text-text-secondary">{dateTime(b.bookingDate)} · {b.status === 'COMPLETED' ? 'Giá cuối' : 'Giá tạm tính'} {money(bookingPrice(b))}</p></Card></Link>)}</div> : <Empty>Chưa có lịch hẹn.</Empty>}<Pager page={page} setPage={setPage} data={list.data} /></QueryState></>;
}

export function CustomerBookingDetail() {
  const { bookingId = '' } = useParams();
  const booking = useQuery({ queryKey: ['bookings', bookingId], queryFn: ({ signal }) => api.bookings.get(bookingId, signal), enabled: !!bookingId });
  const b = booking.data;
  return <><Back to="/app/bookings" /><Title>Chi tiết lịch hẹn</Title><QueryState loading={booking.isLoading} error={booking.error} retry={() => void booking.refetch()}>{b && <Card className="max-w-2xl space-y-3"><p><b>Mã:</b> {b.id}</p><p><b>Trạng thái:</b> {bookingLabel[b.status]}</p><p><b>Thú cưng:</b> {b.pet?.name || b.petId}</p><p><b>Dịch vụ:</b> {firstService(b)}</p><p><b>Ngày giờ:</b> {dateTime(b.bookingDate)}</p><p><b>Ghi chú:</b> {b.note || '—'}</p><p><b>Giá tạm tính:</b> {money(b.estimatedTotal)}</p>{b.status === 'COMPLETED' && <div className="border-t border-border-custom pt-3 space-y-2"><h2 className="font-bold text-lg">Tóm tắt thanh toán</h2>{b.surcharges?.map(s => <p key={s.id}>{s.surchargeName}: +{money(s.amount)}</p>)}<p>Giảm giá: −{money(b.discountAmount)}</p><p className="font-bold">Giá cuối: {money(b.finalTotal)}</p></div>}{b.status === 'CANCELLED' && b.cancellationReason && <p><b>Lý do hủy:</b> {b.cancellationReason}</p>}</Card>}</QueryState></>;
}
