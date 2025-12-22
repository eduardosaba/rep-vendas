import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ToggleSettingProps {
  label: string;
  name: string;
  description: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  icon: LucideIcon;
  children?: React.ReactNode;
}

export const ToggleSetting = ({
  label,
  name,
  description,
  checked,
  onChange,
  icon: Icon,
  children,
}: ToggleSettingProps) => (
  <div
    className={`p-4 bg-white dark:bg-slate-900 rounded-xl border transition-all ${
      checked
        ? 'border-[var(--primary)] ring-1 ring-[var(--primary)]/20 shadow-sm'
        : 'border-gray-200 dark:border-slate-800'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <div
          className={`p-2 rounded-lg ${
            checked
              ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-gray-100 text-gray-500 dark:bg-slate-800 dark:text-gray-400'
          }`}
        >
          <Icon size={18} />
        </div>
        <div>
          <label
            htmlFor={name}
            className="font-medium text-gray-900 dark:text-white cursor-pointer select-none block"
          >
            {label}
          </label>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5 leading-relaxed">
            {description}
          </p>
        </div>
      </div>

      <label className="relative inline-flex items-center cursor-pointer shrink-0">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
      </label>
    </div>
    {checked && children && (
      <div className="mt-4 pt-4 border-t border-gray-100 dark:border-slate-800 animate-in slide-in-from-top-2 fade-in pl-[52px]">
        {children}
      </div>
    )}
  </div>
);