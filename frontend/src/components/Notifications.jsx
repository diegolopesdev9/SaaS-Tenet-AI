
import { useNotification } from '../contexts';

const typeStyles = {
  success: 'bg-green-500 text-white',
  error: 'bg-red-500 text-white',
  warning: 'bg-yellow-500 text-black',
  info: 'bg-blue-500 text-white'
};

const typeIcons = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ'
};

export default function Notifications() {
  const { notifications, removeNotification } = useNotification();

  if (notifications.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {notifications.map(({ id, message, type }) => (
        <div
          key={id}
          className={`${typeStyles[type]} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in`}
        >
          <span className="text-lg">{typeIcons[type]}</span>
          <p className="flex-1 text-sm">{message}</p>
          <button
            onClick={() => removeNotification(id)}
            className="text-lg opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
