import { ConflictException } from '@nestjs/common';
import { ServicesService } from './services.service';

describe('quote by weight', () => {
  const service = { id: 1n, status: 'ACTIVE' };
  const prices = [{ id: 1n, price: 150000 }, { id: 2n, price: 250000 }, { id: 3n, price: 350000 }];
  const db = {
    service: { findUnique: jest.fn().mockResolvedValue(service) },
    servicePrice: {
      findMany: jest.fn().mockImplementation(({ where }) => {
        const weight = Number(where.minWeight.lte);
        return Promise.resolve(weight < 5 ? [prices[0]] : weight < 10 ? [prices[1]] : [prices[2]]);
      }),
    },
  };
  const services = new ServicesService(db as never);
  it.each([['4.99', 150000], ['5', 250000], ['7', 250000], ['10', 350000]])('quotes %s kg correctly', async (weight, amount) => {
    const quote = await services.quote('1', 'DOG', weight);
    expect(quote.basePrice).toBe(amount);
  });
  it('rejects missing and overlapping price rules', async () => {
    db.servicePrice.findMany.mockResolvedValueOnce([]);
    await expect(services.quote('1', 'DOG', '7')).rejects.toBeInstanceOf(ConflictException);
    db.servicePrice.findMany.mockResolvedValueOnce([prices[0], prices[1]]);
    await expect(services.quote('1', 'DOG', '7')).rejects.toBeInstanceOf(ConflictException);
  });
});
