import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin } from '../common/common';
import type { ActorRequest } from '../common/common';
import { ContactDto } from './dto/reminders.dto';
import { ReminderWorkflowService } from './reminders.service';

@Admin()
@ApiTags('admin reminders')
@ApiCookieAuth()
@Controller('admin/reminders')
export class AdminRemindersApiController {
  constructor(private readonly reminders: ReminderWorkflowService) {}
  @Get() list(@Query() query: { due?: string; page?: string; limit?: string }) { return this.reminders.list(query); }
  @Get(':id') one(@Param('id') reminderId: string) { return this.reminders.detail(reminderId); }
  @Post(':id/contact') contact(@Param('id') reminderId: string, @Req() request: ActorRequest, @Body() body: ContactDto) { return this.reminders.contact(reminderId, request.actor, body); }
}
