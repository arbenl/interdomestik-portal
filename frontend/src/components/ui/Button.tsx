import React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'ghost';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant, type = 'button', ...props }, ref) => {
    const baseClasses =
      'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none';

    const variantClasses = {
      default: 'bg-indigo-600 text-white hover:bg-indigo-700',
      ghost: 'bg-transparent text-indigo-600 hover:bg-indigo-100',
    };

    return (
      <button
        type={type}
        className={`${baseClasses} ${variantClasses[variant || 'default']} ${className}`.trim()}
        ref={ref}
        {...props}
      />
    );
  }
);
