import { Body, Controller, Get, Param, Post, Query, Req } from '@nestjs/common';
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
  @Post(':id/activities') addActivity(@Param('id') customerId: string, @Req() request: ActorRequest, @Body() body: ActivityDto) { return this.activitiesService.addActivity(customerId, request.actor, body); }
}
