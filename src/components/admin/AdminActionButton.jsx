import React from 'react';

export const AdminActionButton = ({
  label,
  onClick,
  children,
  className = '',
  type = 'button',
  disabled = false,
  title,
}) => {
  const tooltip = title || label;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={undefined}
      className={`group/action inline-flex items-center justify-center gap-0 overflow-hidden rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${className}`}
    >
      {children}
      <span className="pointer-events-none max-w-0 overflow-hidden whitespace-nowrap text-[10px] font-bold text-white opacity-0 transition-all duration-200 group-hover/action:ml-2 group-hover/action:max-w-24 group-hover/action:opacity-100">
        {tooltip}
      </span>
    </button>
  );
};
