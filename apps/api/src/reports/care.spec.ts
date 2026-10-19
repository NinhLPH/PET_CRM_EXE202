import { ReportsService } from './reports.service';

describe('care conversion cohort', () => {
  it('assigns one rebooking to the latest eligible contact only', async () => {
    const tx = {
      petReminder: { findMany: jest.fn().mockResolvedValue([
        { id: 1n, petId: 3n, serviceId: 4n, contactedAt: new Date('2026-10-01T02:00:00Z') },
        { id: 2n, petId: 3n, serviceId: 4n, contactedAt: new Date('2026-10-02T02:00:00Z') },
      ]) },
      booking: { findMany: jest.fn().mockResolvedValue([
        { id: 9n, petId: 3n, status: 'COMPLETED', createdAt: new Date('2026-10-03T02:00:00Z'), services: [{ serviceId: 4n }] },
      ]) },
    };
    const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
    const result = await new ReportsService(db as never).care('2026-10-01', '2026-10-02', 7);
    expect(result).toMatchObject({
      contacted: 2, matured: 2,
      observed: { created: 1, confirmed: 1, completed: 1 },
      mature: { created: 1, confirmed: 1, completed: 1 },
      rates: { created: 0.5, confirmed: 0.5, completed: 0.5 },
    });
  });
});
