import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { Public } from '../common/common';
import { PrismaService } from '../prisma/prisma.service';

@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get('live') live() {
    return { status: 'ok' };
  }

  @Get('ready') async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      const [operators, services, weeklyRules, unresolved] = await Promise.all([
        this.db.user.count({
          where: { role: 'ADMIN', status: 'ACTIVE', canVerifyIdentity: true },
        }),
        this.db.service.count({
          where: {
            status: 'ACTIVE',
            estimatedDuration: { gt: 0 },
            prices: { some: { status: 'ACTIVE', species: { not: null } } },
            reminderConfigs: { some: { status: 'ACTIVE' } },
          },
        }),
        this.db.workingSchedule.count({ where: { intervals: { not: [] } } }),
        this.db.booking.count({
          where: { status: 'CONFIRMED', scheduledEnd: null },
        }),
      ]);
      const missing = [
        ...(!operators ? ['IDENTITY_OPERATOR'] : []),
        ...(!services ? ['ACTIVE_SERVICE_PRICE_DURATION_REMINDER'] : []),
        ...(!weeklyRules ? ['WORKING_SCHEDULE'] : []),
        ...(unresolved ? ['LEGACY_CONFIRMED_END'] : []),
      ];
      if (missing.length)
        throw new ServiceUnavailableException({
          code: 'NOT_READY',
          message: 'Cấu hình chưa sẵn sàng',
          errors: missing,
        });
      return { status: 'ready' };
    } catch (error) {
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException({ code: 'DATABASE_UNAVAILABLE' });
    }
  }
}
