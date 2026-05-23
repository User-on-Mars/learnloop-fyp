import { createPortal } from 'react-dom';
import Toast from './Toast';

const ToastContainer = ({ toasts, onRemoveToast }) => {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed right-3 top-[calc(env(safe-area-inset-top)+4.5rem)] z-50 flex w-[min(calc(100vw-1.5rem),22rem)] flex-col items-end gap-2 pointer-events-none sm:right-5 sm:top-20 sm:w-[min(calc(100vw-6rem),26rem)]">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          type={toast.type}
          title={toast.title}
          message={toast.message}
          duration={toast.duration}
          showRetry={toast.showRetry}
          onRetry={toast.onRetry}
          onClose={onRemoveToast}
        />
      ))}
    </div>,
    document.body
  );
};

export default ToastContainer;
