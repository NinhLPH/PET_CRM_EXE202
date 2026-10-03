import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin } from '../common/common';
import { CustomerDto, UpdateCustomerDto } from './dto/customers.dto';
import { CustomersService } from './customers.service';

@Admin()
@ApiTags('admin customers')
@ApiCookieAuth()
@Controller('admin/customers')
export class AdminCustomersApiController {
  constructor(private readonly customers: CustomersService) {}
  @Get() list(@Query() query: { q?: string; page?: string; limit?: string }) { return this.customers.customers(query); }
  @Get(':id') one(@Param('id') customerId: string) { return this.customers.customer(customerId); }
  @Post() create(@Body() body: CustomerDto) { return this.customers.createCustomer(body); }
  @Patch(':id') update(@Param('id') customerId: string, @Body() body: UpdateCustomerDto) { return this.customers.updateCustomer(customerId, body); }
  @Delete(':id') remove(@Param('id') customerId: string) { return this.customers.deleteCustomer(customerId); }
}
