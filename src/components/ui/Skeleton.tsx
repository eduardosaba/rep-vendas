import React from 'react';

type Props = React.HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: Props) {
  return (
    <div
      className={`animate-pulse rounded-md bg-slate-200 dark:bg-slate-800 ${className}`}
      {...props}
    />
  );
}

export default Skeleton;
