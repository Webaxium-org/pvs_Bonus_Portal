import { initEmployeeModel, getEmployee } from './Employee.js';
import { initBranchModel, getBranch } from './Branch.js';
import { initNotificationModel, getNotification } from './Notification.js';

let Employee = null;
let Branch = null;
let Notification = null;

// Initialize all models - call this after database connection
export const initModels = (sequelize) => {
  if (Employee && Branch && Notification) {
    return { Employee, Branch, Notification };
  }

  // Initialize Employee first (no dependencies)
  Employee = initEmployeeModel(sequelize);

  // Initialize Branch (depends on Employee)
  Branch = initBranchModel(sequelize, Employee);

  // Initialize Notification
  Notification = initNotificationModel(sequelize);

  return { Employee, Branch, Notification };
};

// Get initialized models (will throw if not initialized)
export const getModels = () => {
  return {
    Employee: getEmployee(),
    Branch: getBranch(),
    Notification: getNotification(),
  };
};

// Export individual getters
export { getEmployee as Employee, getBranch as Branch, getNotification as Notification };

// Default export
export default {
  initModels,
  getModels,
};
