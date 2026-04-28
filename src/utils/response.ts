import { Response } from 'express';

export const sendResponse = (res: Response, statusCode: number, data: any) => {
  return res.status(statusCode).json(data);
};

export const sendError = (res: Response, statusCode: number, message: string) => {
  return res.status(statusCode).json({ error: message });
};
