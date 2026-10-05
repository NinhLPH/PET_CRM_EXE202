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
        <div className="grid sm:grid-cols-3 border border-border-custom rounded-panel bg-surface divide-y sm:divide-y-0 sm:divide-x divide-border-custom">{dashboard.data && <><Link className="block p-4 sm:p-5 hover:bg-muted-surface" to="/admin/bookings?status=PENDING"><span className="block text-sm text-text-secondary">Chờ duyệt</span><strong className="block text-2xl font-semibold mt-1 tabular-nums">{dashboard.data.pending}</strong></Link><Link className="block p-4 sm:p-5 hover:bg-muted-surface" to={`/admin/bookings?status=CONFIRMED&date=${today}`}><span className="block text-sm text-text-secondary">Đã xác nhận hôm nay</span><strong className="block text-2xl font-semibold mt-1 tabular-nums">{dashboard.data.confirmedToday}</strong></Link><Link className="block p-4 sm:p-5 hover:bg-muted-surface" to="/admin/reminders"><span className="block text-sm text-text-secondary">Cần nhắc chăm sóc</span><strong className="block text-2xl font-semibold mt-1 tabular-nums">{dashboard.data.remindersDue}</strong></Link></>}</div>
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
            <div className="border border-border-custom rounded-panel bg-surface overflow-hidden"><table className="w-full text-sm"><thead className="hidden md:table-header-group bg-muted-surface/60 text-left text-text-secondary"><tr><th className="px-4 py-3 font-medium">Lịch hẹn</th><th className="px-4 py-3 font-medium">Khách / thú cưng</th><th className="px-4 py-3 font-medium">Dịch vụ</th><th className="px-4 py-3 font-medium">Trạng thái</th><th className="px-4 py-3 font-medium text-right">Giá tạm tính</th></tr></thead><tbody className="divide-y divide-border-custom">{list.data.items.map(b => <tr key={b.id} className="block md:table-row p-4 md:p-0 hover:bg-canvas"><td className="block md:table-cell md:px-4 md:py-3"><Link to={`/admin/bookings/${b.id}`} className="font-semibold text-plum-noir underline underline-offset-4">#{b.id}</Link><span className="block text-text-secondary mt-1">{dateTime(b.bookingDate)}</span></td><td className="block md:table-cell md:px-4 md:py-3 mt-1 md:mt-0">{b.customer?.fullName || b.customerId}<span className="block text-text-secondary">{b.pet?.name || b.petId}</span></td><td className="block md:table-cell md:px-4 md:py-3 mt-1 md:mt-0">{firstService(b)}</td><td className="block md:table-cell md:px-4 md:py-3 mt-1 md:mt-0 text-plum-noir">{bookingLabel[b.status]}</td><td className="block md:table-cell md:px-4 md:py-3 mt-1 md:mt-0 md:text-right tabular-nums">{money(b.estimatedTotal)}</td></tr>)}</tbody></table></div> : <Empty>Không có lịch hẹn phù hợp.</Empty>}<Pager page={page} setPage={setPage}
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
    return <><Back to="/admin/bookings"/><Title>Lịch hẹn #{bookingId}</Title><QueryState loading={booking.isLoading} error={booking.error} retry={() => void booking.refetch()}>{b && <div className="max-w-4xl"><Notice error={error}/><div className="grid lg:grid-cols-[minmax(0,1fr)_260px] gap-6 items-start"><section className="border-t border-border-custom"><h2 className="font-serif text-lg font-semibold py-4">Thông tin lịch hẹn</h2><div className="space-y-0 text-sm"><p className="border-t border-border-custom py-3"><b>Trạng thái:</b> {bookingLabel[b.status]}</p><p className="border-t border-border-custom py-3"><b>Khách:</b> {b.customer?.fullName || b.customerId} {b.customer?.phone && `· ${b.customer.phone}`}</p><p className="border-t border-border-custom py-3"><b>Thú cưng:</b> {b.pet?.name || b.petId}</p><p className="border-t border-border-custom py-3"><b>Dịch vụ:</b> {firstService(b)}</p><p className="border-t border-border-custom py-3"><b>Lúc hẹn:</b> {dateTime(b.bookingDate)}</p><p className="border-t border-border-custom py-3"><b>Ghi chú:</b> {b.note || '—'}</p><p className="border-t border-border-custom py-3"><b>Giá lúc đặt:</b> {money(b.services?.[0]?.basePrice ?? b.estimatedTotal)}</p><p className="border-y border-border-custom py-3"><b>Cân nặng lúc đặt:</b> {b.services?.[0]?.petWeightSnapshot || '—'} kg</p></div>{b.status === 'COMPLETED' && <div className="border-b border-border-custom py-5 text-sm space-y-2"><h2 className="font-serif text-lg font-semibold">Tổng kết thanh toán</h2><p><b>Phụ phí:</b></p>{b.surcharges?.map(s => <p key={s.id}>{s.surchargeName}: {money(s.amount)}</p>)}<p>Giảm giá: {money(b.discountAmount)}</p><p><b>Giá cuối: {money(b.finalTotal)}</b></p><p>Hoàn thành: {dateTime(b.completedAt)}</p></div>}{b.status === 'CANCELLED' && <p className="border-b border-border-custom py-4 text-sm">Lý do hủy: {b.cancellationReason || '—'}</p>}</section><aside className="border border-border-custom rounded-panel bg-surface p-4"><h2 className="font-serif text-lg font-semibold mb-4">Thao tác</h2><div className="space-y-3">{b.status === 'PENDING' && <Button disabled={pending} onClick={() => { if (window.confirm('Xác nhận lịch hẹn?')) void action(() => api.admin.confirm(bookingId)); }}>Xác nhận lịch</Button>}{(b.status === 'PENDING' || b.status === 'CONFIRMED') && (cancelling ? <form onSubmit={e => { e.preventDefault(); if (window.confirm('Hủy lịch hẹn này?')) void action(async () => { await api.admin.cancel(bookingId, reason || undefined); setCancelling(false); }); }} className="space-y-2"><TextArea label="Lý do hủy (tùy chọn)" maxLength={255} value={reason} onChange={e => setReason(e.target.value)}/><Button type="submit" variant="danger" disabled={pending}>Xác nhận hủy</Button></form> : <Button variant="danger" onClick={() => setCancelling(true)}>Hủy lịch</Button>)}{b.status !== 'PENDING' && b.status !== 'CONFIRMED' && <p className="text-sm text-text-secondary">Không có thao tác cần thực hiện.</p>}</div></aside></div>{b.status === 'CONFIRMED' && b.services?.[0] && <div className="max-w-2xl mt-6"><CompleteForm bookingId={bookingId} base={b.services[0].basePrice} serviceId={b.services[0].serviceId} done={async () => { await reload(); navigate(`/admin/bookings/${bookingId}`, {replace: true}); }}/></div>}</div>}</QueryState></>;
}
