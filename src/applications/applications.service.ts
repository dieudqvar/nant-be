import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationStatus } from '@prisma/client';

@Injectable()
export class ApplicationsService {
  constructor(private prisma: PrismaService) {}

  async apply(dto: CreateApplicationDto) {
    const { jobPostingId, workerId, coverLetter } = dto;

    // Check if job posting exists and is open
    const jobPosting = await this.prisma.jobPosting.findUnique({
      where: { id: jobPostingId },
    });
    if (!jobPosting) {
      throw new NotFoundException(
        `Job posting with ID ${jobPostingId} not found`,
      );
    }
    if (jobPosting.status !== 'OPEN') {
      throw new BadRequestException(
        'This job posting is no longer open for applications',
      );
    }

    // Check if worker exists and is approved
    const worker = await this.prisma.worker.findUnique({
      where: { id: workerId },
    });
    if (!worker) {
      throw new NotFoundException(`Worker with ID ${workerId} not found`);
    }
    if (!worker.isApproved) {
      throw new BadRequestException(
        'Worker profile must be approved to apply for jobs',
      );
    }

    // Check if already applied
    const existing = await this.prisma.jobApplication.findUnique({
      where: {
        jobPostingId_workerId: { jobPostingId, workerId },
      },
    });
    if (existing) {
      throw new ConflictException('You have already applied for this job');
    }

    return this.prisma.jobApplication.create({
      data: {
        jobPostingId,
        workerId,
        coverLetter,
      },
      include: {
        worker: {
          include: {
            user: { select: { name: true } },
          },
        },
        jobPosting: {
          select: { title: true },
        },
      },
    });
  }

  async findByJobPosting(jobPostingId: number) {
    return this.prisma.jobApplication.findMany({
      where: { jobPostingId },
      include: {
        worker: {
          include: {
            user: {
              select: { id: true, name: true, email: true, phone: true },
            },
            documents: true,
            references: true,
            reviews: {
              include: {
                family: {
                  include: {
                    user: { select: { name: true } },
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findByWorker(workerId: number) {
    return this.prisma.jobApplication.findMany({
      where: { workerId },
      include: {
        jobPosting: {
          include: {
            family: {
              include: {
                user: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStatus(id: number, status: ApplicationStatus) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: { jobPosting: true },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.jobApplication.update({
        where: { id },
        data: { status },
      });

      // If accepted, we might want to automatically close the job posting or create a booking
      // For now, just update status.
      // In a real scenario, accepting might move the process to "Interview" or "Booking"

      if (status === 'ACCEPTED') {
        // Optionally mark job as FILLED if family wants
        // await tx.jobPosting.update({ where: { id: application.jobPostingId }, data: { status: 'FILLED' } });
      }

      return updated;
    });
  }

  async findOne(id: number) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
      include: {
        worker: {
          include: { user: true },
        },
        jobPosting: {
          include: {
            family: {
              include: { user: true },
            },
          },
        },
      },
    });
    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }
    return application;
  }
}
