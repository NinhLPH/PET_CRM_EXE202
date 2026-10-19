import { Controller, Get, Query } from '@nestjs/common';
import { Admin } from '../common/common';
import { ReportsService } from './reports.service';

@Admin()
@Controller('admin/reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get('bookings') bookings(
    @Query('from') from: string,
    @Query('to') to: string,
  ) {
    return this.reports.bookings(from, to);
  }
  @Get('value') value(@Query('from') from: string, @Query('to') to: string) {
    return this.reports.value(from, to);
  }
  @Get('care') care(@Query('from') from: string, @Query('to') to: string, @Query('windowDays') days?: string) {
    return this.reports.care(from, to, days === undefined ? 30 : Number(days));
  }
}
