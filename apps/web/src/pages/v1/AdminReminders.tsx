import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { Reminder } from '../../api/types';
import { Back, Button, Card, Empty, Notice, Pager, QueryState, Select, TextArea, Title, dateOnly, dateTime } from '../../app/ui';

function overdueDays(value: string) {
  const localDay = (date: Date) => { const parts = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date).map(p => [p.type, p.value])); return `${parts.year}-${parts.month}-${parts.day}`; };
  const day = localDay(new Date(value));
  const today = localDay(new Date());
  return Math.max(0, Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${day}T00:00:00Z`)) / 86400000));
}
function ReminderCard({ item }: { item: Reminder }) { return <Card><div className="flex flex-wrap justify-between gap-2"><b>{item.customer?.fullName || item.customerId} · {item.customer?.phone || ''}</b><span>{item.status}</span></div><p>{item.pet?.name || item.petId} · {item.service?.serviceName || item.serviceId}</p><p className="text-sm text-text-secondary">Hoàn thành {dateOnly(item.completedDate)} · Cần nhắc {dateOnly(item.reminderDate)} · Quá hạn {overdueDays(item.reminderDate)} ngày</p></Card>; }

export function AdminReminders() {
  const [page, setPage] = useState(1); const [due, setDue] = useState(true);
  const list = useQuery({ queryKey: ['admin', 'reminders', due, page], queryFn: ({ signal }) => api.admin.reminders(due, page, signal) });
  return <><Title>Cần nhắc chăm sóc</Title><div className="flex gap-2 mb-5"><Button variant={due ? 'primary' : 'secondary'} onClick={() => { setDue(true); setPage(1); }}>Đến hạn chưa xử lý</Button><Button variant={!due ? 'primary' : 'secondary'} onClick={() => { setDue(false); setPage(1); }}>Tất cả</Button></div><QueryState loading={list.isLoading} error={list.error} retry={() => void list.refetch()}>{list.data?.items.length ? <div className="space-y-3">{list.data.items.map(item => <Link key={item.id} to={`/admin/reminders/${item.id}`} className="block"><ReminderCard item={item} /></Link>)}</div> : <Empty>{due ? 'Không có khách cần nhắc.' : 'Chưa có reminder.'}</Empty>}<Pager page={page} setPage={setPage} data={list.data} /></QueryState></>;
}

export function AdminReminderDetail() {
  const { reminderId = '' } = useParams(); const client = useQueryClient(); const navigate = useNavigate();
  const [method, setMethod] = useState<'PHONE' | 'ZALO' | 'OTHER'>('PHONE'); const [note, setNote] = useState(''); const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  const detail = useQuery({ queryKey: ['admin', 'reminder', reminderId], queryFn: ({ signal }) => api.admin.reminder(reminderId, signal), enabled: !!reminderId });
  const contact = async (event: FormEvent) => { event.preventDefault(); if (!window.confirm('Bạn đã liên hệ thực tế với khách hàng?')) return; setPending(true); setError(undefined); try { await api.admin.contact(reminderId, { method, ...(note.trim() ? { note: note.trim() } : {}) }); await client.invalidateQueries({ queryKey: ['admin', 'reminders'] }); await client.invalidateQueries({ queryKey: ['admin', 'reminder', reminderId] }); await client.invalidateQueries({ queryKey: ['admin', 'dashboard'] }); await client.invalidateQueries({ queryKey: ['admin', 'customers'] }); await client.invalidateQueries({ queryKey: ['admin', 'customer'] }); navigate('/admin/reminders'); } catch (e) { setError(e); if (e instanceof ApiError && e.status === 409) await detail.refetch(); } finally { setPending(false); } };
  const r = detail.data;
  return <><Back to="/admin/reminders" /><Title>Nhắc chăm sóc #{reminderId}</Title><QueryState loading={detail.isLoading} error={detail.error} retry={() => void detail.refetch()}>{r && <div className="grid md:grid-cols-2 gap-5"><Card className="space-y-2"><Notice error={error} /><p><b>Trạng thái:</b> {r.status}</p><p><b>Khách:</b> {r.customer?.fullName || r.customerId} · {r.customer?.phone}</p><p><b>Thú cưng:</b> {r.pet?.name}</p><p><b>Dịch vụ:</b> {r.service?.serviceName}</p><p><b>Hoàn thành:</b> {dateTime(r.completedDate)}</p><p><b>Ngày cần nhắc:</b> {dateOnly(r.reminderDate)}</p><p><b>Booking nguồn:</b> <Link className="underline" to={`/admin/bookings/${r.bookingId}`}>#{r.bookingId}</Link></p><p><b>Giá gốc:</b> {r.booking?.services?.[0]?.basePrice ?? '—'} VND</p>{r.booking?.surcharges?.map(s => <p key={s.id}>Phụ phí {s.surchargeName}: {s.amount} VND</p>)}<p><b>Ghi chú:</b> {r.note || '—'}</p></Card><div className="space-y-5"><Card><h2 className="text-xl font-bold mb-3">Lịch sử liên quan</h2>{r.pet?.activities?.length ? r.pet.activities.map(a => <p key={a.id} className="border-t border-border-custom py-2 text-sm">{dateTime(a.createdAt)} · {a.type} · {a.content || '—'}</p>) : <p>Chưa có hoạt động.</p>}</Card>{(r.status === 'PENDING' || r.status === 'DUE') && <Card><h2 className="text-xl font-bold mb-3">Ghi nhận đã liên hệ</h2><form onSubmit={contact} className="space-y-3"><Select label="Phương thức" value={method} onChange={e => setMethod(e.target.value as 'PHONE' | 'ZALO' | 'OTHER')} options={[{ value: 'PHONE', label: 'Gọi điện' }, { value: 'ZALO', label: 'Zalo' }, { value: 'OTHER', label: 'Khác' }]} /><TextArea label="Ghi chú (tùy chọn)" value={note} onChange={e => setNote(e.target.value)} /><Button type="submit" disabled={pending}>{pending ? 'Đang lưu…' : 'Đã liên hệ'}</Button></form></Card>}</div></div>}</QueryState></>;
}
