import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('API contract', () => {
  it('retains v1 operations and exposes v2 booking and schedule operations', async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const app = module.createNestApplication();
    try {
      const document = SwaggerModule.createDocument(app, {
        openapi: '3.0.0',
        info: { title: 'TailUp CRM', version: '1.0' },
      });
      const operations = Object.values(document.paths).flatMap((path) =>
        Object.keys(path ?? {}),
      );
      expect(operations.length).toBeGreaterThanOrEqual(61);
      expect(document.paths['/health/live']?.get).toBeDefined();
      expect(document.paths['/health/ready']?.get).toBeDefined();
      expect(document.paths['/admin/reports/bookings']?.get).toBeDefined();
      expect(document.paths['/admin/reports/value']?.get).toBeDefined();
      expect(document.paths['/admin/reports/care']?.get).toBeDefined();
      expect(document.paths['/admin/audit']?.get).toBeDefined();
      expect(document.paths['/admin/bookings/operations/{key}']?.get).toBeDefined();
      expect(document.paths['/admin/operations/{key}']?.get).toBeDefined();
      expect(document.paths['/operations/{key}']?.get).toBeDefined();
      expect(document.paths['/auth/recover']?.post).toBeDefined();
      expect(document.paths['/admin/identity-evidence']?.post).toBeDefined();
      expect(document.paths['/admin/bookings']?.post).toBeDefined();
      expect(document.paths['/auth/register']?.post).toBeDefined();
      expect(
        document.paths['/admin/bookings/{id}/complete']?.post,
      ).toBeDefined();
      expect(
        document.paths['/admin/reminders/{id}/contact']?.post,
      ).toBeDefined();
      expect(document.paths['/availability']?.get).toBeDefined();
      expect(
        document.paths['/admin/schedule/weekly/{weekday}']?.put,
      ).toBeDefined();
      expect(
        document.paths['/admin/schedule/exceptions/{date}']?.put,
      ).toBeDefined();
      expect(document.paths['/admin/schedule/exceptions/{date}']?.delete).toBeDefined();
      expect(
        document.paths['/admin/bookings/{id}/reschedule']?.post,
      ).toBeDefined();
      expect(
        document.paths['/admin/bookings/{id}/no-show']?.post,
      ).toBeDefined();
      expect(
        document.paths['/admin/bookings/{id}/adjustments']?.post,
      ).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
