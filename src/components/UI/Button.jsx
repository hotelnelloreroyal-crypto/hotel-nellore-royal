import React from 'react';

const Button = ({ children, variant = 'primary', size = 'md', className = '', onClick, disabled = false, type = 'button', icon }) => {
  const variants = {
    primary: 'bg-red-600 hover:bg-red-700 text-white',
    secondary: 'bg-black hover:bg-gray-900 text-white',
    success: 'bg-green-600 hover:bg-green-700 text-white',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    warning: 'bg-yellow-500 hover:bg-yellow-600 text-black',
    outline: 'bg-white border-2 border-black text-black hover:bg-black hover:text-white',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        ${variants[variant]} 
        ${sizes[size]} 
        font-bold tracking-wide uppercase
        transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        flex items-center gap-2 justify-center
        ${className}
      `}
    >
      {icon && <span>{icon}</span>}
      {children}
    </button>
  );
};

export default Button;
