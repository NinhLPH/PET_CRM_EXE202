import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Put, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin, Public } from '../common/common';
import { PriceDto, ReminderConfigDto, ServiceDto, StatusDto, UpdateServiceDto } from './dto/services.dto';
import { ServicesService } from './services.service';

@ApiTags('services')
@Controller('services')
export class PublicServicesApiController {
  constructor(private readonly services: ServicesService) {}
  @Public() @Get() list(@Query('status') status?: string, @Query() query?: { page?: string; limit?: string }) {
    if (status && status !== 'ACTIVE') throw new BadRequestException('Chỉ hỗ trợ status=ACTIVE');
    return this.services.publicServices(query);
  }
  @Public() @Get(':id/quote') quote(@Param('id') serviceId: string, @Query('species') species: 'DOG' | 'CAT', @Query('weight') weight: string) { return this.services.quote(serviceId, species, weight); }
}

@Admin()
@ApiTags('admin services')
@ApiCookieAuth()
@Controller('admin/services')
export class AdminServicesApiController {
  constructor(private readonly services: ServicesService) {}
  @Get() list(@Query() query: { page?: string; limit?: string }) { return this.services.adminServices(query); }
  @Post() create(@Body() body: ServiceDto) { return this.services.createService(body); }
  @Patch(':id') update(@Param('id') serviceId: string, @Body() body: UpdateServiceDto) { return this.services.updateService(serviceId, body); }
  @Patch(':id/status') status(@Param('id') serviceId: string, @Body() body: StatusDto) { return this.services.serviceStatus(serviceId, body.status); }
  @Get(':id/prices') prices(@Param('id') serviceId: string, @Query('species') species?: 'DOG' | 'CAT', @Query() query?: { page?: string; limit?: string }) {
    if (species && !['DOG', 'CAT'].includes(species)) throw new BadRequestException('Loài không hợp lệ');
    return this.services.prices(serviceId, species, query);
  }
  @Post(':id/prices') createPrice(@Param('id') serviceId: string, @Body() body: PriceDto) { return this.services.createPrice(serviceId, body); }
  @Patch(':id/prices/:priceId') updatePrice(@Param('id') serviceId: string, @Param('priceId') priceId: string, @Body() body: PriceDto) { return this.services.updatePrice(serviceId, priceId, body); }
  @Get(':id/reminder-config') reminderConfig(@Param('id') serviceId: string) { return this.services.reminderConfig(serviceId); }
  @Put(':id/reminder-config') putReminderConfig(@Param('id') serviceId: string, @Body() body: ReminderConfigDto) { return this.services.putReminderConfig(serviceId, body); }
}

@Admin()
@ApiTags('admin prices')
@ApiCookieAuth()
@Controller('admin/prices')
export class AdminPricesApiController {
  constructor(private readonly services: ServicesService) {}
  @Patch(':priceId/status') status(@Param('priceId') priceId: string, @Body() body: StatusDto) { return this.services.priceStatus(priceId, body.status); }
}
