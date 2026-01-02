
import React from 'react';

export default function FormRadio({
  label,
  name,
  value,
  checked,
  onChange,
  disabled = false,
  error,
  className = '',
  ...props
}) {
  return (
    <div className={className}>
      <label className="flex items-center cursor-pointer">
        <input
          type="radio"
          name={name}
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="w-4 h-4 text-cyan-500 bg-[#1A1A1A] border-white/30 focus:ring-2 focus:ring-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed checked:bg-cyan-500 checked:border-cyan-500 transition-colors"
          {...props}
        />
        {label && (
          <span className="ml-2 text-sm text-gray-300">{label}</span>
        )}
      </label>
      {error && (
        <p className="mt-1 text-sm text-red-400">{error}</p>
      )}
    </div>
  );
}
