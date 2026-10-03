import { ForbiddenException } from '@nestjs/common';
import { PetsService } from './pets.service';

describe('pet ownership', () => {
  const db = { pet: { findUnique: jest.fn().mockResolvedValue({ id: 9n, customerId: 2n }) } };
  const pets = new PetsService(db as never);
  it('blocks a customer from reading another owner pet', async () => {
    await expect(pets.pet('9', { id: 1n, role: 'CUSTOMER', customerId: 3n, sessionId: 4n }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});
