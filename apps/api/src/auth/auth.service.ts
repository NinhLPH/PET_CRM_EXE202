import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
} from 'node:crypto';
import { promisify } from 'node:util';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, digest } from '../common/common';

const scrypt = promisify(scryptCallback);
const phonePattern = /^0\d{9}$/;

@Injectable()
export class AuthWorkflowService {
  constructor(private readonly prisma: PrismaService) {}

  private async hash(password: string) {
    const salt = randomBytes(16).toString('hex');
    const key = (await scrypt(password, salt, 64)) as Buffer;
    return `scrypt:${salt}:${key.toString('hex')}`;
  }

  private async verify(password: string, stored: string) {
    const [method, salt, key] = stored.split(':');
    if (method !== 'scrypt' || !salt || !key) return false;
    const candidate = (await scrypt(password, salt, 64)) as Buffer;
    const expected = Buffer.from(key, 'hex');
    return (
      expected.length === candidate.length &&
      timingSafeEqual(expected, candidate)
    );
  }

  async register(body: {
    fullName: string;
    phone: string;
    password: string;
    confirmPassword: string;
  }) {
    if (
      !body.fullName?.trim() ||
      body.fullName.trim().length > 100 ||
      !phonePattern.test(body.phone) ||
      typeof body.password !== 'string' ||
      body.password.length < 8 ||
      body.password !== body.confirmPassword
    )
      throw new BadRequestException('Dữ liệu đăng ký không hợp lệ');
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${body.phone}`}, 0))`;
      if (await tx.user.findUnique({ where: { phone: body.phone } }))
        throw new ConflictException('Số điện thoại đã có tài khoản');
      const matches = await tx.customer.findMany({
        where: { phone: body.phone },
        take: 2,
      });
      if (matches.length > 1)
        throw new ConflictException('Có nhiều hồ sơ CRM cùng SĐT');
      if (matches[0]?.userId)
        throw new ConflictException('Hồ sơ CRM đã liên kết tài khoản');
      const user = await tx.user.create({
        data: {
          phone: body.phone,
          passwordHash: await this.hash(body.password),
          role: 'CUSTOMER',
        },
      });
      if (matches[0])
        await tx.customer.update({
          where: { id: matches[0].id },
          data: { userId: user.id, fullName: body.fullName.trim() },
        });
      else
        await tx.customer.create({
          data: {
            userId: user.id,
            fullName: body.fullName.trim(),
            phone: body.phone,
          },
        });
      return { id: user.id, phone: user.phone, role: user.role };
    });
  }

  async login(body: { phone: string; password: string }, response: Response) {
    if (!phonePattern.test(body.phone) || !body.password)
      throw new BadRequestException('SĐT và mật khẩu là bắt buộc');
    const user = await this.prisma.user.findUnique({
      where: { phone: body.phone },
    });
    if (!user || !(await this.verify(body.password, user.passwordHash)))
      throw new UnauthorizedException('SĐT hoặc mật khẩu không đúng');
    if (user.status !== 'ACTIVE')
      throw new UnauthorizedException('Tài khoản không khả dụng');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.userSession.create({
      data: { userId: user.id, tokenHash: digest(token), expiresAt },
    });
    response.cookie('petcare_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    });
    return { role: user.role, userId: user.id };
  }

  async logout(actor: Actor, response: Response) {
    await this.prisma.userSession.update({
      where: { id: actor.sessionId },
      data: { revokedAt: new Date() },
    });
    response.clearCookie('petcare_session', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });
    return { success: true };
  }
}
