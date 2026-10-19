import { scryptSync } from 'node:crypto';
import { AuthWorkflowService } from './auth.service';

describe('login session policy', () => {
  it('keeps at most five non-idle sessions after login', async () => {
    const salt = 'session-test-salt';
    const passwordHash = `scrypt:${salt}:${scryptSync('password-123', salt, 64).toString('hex')}`;
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      user: { findUnique: jest.fn().mockResolvedValue({ id: 7n, phone: '0912345678', passwordHash, role: 'CUSTOMER', status: 'ACTIVE' }) },
      userSession: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([1n, 2n, 3n, 4n, 5n].map((id) => ({ id }))),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
    const response = { cookie: jest.fn() };
    await new AuthWorkflowService(db as never).login({ phone: '0912345678', password: 'password-123' }, response as never);
    expect(tx.userSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    expect(tx.userSession.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ userId: 7n, id: { notIn: [1n, 2n, 3n, 4n, 5n] } }),
    }));
    expect(response.cookie).toHaveBeenCalled();
  });
});
