import { Test } from '@nestjs/testing';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('MVP API contract', () => {
  it('exposes the 45 documented operations', async () => {
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
      expect(operations).toHaveLength(45);
      expect(document.paths['/auth/register']?.post).toBeDefined();
      expect(
        document.paths['/admin/bookings/{id}/complete']?.post,
      ).toBeDefined();
      expect(
        document.paths['/admin/reminders/{id}/contact']?.post,
      ).toBeDefined();
    } finally {
      await app.close();
    }
  });
});
