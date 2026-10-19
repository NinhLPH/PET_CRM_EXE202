import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { digest } from '../common/common';
import { AuthWorkflowService } from './auth.service';

describe('staff verified recovery', () => {
  const token = 'one-time-secret';
  const tx = {
    $executeRaw: jest.fn().mockResolvedValue([]),
    identityEvidence: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 1n, tokenHash: digest(token) }),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    user: {
      findUnique: jest.fn().mockResolvedValue({ id: 2n, role: 'CUSTOMER' }),
      update: jest.fn().mockResolvedValue({}),
      create: jest
        .fn()
        .mockResolvedValue({ id: 9n, phone: '0912345678', role: 'CUSTOMER' }),
    },
    customer: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          {
            id: 7n,
            phone: '0912345678',
            userId: null,
            fullName: 'Existing CRM',
          },
        ]),
      update: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
    userSession: { updateMany: jest.fn().mockResolvedValue({ count: 2 }) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
  };
  const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  const auth = new AuthWorkflowService(db as never);
  beforeEach(() => jest.clearAllMocks());

  it('consumes evidence, resets password and revokes sessions in one transaction', async () => {
    await expect(
      auth.recover({
        phone: '0912345678',
        verificationToken: token,
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      }),
    ).resolves.toEqual({ success: true });
    expect(tx.identityEvidence.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tokenHash: digest(token),
          consumedAt: null,
        }),
      }),
    );
    expect(tx.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          passwordHash: expect.stringMatching(/^scrypt:/),
        }),
      }),
    );
    expect(tx.userSession.updateMany).toHaveBeenCalledTimes(1);
  });

  it('counts an invalid attempt without resetting the account', async () => {
    await expect(
      auth.recover({
        phone: '0912345678',
        verificationToken: 'wrong',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(tx.identityEvidence.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { attempts: { increment: 1 } },
      }),
    );
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  it('does not let an ordinary admin issue identity evidence', async () => {
    await expect(
      auth.issueEvidence(
        { id: 3n, role: 'ADMIN', sessionId: 4n, canVerifyIdentity: false },
        {
          phone: '0912345678',
          purpose: 'RECOVERY',
          evidenceSummary: 'Checked at counter',
        },
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it('links the selected CRM only after consuming LINK evidence', async () => {
    tx.user.findUnique.mockResolvedValueOnce(null);
    await auth.register({
      fullName: 'New form name',
      phone: '0912345678',
      password: 'long-password',
      confirmPassword: 'long-password',
      verificationToken: token,
    });
    expect(tx.identityEvidence.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          purpose: 'LINK',
          customerId: 7n,
          tokenHash: digest(token),
        }),
      }),
    );
    expect(tx.customer.update).toHaveBeenCalledWith({
      where: { id: 7n },
      data: { userId: 9n },
    });
    expect(tx.customer.create).not.toHaveBeenCalled();
  });
});
