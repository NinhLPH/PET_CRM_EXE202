/* eslint-disable react-refresh/only-export-components -- Operation hook and its shared status panel are used together. */
import { useState } from 'react';
import { ApiError } from '../api/client';
import type { OperationResult } from '../api/types';
import { useAuth } from './authContext';
import { Button, Card, Notice } from './ui';

type Record = { key: string; actorId: string; scope: string; createdAt: number };
const prefix = 'tailup_operation_v2:';

function read(actorId: string, scope: string): Record | null {
  try {
    const raw = sessionStorage.getItem(prefix + actorId + ':' + scope);
    if (!raw) return null;
    const value = JSON.parse(raw) as Record;
    if (value.actorId === actorId && value.scope === scope &&
        /^[0-9a-f-]{36}$/i.test(value.key) && Number.isFinite(value.createdAt)) return value;
    sessionStorage.removeItem(prefix + actorId + ':' + scope);
  } catch { /* Storage might be unavailable. */ }
  return null;
}

export function useOperation(scope: string, lookup: (key: string) => Promise<OperationResult<unknown>>) {
  const {state} = useAuth();
  const actorId = state.userId || '';
  const [pending, setPending] = useState<Record | null>(() => actorId ? read(actorId, scope) : null);
  const [error, setError] = useState<unknown>();
  const [busy, setBusy] = useState(false);
  const active = pending?.actorId === actorId && pending.scope === scope ? pending : read(actorId, scope);
  const clear = () => {
    sessionStorage.removeItem(prefix + actorId + ':' + scope);
    setPending(null);
  };
  const execute = async <T,>(send: (key: string) => Promise<T>) => {
    if (!actorId) throw new Error('Chưa xác minh tài khoản.');
    if (active) throw new Error('Thao tác trước chưa rõ kết quả. Hãy tra cứu trước.');
    const record = { key: crypto.randomUUID(), actorId, scope, createdAt: Date.now() };
    sessionStorage.setItem(prefix + actorId + ':' + scope, JSON.stringify(record));
    setPending(record); setError(undefined); setBusy(true);
    try {
      const result = await send(record.key);
      clear();
      return result;
    } catch (cause) {
      if (!(cause instanceof ApiError) || (cause.status > 0 && cause.status < 500 && cause.code !== 'INVALID_RESPONSE')) clear();
      setError(cause);
      throw cause;
    } finally { setBusy(false); }
  };
  const reconcile = async () => {
    if (!active) return null;
    setBusy(true); setError(undefined);
    try {
      const result = await lookup(active.key);
      clear();
      return result;
    } catch (cause) {
      setError(cause);
      throw cause;
    } finally { setBusy(false); }
  };
  return { active, busy, error, execute, reconcile };
}

export function OperationBanner({ operation, onResolved }: {
  operation: Pick<ReturnType<typeof useOperation>, 'active'|'busy'|'error'|'reconcile'>;
  onResolved?: (result: OperationResult<unknown>) => void;
}) {
  if (!operation.active) return null;
  return <Card className="mb-4 bg-amber-50">
    <p className="text-sm mb-2">Kết quả thao tác trước chưa xác định. Mã tra cứu: {operation.active.key}. Sau khi tải lại trang, hãy tra cứu trước khi tạo thao tác khác. Kết quả 404 cũng chưa chứng minh thao tác chưa được ghi.</p>
    <Notice error={operation.error}/>
    <Button variant="secondary" disabled={operation.busy} onClick={() => void operation.reconcile().then(result => { if (result) onResolved?.(result); }).catch(() => undefined)}>Tra cứu kết quả</Button>
  </Card>;
}
