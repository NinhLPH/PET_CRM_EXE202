import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin, Customer } from '../common/common';
import type { ActorRequest } from '../common/common';
import {
  AdjustmentDto,
  AdminCreateBookingDto,
  CancelDto,
  CompleteDto,
  CreateBookingDto,
  RescheduleDto,
} from './dto/bookings.dto';
import { BookingWorkflowService } from './bookings.service';

@Customer()
@ApiTags('bookings')
@ApiCookieAuth()
@Controller('bookings')
export class BookingsApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Post() create(
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key: string,
    @Body() body: CreateBookingDto,
  ) {
    return this.bookings.create(request.actor, body, key);
  }
  @Get('mine') mine(
    @Req() request: ActorRequest,
    @Query() query: { page?: string; limit?: string },
  ) {
    return this.bookings.mine(request.actor, query);
  }
  @Get('operations/:key') operation(
    @Req() request: ActorRequest,
    @Param('key') key: string,
  ) { return this.bookings.operation(request.actor, key); }
  @Get(':id') one(
    @Req() request: ActorRequest,
    @Param('id') bookingId: string,
  ) {
    return this.bookings.booking(bookingId, request.actor);
  }
}

@Admin()
@ApiTags('admin dashboard')
@ApiCookieAuth()
@Controller('admin/dashboard')
export class AdminDashboardApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Get() show() {
    return this.bookings.dashboard();
  }
}

@Admin()
@ApiTags('admin bookings')
@ApiCookieAuth()
@Controller('admin/bookings')
export class AdminBookingsApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Post() create(
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key: string,
    @Body() body: AdminCreateBookingDto,
  ) {
    return this.bookings.create(request.actor, body, key);
  }
  @Get() list(
    @Query()
    query: {
      status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';
      date?: string;
      from?: string;
      to?: string;
      dateBasis?: 'bookingDate' | 'completedAt';
      page?: string;
      limit?: string;
    },
  ) {
    return this.bookings.adminList(query);
  }
  @Get('operations/:key') operation(
    @Req() request: ActorRequest,
    @Param('key') key: string,
  ) { return this.bookings.operation(request.actor, key); }
  @Get(':id') one(
    @Param('id') bookingId: string,
    @Req() request: ActorRequest,
  ) {
    return this.bookings.booking(bookingId, request.actor, true);
  }
  @Post(':id/confirm') confirm(
    @Param('id') bookingId: string,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.confirm(bookingId, request.actor, key);
  }
  @Post(':id/cancel') cancel(
    @Param('id') bookingId: string,
    @Body() body: CancelDto,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.cancel(bookingId, body, request.actor, key);
  }
  @Post(':id/reschedule') reschedule(
    @Param('id') bookingId: string,
    @Body() body: RescheduleDto,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.reschedule(
      bookingId,
      body.bookingDate,
      body.reason,
      request.actor,
      key,
    );
  }
  @Post(':id/no-show') noShow(
    @Param('id') bookingId: string,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.noShow(bookingId, request.actor, key);
  }
  @Post(':id/complete') complete(
    @Param('id') bookingId: string,
    @Body() body: CompleteDto,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.bookings.complete(bookingId, body, request.actor, key);
  }
  @Post(':id/adjustments') adjust(
    @Param('id') bookingId: string,
    @Body() body: AdjustmentDto,
    @Req() request: ActorRequest,
    @Headers('idempotency-key') key: string,
  ) {
    return this.bookings.adjust(
      bookingId,
      body.delta,
      body.reason,
      request.actor,
      key,
      body.reversalRef,
    );
  }
}
