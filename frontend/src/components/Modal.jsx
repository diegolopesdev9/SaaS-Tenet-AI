
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  size = 'md'
}) {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className={`bg-[#2D2D2D] border border-white/10 rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden`}>
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">{title}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)] bg-[#2D2D2D]">
          <div className="text-gray-300">
            {children}
          </div>
        </div>

        {/* Footer */}
        {footer && (
          <div className="flex gap-3 p-4 border-t border-white/10 bg-[#1A1A1A]">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de botões para facilitar uso
export function ModalButton({ variant = 'primary', onClick, children, className = '', ...props }) {
  const variants = {
    primary: 'bg-cyan-500 text-black hover:bg-cyan-600',
    secondary: 'bg-white/10 text-gray-300 hover:bg-white/20',
    danger: 'bg-red-500 text-white hover:bg-red-600'
  };

  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition-colors ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
