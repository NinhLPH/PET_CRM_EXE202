import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ReminderConfigDto } from '../services/dto/services.dto';
import { ReminderWorkflowService } from './reminders.service';

describe('reminder workflow', () => {
  it.each([7, 365])('rejects %i reminder days', async (days) => {
    expect(
      await validate(
        plainToInstance(ReminderConfigDto, { reminderDays: days }),
      ),
    ).not.toHaveLength(0);
  });
  it.each([8, 60, 364])('accepts %i reminder days', async (days) => {
    expect(
      await validate(
        plainToInstance(ReminderConfigDto, { reminderDays: days }),
      ),
    ).toHaveLength(0);
  });
  it('records contact and CRM activity in one transaction', async () => {
    const tx = {
      petReminder: {
        findUnique: jest
          .fn()
          .mockResolvedValue({
            id: 1n,
            customerId: 2n,
            petId: 3n,
            status: 'PENDING',
          }),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        findUniqueOrThrow: jest
          .fn()
          .mockResolvedValue({ id: 1n, status: 'CONTACTED' }),
      },
      crmActivity: { create: jest.fn().mockResolvedValue({}) },
    };
    const db = {
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    const service = new ReminderWorkflowService(db as never);
    await service.contact(
      '1',
      { id: 4n, role: 'ADMIN', sessionId: 5n },
      { method: 'PHONE', note: 'Đã gọi' },
    );
    expect(tx.petReminder.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'CONTACTED',
          contactMethod: 'PHONE',
        }),
      }),
    );
    expect(tx.crmActivity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: 'CALL', createdBy: 4n }),
      }),
    );
  });
});
