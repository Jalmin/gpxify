import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
}

/**
 * Reusable Button component with variants
 *
 * @example
 * <Button>Click me</Button>
 * <Button variant="outline" size="sm">Small</Button>
 * <Button variant="destructive" disabled>Delete</Button>
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <button
        className={cn(
          // Base styles
          'inline-flex items-center justify-center rounded-md font-medium',
          'transition-colors focus-visible:outline-none',
          'focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ring',
          'disabled:opacity-50 disabled:pointer-events-none',

          // Variants
          {
            'bg-primary text-primary-foreground hover:bg-primary/90':
              variant === 'default',
            'bg-secondary text-secondary-foreground hover:bg-secondary/80':
              variant === 'secondary',
            'border border-input bg-background hover:bg-accent hover:text-accent-foreground':
              variant === 'outline',
            'hover:bg-accent hover:text-accent-foreground':
              variant === 'ghost',
            'bg-destructive text-destructive-foreground hover:bg-destructive/90':
              variant === 'destructive',
          },

          // Sizes
          {
            'h-10 px-4 py-2': size === 'default',
            'h-9 px-3 text-sm': size === 'sm',
            'h-11 px-8 text-lg': size === 'lg',
          },

          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';

export { Button };
