import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WorkersService } from './workers.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Workers')
@Controller('workers')
export class WorkersController {
  constructor(private workersService: WorkersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all approved workers' })
  @ApiResponse({ status: 200, description: 'List of workers' })
  async findAll() {
    return this.workersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get worker by ID' })
  @ApiResponse({ status: 200, description: 'Worker found' })
  @ApiResponse({ status: 404, description: 'Worker not found' })
  async findById(@Param('id') id: string) {
    return this.workersService.findById(parseInt(id));
  }

  @Get('pending')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get pending worker approvals' })
  @ApiResponse({ status: 200, description: 'Pending workers' })
  async getPending() {
    return this.workersService.getPending();
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create worker profile' })
  @ApiResponse({ status: 201, description: 'Worker created' })
  async create(@Body() data: any) {
    return this.workersService.create(data.userId, data);
  }

  @Post(':id/approve')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Approve worker' })
  @ApiResponse({ status: 200, description: 'Worker approved' })
  async approve(@Param('id') id: string) {
    return this.workersService.approve(parseInt(id));
  }

  @Post(':id/reject')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Reject worker' })
  @ApiResponse({ status: 200, description: 'Worker rejected' })
  async reject(@Param('id') id: string) {
    return this.workersService.reject(parseInt(id));
  }
}
