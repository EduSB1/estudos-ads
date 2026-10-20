import { forwardRef, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const base =
  'w-full rounded-md border border-borda bg-fundo px-3 py-2 text-sm text-texto ' +
  'placeholder:text-suave/70 transition-colors focus:border-destaque disabled:opacity-50';

export const Campo = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn(base, 'h-9', className)} {...props} />
  ),
);
Campo.displayName = 'Campo';

export const Area = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea ref={ref} className={cn(base, 'min-h-20 resize-y', className)} {...props} />
  ),
);
Area.displayName = 'Area';
