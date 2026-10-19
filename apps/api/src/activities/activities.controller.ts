import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin } from '../common/common';
import type { ActorRequest } from '../common/common';
import { ActivityDto } from './dto/activities.dto';
import { ActivitiesService } from './activities.service';

@Admin()
@ApiTags('admin customers')
@ApiCookieAuth()
@Controller('admin/customers')
export class AdminCustomerActivitiesApiController {
  constructor(private readonly activitiesService: ActivitiesService) {}
  @Get(':id/activities') activities(@Param('id') customerId: string, @Query() query: { page?: string; limit?: string }) { return this.activitiesService.activities(customerId, query); }
  @Post(':id/activities') addActivity(@Param('id') customerId: string, @Req() request: ActorRequest, @Body() body: ActivityDto, @Headers('idempotency-key') key?: string) { return this.activitiesService.addActivity(customerId, request.actor, body, key); }
}
