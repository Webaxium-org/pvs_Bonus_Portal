import { DataTypes } from 'sequelize';
import { getSequelize } from '../../config/sqlDatabase.js';

let Notification = null;

export const initNotificationModel = (sequelize) => {
  Notification = sequelize.define(
    'Notification',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      // The user who receives the notification
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        field: 'recipientId',
      },
      // Type of notification
      type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        defaultValue: 'bonus_rejected',
      },
      // Title shown in the notification bell panel
      title: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      // Full message body
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // JSON payload with all data needed to act on the notification
      // e.g. { employeeId, employeeDbId, employeeName, currentBonus, rejectedBy, rejectorLevel, rejectionReason }
      payload: {
        type: DataTypes.TEXT,
        allowNull: true,
        get() {
          const raw = this.getDataValue('payload');
          try {
            return raw ? JSON.parse(raw) : null;
          } catch {
            return null;
          }
        },
        set(value) {
          this.setDataValue(
            'payload',
            value ? JSON.stringify(value) : null
          );
        },
      },
      isRead: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
      createdAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
      updatedAt: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
      },
    },
    {
      tableName: 'Notifications',
      timestamps: true,
    }
  );

  return Notification;
};

export const getNotification = () => {
  if (!Notification) {
    throw new Error('Notification model not initialized. Call initNotificationModel first.');
  }
  return Notification;
};

export default { initNotificationModel, getNotification };
