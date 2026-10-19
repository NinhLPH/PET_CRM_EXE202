import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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
import { IdentityPurpose } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { Actor, SESSION_IDLE_MS, digest, id } from '../common/common';

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

  async issueEvidence(
    actor: Actor,
    body: {
      phone: string;
      purpose: IdentityPurpose;
      customerId?: string;
      evidenceSummary: string;
    },
  ) {
    if (actor.role !== 'ADMIN' || !actor.canVerifyIdentity)
      throw new ForbiddenException('Chưa có quyền xác minh danh tính');
    if (
      !phonePattern.test(body.phone) ||
      !body.evidenceSummary?.trim() ||
      body.evidenceSummary.length > 500
    )
      throw new BadRequestException('Bằng chứng xác minh không hợp lệ');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const record = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`identity:${body.phone}:${body.purpose}`}, 0))`;
      let customerId: bigint | null = null;
      if (body.purpose === 'LINK') {
        if (!body.customerId)
          throw new BadRequestException('Cần chọn hồ sơ CRM');
        const customer = await tx.customer.findUnique({
          where: { id: id(body.customerId) },
        });
        if (!customer || customer.phone !== body.phone || customer.userId)
          throw new ConflictException('Hồ sơ CRM không thể liên kết');
        const count = await tx.customer.count({ where: { phone: body.phone } });
        if (count !== 1)
          throw new ConflictException('Có nhiều hồ sơ CRM cùng SĐT');
        customerId = customer.id;
      } else {
        const user = await tx.user.findUnique({ where: { phone: body.phone } });
        if (!user || user.role !== 'CUSTOMER')
          throw new ConflictException(
            'Tài khoản không thể khôi phục theo quy trình này',
          );
      }
      await tx.identityEvidence.updateMany({
        where: {
          subjectPhone: body.phone,
          purpose: body.purpose,
          consumedAt: null,
        },
        data: { consumedAt: new Date() },
      });
      const evidence = await tx.identityEvidence.create({
        data: {
          purpose: body.purpose,
          subjectPhone: body.phone,
          customerId,
          tokenHash: digest(token),
          evidenceSummary: body.evidenceSummary.trim(),
          issuedBy: actor.id,
          expiresAt,
        },
      });
      await tx.auditEvent.create({ data: {
        actorId: actor.id, action: 'ISSUE_IDENTITY_EVIDENCE', objectType: 'IDENTITY_EVIDENCE',
        objectId: evidence.id.toString(), change: { purpose: body.purpose, customerId: customerId?.toString() ?? null },
      } });
      return evidence;
    });
    return { evidenceId: record.id, verificationToken: token, expiresAt };
  }

  private async checkEvidence(
    phone: string,
    purpose: IdentityPurpose,
    token: string,
  ) {
    if (!phonePattern.test(phone) || !token || token.length > 200)
      throw new UnauthorizedException('Xác minh không hợp lệ hoặc đã hết hạn');
    const result = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`identity:${phone}:${purpose}`}, 0))`;
      const evidence = await tx.identityEvidence.findFirst({
        where: {
          subjectPhone: phone,
          purpose,
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 3 },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (!evidence) return null;
      if (evidence.tokenHash !== digest(token)) {
        await tx.identityEvidence.update({
          where: { id: evidence.id },
          data: { attempts: { increment: 1 } },
        });
        return null;
      }
      return evidence.id;
    });
    if (!result)
      throw new UnauthorizedException('Xác minh không hợp lệ hoặc đã hết hạn');
    return result;
  }

  async register(body: {
    fullName: string;
    phone: string;
    password: string;
    confirmPassword: string;
    verificationToken?: string;
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
    const evidenceId = body.verificationToken
      ? await this.checkEvidence(body.phone, 'LINK', body.verificationToken)
      : null;
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
      if (matches.length && !evidenceId)
        throw new ConflictException({
          code: 'CRM_LINK_VERIFICATION_REQUIRED',
          message: 'Hồ sơ CRM cần được xác minh trước khi liên kết',
        });
      if (!matches.length && evidenceId)
        throw new ConflictException('Hồ sơ CRM đã thay đổi');
      if (evidenceId) {
        const consumed = await tx.identityEvidence.updateMany({
          where: {
            id: evidenceId,
            purpose: 'LINK',
            subjectPhone: body.phone,
            customerId: matches[0].id,
            consumedAt: null,
            expiresAt: { gt: new Date() },
            attempts: { lt: 3 },
            tokenHash: digest(body.verificationToken!),
          },
          data: { consumedAt: new Date() },
        });
        if (!consumed.count)
          throw new ConflictException('Xác minh đã hết hạn hoặc đã dùng');
      }
      const user = await tx.user.create({
        data: {
          phone: body.phone,
          passwordHash: await this.hash(body.password),
          role: 'CUSTOMER',
        },
      });
      if (evidenceId)
        await tx.customer.update({
          where: { id: matches[0].id },
          data: { userId: user.id },
        });
      else
        await tx.customer.create({
          data: {
            userId: user.id,
            fullName: body.fullName.trim(),
            phone: body.phone,
          },
        });
      if (evidenceId) await tx.auditEvent.create({ data: {
        actorId: user.id, action: 'LINK_CRM', objectType: 'CUSTOMER',
        objectId: matches[0].id.toString(), change: { userId: user.id.toString(), evidenceId: evidenceId.toString() },
      } });
      return { id: user.id, phone: user.phone, role: user.role };
    });
  }

  async recover(body: {
    phone: string;
    verificationToken: string;
    newPassword: string;
    confirmPassword: string;
  }) {
    if (
      !phonePattern.test(body.phone) ||
      !body.newPassword ||
      body.newPassword.length < 8 ||
      body.newPassword !== body.confirmPassword
    )
      throw new BadRequestException('Dữ liệu khôi phục không hợp lệ');
    const evidenceId = await this.checkEvidence(
      body.phone,
      'RECOVERY',
      body.verificationToken,
    );
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${body.phone}`}, 0))`;
      const user = await tx.user.findUnique({ where: { phone: body.phone } });
      if (!user || user.role !== 'CUSTOMER')
        throw new ConflictException('Tài khoản đã thay đổi');
      const consumed = await tx.identityEvidence.updateMany({
        where: {
          id: evidenceId,
          purpose: 'RECOVERY',
          subjectPhone: body.phone,
          tokenHash: digest(body.verificationToken),
          consumedAt: null,
          expiresAt: { gt: new Date() },
          attempts: { lt: 3 },
        },
        data: { consumedAt: new Date() },
      });
      if (!consumed.count)
        throw new ConflictException('Xác minh đã hết hạn hoặc đã dùng');
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash: await this.hash(body.newPassword) },
      });
      await tx.userSession.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.auditEvent.create({ data: {
        actorId: user.id, action: 'RECOVER_PASSWORD', objectType: 'USER',
        objectId: user.id.toString(), change: { evidenceId: evidenceId.toString(), sessionsRevoked: true },
      } });
      return { success: true };
    });
  }

  async login(body: { phone: string; password: string }, response: Response) {
    if (!phonePattern.test(body.phone) || !body.password)
      throw new BadRequestException('SĐT và mật khẩu là bắt buộc');
    const token = randomBytes(32).toString('base64url');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const user = await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`customer-phone:${body.phone}`}, 0))`;
      const found = await tx.user.findUnique({ where: { phone: body.phone } });
      if (!found || !(await this.verify(body.password, found.passwordHash)))
        throw new UnauthorizedException('SĐT hoặc mật khẩu không đúng');
      if (found.status !== 'ACTIVE')
        throw new UnauthorizedException('Tài khoản không khả dụng');
      await tx.userSession.create({
        data: { userId: found.id, tokenHash: digest(token), expiresAt },
      });
      const keep = await tx.userSession.findMany({
        where: { userId: found.id, revokedAt: null, expiresAt: { gt: new Date() }, lastSeenAt: { gt: new Date(Date.now() - SESSION_IDLE_MS) } },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 5,
        select: { id: true },
      });
      await tx.userSession.updateMany({
        where: { userId: found.id, revokedAt: null, id: { notIn: keep.map((item) => item.id) } },
        data: { revokedAt: new Date() },
      });
      return found;
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
