import { Request, Response, NextFunction } from 'express';
import { LeadService, LeadStatus } from '../services/lead.service';
import { 
  CreateLeadSchema, 
  UpdateLeadSchema, 
  UpdateLeadStatusSchema, 
  LeadQuerySchema
} from '../validators/lead.validator';
import { sendResponse } from '../utils/response';

/**
 * LeadController serves as the entry point for API requests.
 * It focuses on translating HTTP inputs (query params, body) into
 * service calls and ensuring proper responses are returned.
 */
export class LeadController {
  
  static async create(req: Request, res: Response, next: NextFunction) {
    try {
      const validatedData = CreateLeadSchema.parse(req.body);
      const lead = await LeadService.create(validatedData);
      return sendResponse(res, 201, lead);
    } catch (error) {
      next(error);
    }
  }

  static async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const filters = LeadQuerySchema.parse(req.query);
      const result = await LeadService.findAll(filters);
      return sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  static async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const lead = await LeadService.findById(id);
      return sendResponse(res, 200, lead);
    } catch (error) {
      next(error);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const validatedData = UpdateLeadSchema.parse(req.body);
      const lead = await LeadService.update(id, validatedData);
      return sendResponse(res, 200, lead);
    } catch (error) {
      next(error);
    }
  }

  static async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      await LeadService.delete(id);
      // Return 204 No Content for successful deletion
      return res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  /**
   * Dedicated endpoint for status changes to enforce state machine rules.
   */
  static async transitionStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const id = req.params.id as string;
      const { status: targetStatus } = UpdateLeadStatusSchema.parse(req.body);
      
      const lead = await LeadService.transitionStatus(id, targetStatus as LeadStatus);
      return sendResponse(res, 200, lead);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Bulk creation allows multiple leads to be submitted in one go.
   * Partial success is reported for each individual item.
   */
  static async bulkCreate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LeadService.bulkCreate(req.body);
      return sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }

  static async bulkUpdate(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await LeadService.bulkUpdate(req.body);
      return sendResponse(res, 200, result);
    } catch (error) {
      next(error);
    }
  }
}
