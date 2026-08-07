import type { ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'accent';
  size?: 'default' | 'sm';
}

export function Button({ variant = 'default', size = 'default', className, ...props }: ButtonProps) {
  return (
    <button
      className={cn('btn', `btn-${variant}`, size === 'sm' && 'btn-sm', className)}
      {...props}
    />
  );
}
