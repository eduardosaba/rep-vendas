import React from 'react';

export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`rounded-xl bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 shadow-sm ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`px-4 py-3 border-b border-gray-100 dark:border-slate-800 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`p-4 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`text-sm font-medium text-gray-700 dark:text-gray-300 ${className}`}
    {...props}
  >
    {children}
  </div>
);

export default Card;
