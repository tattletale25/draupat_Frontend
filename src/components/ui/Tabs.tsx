import type { ReactNode } from 'react';
import { cn } from '../../lib/utils';

interface TabsProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  className?: string;
}

export function Tabs<T extends string>({ value, onChange, options, className }: TabsProps<T>) {
  return (
    <div className={cn('tabs-list', className)} role="tablist">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          className="tabs-trigger"
          data-active={value === opt.value}
          aria-selected={value === opt.value}
          onClick={() => onChange(opt.value)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function TabsContent({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
