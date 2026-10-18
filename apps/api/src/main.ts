import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  BadRequestException,
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  ValidationPipe,
} from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { map } from 'rxjs';
import { serialize } from './common/common';
import { Prisma } from '@prisma/client';

@Catch()
class ApiErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse();
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      ['P2002', 'P2003'].includes(error.code)
    ) {
      response
        .status(409)
        .json({
          code: 'CONFLICT',
          message: 'Dữ liệu đã tồn tại hoặc đang được sử dụng',
        });
      return;
    }
    const status = error instanceof HttpException ? error.getStatus() : 500;
    const detail =
      error instanceof HttpException
        ? error.getResponse()
        : 'Internal server error';
    const value =
      typeof detail === 'string'
        ? { message: detail }
        : (detail as Record<string, unknown>);
    response
      .status(status)
      .json({
        code:
          status === 500 ? 'INTERNAL_ERROR' : (value.code ?? `HTTP_${status}`),
        message: value.message ?? 'Request failed',
        ...(value.currentQuote ? { currentQuote: value.currentQuote } : {}),
        ...(value.errors ? { errors: value.errors } : {}),
      });
  }
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowed = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (allowed.length) app.enableCors({ origin: allowed, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          code: 'VALIDATION_ERROR',
          message: 'Dữ liệu không hợp lệ',
          errors: errors.map((error) => ({
            field: error.property,
            messages: Object.values(error.constraints ?? {}),
          })),
        }),
    }),
  );
  app.useGlobalInterceptors({
    intercept: (_context, next) =>
      next.handle().pipe(map((value) => serialize(value))),
  });
  app.useGlobalFilters(new ApiErrorFilter());
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('TailUp CRM API v1')
      .setVersion('1.0')
      .addCookieAuth('petcare_session')
      .build(),
  );
  SwaggerModule.setup('openapi', app, document);
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
