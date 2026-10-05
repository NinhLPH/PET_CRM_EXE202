import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { AuthRateGuard, Public } from '../common/common';
import type { ActorRequest } from '../common/common';
import { LoginDto, RegisterDto } from './dto/auth.dto';
import { AuthWorkflowService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthApiController {
  constructor(private readonly auth: AuthWorkflowService) {}
  @Public() @UseGuards(AuthRateGuard) @Post('register') register(@Body() body: RegisterDto) { return this.auth.register(body); }
  @Public() @UseGuards(AuthRateGuard) @Post('login') login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) { return this.auth.login(body, response); }
  @Post('logout') logout(@Req() request: ActorRequest, @Res({ passthrough: true }) response: Response) { return this.auth.logout(request.actor, response); }
}
