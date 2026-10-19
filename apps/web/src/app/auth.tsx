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
      const context = await api.auth.context(controller.signal);
      if (current !== generation.current) return;
      await client.cancelQueries(); client.clear();
      if (context.role === 'CUSTOMER' && context.customerId) retainPendingForCustomer(context.customerId);
      else clearPendingBooking();
      setState({ status: 'authenticated', role: context.role, userId: context.userId, customerId: context.customerId, canVerifyIdentity: context.capabilities.canVerifyIdentity });
    } catch (error) {
      if (current !== generation.current) return;
      if (error instanceof ApiError && error.status === 401) { await client.cancelQueries(); client.clear(); setState({ status: 'anonymous' }); return; }
      setState({ status: 'error', error: error instanceof Error ? error.message : 'Không xác minh được phiên đăng nhập.' });
    }
  }, [client]);
  useEffect(() => { let active = true; queueMicrotask(() => { if (active) void refresh(); }); return () => { active = false; }; }, [refresh]);
  useEffect(() => {
    const onExpired = () => { generation.current++; probe.current?.abort(); void client.cancelQueries().then(() => client.clear()); setState({ status: 'anonymous' }); };
    window.addEventListener('petcare:session-expired', onExpired);
    return () => window.removeEventListener('petcare:session-expired', onExpired);
  }, [client]);
  const login = useCallback(async (phone: string, password: string) => {
    probe.current?.abort();
    const current = ++generation.current;
    await client.cancelQueries(); client.clear();
    const session = await api.auth.login({ phone, password });
    const context = await api.auth.context();
    if (current === generation.current) {
      if (context.role === 'CUSTOMER' && context.customerId) retainPendingForCustomer(context.customerId);
      else clearPendingBooking();
      setState({ status: 'authenticated', role: context.role, userId: context.userId, customerId: context.customerId, canVerifyIdentity: context.capabilities.canVerifyIdentity });
    }
    return session.role;
  }, [client]);
  const logout = useCallback(async () => {
    try { await api.auth.logout(); }
    catch (error) { if (!(error instanceof ApiError && error.status === 401)) {
      await client.cancelQueries(); client.clear(); throw error;
    } }
    generation.current++; probe.current?.abort(); await client.cancelQueries(); client.clear(); clearPendingBooking(); setState({ status: 'anonymous' });
  }, [client]);
  const value = useMemo(() => ({ state, refresh, login, logout }), [state, refresh, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
