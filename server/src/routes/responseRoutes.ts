import { Router } from 'express';
import { responseController } from '../controllers/responseController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// GET /api/responses/:id or /api/v1/responses/:id
router.get('/:id', requireAuth, (req, res, next) =>
  responseController.getResponseById(req, res, next)
);

export default router;
