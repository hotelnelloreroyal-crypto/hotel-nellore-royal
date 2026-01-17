import React from 'react';

const Badge = ({ children, variant = 'default', className = '' }) => {
  const variants = {
    default: 'bg-gray-200 text-gray-900',
    pending: 'bg-yellow-400 text-black',
    preparing: 'bg-blue-600 text-white',
    ready: 'bg-green-600 text-white',
    completed: 'bg-gray-400 text-white',
    cancelled: 'bg-red-600 text-white',
    available: 'bg-green-600 text-white',
    occupied: 'bg-red-600 text-white',
    reserved: 'bg-yellow-500 text-black',
  };

  return (
    <span className={`px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
