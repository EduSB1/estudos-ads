import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('cartao p-4', className)} {...props} />;
}

export function CartaoTitulo({ className, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-sm font-semibold text-texto', className)} {...props} />;
}

export function CartaoDescricao({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-xs text-suave', className)} {...props} />;
}
