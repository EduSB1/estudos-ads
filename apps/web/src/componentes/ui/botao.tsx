import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const variantes = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors ' +
    'disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        primario: 'bg-destaque text-destaque-texto hover:bg-destaque/90',
        secundario: 'bg-superficie text-texto border border-borda hover:bg-borda/60',
        fantasma: 'text-suave hover:bg-superficie hover:text-texto',
        perigo: 'bg-perigo/15 text-perigo border border-perigo/30 hover:bg-perigo/25',
      },
      tamanho: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4 text-sm',
        lg: 'h-11 px-6 text-base',
        icone: 'h-9 w-9',
      },
    },
    defaultVariants: { variante: 'secundario', tamanho: 'md' },
  },
);

export type PropsBotao = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof variantes>;

export const Botao = forwardRef<HTMLButtonElement, PropsBotao>(
  ({ className, variante, tamanho, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(variantes({ variante, tamanho }), className)}
      {...props}
    />
  ),
);
Botao.displayName = 'Botao';
