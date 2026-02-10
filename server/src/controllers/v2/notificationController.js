import { getNotification } from '../../models/sql/Notification.js';
import { getEmployee as getEmployeeModel } from '../../models/sql/Employee.js';
import AppError from '../../utils/appError.js';
import { Op } from 'sequelize';

// @desc    Get all notifications for a user
// @route   GET /api/v2/notifications?recipientId=xxx
// @access  Public (uses recipientId query param)
export const getNotifications = async (req, res, next) => {
  try {
    const Notification = getNotification();
    const recipientId =
      req.user?.userId || req.user?.id || req.query?.recipientId;

    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      return next(new AppError('Recipient ID is required', 400));
    }

    const notifications = await Notification.findAll({
      where: { recipientId },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    res.status(200).json({
      success: true,
      data: notifications,
      unreadCount,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read
// @route   PATCH /api/v2/notifications/:id/read
// @access  Public
export const markAsRead = async (req, res, next) => {
  try {
    const Notification = getNotification();
    const { id } = req.params;
    const recipientId =
      req.user?.userId || req.user?.id || req.query?.recipientId || req.body?.recipientId;

    const notification = await Notification.findByPk(id);
    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    // Ensure the notification belongs to the requesting user
    if (recipientId && notification.recipientId.toString() !== recipientId.toString()) {
      return next(new AppError('Not authorized', 403));
    }

    await notification.update({ isRead: true });

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all notifications as read for a user
// @route   PATCH /api/v2/notifications/mark-all-read
// @access  Public
export const markAllAsRead = async (req, res, next) => {
  try {
    const Notification = getNotification();
    const recipientId =
      req.user?.userId || req.user?.id || req.query?.recipientId || req.body?.recipientId;

    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      return next(new AppError('Recipient ID is required', 400));
    }

    await Notification.update(
      { isRead: true },
      { where: { recipientId, isRead: false } }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get unread notification count for a user
// @route   GET /api/v2/notifications/count?recipientId=xxx
// @access  Public
export const getUnreadCount = async (req, res, next) => {
  try {
    const Notification = getNotification();
    const recipientId =
      req.user?.userId || req.user?.id || req.query?.recipientId;

    if (!recipientId || recipientId === 'undefined' || recipientId === 'null') {
      return next(new AppError('Recipient ID is required', 400));
    }

    const count = await Notification.count({
      where: { recipientId, isRead: false },
    });

    res.status(200).json({
      success: true,
      unreadCount: count,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark a single notification as read by ID (internal helper)
// @param   id  — notification primary key
export const markNotificationRead = async (id) => {
  try {
    const Notification = getNotification();
    await Notification.update({ isRead: true }, { where: { id } });
  } catch (error) {
    console.error('❌ Failed to mark notification as read:', error.message);
  }
};

// @desc    Create a notification (internal helper - also exported for direct use)
// @param   { recipientId, type, title, message, payload }
export const createNotification = async ({ recipientId, type, title, message, payload }) => {
  try {
    const Notification = getNotification();
    const notification = await Notification.create({
      recipientId,
      type: type || 'bonus_rejected',
      title,
      message,
      payload,
      isRead: false,
    });
    return notification;
  } catch (error) {
    // Don't throw - notification failure must never break the approval flow
    console.error('❌ Failed to create notification:', error.message);
    return null;
  }
};

//test push
