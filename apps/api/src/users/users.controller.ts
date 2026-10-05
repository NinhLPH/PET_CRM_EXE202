import { Body, Controller, Get, Patch, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Customer } from '../common/common';
import type { ActorRequest } from '../common/common';
import { ProfileDto } from './dto/users.dto';
import { UsersService } from './users.service';

@Customer()
@ApiTags('me')
@ApiCookieAuth()
@Controller('me')
export class MeApiController {
  constructor(private readonly users: UsersService) {}
  @Get('profile') profile(@Req() request: ActorRequest) { return this.users.profile(request.actor); }
  @Patch('profile') update(@Req() request: ActorRequest, @Body() body: ProfileDto) { return this.users.updateProfile(request.actor, body); }
}
