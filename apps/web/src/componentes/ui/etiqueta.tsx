import { cva, type VariantProps } from 'class-variance-authority';
import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variantes = cva(
  'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
  {
    variants: {
      tom: {
        neutro: 'bg-borda/60 text-suave',
        destaque: 'bg-destaque/15 text-destaque',
        sucesso: 'bg-sucesso/15 text-sucesso',
        atencao: 'bg-atencao/15 text-atencao',
        perigo: 'bg-perigo/15 text-perigo',
      },
    },
    defaultVariants: { tom: 'neutro' },
  },
);

export function Etiqueta({
  className,
  tom,
  ...props
}: HTMLAttributes<HTMLSpanElement> & VariantProps<typeof variantes>) {
  return <span className={cn(variantes({ tom }), className)} {...props} />;
}
