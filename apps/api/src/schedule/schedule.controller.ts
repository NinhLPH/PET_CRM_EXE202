import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import {
  IsArray,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { Admin, id } from '../common/common';
import type { ActorRequest } from '../common/common';
import { ScheduleService } from './schedule.service';

class IntervalDto {
  @IsString()
  start: string;
  @IsString()
  end: string;
}
class ScheduleDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => IntervalDto)
  intervals: IntervalDto[];
  @IsInt() @Min(1) capacity: number;
  @IsInt() @Min(1) @Max(1440) slotStep: number;
}

@ApiTags('schedule')
@ApiCookieAuth()
@Controller('availability')
export class AvailabilityController {
  constructor(private readonly schedule: ScheduleService) {}
  @Get() show(
    @Query('serviceId') serviceId: string,
    @Query('date') date: string,
  ) {
    return this.schedule.availability(id(serviceId), date);
  }
}

@Admin()
@ApiTags('admin schedule')
@ApiCookieAuth()
@Controller('admin/schedule')
export class ScheduleController {
  constructor(private readonly schedule: ScheduleService) {}
  @Get('weekly') listWeekly() {
    return this.schedule.weekly();
  }
  @Get('exceptions') listExceptions(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.schedule.exceptions(from, to);
  }
  @Put('weekly/:weekday') weekly(
    @Param('weekday', ParseIntPipe) weekday: number,
    @Body() body: ScheduleDto,
    @Req() request: ActorRequest,
  ) {
    return this.schedule.saveWeekly(weekday, body, request.actor);
  }
  @Put('exceptions/:date') exception(
    @Param('date') date: string,
    @Body() body: ScheduleDto,
    @Req() request: ActorRequest,
  ) {
    return this.schedule.saveException(date, body, request.actor);
  }
  @Delete('exceptions/:date') deleteException(@Param('date') date: string, @Req() request: ActorRequest) {
    return this.schedule.deleteException(date, request.actor);
  }
}
