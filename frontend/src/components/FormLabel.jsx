
import React from 'react';

export default function FormLabel({
  children,
  required = false,
  htmlFor,
  className = ''
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`block text-sm font-medium text-gray-300 mb-1 ${className}`}
    >
      {children}
      {required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );
}
