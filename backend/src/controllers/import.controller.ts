import { Request, Response, NextFunction } from 'express';
import { parseCsvBuffer } from '../services/csv.service';
import { extractCrmRecords } from '../services/ai.service';
import { ApiError } from '../middleware/errorHandler';

/**
 * POST /api/import/preview
 * Parses the uploaded CSV and returns raw rows for the frontend preview
 * table. No AI processing happens here, per spec (Step 2 must be AI-free).
 */
export async function previewCsv(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No CSV file was uploaded. Use the "file" field.');
    }

    const rows = parseCsvBuffer(req.file.buffer);
    const headers = Object.keys(rows[0]);

    res.json({
      success: true,
      data: {
        fileName: req.file.originalname,
        headers,
        rows,
        totalRows: rows.length,
      },
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/import/confirm
 * Accepts the same CSV file again (re-uploaded on confirm, per the spec's
 * "only after confirmation should the frontend call the backend API"),
 * re-parses it, and runs the AI extraction pipeline in batches.
 */
export async function confirmImport(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) {
      throw new ApiError(400, 'No CSV file was uploaded. Use the "file" field.');
    }

    const rows = parseCsvBuffer(req.file.buffer);

    if (!process.env.GEMINI_API_KEY) {
      throw new ApiError(
        500,
        'Server is missing GEMINI_API_KEY. Set it in backend/.env before importing.'
      );
    }

    const result = await extractCrmRecords(rows);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
