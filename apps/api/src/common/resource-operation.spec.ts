import { ConflictException } from '@nestjs/common';
import { runResourceOperation } from './resource-operation';

describe('CRM/pet/note operation replay', () => {
  it('returns the saved result without creating a second resource', async () => {
    let saved: { operation: string; requestHash: string; result: unknown } | null = null;
    const tx = {
      $executeRaw: jest.fn().mockResolvedValue(undefined),
      resourceOperation: {
        findUnique: jest.fn().mockImplementation(() => Promise.resolve(saved)),
        create: jest.fn().mockImplementation(({ data }) => { saved = data; return Promise.resolve(data); }),
      },
    };
    const db = { $transaction: jest.fn().mockImplementation((fn) => fn(tx)) };
    const create = jest.fn().mockResolvedValue({ id: 9n, name: 'Milo' });
    const first = await runResourceOperation(db as never, 1n, 'pet-key', 'CREATE_PET', { name: 'Milo' }, create);
    const replay = await runResourceOperation(db as never, 1n, 'pet-key', 'CREATE_PET', { name: 'Milo' }, create);
    expect(first.id).toBe(9n);
    expect(replay).toEqual({ id: '9', name: 'Milo' });
    expect(create).toHaveBeenCalledTimes(1);
    await expect(runResourceOperation(db as never, 1n, 'pet-key', 'CREATE_PET', { name: 'Other' }, create))
      .rejects.toBeInstanceOf(ConflictException);
  });
});
