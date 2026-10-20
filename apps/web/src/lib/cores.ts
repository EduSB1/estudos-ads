/** Paleta dos destaques. A chave e o que vai para o banco. */
export const CORES_DESTAQUE = {
  amarelo: { rotulo: 'Amarelo', css: 'rgba(250, 204, 21, 0.38)', classe: 'bg-yellow-400' },
  verde: { rotulo: 'Verde', css: 'rgba(74, 222, 128, 0.35)', classe: 'bg-green-400' },
  azul: { rotulo: 'Azul', css: 'rgba(56, 189, 248, 0.35)', classe: 'bg-sky-400' },
  rosa: { rotulo: 'Rosa', css: 'rgba(244, 114, 182, 0.35)', classe: 'bg-pink-400' },
  roxo: { rotulo: 'Roxo', css: 'rgba(167, 139, 250, 0.38)', classe: 'bg-violet-400' },
} as const;

export type CorDestaque = keyof typeof CORES_DESTAQUE;
export const LISTA_CORES = Object.keys(CORES_DESTAQUE) as CorDestaque[];
