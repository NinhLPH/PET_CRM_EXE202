import { BadRequestException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { digest, serialize } from './common';

export async function runResourceOperation<T extends { id: bigint }>(
  db: PrismaService,
  actorId: bigint | undefined,
  key: string | undefined,
  operation: string,
  payload: unknown,
  mutate: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (key && (!actorId || key.length > 100))
    throw new BadRequestException('Idempotency-Key không hợp lệ');
  const requestHash = digest(JSON.stringify(payload));
  return db.$transaction(async (tx) => {
    if (key && actorId) {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`resource-operation:${actorId}:${key}`}, 0))`;
      const previous = await tx.resourceOperation.findUnique({ where: { actorId_key: { actorId, key } } });
      if (previous) {
        if (previous.operation !== operation || previous.requestHash !== requestHash)
          throw new ConflictException({ code: 'IDEMPOTENCY_KEY_REUSED', message: 'Idempotency-Key đã dùng cho request khác' });
        return previous.result as unknown as T;
      }
    }
    const result = await mutate(tx);
    if (key && actorId) await tx.resourceOperation.create({ data: {
      actorId, key, operation, requestHash,
      resourceId: result.id.toString(),
      result: serialize(result) as Prisma.InputJsonValue,
    } });
    return result;
  });
}
