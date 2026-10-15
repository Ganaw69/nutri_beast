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
      className={`group/action relative inline-flex items-center justify-center rounded-lg transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${className}`}
    >
      {children}
      <span className="pointer-events-none absolute bottom-[calc(100%+0.35rem)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded bg-[#090909] px-2 py-1 text-[10px] font-bold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/action:opacity-100 group-focus-visible/action:opacity-100">
        {tooltip}
      </span>
    </button>
  );
};
