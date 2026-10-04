import { ConflictException, ForbiddenException } from '@nestjs/common';
import { PetsService } from './pets.service';

describe('pet ownership', () => {
  const db = { pet: { findUnique: jest.fn().mockResolvedValue({ id: 9n, customerId: 2n }) } };
  const pets = new PetsService(db as never);
  it('blocks a customer from reading another owner pet', async () => {
    await expect(pets.pet('9', { id: 1n, role: 'CUSTOMER', customerId: 3n, sessionId: 4n }))
      .rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('pet with CRM activity', () => {
  it('returns a conflict instead of violating the activity foreign key', async () => {
    const db = {
      pet: { findUnique: jest.fn().mockResolvedValue({ id: 9n, customerId: 2n }), delete: jest.fn() },
      booking: { count: jest.fn().mockResolvedValue(0) },
      petReminder: { count: jest.fn().mockResolvedValue(0) },
      crmActivity: { count: jest.fn().mockResolvedValue(1) },
    };
    await expect(new PetsService(db as never).deletePet('9', { id: 1n, role: 'CUSTOMER', customerId: 2n, sessionId: 4n }))
      .rejects.toBeInstanceOf(ConflictException);
    expect(db.pet.delete).not.toHaveBeenCalled();
  });
});
