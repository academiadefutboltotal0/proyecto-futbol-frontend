export interface CarruselImg {
  url: string;
  modo: 'contain' | 'cover';
  posicion: string;
  blur: boolean;
  color: string;
}

/* Compatibilidad: antes imagenesCarrusel era un array de strings (solo la url). */
export function normalizarImagenCarrusel(item: any): CarruselImg {
  if (typeof item === 'string') {
    return { url: item, modo: 'contain', posicion: '50% 50%', blur: true, color: '#1a7a3e' };
  }
  return {
    url: item.url,
    modo: item.modo === 'cover' ? 'cover' : 'contain',
    posicion: item.posicion || '50% 50%',
    blur: item.blur !== false,
    color: item.color || '#1a7a3e',
  };
}
