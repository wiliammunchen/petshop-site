// utilitário para normalizar campos que podem ser: text[], json string, CSV, object, or null/undefined
// retorna sempre um array de strings (padrão: [])
export function normalizeArrayField(value) {
  if (!value && value !== 0) return [];
  // Já é array -> filtra e transforma em strings
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  // Caso jsonb vindo do supabase pode aparecer como object/Array-like
  if (typeof value === 'object') {
    try {
      return Array.from(value).map(String).filter(Boolean);
    } catch (e) {
      return [];
    }
  }
  // É string: tenta JSON parse
  if (typeof value === 'string') {
    const s = value.trim();
    // tenta JSON array: '["a","b"]'
    if (s.startsWith('[') && s.endsWith(']')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
      } catch (e) {
        // ignora e tenta CSV abaixo
      }
    }
    // fallback CSV "a,b,c"
    if (s.length === 0) return [];
    return s.split(',').map(v => v.trim()).filter(Boolean);
  }
  return [];
}

export function firstArrayItem(value) {
  const arr = normalizeArrayField(value);
  return arr.length ? arr[0] : null;
}