import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Admin, Customer, id } from '../common/common';
import type { ActorRequest } from '../common/common';
import { PetDto, UpdatePetDto } from './dto/pets.dto';
import { PetsService } from './pets.service';

@Customer()
@ApiTags('pets')
@ApiCookieAuth()
@Controller('pets')
export class PetsApiController {
  constructor(private readonly pets: PetsService) {}
  @Get('mine') mine(@Req() request: ActorRequest, @Query() query: { page?: string; limit?: string }) { return this.pets.petList(request.actor.customerId!, query); }
  @Get(':id') one(@Param('id') petId: string, @Req() request: ActorRequest) { return this.pets.pet(petId, request.actor); }
  @Post() create(@Req() request: ActorRequest, @Body() body: PetDto) { return this.pets.createPet(request.actor.customerId!, body); }
  @Patch(':id') update(@Param('id') petId: string, @Req() request: ActorRequest, @Body() body: UpdatePetDto) { return this.pets.updatePet(petId, request.actor, body); }
  @Delete(':id') remove(@Param('id') petId: string, @Req() request: ActorRequest) { return this.pets.deletePet(petId, request.actor); }
}

@Admin()
@ApiTags('admin pets')
@ApiCookieAuth()
@Controller('admin/pets')
export class AdminPetsApiController {
  constructor(private readonly pets: PetsService) {}
  @Patch(':petId') update(@Param('petId') petId: string, @Req() request: ActorRequest, @Body() body: UpdatePetDto) { return this.pets.updatePet(petId, request.actor, body, true); }
  @Delete(':petId') remove(@Param('petId') petId: string, @Req() request: ActorRequest) { return this.pets.deletePet(petId, request.actor, true); }
}

@Admin()
@ApiTags('admin customers')
@ApiCookieAuth()
@Controller('admin/customers')
export class AdminCustomerPetsApiController {
  constructor(private readonly petsService: PetsService) {}
  @Get(':id/pets') pets(@Param('id') customerId: string, @Query() query: { page?: string; limit?: string }) { return this.petsService.petList(id(customerId), query); }
  @Post(':id/pets') addPet(@Param('id') customerId: string, @Body() body: PetDto) { return this.petsService.createPet(id(customerId), body); }
}
