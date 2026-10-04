import {Link, NavLink, Outlet, useNavigate} from 'react-router-dom';
import {useState} from 'react';
import {adminNav, customerNav} from './features';
import {useAuth} from './authContext';
import {Notice} from './ui';
import {errorText} from '../api/client';

export function Layout({admin = false}: { admin?: boolean }) {
    const nav = admin ? adminNav : customerNav;
    const {logout} = useAuth();
    const navigate = useNavigate();
    const [error, setError] = useState('');
    return <div className="min-h-screen bg-canvas pb-20 md:pb-0">
        <header className="sticky top-0 z-20 border-b border-border-custom bg-surface/95 backdrop-blur">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
                <Link to={admin ? '/admin' : '/app'}
                      className="font-serif text-2xl font-bold text-plum-noir">PetCare <span
                    className="font-sans text-xs font-normal uppercase">CRM</span></Link>
                <nav className="hidden md:flex gap-4 flex-wrap">{nav.map(item => <NavLink key={item.to} to={item.to}
                                                                                          end={item.to === '/app' || item.to === '/admin'}
                                                                                          className={({isActive}) => `text-sm ${isActive ? 'font-bold text-plum-noir underline' : 'text-text-secondary hover:text-plum-noir'}`}>{item.label}</NavLink>)}</nav>
                <button className="text-sm text-plum-noir underline" onClick={async () => {
                    try {
                        await logout();
                        navigate('/login');
                    } catch (e) {
                        setError(errorText(e));
                    }
                }}>Đăng xuất
                </button>
            </div>
        </header>
        <main className="max-w-6xl mx-auto px-4 py-7"><Notice error={error || undefined}/><Outlet/></main>
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-surface border-t border-border-custom grid"
             style={{gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))`}}>{nav.map(item => <NavLink
            key={item.to} to={item.to} end={item.to === '/app' || item.to === '/admin'}
            className={({isActive}) => `text-[11px] text-center py-4 ${isActive ? 'font-bold text-plum-noir' : 'text-text-secondary'}`}>{item.label}</NavLink>)}</nav>
    </div>;
}
