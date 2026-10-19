import { Prisma } from '@prisma/client';
import { ReportsService } from './reports.service';

describe('pilot reports', () => {
  const tx = {
    booking: {
      groupBy: jest.fn().mockResolvedValue([
        { status: 'COMPLETED', _count: { _all: 6 } },
        { status: 'CANCELLED', _count: { _all: 2 } },
      ]),
      count: jest.fn().mockResolvedValue(1),
      aggregate: jest
        .fn()
        .mockResolvedValue({
          _count: { _all: 6 },
          _sum: { finalTotal: new Prisma.Decimal(600000) },
        }),
    },
    bookingAdjustment: {
      aggregate: jest
        .fn()
        .mockResolvedValueOnce({ _sum: { delta: new Prisma.Decimal(-50000) } })
        .mockResolvedValueOnce({ _sum: { delta: new Prisma.Decimal(10000) } }),
    },
  };
  const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  const reports = new ReportsService(db as never);

  it('uses appointment-date cohort and counts no-show inside cancellation', async () => {
    const result = await reports.bookings('2026-10-01', '2026-10-31');
    expect(result).toMatchObject({
      total: 8,
      cancelled: 2,
      noShow: 1,
      cancellationRate: 0.25,
      noShowRate: 0.125,
    });
    expect(tx.booking.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          bookingDate: {
            gte: new Date('2026-09-30T17:00:00Z'),
            lt: new Date('2026-10-31T17:00:00Z'),
          },
        },
      }),
    );
  });

  it('keeps completion-period value separate from adjustment recording period', async () => {
    const result = await reports.value('2026-10-01', '2026-10-31');
    expect(result).toMatchObject({
      originalTotal: 600000,
      deltaTotal: -50000,
      adjustedTotal: 550000,
      adjustmentsRecordedInPeriod: 10000,
    });
  });
});
