import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'accent';
}

export function Badge({ variant = 'default', className, ...props }: BadgeProps) {
  return <span className={cn('badge', `badge-${variant}`, className)} {...props} />;
}
