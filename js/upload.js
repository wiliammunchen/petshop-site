import { supabase } from './supabase-config.js';

/**
 * Faz upload de um array de File/Blob para o bucket especificado e retorna array de public URLs.
 * - tenta upload; se existir conflito de nome, tenta renomear com sufixo rand.
 * - se o bucket for privado, getPublicUrl retornará uma URL relativa que pode exigir Signed URL (não coberto aqui).
 *
 * @param {FileList|File[]} files - lista de arquivos (FileList ou array)
 * @param {Object} options
 *   - bucket (string) default 'petshop-assets'
 *   - folder (string) default 'adocao_fotos'
 * @returns {Promise<string[]>} array de publicUrls
 */
export async function uploadFilesToStorage(files, options = {}) {
  const bucket = options.bucket || 'petshop-assets';
  const folder = options.folder || 'adocao_fotos';
  const urls = [];

  // Normalize files to array
  const fileArray = Array.from(files || []);

  for (const file of fileArray) {
    // sanitize filename
    const safeName = (file.name || 'file').replace(/\s+/g, '_');
    let filePath = `${folder}/${Date.now()}-${safeName}`;

    // tentativa de upload com retry simples se erro de existência do arquivo
    let attempt = 0;
    while (attempt < 3) {
      attempt++;
      try {
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(filePath, file, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          // se conflito (already exists), cria novo nome e tenta novamente
          const msg = String(uploadError.message || '');
          if (/file already exists|duplicate key|object already exists/i.test(msg) && attempt < 3) {
            filePath = `${folder}/${Date.now()}-${Math.floor(Math.random()*90000)+10000}-${safeName}`;
            continue;
          }
          // outro erro -> lançar
          throw uploadError;
        }

        // getPublicUrl é síncrono na supabase-js; retorna { data: { publicUrl } }
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);
        const publicUrl = urlData?.publicUrl || null;
        if (!publicUrl) {
          throw new Error('Não foi possível obter publicUrl após upload.');
        }
        urls.push(publicUrl);
        break; // upload ok -> passa para o próximo arquivo
      } catch (err) {
        // no último attempt, rethrow
        if (attempt >= 3) throw err;
        // senão, espera um pouco e tenta novamente
        await new Promise(r => setTimeout(r, 200 + Math.random()*300));
      }
    }
  }

  return urls;
}