import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import SkillService from '../services/SkillService.js';
import { ConflictError, NotFoundError, PermissionError } from '../utils/errors.js';

const router = Router();
router.use(requireAuth);

export const createSkillMapSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(60, 'Title must be 60 characters or less'),
  description: z.string().trim().max(120, 'Description must be 120 characters or less').nullable().optional(),
  icon: z.string().trim().min(1, 'Icon is required').max(16),
  goal: z.string().trim().min(1, 'Goal is required').max(200, 'Goal must be 200 characters or less'),
  sketchTitles: z.array(z.string()).max(6).optional().default([])
}).superRefine((data, ctx) => {
  const titles = (data.sketchTitles || []).map((t) => String(t).trim()).filter(Boolean);
  const seen = new Set();
  for (const t of titles) {
    const key = t.toLowerCase();
    if (seen.has(key)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Node titles must be unique within this map',
        path: ['sketchTitles']
      });
      return;
    }
    seen.add(key);
  }
});

export const validateCreateSkillMapBody = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formatted = error.errors.map((err) => ({
        field: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({
        type: 'VALIDATION_ERROR',
        message: 'Validation failed',
        errors: formatted
      });
    }
    return res.status(500).json({ type: 'SERVER_ERROR', message: 'Internal validation error' });
  }
};

export async function postCreateSkillMap(req, res) {
  try {
    const { title, description, icon, goal, sketchTitles } = req.body;
    const normalizedTitles = (sketchTitles || []).map((t) => String(t).trim()).filter(Boolean);
    const desc = description == null || String(description).trim() === '' ? null : String(description).trim();
    const result = await SkillService.createSkillMap(req.user.id, {
      title,
      description: desc,
      icon,
      goal,
      sketchTitles: normalizedTitles
    });
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating skill map:', error.message);
    if (error instanceof ConflictError) {
      return res.status(409).json({
        type: 'DUPLICATE_ERROR',
        message: 'A skill map with this title already exists',
        timestamp: new Date().toISOString()
      });
    }
    const statusCode = error.message?.includes('must be') || error.message?.includes('required') ? 400 : 500;
    res.status(statusCode).json({
      type: statusCode === 400 ? 'VALIDATION_ERROR' : 'SERVER_ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

export async function getSkillMapFullHandler(req, res) {
  try {
    const data = await SkillService.getSkillMapFull(req.params.id, req.user.id);
    res.json(data);
  } catch (error) {
    console.error('Error loading skill map full:', error.message);
    if (error instanceof NotFoundError || error instanceof PermissionError) {
      return res.status(404).json({
        type: 'NOT_FOUND',
        message: 'Skill map not found',
        timestamp: new Date().toISOString()
      });
    }
    let statusCode = 500;
    let type = 'SERVER_ERROR';
    if (error.name === 'CastError') {
      statusCode = 400;
      type = 'INVALID_ID';
    }
    res.status(statusCode).json({
      type,
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}

router.post('/', validateCreateSkillMapBody(createSkillMapSchema), postCreateSkillMap);
router.get('/:id/full', getSkillMapFullHandler);

export default router;
