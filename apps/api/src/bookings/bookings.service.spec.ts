import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingWorkflowService } from './bookings.service';

describe('complete booking', () => {
  const booking = {
    id: 1n,
    customerId: 2n,
    petId: 3n,
    status: 'CONFIRMED',
    services: [{ id: 4n, serviceId: 5n, basePrice: 250000 }],
  };
  const tx = {
    booking: {
      findUnique: jest.fn().mockResolvedValue(booking),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUniqueOrThrow: jest
        .fn()
        .mockResolvedValue({ id: 1n, finalTotal: 280000 }),
    },
    reminderConfig: {
      findFirst: jest.fn().mockResolvedValue({ reminderDays: 60 }),
    },
    bookingService: { update: jest.fn().mockResolvedValue({}) },
    bookingSurcharge: { createMany: jest.fn().mockResolvedValue({}) },
    petReminder: {
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({}),
    },
  };
  const db = {
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
  };
  const service = new BookingWorkflowService(db as never);
  beforeEach(() => jest.clearAllMocks());
  it('calculates final price and creates reminder in the same transaction', async () => {
    await service.complete('1', {
      surcharges: [{ name: 'Lông rối', amount: 50000 }],
      discount: 20000,
    });
    expect(tx.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          finalTotal: 280000,
          status: 'COMPLETED',
        }),
      }),
    );
    expect(tx.petReminder.create).toHaveBeenCalledTimes(1);
    const reminder = tx.petReminder.create.mock.calls[0][0].data;
    expect(reminder.reminderDate.getTime()).toBeGreaterThan(
      reminder.completedDate.getTime(),
    );
  });
  it('rejects a discount larger than the amount due', async () => {
    await expect(
      service.complete('1', { surcharges: [], discount: 310000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a booking that another request already changed', async () => {
    tx.booking.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.complete('1', { surcharges: [], discount: 0 }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.petReminder.create).not.toHaveBeenCalled();
  });
});

describe('create booking', () => {
  const pet = { id: 3n, customerId: 2n, species: 'DOG', weight: 7 };
  const tx = {
    pet: { findUnique: jest.fn().mockResolvedValue(pet) },
    service: {
      findUnique: jest.fn().mockResolvedValue({ id: 5n, status: 'ACTIVE' }),
    },
    servicePrice: {
      findMany: jest.fn().mockResolvedValue([{ id: 6n, price: 250000 }]),
    },
    booking: {
      create: jest.fn().mockResolvedValue({ id: 7n, status: 'PENDING' }),
    },
    idempotencyRequest: { create: jest.fn().mockResolvedValue({}) },
    $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
  };
  const db = {
    idempotencyRequest: { findUnique: jest.fn().mockResolvedValue(null) },
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
  };
  const service = new BookingWorkflowService(db as never);
  const actor = {
    id: 1n,
    role: 'CUSTOMER' as const,
    customerId: 2n,
    sessionId: 8n,
  };
  const body = {
    petId: '3',
    serviceId: '5',
    bookingDate: '2030-10-01T03:00:00.000Z',
    expectedBasePrice: 250000,
  };
  beforeEach(() => jest.clearAllMocks());
  it('stores weight and price snapshots and an idempotency record', async () => {
    await service.create(actor, body, 'request-1');
    expect(tx.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'PENDING',
          estimatedTotal: 250000,
          services: {
            create: expect.objectContaining({
              petWeightSnapshot: 7,
              basePrice: 250000,
            }),
          },
        }),
      }),
    );
    expect(tx.idempotencyRequest.create).toHaveBeenCalledTimes(1);
  });
  it('returns PRICE_CHANGED when the selected quote is stale', async () => {
    await expect(
      service.create(
        actor,
        { ...body, expectedBasePrice: 200000 },
        'request-2',
      ),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'PRICE_CHANGED' }),
    });
    expect(tx.booking.create).not.toHaveBeenCalled();
  });
});
