import { z } from 'zod';

export const LeadStatusEnum = z.enum(['NEW', 'CONTACTED', 'QUALIFIED', 'CONVERTED', 'LOST']);

export const CreateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  phone: z.string().optional(),
  source: z.string().optional(),
});

export const UpdateLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').optional(),
  email: z.string().email('Invalid email format').optional(),
  phone: z.string().optional(),
  source: z.string().optional(),
});

export const UpdateLeadStatusSchema = z.object({
  status: LeadStatusEnum,
});

export const BulkCreateLeadSchema = z.array(CreateLeadSchema);

export const BulkUpdateLeadSchema = z.array(
  UpdateLeadSchema.extend({
    id: z.string().uuid('Invalid lead ID format'),
  })
);

export const LeadQuerySchema = z.object({
  status: LeadStatusEnum.optional(),
  search: z.string().optional(),
  sortBy: z.string().optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
  page: z.string().optional().default('1').transform(Number),
  limit: z.string().optional().default('10').transform(Number),
});
