// Utility to help replace browser alerts systematically
// This file provides functions to easily replace alert() calls

import { useNotification } from '../context/NotificationContext';
import { useDialog } from '../context/DialogContext';

export const useCustomAlerts = () => {
  const { showSuccess, showError, showWarning, showInfo } = useNotification();
  const { showAlert, showConfirm } = useDialog();

  // Replace simple alert() calls
  const alert = (message, type = 'info') => {
    switch (type) {
      case 'success':
        return showSuccess(message);
      case 'error':
        return showError(message);
      case 'warning':
        return showWarning(message);
      case 'info':
      default:
        return showInfo(message);
    }
  };

  // Replace confirm() calls
  const confirm = (message, title = 'Confirm') => {
    return showConfirm({
      title,
      message,
      type: 'question'
    });
  };

  // Styled alerts with titles
  const alertWithTitle = (message, title, type = 'info') => {
    return showAlert({
      title,
      message,
      type
    });
  };

  // Success notification
  const success = (message, title = 'Success') => {
    return showSuccess(message, { title });
  };

  // Error notification
  const error = (message, title = 'Error') => {
    return showError(message, { title });
  };

  // Warning notification
  const warning = (message, title = 'Warning') => {
    return showWarning(message, { title });
  };

  // Info notification
  const info = (message, title = 'Information') => {
    return showInfo(message, { title });
  };

  return {
    alert,
    confirm,
    alertWithTitle,
    success,
    error,
    warning,
    info,
    // Direct access to original functions if needed
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showAlert,
    showConfirm
  };
};

export default useCustomAlerts;