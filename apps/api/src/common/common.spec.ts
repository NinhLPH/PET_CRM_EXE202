import { addLocalDays, localDayStart, serialize, SessionGuard } from './common';
import { Prisma } from '@prisma/client';
import { ForbiddenException, UnauthorizedException } from '@nestjs/common';

describe('API conventions', () => {
  it('uses the Vietnam calendar for reminders', () => {
    const completed = new Date('2026-10-01T12:00:00.000Z');
    expect(localDayStart(completed).toISOString()).toBe(
      '2026-09-30T17:00:00.000Z',
    );
    expect(addLocalDays(completed, 60).toISOString()).toBe(
      '2026-11-29T17:00:00.000Z',
    );
  });
  it('serializes BIGINT IDs and dates', () => {
    expect(
      serialize({
        id: 123n,
        at: new Date('2026-10-01T00:00:00Z'),
        basePrice: new Prisma.Decimal('250000.00'),
        weight: new Prisma.Decimal('7.00'),
      }),
    ).toEqual({
      id: '123',
      at: '2026-10-01T00:00:00.000Z',
      basePrice: 250000,
      weight: '7',
    });
  });
});

describe('session authorization', () => {
  const request = {
    headers: { cookie: 'petcare_session=token' },
    method: 'GET',
  } as any;
  const context = {
    getHandler: () => null,
    getClass: () => null,
    switchToHttp: () => ({ getRequest: () => request }),
  } as any;
  const db = {
    userSession: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: 1n,
          userId: 2n,
          revokedAt: null,
          expiresAt: new Date('2030-01-01'),
          user: { status: 'ACTIVE', role: 'CUSTOMER', customer: { id: 3n } },
        }),
    },
  };
  const reflector = {
    getAllAndOverride: jest
      .fn()
      .mockImplementation((key) => key === 'adminRoute'),
  };
  const guard = new SessionGuard(db as never, reflector as never);
  it('rejects CUSTOMER on an ADMIN route', async () => {
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
  it('rejects a missing session', async () => {
    const saved = request.headers.cookie;
    request.headers.cookie = '';
    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    request.headers.cookie = saved;
  });
});
