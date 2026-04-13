import * as React from 'react';

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {}

export const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <label
        ref={ref}
        className={
          'text-sm font-semibold text-slate-700 dark:text-slate-200 ' + className
        }
        {...props}
      />
    );
  }
);

Label.displayName = 'Label';
