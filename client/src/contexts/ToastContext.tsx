import React, { createContext, useContext, useState } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  toasts: Array<{ id: number; message: string; type: ToastType; duration: number }>;
  removeToast: (id: number) => void;
}

export const ToastContext = createContext<ToastContextType>({
  showToast: () => {},
  toasts: [],
  removeToast: () => {},
});

export const useToast = () => {
  return useContext(ToastContext);
};

export const ToastProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [toasts, setToasts] = useState<Array<{ 
    id: number; 
    message: string; 
    type: ToastType; 
    duration: number 
  }>>([]);

  // Show a toast notification
  const showToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
    const id = Math.random();
    setToasts((prevToasts) => [...prevToasts, { id, message, type, duration }]);

    // Auto remove toast after duration
    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  // Remove a specific toast by ID
  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  return (
    <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
      {children}
      {/* You can add a Toast component here to render the toasts */}
    </ToastContext.Provider>
  );
}; 