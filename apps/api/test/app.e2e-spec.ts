import { Test } from '@nestjs/testing';
import { ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('TailUp API v1 (e2e)', () => {
  it('protects private routes and exposes active public services', async () => {
    const prisma = {
      service: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    const app = module.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
    try {
      await request(app.getHttpServer()).get('/me/profile').expect(401);
      await request(app.getHttpServer()).get('/admin/dashboard').expect(401);
      const response = await request(app.getHttpServer())
        .get('/services?status=ACTIVE')
        .expect(200);
      expect(response.body).toEqual({
        items: [],
        total: 0,
        page: 1,
        limit: 20,
      });
    } finally {
      await app.close();
    }
  });
});
