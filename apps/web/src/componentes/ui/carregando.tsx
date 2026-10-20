import { Loader2 } from 'lucide-react';

export function Carregando({ texto = 'Carregando…' }: { texto?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center justify-center gap-2 py-12 text-sm text-suave"
    >
      <Loader2 className="size-4 animate-spin" aria-hidden />
      {texto}
    </div>
  );
}
