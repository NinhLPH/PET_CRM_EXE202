import { BadRequestException, ConflictException } from '@nestjs/common';
import { BookingWorkflowService } from './bookings.service';

describe('customer booking projection', () => {
  it('includes visible cancellation and adjustment history without internal notes', () => {
    const service = new BookingWorkflowService({} as never, {} as never);
    const result = service['customerBooking']({
      id: 1n, customerId: 2n, bookingDate: new Date('2026-10-19T02:00:00Z'), scheduledEnd: new Date('2026-10-19T03:00:00Z'),
      status: 'COMPLETED', version: 1, note: null, estimatedTotal: 100000,
      finalTotal: 110000, discountAmount: 0, cancellationType: null, cancellationReason: null,
      pet: {id: 3n,name:'Milo',species:'DOG'},
      services: [{serviceId:4n,serviceNameSnapshot:'Tắm',basePrice:100000,durationMinutes:60,service:{serviceName:'Khác'}}],
      surcharges: [{surchargeName:'Lông dày',amount:10000}],
      adjustments: [{id:5n,delta:-20000,reason:'Điều chỉnh',reversalRef:null,createdAt:new Date('2026-10-20T00:00:00Z'),actorId:99n}],
      events: [{action:'COMPLETE',oldStatus:'CONFIRMED',newStatus:'COMPLETED',oldStart:null,newStart:null,createdAt:new Date('2026-10-19T03:00:00Z'),actorId:99n}],
    } as never);
    expect(result.services[0].serviceName).toBe('Tắm');
    expect(result.surcharges?.[0].name).toBe('Lông dày');
    expect(result.adjustments?.[0].delta).toBe(-20000);
    expect(result.adjustments?.[0]).not.toHaveProperty('actorId');
    expect(result.events[0]).not.toHaveProperty('actorId');
  });
});

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
      findMany: jest.fn().mockResolvedValue([]),
      updateMany: jest.fn().mockResolvedValue({}),
      create: jest.fn().mockResolvedValue({ id: 9n }),
    },
    bookingEvent: { create: jest.fn().mockResolvedValue({}) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $executeRaw: jest.fn().mockResolvedValue([]),
  };
  const db = {
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
  };
  const schedule = {
    lock: jest.fn().mockResolvedValue(undefined),
    rule: jest.fn().mockResolvedValue({
      intervals: [{ start: '00:00', end: '23:59' }],
      capacity: 1,
      slotStep: 1,
    }),
  };
  const service = new BookingWorkflowService(db as never, schedule as never);
  const actor = { id: 1n, role: 'ADMIN' as const, sessionId: 1n };
  beforeEach(() => jest.clearAllMocks());
  it('calculates final price and creates reminder in the same transaction', async () => {
    await service.complete(
      '1',
      {
        surcharges: [{ name: 'Lông rối', amount: 50000 }],
        discount: 20000,
      },
      actor,
    );
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
      service.complete('1', { surcharges: [], discount: 310000 }, actor),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(tx.booking.updateMany).not.toHaveBeenCalled();
  });
  it('rejects a booking that another request already changed', async () => {
    tx.booking.updateMany.mockResolvedValueOnce({ count: 0 });
    await expect(
      service.complete('1', { surcharges: [], discount: 0 }, actor),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(tx.petReminder.create).not.toHaveBeenCalled();
  });
});

describe('create booking', () => {
  const pet = { id: 3n, customerId: 2n, species: 'DOG', weight: 7 };
  const tx = {
    pet: { findUnique: jest.fn().mockResolvedValue(pet) },
    service: {
      findUnique: jest.fn().mockResolvedValue({
        id: 5n,
        status: 'ACTIVE',
        estimatedDuration: 60,
        serviceName: 'Tắm',
      }),
    },
    servicePrice: {
      findMany: jest.fn().mockResolvedValue([{ id: 6n, price: 250000 }]),
    },
    booking: {
      create: jest.fn().mockResolvedValue({ id: 7n, status: 'PENDING' }),
    },
    idempotencyRequest: { create: jest.fn().mockResolvedValue({}) },
    bookingEvent: { create: jest.fn().mockResolvedValue({}) },
    auditEvent: { create: jest.fn().mockResolvedValue({}) },
    $executeRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
  };
  const db = {
    idempotencyRequest: { findUnique: jest.fn().mockResolvedValue(null) },
    booking: {
      findUnique: jest.fn().mockResolvedValue({
        id: 7n,
        customerId: 2n,
        pet: { id: 3n, name: 'Bông', species: 'DOG' },
        status: 'PENDING',
        adjustments: [],
        surcharges: [],
        events: [],
        services: [
          {
            serviceId: 5n,
            serviceNameSnapshot: 'Tắm',
            basePrice: 250000,
            durationMinutes: 60,
            service: { serviceName: 'Tắm' },
          },
        ],
      }),
    },
    $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
  };
  const schedule = {
    lock: jest.fn().mockResolvedValue(undefined),
    assertWindow: jest.fn().mockResolvedValue({
      intervals: [{ start: '00:00', end: '23:59' }],
      capacity: 1,
      slotStep: 1,
    }),
  };
  const service = new BookingWorkflowService(db as never, schedule as never);
  const actor = {
    id: 1n,
    role: 'CUSTOMER' as const,
    customerId: 2n,
    sessionId: 8n,
  };
  const body = {
    petId: '3',
    serviceId: '5',
    bookingDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
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
