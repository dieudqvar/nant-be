import { Controller, Get, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BookingsService } from './bookings.service';
import { JwtAuthGuard } from '../auth/jwt.guard';

@ApiTags('Bookings')
@Controller('bookings')
export class BookingsController {
  constructor(private bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all bookings' })
  @ApiResponse({ status: 200, description: 'List of bookings' })
  async findAll() {
    return this.bookingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get booking by ID' })
  @ApiResponse({ status: 200, description: 'Booking found' })
  @ApiResponse({ status: 404, description: 'Booking not found' })
  async findById(@Param('id') id: string) {
    return this.bookingsService.findById(parseInt(id));
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Create new booking' })
  @ApiResponse({ status: 201, description: 'Booking created' })
  async create(@Body() data: any) {
    return this.bookingsService.create(data);
  }

  @Post(':id/confirm')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Confirm booking' })
  @ApiResponse({ status: 200, description: 'Booking confirmed' })
  async confirm(@Param('id') id: string) {
    return this.bookingsService.updateStatus(parseInt(id), 'CONFIRMED');
  }

  @Post(':id/cancel')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Cancel booking' })
  @ApiResponse({ status: 200, description: 'Booking cancelled' })
  async cancel(@Param('id') id: string) {
    return this.bookingsService.cancel(parseInt(id));
  }
}
