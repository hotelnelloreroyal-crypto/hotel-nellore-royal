import React from 'react';

const Card = ({ children, className = '', variant = 'default', onClick }) => {
  const variants = {
    default: 'bg-white border-2 border-gray-200',
    outlined: 'bg-white border-4 border-black',
    elevated: 'bg-white border-2 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]',
  };

  return (
    <div 
      className={`p-4 ${variants[variant]} ${onClick ? 'cursor-pointer hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] transition-shadow' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default Card;
