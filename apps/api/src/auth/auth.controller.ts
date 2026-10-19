import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import {
  Admin,
  AuthRateGuard,
  IdentityOperator,
  Public,
} from '../common/common';
import type { ActorRequest } from '../common/common';
import {
  IssueEvidenceDto,
  LoginDto,
  RecoverDto,
  RecoveryRequestDto,
  RegisterDto,
} from './dto/auth.dto';
import { AuthWorkflowService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthApiController {
  constructor(private readonly auth: AuthWorkflowService) {}
  @Get('context') context(@Req() request: ActorRequest) {
    const actor = request.actor;
    return {
      role: actor.role,
      userId: actor.id,
      customerId: actor.customerId ?? null,
      capabilities: { canVerifyIdentity: !!actor.canVerifyIdentity },
    };
  }
  @Public() @UseGuards(AuthRateGuard) @Post('register') register(
    @Body() body: RegisterDto,
  ) {
    return this.auth.register(body);
  }
  @Public() @UseGuards(AuthRateGuard) @Post('login') login(
    @Body() body: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.login(body, response);
  }
  @Public() @UseGuards(AuthRateGuard) @Post('recover') recover(
    @Body() body: RecoverDto,
  ) {
    return this.auth.recover(body);
  }
  @Public() @UseGuards(AuthRateGuard) @Post('recovery/request') recoveryRequest(
    @Body() _body: RecoveryRequestDto,
  ) {
    return {
      message:
        'Nếu cần khôi phục, vui lòng liên hệ nhân viên cửa hàng để xác minh',
    };
  }
  @Post('logout') logout(
    @Req() request: ActorRequest,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.auth.logout(request.actor, response);
  }
}

@Admin()
@IdentityOperator()
@ApiTags('admin identity')
@Controller('admin/identity-evidence')
export class AdminIdentityController {
  constructor(private readonly auth: AuthWorkflowService) {}
  @Post() issue(@Req() request: ActorRequest, @Body() body: IssueEvidenceDto) {
    return this.auth.issueEvidence(request.actor, body);
  }
}
