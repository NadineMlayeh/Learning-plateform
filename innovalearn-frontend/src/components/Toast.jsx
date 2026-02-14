import { useEffect, useState } from 'react';

const TOAST_TIMEOUT_MS = 4200;
let nextToastId = 1;

function ToastItem({ toast, onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, TOAST_TIMEOUT_MS);

    return () => clearTimeout(timer);
  }, [toast.id, onClose]);

  return (
    <div className={`toast toast-${toast.type}`}>
      <p>{toast.message}</p>
      <button type="button" className="toast-close" onClick={() => onClose(toast.id)}>
        x
      </button>
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
    setToasts((prev) => [
      ...prev,
      {
        id: nextToastId++,
        message,
        type,
      },
    ]);
  }

  function removeToast(id) {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }

  return { toasts, pushToast, removeToast };
}
