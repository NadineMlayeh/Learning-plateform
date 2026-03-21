import { useEffect, useState } from 'react';

const TOAST_TIMEOUT_MS = 2500;
let nextToastId = 1;

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, TOAST_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  const isSuccess = toast.type === 'success';

  return (
    <div className={`toast toast-${toast.type}`}>
      <span className="toast-icon">
        {isSuccess ? '✓' : '✕'}
      </span>
      <p>{toast.message}</p>
    </div>
  );
}

export function ToastViewport({ toasts, removeToast }) {
  return (
    <div className="toast-viewport">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onClose={removeToast} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState([]);

  function pushToast(message, type = 'error') {
    const normalizedMessage = String(message ?? '').trim();
    if (!normalizedMessage) return;

    if (type === 'error') {
      const lower = normalizedMessage.toLowerCase();
      if (lower.includes('unauthorized')) return;
    }

    setToasts((prev) => [
      ...prev,
      {
        id: nextToastId++,
        message: normalizedMessage,
        type,
      },
    ]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  return { toasts, pushToast, removeToast };
}
