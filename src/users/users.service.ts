import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { UpdateUserDto } from './dto/update-user.dto';

import { CreateWorkerDto } from './dto/create-worker.dto';
import { UpdateWorkerDto } from './dto/update-worker.dto';
import { CreateWorkerDocumentDto } from './dto/create-worker-document.dto';
import { CreateTrainingAttemptDto } from './dto/create-training-attempt.dto';
import { ScheduleInterviewDto } from './dto/schedule-interview.dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll(pagination: PaginationQueryDto) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          name: true,
          phone: true,
          role: true,
          createdAt: true,
        },
      }),
      this.prisma.user.count(),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: {
        worker: {
          include: {
            documents: true,
            references: true,
            trainingAttempts: {
              orderBy: { takenAt: 'desc' },
            },
            reviews: {
              include: {
                family: {
                  include: {
                    user: {
                      select: { name: true },
                    },
                  },
                },
              },
            },
            interviews: true,
            bookings: {
              take: 5,
              orderBy: { date: 'desc' },
            },
          },
        },
        family: true,
      },
    });
  }

  // Worker Profile Management moved from WorkersService
  async findWorkers(pagination: PaginationQueryDto, filters?: any) {
    const { page = 1, limit = 10 } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.WorkerWhereInput = {
      isApproved: true,
    };

    if (filters?.experience) {
      where.experience = {
        contains: String(filters.experience),
        mode: 'insensitive',
      };
    }

    const [data, total] = await Promise.all([
      this.prisma.worker.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      }),
      this.prisma.worker.count({
        where,
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        lastPage: Math.ceil(total / limit),
      },
    };
  }

  async getWorkerProfileByUserId(userId: number) {
    return this.prisma.worker.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
          },
        },
        documents: {
          orderBy: { createdAt: 'desc' },
        },
        references: true,
        trainingAttempts: {
          orderBy: { takenAt: 'desc' },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            booking: true,
            family: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        interviews: {
          orderBy: { scheduledAt: 'desc' },
          include: {
            family: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
        bookings: {
          orderBy: { date: 'desc' },
          include: {
            family: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            payment: {
              include: {
                breakdown: true,
              },
            },
            review: true,
            contract: {
              include: {
                acceptances: true,
              },
            },
            shiftReport: true,
          },
        },
        contracts: {
          orderBy: { createdAt: 'desc' },
          include: {
            family: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            booking: true,
            acceptances: true,
          },
        },
        jobApplications: {
          orderBy: { createdAt: 'desc' },
          include: {
            jobPosting: {
              include: {
                family: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async createWorkerProfile(userId: number, dto: CreateWorkerDto) {
    return this.prisma.worker.create({
      data: {
        employeeCode: dto.employeeCode,
        bio: dto.bio,
        experience: dto.experience,
        jobTypes: dto.jobTypes,
        languages: dto.languages,
        services: dto.services,
        hourlyRate: dto.hourlyRate,
        dailyRate: dto.dailyRate,
        travelRate: dto.travelRate,
        nonSmoker: dto.nonSmoker,
        hasReliableTransportation: dto.hasReliableTransportation,
        availability: dto.availability,
        certifications: dto.certifications,
        userId,
      },
      include: {
        user: true,
      },
    });
  }

  async updateWorkerProfile(id: number, dto: UpdateWorkerDto) {
    const updateData: Prisma.WorkerUpdateInput = {
      employeeCode: dto.employeeCode,
      bio: dto.bio,
      experience: dto.experience,
      jobTypes: dto.jobTypes,
      languages: dto.languages,
      services: dto.services,
      hourlyRate: dto.hourlyRate,
      dailyRate: dto.dailyRate,
      travelRate: dto.travelRate,
      nonSmoker: dto.nonSmoker,
      hasReliableTransportation: dto.hasReliableTransportation,
      availability: dto.availability,
      certifications: dto.certifications,
    };

    return this.prisma.worker.update({
      where: { id },
      data: updateData,
    });
  }

  async getPendingWorkers() {
    return this.prisma.worker.findMany({
      where: { isApproved: false },
      include: { user: true },
    });
  }

  async approveWorker(id: number) {
    return this.prisma.worker.update({
      where: { id },
      data: { isApproved: true },
    });
  }

  async rejectWorker(id: number) {
    return this.prisma.worker.delete({
      where: { id },
    });
  }

  async createWorkerDocument(workerId: number, dto: CreateWorkerDocumentDto) {
    return this.prisma.workerDocument.create({
      data: {
        workerId,
        type: dto.type,
        title: dto.title,
        fileUrl: dto.fileUrl,
        issuedAt: dto.issuedAt ? new Date(dto.issuedAt) : undefined,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        notes: dto.notes,
      },
    });
  }

  async getWorkerDocuments(workerId: number) {
    return this.prisma.workerDocument.findMany({
      where: { workerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createTrainingAttempt(workerId: number, dto: CreateTrainingAttemptDto) {
    const passed = dto.score >= 80;

    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.trainingAttempt.create({
        data: {
          workerId,
          courseName: dto.courseName,
          score: dto.score,
          passed,
        },
      });

      if (passed) {
        await tx.worker.update({
          where: { id: workerId },
          data: { trainingPassed: true },
        });
      }

      return attempt;
    });
  }

  async scheduleInterview(workerId: number, dto: ScheduleInterviewDto) {
    return this.prisma.interviewSession.create({
      data: {
        workerId,
        familyId: dto.familyId,
        scheduledAt: new Date(dto.scheduledAt),
        notes: dto.notes,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: number, dto: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
      },
    });
  }

  async delete(id: number) {
    return this.prisma.user.delete({
      where: { id },
    });
  }
}
