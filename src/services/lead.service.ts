import { PrismaClient, Lead } from '@prisma/client';
import { BadRequestError, NotFoundError } from '../utils/errors';
import { cacheService } from './cache.service';
import { CreateLeadSchema, UpdateLeadSchema } from '../validators/lead.validator';
import { z } from 'zod';

/**
 * LeadStatus enum defines the possible stages of a lead in our CRM.
 * Using a manual enum here since SQLite doesn't natively support Prisma enums.
 */
export enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

const prisma = new PrismaClient();

/**
 * STATUS_FLOW defines the strict "State Machine" for lead transitions.
 * This ensures data integrity by preventing illogical jumps (e.g., NEW -> CONVERTED).
 */
const STATUS_FLOW: Record<string, string[]> = {
  [LeadStatus.NEW]: [LeadStatus.CONTACTED, LeadStatus.LOST],
  [LeadStatus.CONTACTED]: [LeadStatus.QUALIFIED, LeadStatus.LOST],
  [LeadStatus.QUALIFIED]: [LeadStatus.CONVERTED, LeadStatus.LOST],
  [LeadStatus.CONVERTED]: [], // Terminal state
  [LeadStatus.LOST]: [],      // Terminal state
};

export class LeadService {
  private static getCacheKey(id: string) {
    return `lead_record:${id}`;
  }

  /**
   * Creates a new lead. All leads start in the 'NEW' status by default.
   */
  static async create(data: any): Promise<Lead> {
    const lead = await prisma.lead.create({
      data: {
        ...data,
        status: LeadStatus.NEW,
      },
    });
    return lead;
  }

  /**
   * Retrieves leads with support for filtering, search, and pagination.
   */
  static async findAll(filters: any) {
    const { status, search, sortBy, order, page, limit } = filters;

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
      ];
    }

    // We run count and findMany in parallel to optimize response time
    const [totalCount, leads] = await Promise.all([
      prisma.lead.count({ where }),
      prisma.lead.findMany({
        where,
        orderBy: { [sortBy]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      total: totalCount,
      page,
      limit,
      data: leads,
    };
  }

  /**
   * Fetches a single lead, checking the cache first for extra speed.
   */
  static async findById(id: string): Promise<Lead> {
    const cacheKey = this.getCacheKey(id);
    const cachedData = await cacheService.get(cacheKey);
    
    if (cachedData) return cachedData;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError(`Lead with ID ${id} not found`);

    await cacheService.set(cacheKey, lead);
    return lead;
  }

  /**
   * Updates lead fields. Note: Status changes are handled separately 
   * via transitionStatus for better control.
   */
  static async update(id: string, data: any): Promise<Lead> {
    const existingLead = await prisma.lead.findUnique({ where: { id } });
    if (!existingLead) throw new NotFoundError('Cannot update: Lead not found');

    const updatedLead = await prisma.lead.update({
      where: { id },
      data,
    });

    // Always invalidate cache on update
    await cacheService.del(this.getCacheKey(id));
    return updatedLead;
  }

  /**
   * Removes a lead from the system and clears its cache.
   */
  static async delete(id: string): Promise<void> {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError('Cannot delete: Lead not found');

    await prisma.lead.delete({ where: { id } });
    await cacheService.del(this.getCacheKey(id));
  }

  /**
   * Handles complex status transitions using the state machine rules.
   */
  static async transitionStatus(id: string, newStatus: LeadStatus): Promise<Lead> {
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) throw new NotFoundError('Lead not found for status transition');

    const currentStatus = lead.status;

    // Validate the movement against our status flow rules
    const allowedTargets = STATUS_FLOW[currentStatus] || [];
    if (!allowedTargets.includes(newStatus)) {
      throw new BadRequestError(`Forbidden transition: ${currentStatus} -> ${newStatus}`);
    }

    const updated = await prisma.lead.update({
      where: { id },
      data: { status: newStatus },
    });

    await cacheService.del(this.getCacheKey(id));
    return updated;
  }

  /**
   * Batch creates leads. We validate each lead independently so one bad 
   * record doesn't spoil the whole batch.
   */
  static async bulkCreate(leadsData: any[]) {
    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < leadsData.length; i++) {
      try {
        const validation = CreateLeadSchema.safeParse(leadsData[i]);
        if (!validation.success) {
          results.push({ 
            index: i, 
            success: false, 
            error: validation.error.issues.map(iss => iss.message).join('. ') 
          });
          failedCount++;
          continue;
        }

        const lead = await this.create(validation.data);
        results.push({ index: i, success: true, lead });
        successfulCount++;
      } catch (error: any) {
        results.push({ index: i, success: false, error: 'Database error: ' + error.message });
        failedCount++;
      }
    }

    return { total: leadsData.length, successful: successfulCount, failed: failedCount, results };
  }

  /**
   * Batch updates leads. Useful for syncing data from external sources.
   */
  static async bulkUpdate(updates: any[]) {
    const results = [];
    let successfulCount = 0;
    let failedCount = 0;

    for (let i = 0; i < updates.length; i++) {
      try {
        const validation = UpdateLeadSchema.extend({
          id: z.string().uuid('Invalid lead ID format'),
        }).safeParse(updates[i]);

        if (!validation.success) {
          results.push({ 
            index: i, 
            success: false, 
            error: validation.error.issues.map(iss => iss.message).join('. ') 
          });
          failedCount++;
          continue;
        }

        const { id, ...updateData } = validation.data;
        const lead = await this.update(id, updateData);
        results.push({ index: i, success: true, lead });
        successfulCount++;
      } catch (error: any) {
        results.push({ index: i, success: false, error: error.message });
        failedCount++;
      }
    }

    return { total: updates.length, successful: successfulCount, failed: failedCount, results };
  }
}
