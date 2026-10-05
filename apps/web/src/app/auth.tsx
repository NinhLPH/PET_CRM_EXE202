import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import type { AuthState } from './authContext';
import { AuthContext } from './authContext';
import { clearPendingBooking, retainPendingForCustomer } from './pendingBooking';

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const [state, setState] = useState<AuthState>({ status: 'checking' });
  const generation = useRef(0);
  const probe = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    probe.current?.abort();
    const controller = new AbortController(); probe.current = controller;
    const current = ++generation.current;
    setState({ status: 'checking' });
    try {
      const profile = await api.profile.get(controller.signal);
      if (current !== generation.current) return;
      retainPendingForCustomer(profile.id);
      client.setQueryData(['profile'], profile);
      setState({ status: 'authenticated', role: 'CUSTOMER' });
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) { client.clear(); clearPendingBooking(); setState({ status: 'anonymous' }); return; }
      if (error instanceof ApiError && error.status === 403) {
        try {
          const dashboard = await api.admin.dashboard(controller.signal);
          if (current !== generation.current) return;
          client.setQueryData(['admin', 'dashboard'], dashboard);
          clearPendingBooking();
          setState({ status: 'authenticated', role: 'ADMIN' });
        } catch (second) {
          if (current !== generation.current) return;
          if (second instanceof ApiError && second.status === 401) { client.clear(); clearPendingBooking(); setState({ status: 'anonymous' }); }
          else setState({ status: 'error', error: second instanceof Error ? second.message : 'Không xác minh được phiên đăng nhập.' });
        }
        return;
      }
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Không xác minh được phiên đăng nhập.' });
    }
  }, [client]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void refresh(); }); return () => { active = false; }; }, [refresh]);
  useEffect(() => {
    const onExpired = () => { generation.current++; probe.current?.abort(); client.clear(); clearPendingBooking(); setState({ status: 'anonymous' }); };
    window.addEventListener('petcare:session-expired', onExpired);
    return () => window.removeEventListener('petcare:session-expired', onExpired);
  }, [client]);
  const login = useCallback(async (phone: string, password: string) => {
    probe.current?.abort();
    const current = ++generation.current;
    await client.cancelQueries(); client.clear();
    const session = await api.auth.login({ phone, password });
    if (current === generation.current) { clearPendingBooking(); setState({ status: 'authenticated', role: session.role, userId: session.userId }); }
    return session.role;
  }, [client]);
  const logout = useCallback(async () => {
    try { await api.auth.logout(); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) throw error; }
    generation.current++; probe.current?.abort(); await client.cancelQueries(); client.clear(); clearPendingBooking(); setState({ status: 'anonymous' });
  }, [client]);
  const value = useMemo(() => ({ state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
