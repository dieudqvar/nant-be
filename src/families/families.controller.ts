import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { FamiliesService } from './families.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Families')
@Controller('families')
export class FamiliesController {
  constructor(private familiesService: FamiliesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all families' })
  @ApiResponse({ status: 200, description: 'List of families' })
  async findAll() {
    return this.familiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get family by ID' })
  @ApiResponse({ status: 200, description: 'Family found' })
  @ApiResponse({ status: 404, description: 'Family not found' })
  async findById(@Param('id') id: string) {
    return this.familiesService.findById(parseInt(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create family profile' })
  @ApiResponse({ status: 201, description: 'Family created' })
  async create(@Body() data: any) {
    return this.familiesService.create(data.userId, data);
  }
}
