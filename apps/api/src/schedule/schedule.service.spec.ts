import { ConflictException } from '@nestjs/common';
import {
  ScheduleService,
  fitsConfirmed,
  validateRule,
} from './schedule.service';

describe('schedule and capacity', () => {
  it('rejects overlapping opening intervals', () => {
    expect(() =>
      validateRule({
        intervals: [
          { start: '08:00', end: '12:00' },
          { start: '11:00', end: '17:00' },
        ],
        capacity: 2,
        slotStep: 30,
      }),
    ).toThrow();
  });
  it('preserves confirmed bookings when the new rule still fits them', () => {
    const rule = {
      intervals: [{ start: '09:00', end: '12:00' }],
      capacity: 2,
      slotStep: 30,
    };
    const bookings = [
      {
        id: 1n,
        bookingDate: new Date('2030-10-01T02:00:00Z'),
        scheduledEnd: new Date('2030-10-01T03:00:00Z'),
      },
      {
        id: 2n,
        bookingDate: new Date('2030-10-01T02:30:00Z'),
        scheduledEnd: new Date('2030-10-01T03:30:00Z'),
      },
    ];
    expect(fitsConfirmed(rule, bookings)).toBe(true);
    expect(fitsConfirmed({ ...rule, capacity: 1 }, bookings)).toBe(false);
    expect(fitsConfirmed({ ...rule, intervals: [] }, bookings)).toBe(false);
  });

  const start = new Date('2030-10-01T02:00:00Z');
  const end = new Date('2030-10-01T03:00:00Z');
  const tx = {
    dateException: { findUnique: jest.fn().mockResolvedValue(null) },
    workingSchedule: {
      findUnique: jest.fn().mockResolvedValue({
        intervals: [{ start: '08:00', end: '12:00' }],
        capacity: 2,
        slotStep: 30,
      }),
    },
    booking: {
      count: jest.fn().mockResolvedValue(0),
      findMany: jest.fn(),
    },
  };
  const schedule = new ScheduleService({} as never);
  beforeEach(() => jest.clearAllMocks());

  it('accepts two non-overlapping bookings when capacity is two', async () => {
    tx.booking.findMany.mockResolvedValueOnce([
      {
        petId: 2n,
        bookingDate: start,
        scheduledEnd: new Date('2030-10-01T02:30:00Z'),
      },
      {
        petId: 3n,
        bookingDate: new Date('2030-10-01T02:30:00Z'),
        scheduledEnd: end,
      },
    ]);
    await expect(
      schedule.assertAvailable(tx as never, start, end, 1n),
    ).resolves.toBeUndefined();
  });

  it('rejects overlapping capacity at an inner boundary', async () => {
    tx.booking.findMany.mockResolvedValueOnce([
      { petId: 2n, bookingDate: start, scheduledEnd: end },
      {
        petId: 3n,
        bookingDate: new Date('2030-10-01T02:30:00Z'),
        scheduledEnd: end,
      },
    ]);
    await expect(
      schedule.assertAvailable(tx as never, start, end, 1n),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('blocks confirmation on a day with unresolved legacy bookings', async () => {
    tx.booking.count.mockResolvedValueOnce(1);
    await expect(
      schedule.assertAvailable(tx as never, start, end, 1n),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'LEGACY_BOOKING_UNRESOLVED' }),
    });
    expect(tx.booking.findMany).not.toHaveBeenCalled();
  });
});

describe('reschedule availability', () => {
  it('uses the booking duration snapshot and excludes its current reservation', async () => {
    const date = new Intl.DateTimeFormat('en-CA', {timeZone:'Asia/Ho_Chi_Minh',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(Date.now()+7*86400000));
    const db = {
      booking: {
        findUnique: jest.fn().mockResolvedValue({ id: 9n, petId: 3n, status: 'CONFIRMED', services: [{serviceId: 4n, durationMinutes: 45}] }),
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      service: { findUnique: jest.fn() },
      dateException: {findUnique: jest.fn().mockResolvedValue(null)},
      workingSchedule: {findUnique: jest.fn().mockResolvedValue({intervals:[{start:'08:00',end:'12:00'}],capacity:2,slotStep:30})},
    };
    const result = await new ScheduleService(db as never).bookingAvailability(9n,date);
    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots[0].end.getTime()-result.slots[0].start.getTime()).toBe(45*60000);
    expect(db.service.findUnique).not.toHaveBeenCalled();
    expect(db.booking.findMany).toHaveBeenCalledWith(expect.objectContaining({where:expect.objectContaining({id:{not:9n}})}));
  });
});
