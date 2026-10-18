import { useState, type FormEvent, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { PawPrint } from 'lucide-react';
import { api } from '../../api/endpoints';
import { useAuth } from '../../app/authContext';
import { Button, Input, Notice, Title, fieldError } from '../../app/ui';

function Brand() { return <Link to="/" className="inline-flex items-center gap-2 text-plum-noir"><PawPrint aria-hidden="true" size={24} strokeWidth={1.7} /><span className="font-serif text-2xl font-semibold">TailUp</span></Link>; }

function AuthShell({ children }: { children: ReactNode }) { return <div className="min-h-dvh bg-canvas"><header className="mx-auto max-w-6xl px-4 sm:px-6 py-5"><Brand /></header><main className="mx-auto max-w-[440px] px-4 sm:px-0 py-8 sm:py-14"><div className="bg-surface border border-border-custom rounded-panel p-5 sm:p-7">{children}</div></main></div>; }

export function LoginPage() {
  const { state, login } = useAuth(); const navigate = useNavigate(); const [params] = useSearchParams();
  const [phone, setPhone] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  if (state.status === 'authenticated') return <AuthShell><Button onClick={() => navigate(state.role === 'ADMIN' ? '/admin' : '/app')}>Vào ứng dụng</Button></AuthShell>;
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); setPending(true); try { const role = await login(phone, password); const target = params.get('returnTo'); navigate(target?.startsWith(role === 'ADMIN' ? '/admin' : '/app') ? target : role === 'ADMIN' ? '/admin' : '/app', { replace: true }); } catch (e) { setError(e); } finally { setPending(false); } };
  return <AuthShell><Title>Đăng nhập</Title><p className="text-sm text-text-secondary mb-6">Chào mừng bạn trở lại với TailUp.</p><Notice error={error} success={params.get('registered') ? 'Đăng ký thành công. Vui lòng đăng nhập.' : undefined} /><form onSubmit={submit} className="space-y-4"><Input label="Số điện thoại" inputMode="tel" value={phone} onChange={e => setPhone(e.target.value)} required pattern="0[0-9]{9}" error={fieldError(error, 'phone')} /><Input label="Mật khẩu" type="password" value={password} onChange={e => setPassword(e.target.value)} required error={fieldError(error, 'password')} /><div className="pt-1"><Button type="submit" disabled={pending}>{pending ? 'Đang đăng nhập…' : 'Đăng nhập'}</Button></div></form><p className="text-sm mt-6 pt-5 border-t border-border-custom text-text-secondary">Chưa có tài khoản? <Link className="text-plum-noir underline underline-offset-4" to="/register">Đăng ký</Link></p></AuthShell>;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ fullName: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState<unknown>(); const [pending, setPending] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(undefined); if (form.password.length < 8 || form.password !== form.confirmPassword) { setError(new Error('Mật khẩu cần ít nhất 8 ký tự và phần nhập lại phải khớp.')); return; } setPending(true); try { await api.auth.register(form); navigate('/login?registered=1', { replace: true }); } catch (e) { setError(e); } finally { setPending(false); } };
  return <AuthShell><Title>Đăng ký</Title><p className="text-sm text-text-secondary mb-6">Tạo tài khoản để quản lý thú cưng và đặt lịch chăm sóc.</p><Notice error={error} /><form onSubmit={submit} className="space-y-4"><Input label="Họ tên" value={form.fullName} onChange={e => setForm({ ...form, fullName: e.target.value })} required maxLength={100} error={fieldError(error, 'fullName')} /><Input label="Số điện thoại" inputMode="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} required pattern="0[0-9]{9}" error={fieldError(error, 'phone')} /><Input label="Mật khẩu" type="password" minLength={8} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required error={fieldError(error, 'password')} /><Input label="Nhập lại mật khẩu" type="password" value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} required error={fieldError(error, 'confirmPassword')} /><div className="pt-1"><Button type="submit" disabled={pending}>{pending ? 'Đang tạo…' : 'Tạo tài khoản'}</Button></div></form><p className="text-sm mt-6 pt-5 border-t border-border-custom text-text-secondary">Đã có tài khoản? <Link className="text-plum-noir underline underline-offset-4" to="/login">Đăng nhập</Link></p></AuthShell>;
}
