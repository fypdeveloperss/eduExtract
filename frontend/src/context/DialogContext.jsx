import React, { createContext, useContext, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Info, HelpCircle, X, Check, XCircle } from 'lucide-react';

const DialogContext = createContext();

export const useDialog = () => {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error('useDialog must be used within a DialogProvider');
  }
  return context;
};

export const DialogProvider = ({ children }) => {
  const [dialogs, setDialogs] = useState([]);

  const showDialog = (dialog) => {
    const id = Date.now() + Math.random();
    const newDialog = {
      id,
      type: 'info',
      ...dialog
    };

    setDialogs(prev => [...prev, newDialog]);
    return id;
  };

  const closeDialog = (id) => {
    setDialogs(prev => prev.filter(dialog => dialog.id !== id));
  };

  const showConfirm = ({ 
    title = 'Confirm Action',
    message = 'Are you sure you want to continue?',
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    type = 'warning',
    onConfirm = () => {},
    onCancel = () => {}
  }) => {
    return new Promise((resolve) => {
      const id = showDialog({
        title,
        message,
        confirmText,
        cancelText,
        type,
        isConfirm: true,
        onConfirm: () => {
          onConfirm();
          closeDialog(id);
          resolve(true);
        },
        onCancel: () => {
          onCancel();
          closeDialog(id);
          resolve(false);
        }
      });
    });
  };

  const showAlert = ({
    title = 'Information',
    message = '',
    buttonText = 'OK',
    type = 'info',
    onClose = () => {}
  }) => {
    return new Promise((resolve) => {
      const id = showDialog({
        title,
        message,
        buttonText,
        type,
        isAlert: true,
        onClose: () => {
          onClose();
          closeDialog(id);
          resolve();
        }
      });
    });
  };

  const value = {
    dialogs,
    showDialog,
    closeDialog,
    showConfirm,
    showAlert
  };

  return (
    <DialogContext.Provider value={value}>
      {children}
      <DialogContainer dialogs={dialogs} onClose={closeDialog} />
    </DialogContext.Provider>
  );
};

const DialogContainer = ({ dialogs, onClose }) => {
  return (
    <AnimatePresence>
      {dialogs.map((dialog) => (
        <DialogModal key={dialog.id} dialog={dialog} onClose={onClose} />
      ))}
    </AnimatePresence>
  );
};

const DialogModal = ({ dialog, onClose }) => {
  const { 
    id, 
    title, 
    message, 
    type, 
    isConfirm, 
    isAlert,
    confirmText,
    cancelText,
    buttonText,
    onConfirm,
    onCancel,
    onClose: dialogOnClose
  } = dialog;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <Check className="w-8 h-8 text-green-500" />;
      case 'error':
      case 'danger':
        return <XCircle className="w-8 h-8 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="w-8 h-8 text-yellow-500" />;
      case 'question':
        return <HelpCircle className="w-8 h-8 text-blue-500" />;
      case 'info':
      default:
        return <Info className="w-8 h-8 text-blue-500" />;
    }
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      if (isConfirm && onCancel) {
        onCancel();
      } else if (isAlert && dialogOnClose) {
        dialogOnClose();
      } else {
        onClose(id);
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-[#171717] rounded-2xl p-6 w-full max-w-md shadow-2xl border border-gray-200 dark:border-[#2E2E2E]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {getIcon()}
            <h2 className="text-xl font-semibold text-[#171717] dark:text-[#fafafa]">
              {title}
            </h2>
          </div>
          <button
            onClick={() => {
              if (isConfirm && onCancel) {
                onCancel();
              } else if (isAlert && dialogOnClose) {
                dialogOnClose();
              } else {
                onClose(id);
              }
            }}
            className="p-1 hover:bg-gray-100 dark:hover:bg-[#2E2E2E] rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-[#171717cc] dark:text-[#fafafacc]" />
          </button>
        </div>

        {/* Content */}
        <div className="mb-6">
          <p className="text-[#171717cc] dark:text-[#fafafacc] leading-relaxed whitespace-pre-wrap">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {isConfirm ? (
            <>
              <button
                onClick={onCancel}
                className="px-4 py-2 border border-gray-200 dark:border-[#2E2E2E] rounded-lg text-[#171717] dark:text-[#fafafa] hover:bg-gray-50 dark:hover:bg-[#2E2E2E] transition-colors font-medium"
              >
                {cancelText || 'Cancel'}
              </button>
              <button
                onClick={onConfirm}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  type === 'danger' || type === 'error'
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : type === 'warning'
                    ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                    : 'bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] hover:opacity-90'
                }`}
              >
                {confirmText || 'Confirm'}
              </button>
            </>
          ) : (
            <button
              onClick={dialogOnClose}
              className="px-6 py-2 bg-[#171717] dark:bg-[#fafafa] text-white dark:text-[#171717] rounded-lg hover:opacity-90 transition-opacity font-medium"
            >
              {buttonText || 'OK'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default DialogProvider;