import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { CalendarDays, ClipboardList, Heart, House, LogOut, Menu, PawPrint, Scissors, UserRound, Users, X, type LucideIcon } from 'lucide-react';
import { adminNav, customerNav } from './features';
import { useAuth } from './authContext';
import { Notice } from './ui';
import { errorText } from '../api/client';

const customerIcons: LucideIcon[] = [House, PawPrint, Scissors, CalendarDays, UserRound];
const adminIcons: LucideIcon[] = [House, Users, Scissors, ClipboardList, Heart];

export function Layout({ admin = false }: { admin?: boolean }) {
  const nav = admin ? adminNav : customerNav;
  const icons = admin ? adminIcons : customerIcons;
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const customerActive = (to: string) => to === '/app' ? location.pathname === to : to === '/app/bookings' ? location.pathname.startsWith(to) && !location.pathname.startsWith('/app/bookings/new') : location.pathname === to || location.pathname.startsWith(`${to}/`);
  const signOut = async () => {
    try { await logout(); navigate('/login'); }
    catch (e) { setError(errorText(e)); }
  };
  const brand = <Link to={admin ? '/admin' : '/app'} className="inline-flex items-center gap-2 text-plum-noir"><PawPrint aria-hidden="true" size={23} strokeWidth={1.7} /><span className="font-serif text-[22px] font-semibold tracking-tight">TailUp</span></Link>;
  const navLinks = nav.map((item, index) => {
    const Icon = icons[index];
    return <NavLink key={item.to} to={item.to} end={item.to === '/app' || item.to === '/admin'} onClick={() => setMenuOpen(false)} className={({ isActive }) => `flex items-center gap-3 rounded-control px-3 py-2.5 text-sm font-medium transition-colors ${isActive ? 'bg-plum-pale text-plum-noir font-semibold' : 'text-text-secondary hover:bg-muted-surface hover:text-text-primary'}`}><Icon aria-hidden="true" size={18} strokeWidth={1.8} />{item.label}</NavLink>;
  });

  if (admin) return <div className="min-h-dvh bg-canvas lg:grid lg:grid-cols-[232px_minmax(0,1fr)]">
    <aside className="hidden lg:flex lg:flex-col border-r border-border-custom bg-surface px-4 py-6 min-h-dvh">
      <div className="px-3 mb-9">{brand}<p className="mt-1 ml-8 text-[11px] uppercase tracking-[.14em] text-text-secondary">Quản lý cửa hàng</p></div>
      <nav aria-label="Quản lý" className="space-y-1">{navLinks}</nav>
      <button onClick={() => void signOut()} className="mt-auto flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-text-secondary hover:bg-muted-surface hover:text-text-primary cursor-pointer"><LogOut aria-hidden="true" size={18} />Đăng xuất</button>
    </aside>
    <div className="min-w-0">
      <header className="sticky top-0 z-20 border-b border-border-custom bg-surface">
        <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="lg:hidden">{brand}</div><span className="hidden lg:block text-sm font-medium text-text-secondary">Không gian quản lý TailUp</span>
          <button className="lg:hidden inline-flex min-h-10 items-center gap-2 rounded-control border border-border-custom px-3 text-sm" aria-label={menuOpen ? 'Đóng menu quản lý' : 'Mở menu quản lý'} aria-expanded={menuOpen} aria-controls="admin-mobile-nav" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X aria-hidden="true" size={18} /> : <Menu aria-hidden="true" size={18} />}Menu</button>
        </div>
        {menuOpen && <nav id="admin-mobile-nav" aria-label="Quản lý" className="lg:hidden border-t border-border-custom px-4 py-3 space-y-1">{navLinks}<button onClick={() => void signOut()} className="w-full flex items-center gap-3 rounded-control px-3 py-2.5 text-sm text-text-secondary"><LogOut aria-hidden="true" size={18} />Đăng xuất</button></nav>}
      </header>
      <main id="main-content" className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 lg:px-8 lg:py-7"><Notice error={error || undefined} /><Outlet /></main>
    </div>
  </div>;

  return <div className="min-h-dvh bg-canvas pb-[calc(78px+env(safe-area-inset-bottom))] md:pb-0">
    <header className="sticky top-0 z-20 border-b border-border-custom bg-surface">
      <div className="mx-auto max-w-6xl min-h-16 px-4 sm:px-6 flex items-center justify-between gap-4">{brand}
        <nav aria-label="Khách hàng" className="hidden md:flex items-center gap-1">{nav.map(item => <NavLink key={item.to} to={item.to} end aria-current={customerActive(item.to) ? 'page' : undefined} className={() => `rounded-control px-3 py-2 text-sm ${customerActive(item.to) ? 'bg-plum-pale text-plum-noir font-semibold' : 'text-text-secondary hover:text-plum-noir'}`}>{item.label}</NavLink>)}</nav>
        <button className="hidden md:inline-flex items-center gap-2 text-sm text-text-secondary hover:text-plum-noir" onClick={() => void signOut()}><LogOut aria-hidden="true" size={16} />Đăng xuất</button>
        <button className="md:hidden text-sm text-text-secondary underline underline-offset-4" onClick={() => void signOut()}>Đăng xuất</button>
      </div>
    </header>
    <main id="main-content" className="mx-auto max-w-6xl px-4 py-6 sm:px-6 md:py-8"><Notice error={error || undefined} /><Outlet /></main>
    <nav aria-label="Khách hàng" className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-5 border-t border-border-custom bg-surface pb-[env(safe-area-inset-bottom)]">
      {nav.map((item, index) => { const Icon = icons[index]; const active = customerActive(item.to); return <NavLink key={item.to} to={item.to} end aria-current={active ? 'page' : undefined} className={`min-h-[62px] flex flex-col items-center justify-center gap-1 px-0.5 text-[11px] leading-tight text-center ${active ? 'font-semibold text-plum-noir' : 'text-text-secondary'}`}><Icon aria-hidden="true" size={18} strokeWidth={1.8} /><span>{item.label}</span></NavLink>; })}
    </nav>
  </div>;
}
