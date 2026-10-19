import { ConflictException } from '@nestjs/common';
import { digest } from '../common/common';
import { BookingWorkflowService } from './bookings.service';

describe('booking operation reconciliation', () => {
  const actor = { id: 3n, role: 'ADMIN' as const, sessionId: 4n };
  const tx = {
    idempotencyRequest: { findUnique: jest.fn() },
    booking: { findUnique: jest.fn(), updateMany: jest.fn() },
  };
  const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
  const schedule = { lock: jest.fn().mockResolvedValue(undefined) };
  const service = new BookingWorkflowService(db as never, schedule as never);

  beforeEach(() => jest.clearAllMocks());

  it('replays a committed reschedule even after its new start has passed', async () => {
    const start = '2026-10-01T02:00:00.000Z';
    tx.idempotencyRequest.findUnique.mockResolvedValue({
      operation: 'RESCHEDULE', bookingId: 8n,
      requestHash: digest(JSON.stringify({ bookingId: '8', start, reason: 'Khách đổi giờ' })),
      result: { id: '8', status: 'CONFIRMED', bookingDate: start },
    });
    await expect(service.reschedule('8', start, 'Khách đổi giờ', actor, 'retry-8'))
      .resolves.toMatchObject({ id: '8', bookingDate: start });
    expect(tx.booking.findUnique).not.toHaveBeenCalled();
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });

  it('rejects reuse of a key for a different operation', async () => {
    tx.idempotencyRequest.findUnique.mockResolvedValue({
      operation: 'CANCEL', bookingId: 8n, requestHash: 'other', result: {},
    });
    await expect(service.confirm('8', actor, 'retry-8')).rejects.toBeInstanceOf(ConflictException);
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });
});
