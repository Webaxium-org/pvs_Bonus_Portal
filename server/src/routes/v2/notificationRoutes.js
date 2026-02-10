import { Router } from 'express';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from '../../controllers/v2/notificationController.js';

const router = Router();

// All routes are public (authenticated via recipientId param / body - same pattern as approval routes)
router.get('/', getNotifications);
router.get('/count', getUnreadCount);
router.patch('/mark-all-read', markAllAsRead);
router.patch('/:id/read', markAsRead);

export default router;
