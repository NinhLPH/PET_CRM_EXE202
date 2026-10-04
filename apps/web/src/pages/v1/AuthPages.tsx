import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/endpoints';
import { useAuth } from '../../app/authContext';
import { Button, Card, Input, Notice, QueryState, Title, fieldError } from '../../app/ui';

export function PublicPage() {
  const services = useQuery({ queryKey: ['services', 1], queryFn: ({ signal }) => api.services.list(1, 20, signal) });
  return <div className="min-h-screen bg-canvas"><header className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center"><Link to="/" className="font-serif text-3xl font-bold text-plum-noir">PetCare CRM</Link><div className="flex gap-4"><Link className="underline" to="/login">Đăng nhập</Link><Link className="underline" to="/register">Đăng ký</Link></div></header><main className="max-w-6xl mx-auto px-4 py-12"><div className="grid md:grid-cols-2 gap-8 items-center"><div><h1 className="text-4xl font-bold mb-4">Chăm sóc và đặt lịch grooming cho thú cưng</h1><p className="text-text-secondary mb-6">Tạo hồ sơ cho bé, xem giá tạm tính theo cân nặng và gửi yêu cầu đặt lịch. Cửa hàng sẽ xác nhận lịch sau.</p><Link to="/register" className="inline-block bg-plum-noir text-white rounded-lg px-5 py-3">Bắt đầu</Link></div><Card><h2 className="text-xl font-bold mb-4">Dịch vụ đang mở bán</h2><QueryState loading={services.isLoading} error={services.error} retry={() => void services.refetch()}>{services.data?.items.length ? services.data.items.map(s => <div key={s.id} className="border-t border-border-custom py-3"><b>{s.serviceName}</b><p className="text-sm text-text-secondary">{s.description || 'Giá được báo theo thú cưng và cân nặng.'}</p></div>) : <p>Chưa có dịch vụ đang mở bán.</p>}</QueryState></Card></div></main></div>;
}

export function LoginPage() {
  const { state, login } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  if (state.status === 'authenticated') return <div className="p-10"><Button onClick={() => navigate(state.role === 'ADMIN' ? '/admin' : '/app')}>Vào ứng dụng</Button></div>;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); setPending(true); try { const role = await login(phone, password); const target = params.get('returnTo'); navigate(target?.startsWith(role === 'ADMIN' ? '/admin' : '/app') ? target : role === 'ADMIN' ? '/admin' : '/app', { replace: true }); } catch (e) { setError(e); } finally { setPending(false); } };
  return <div className="min-h-screen bg-canvas grid place-items-center p-4"><Card className="w-full max-w-md"><Title>Đăng nhập</Title><Notice error={error} success={params.get('registered') ? 'Đăng ký thành công. Vui lòng đăng nhập.' : undefined} /><form onSubmit={submit} className="space-y-4"><Input label="Số điện thoại" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required pattern="0[0-9]{9}" error={fieldError(error, 'phone')} /><Input label="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} required error={fieldError(error, 'password')} /><Button type="submit" disabled={pending}>{pending ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button></form><p className="text-sm mt-5">Chưa có tài khoản? <Link className="underline" to="/register">Đăng ký</Link></p></Card></div>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); if (form.password.length < 8 || form.password !== form.confirmPassword) { setError(new Error('Mật khẩu cần ít nhất 8 ký tự và phần nhập lại phải khớp.')); return; } setPending(true); try { await api.auth.register(form); navigate('/login?registered=1', { replace: true }); } catch (e) { setError(e); } finally { setPending(false); } };
  return <div className="min-h-screen bg-canvas grid place-items-center p-4"><Card className="w-full max-w-md"><Title>Đăng ký</Title><Notice error={error} /><form onSubmit={submit} className="space-y-4"><Input label="Họ tên" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required maxLength={100} error={fieldError(error, 'fullName')} /><Input label="Số điện thoại" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required pattern="0[0-9]{9}" error={fieldError(error, 'phone')} /><Input label="Mật khẩu" type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required error={fieldError(error, 'password')} /><Input label="Nhập lại mật khẩu" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required error={fieldError(error, 'confirmPassword')} /><Button type="submit" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo tài khoản'}</Button></form><p className="text-sm mt-5">Đã có tài khoản? <Link className="underline" to="/login">Đăng nhập</Link></p></Card></div>;
}
