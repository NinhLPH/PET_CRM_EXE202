import { Body, Controller, Get, Headers, Param, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin, Customer } from '../common/common';
import type { ActorRequest } from '../common/common';
import { CancelDto, CompleteDto, CreateBookingDto } from './dto/bookings.dto';
import { BookingWorkflowService } from './bookings.service';

@Customer()
@ApiTags('bookings')
@ApiCookieAuth()
@Controller('bookings')
export class BookingsApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Post() create(@Req() request: ActorRequest, @Headers('idempotency-key') key: string, @Body() body: CreateBookingDto) { return this.bookings.create(request.actor, body, key); }
  @Get('mine') mine(@Req() request: ActorRequest, @Query() query: { page?: string; limit?: string }) { return this.bookings.mine(request.actor, query); }
  @Get(':id') one(@Req() request: ActorRequest, @Param('id') bookingId: string) { return this.bookings.booking(bookingId, request.actor); }
}

@Admin()
@ApiTags('admin dashboard')
@ApiCookieAuth()
@Controller('admin/dashboard')
export class AdminDashboardApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Get() show() { return this.bookings.dashboard(); }
}

@Admin()
@ApiTags('admin bookings')
@ApiCookieAuth()
@Controller('admin/bookings')
export class AdminBookingsApiController {
  constructor(private readonly bookings: BookingWorkflowService) {}
  @Get() list(@Query() query: { status?: 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED'; date?: string; page?: string; limit?: string }) { return this.bookings.adminList(query); }
  @Get(':id') one(@Param('id') bookingId: string, @Req() request: ActorRequest) { return this.bookings.booking(bookingId, request.actor, true); }
  @Post(':id/confirm') confirm(@Param('id') bookingId: string) { return this.bookings.confirm(bookingId); }
  @Post(':id/cancel') cancel(@Param('id') bookingId: string, @Body() body: CancelDto = {}) { return this.bookings.cancel(bookingId, body); }
  @Post(':id/complete') complete(@Param('id') bookingId: string, @Body() body: CompleteDto) { return this.bookings.complete(bookingId, body); }
}
