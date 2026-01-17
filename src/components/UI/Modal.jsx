import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import Button from './Button';

const Modal = ({ open, onClose, title, children, footer, size = 'md', overlayClassName = '' }) => {
  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-2xl',
    lg: 'max-w-4xl',
    xl: 'max-w-6xl',
  };

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className={`absolute inset-0 backdrop-blur-sm ${overlayClassName}`}
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className={`relative bg-white rounded-xl shadow-2xl w-full ${sizes[size]} mx-4 max-h-[90vh] flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X size={24} />
          </button>
        </div>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>
        
        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

export default Modal;
