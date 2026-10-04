import {useState, type FormEvent} from 'react';
import {Link, useNavigate, useParams, useSearchParams} from 'react-router-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {api} from '../../api/endpoints';
import {ApiError} from '../../api/client';
import type {BookingStatus} from '../../api/types';
import {
    Back,
    Button,
    Card,
    Empty,
    Input,
    Notice,
    Pager,
    QueryState,
    Select,
    TextArea,
    Title,
    bookingLabel,
    dateTime,
    firstService,
    money
} from '../../app/ui';

export function AdminDashboard() {
    const dashboard = useQuery({queryKey: ['admin', 'dashboard'], queryFn: ({signal}) => api.admin.dashboard(signal)});
    const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Ho_Chi_Minh',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(new Date()).map(part => [part.type, part.value]));
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    return <><Title>Tổng quan cửa hàng</Title><QueryState loading={dashboard.isLoading} error={dashboard.error}
                                                          retry={() => void dashboard.refetch()}>
        <div className="grid md:grid-cols-3 gap-4">{dashboard.data && <><Link to="/admin/bookings?status=PENDING"><Card><b>Chờ
            duyệt</b><p className="text-3xl mt-2">{dashboard.data.pending}</p></Card></Link><Link
            to={`/admin/bookings?status=CONFIRMED&date=${today}`}><Card><b>Đã xác nhận hôm nay</b><p
            className="text-3xl mt-2">{dashboard.data.confirmedToday}</p></Card></Link><Link
            to="/admin/reminders"><Card><b>Cần nhắc chăm sóc</b><p
            className="text-3xl mt-2">{dashboard.data.remindersDue}</p></Card></Link></>}</div>
    </QueryState></>;
}

export function AdminBookings() {
    const [params, setParams] = useSearchParams();
    const [page, setPage] = useState(1);
    const rawStatus = params.get('status');
    const status = rawStatus && ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(rawStatus) ? rawStatus as BookingStatus : undefined;
    const date = params.get('date') || '';
    const list = useQuery({
        queryKey: ['admin', 'bookings', status, date, page],
        queryFn: ({signal}) => api.admin.bookings({status, date: date || undefined, page}, signal)
    });
    return <><Title>Lịch hẹn</Title>
        <div className="flex flex-wrap gap-3 items-end mb-5"><Select label="Trạng thái" value={status || ''} options={[{
            value: '',
            label: 'Tất cả'
        }, ...Object.entries(bookingLabel).map(([value, label]) => ({value, label}))]} onChange={e => {
            setParams({...(e.target.value ? {status: e.target.value} : {}), ...(date ? {date} : {})});
            setPage(1);
        }}/><Input label="Ngày hẹn (Việt Nam)" type="date" value={date} onChange={e => {
            setParams({...(status ? {status} : {}), ...(e.target.value ? {date: e.target.value} : {})});
            setPage(1);
        }}/></div>
        <QueryState loading={list.isLoading} error={list.error}
                    retry={() => void list.refetch()}>{list.data?.items.length ?
            <div className="space-y-3">{list.data.items.map(b => <Link key={b.id} to={`/admin/bookings/${b.id}`}
                                                                       className="block"><Card>
                <div className="flex flex-wrap justify-between gap-2">
                    <b>#{b.id} · {b.customer?.fullName || b.customerId} · {b.pet?.name || b.petId}</b><span>{bookingLabel[b.status]}</span>
                </div>
                <p className="text-sm text-text-secondary">{firstService(b)} · {dateTime(b.bookingDate)} · {money(b.estimatedTotal)}</p>
            </Card></Link>)}</div> : <Empty>Không có lịch hẹn phù hợp.</Empty>}<Pager page={page} setPage={setPage}
                                                                                      data={list.data}/></QueryState></>;
}

type SurchargeDraft = { name: string; amount: string; note: string };

function CompleteForm({bookingId, base, serviceId, done}: {
    bookingId: string;
    base: number;
    serviceId: string;
    done: () => Promise<void>
}) {
    const [lines, setLines] = useState<SurchargeDraft[]>([]);
    const [discount, setDiscount] = useState('0');
    const [error, setError] = useState<unknown>();
    const [pending, setPending] = useState(false);
    const config = useQuery({
        queryKey: ['admin', 'services', serviceId, 'reminder-config'],
        queryFn: ({signal}) => api.admin.reminderConfig(serviceId, signal),
        enabled: !!serviceId
    });
    const totalSurcharge = lines.reduce((sum, line) => sum + (Number(line.amount) || 0), 0);
    const final = base + totalSurcharge - Number(discount || 0);
    const valid = !config.isLoading && !!config.data && lines.length <= 50 && lines.every(l => l.name.trim().length > 0 && l.name.trim().length <= 100 && Number.isInteger(Number(l.amount)) && Number(l.amount) > 0 && Number(l.amount) <= 9999999999 && l.note.length <= 255) && Number.isInteger(Number(discount)) && Number(discount) >= 0 && final >= 0 && base + totalSurcharge <= 9999999999;
    const submit = async (e: FormEvent) => {
        e.preventDefault();
        if (!window.confirm(`Chốt hoàn thành với giá cuối ${money(final)}?`)) return;
        setError(undefined);
        setPending(true);
        try {
            await api.admin.complete(bookingId, {
                surcharges: lines.map(l => ({
                    name: l.name.trim(),
                    amount: Number(l.amount), ...(l.note ? {note: l.note} : {})
                })), discount: Number(discount)
            });
            await done();
        } catch (e) {
            setError(e);
            if (e instanceof ApiError && (e.status === 409 || e.status === 0 || e.status >= 500 || e.code === 'INVALID_RESPONSE')) await done();
        } finally {
            setPending(false);
        }
    };
    return <Card className="mt-5"><h2 className="text-xl font-bold mb-3">Chốt giá và hoàn thành</h2><Notice
        error={error}/>{config.error && <Notice error={config.error}/>}{!config.isLoading && !config.data &&
        <p className="text-red-700 mb-3">Dịch vụ chưa có chu kỳ nhắc ACTIVE. <Link className="underline"
                                                                                   to="/admin/services">Cấu hình dịch
            vụ</Link> trước khi hoàn thành.</p>}
        <form onSubmit={submit} className="space-y-3"><p>Giá gốc đã lưu: <b>{money(base)}</b>
        </p>{lines.map((line, index) => <div key={index}
                                             className="grid md:grid-cols-3 gap-2 border-t border-border-custom pt-3">
            <Input label="Tên phụ phí" maxLength={100} required value={line.name}
                   onChange={e => setLines(lines.map((v, i) => i === index ? {...v, name: e.target.value} : v))}/><Input
            label="Số tiền VND" type="number" min={1} max={9999999999} step={1} required value={line.amount}
            onChange={e => setLines(lines.map((v, i) => i === index ? {...v, amount: e.target.value} : v))}/>
            <div><Input label="Ghi chú" maxLength={255} value={line.note}
                        onChange={e => setLines(lines.map((v, i) => i === index ? {...v, note: e.target.value} : v))}/>
                <button type="button" className="underline text-sm"
                        onClick={() => setLines(lines.filter((_, i) => i !== index))}>Bỏ dòng
                </button>
            </div>
        </div>)}<Button variant="secondary" disabled={lines.length >= 50}
                        onClick={() => setLines([...lines, {name: '', amount: '', note: ''}])}>Thêm phụ
            phí</Button><Input label="Giảm giá (VND)" type="number" min={0} max={9999999999} step={1} required
                               value={discount} onChange={e => setDiscount(e.target.value)}/><p
            className="font-bold">Giá cuối dự kiến: {money(final)}</p>{final < 0 &&
            <p className="text-red-700 text-sm">Giảm giá vượt quá tổng tiền.</p>}<Button type="submit"
                                                                                         disabled={pending || !valid}>{pending ? 'Đang chốt…' : 'Chốt hoàn thành'}</Button>
        </form>
    </Card>;
}

export function AdminBookingDetail() {
    const {bookingId = ''} = useParams();
    const client = useQueryClient();
    const navigate = useNavigate();
    const [error, setError] = useState<unknown>();
    const [pending, setPending] = useState(false);
    const [reason, setReason] = useState('');
    const [cancelling, setCancelling] = useState(false);
    const booking = useQuery({
        queryKey: ['admin', 'booking', bookingId],
        queryFn: ({signal}) => api.admin.booking(bookingId, signal),
        enabled: !!bookingId
    });
    const reload = async () => {
        await client.invalidateQueries({queryKey: ['admin', 'booking', bookingId]});
        await client.invalidateQueries({queryKey: ['admin', 'bookings']});
        await client.invalidateQueries({queryKey: ['admin', 'dashboard']});
        await client.invalidateQueries({queryKey: ['admin', 'reminders']});
        await client.invalidateQueries({queryKey: ['admin', 'customers']});
        await client.invalidateQueries({queryKey: ['admin', 'customer']});
    };
    const action = async (task: () => Promise<unknown>) => {
        setPending(true);
        setError(undefined);
        try {
            await task();
            await reload();
        } catch (e) {
            setError(e);
            if (e instanceof ApiError && (e.status === 409 || e.status === 0 || e.status >= 500 || e.code === 'INVALID_RESPONSE')) await reload();
        } finally {
            setPending(false);
        }
    };
    const b = booking.data;
    return <><Back to="/admin/bookings"/><Title>Booking #{bookingId}</Title><QueryState loading={booking.isLoading}
                                                                                        error={booking.error}
                                                                                        retry={() => void booking.refetch()}>{b && <>
        <Card className="max-w-2xl space-y-2"><Notice error={error}/><p><b>Trạng thái:</b> {bookingLabel[b.status]}</p>
            <p><b>Khách:</b> {b.customer?.fullName || b.customerId} {b.customer?.phone && `· ${b.customer.phone}`}</p>
            <p><b>Pet:</b> {b.pet?.name || b.petId}</p><p><b>Dịch vụ:</b> {firstService(b)}</p><p><b>Lúc
                hẹn:</b> {dateTime(b.bookingDate)}</p><p><b>Ghi chú:</b> {b.note || '—'}</p><p><b>Giá
                snapshot:</b> {money(b.services?.[0]?.basePrice ?? b.estimatedTotal)}</p><p><b>Cân nặng
                snapshot:</b> {b.services?.[0]?.petWeightSnapshot || '—'} kg</p>{b.status === 'COMPLETED' &&
                <div className="border-t border-border-custom pt-3"><p><b>Phụ phí:</b></p>{b.surcharges?.map(s => <p
                    key={s.id}>{s.surchargeName}: {money(s.amount)}</p>)}<p>Giảm giá: {money(b.discountAmount)}</p><p>
                    <b>Giá cuối: {money(b.finalTotal)}</b></p><p>Hoàn thành: {dateTime(b.completedAt)}</p>
                </div>}{b.status === 'CANCELLED' &&
                <p>Lý do hủy: {b.cancellationReason || '—'}</p>}{b.status === 'PENDING' &&
                <Button disabled={pending} onClick={() => {
                    if (window.confirm('Xác nhận lịch hẹn?')) void action(() => api.admin.confirm(bookingId));
                }}>Xác nhận lịch</Button>}{(b.status === 'PENDING' || b.status === 'CONFIRMED') &&
                <div className="pt-3">{cancelling ? <form onSubmit={e => {
                        e.preventDefault();
                        if (window.confirm('Hủy lịch hẹn này?')) void action(async () => {
                            await api.admin.cancel(bookingId, reason || undefined);
                            setCancelling(false);
                        });
                    }} className="space-y-2"><TextArea label="Lý do hủy (tùy chọn)" maxLength={255} value={reason}
                                                       onChange={e => setReason(e.target.value)}/><Button type="submit"
                                                                                                          variant="danger"
                                                                                                          disabled={pending}>Xác
                        nhận hủy</Button></form> :
                    <Button variant="danger" onClick={() => setCancelling(true)}>Hủy lịch</Button>}</div>}
        </Card>{b.status === 'CONFIRMED' && b.services?.[0] &&
        <div className="max-w-2xl"><CompleteForm bookingId={bookingId} base={b.services[0].basePrice}
                                                 serviceId={b.services[0].serviceId} done={async () => {
            await reload();
            navigate(`/admin/bookings/${bookingId}`, {replace: true});
        }}/></div>}</>}</QueryState></>;
}
