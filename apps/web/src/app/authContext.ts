import { createContext, useContext } from 'react';
import type { Role } from '../api/types';

export type AuthState = { status: 'checking' | 'anonymous' | 'authenticated' | 'error'; role?: Role; userId?: string; error?: string };
export type AuthValue = { state: AuthState; refresh: () => Promise<void>; login: (phone: string, password: string) => Promise<Role>; logout: () => Promise<void> };
export const AuthContext = createContext<AuthValue | null>(null);
export function useAuth() { const value = useContext(AuthContext); if (!value) throw new Error('AuthProvider missing'); return value; }
