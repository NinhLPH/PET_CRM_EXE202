import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  HttpException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Prisma } from '@prisma/client';
import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { PrismaService } from '../prisma/prisma.service';

export const PUBLIC = 'publicRoute';
export const ADMIN = 'adminRoute';
export const CUSTOMER = 'customerRoute';
export const Public = () => SetMetadata(PUBLIC, true);
export const Admin = () => SetMetadata(ADMIN, true);
export const Customer = () => SetMetadata(CUSTOMER, true);

export function id(value: string): bigint {
  if (!/^[1-9]\d*$/.test(value))
    throw new BadRequestException('ID không hợp lệ');
  return BigInt(value);
}

export function page(query: { page?: string; limit?: string }) {
  const number = query.page === undefined ? 1 : Number(query.page);
  const limit = query.limit === undefined ? 20 : Number(query.limit);
  if (
    !Number.isInteger(number) ||
    number < 1 ||
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  )
    throw new BadRequestException('Phân trang không hợp lệ');
  return { skip: (number - 1) * limit, take: limit, page: number, limit };
}

export function serialize(value: unknown, key = ''): unknown {
  if (typeof value === 'bigint') return value.toString();
  if (value instanceof Prisma.Decimal)
    return [
      'price',
      'basePrice',
      'finalPrice',
      'estimatedTotal',
      'finalTotal',
      'discountAmount',
      'amount',
    ].includes(key)
      ? Number(value)
      : value.toString();
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => serialize(item, key));
  if (value && typeof value === 'object')
    return Object.fromEntries(
      Object.entries(value).map(([field, item]) => [
        field,
        serialize(item, field),
      ]),
    );
  return value;
}

export const digest = (value: string) =>
  createHash('sha256').update(value).digest('hex');

function checkOrigin(request: any) {
  const origin = request.headers.origin;
  if (!origin) return;
  const allowed = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  try {
    if (
      new URL(origin).host === request.headers.host ||
      allowed.includes(origin)
    )
      return;
  } catch {
    /* invalid origin */
  }
  throw new ForbiddenException('Origin không được phép');
}

export function localDayStart(date: Date): Date {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Ho_Chi_Minh',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .formatToParts(date)
      .map((part) => [part.type, part.value]),
  );
  return new Date(`${parts.year}-${parts.month}-${parts.day}T00:00:00+07:00`);
}

export function addLocalDays(date: Date, days: number): Date {
  const start = localDayStart(date);
  start.setUTCDate(start.getUTCDate() + days);
  return start;
}

export interface Actor {
  id: bigint;
  role: 'CUSTOMER' | 'ADMIN';
  customerId?: bigint;
  sessionId: bigint;
}

export type ActorRequest = Request & { actor: Actor };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}
  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const request = context.switchToHttp().getRequest();
    const cookie = String(request.headers.cookie ?? '')
      .split(';')
      .map((part: string) => part.trim())
      .find((part: string) => part.startsWith('petcare_session='));
    const token = cookie?.slice('petcare_session='.length);
    if (!token) throw new UnauthorizedException('Phiên đã hết hạn');
    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: digest(token) },
      include: { user: { include: { customer: true } } },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== 'ACTIVE'
    )
      throw new UnauthorizedException('Phiên đã hết hạn');
    if (
      this.reflector.getAllAndOverride<boolean>(ADMIN, [
        context.getHandler(),
        context.getClass(),
      ]) &&
      session.user.role !== 'ADMIN'
    )
      throw new ForbiddenException('Bạn không có quyền thực hiện');
    if (
      this.reflector.getAllAndOverride<boolean>(CUSTOMER, [
        context.getHandler(),
        context.getClass(),
      ]) &&
      session.user.role !== 'CUSTOMER'
    )
      throw new ForbiddenException('Bạn không có quyền thực hiện');
    if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method)) {
      checkOrigin(request);
    }
    request.actor = {
      id: session.userId,
      role: session.user.role,
      customerId: session.user.customer?.id,
      sessionId: session.id,
    } satisfies Actor;
    return true;
  }
}

@Injectable()
export class AuthRateGuard implements CanActivate {
  private readonly attempts = new Map<
    string,
    { count: number; resetAt: number }
  >();
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    checkOrigin(req);
    const key = `${req.ip}:${req.route?.path ?? req.path}`;
    const now = Date.now();
    const entry = this.attempts.get(key);
    if (!entry || entry.resetAt <= now) {
      this.attempts.set(key, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    if (++entry.count > 10)
      throw new HttpException('Quá nhiều yêu cầu, vui lòng thử lại sau', 429);
    return true;
  }
}
