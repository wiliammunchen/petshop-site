// petshop-site/js/supabase-config.js
// Versão que lê as chaves de configuração de múltiplas fontes (mais segura para deploy):
// - window.__ENV__ (injetado pelo servidor, recomendado para produção)
// - <meta name="supabase-url"> / <meta name="supabase-anon-key"> (simples injeção via HTML)
// - fallback para as constantes embutidas (apenas para desenvolvimento local)
//
// Para produção recomendo injetar as variáveis no HTML (ex.: via template do servidor ou CI/CD):
// <script>window.__ENV__ = { SUPABASE_URL: 'https://...' , SUPABASE_ANON_KEY: '...' };</script>
//
// Se preferir, posso também gerar instruções de como configurar isso no seu host (Netlify, Vercel, Railway, etc.)

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

function readFromWindowEnv() {
  try {
    if (window && window.__ENV && window.__ENV.SUPABASE_URL && window.__ENV.SUPABASE_ANON_KEY) {
      return {
        url: window.__ENV.SUPABASE_URL,
        key: window.__ENV.SUPABASE_ANON_KEY
      };
    }
  } catch (e) { /* ignore */ }
  return null;
}

function readFromMeta() {
  try {
    const metaUrl = document.querySelector('meta[name="supabase-url"]')?.getAttribute('content');
    const metaKey = document.querySelector('meta[name="supabase-anon-key"]')?.getAttribute('content');
    if (metaUrl && metaKey) return { url: metaUrl, key: metaKey };
  } catch (e) { /* ignore */ }
  return null;
}

// Developer fallback (keeps previous values for local/dev; remove or replace in production)
const DEV_FALLBACK = {
  url: 'https://ppjnhgpdmffykuviwwqa.supabase.co',
  key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwam5oZ3BkbWZmeWt1dml3d3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDgwMzQsImV4cCI6MjA3MzAyNDAzNH0.7unRSu9moaz4Y4MhB0EKV5M5CEJz_w6Qa1jfcIUUOc8'
};

// Resolve config in order: window.__ENV__ -> meta tags -> fallback
const resolved = readFromWindowEnv() || readFromMeta() || DEV_FALLBACK;

if (!resolved.url || !resolved.key) {
  // Não quebra em produção: logamos um aviso claro
  // Em ambientes seguros, prefira injetar window.__ENV__ do servidor
  console.warn('Supabase config não encontrada nas fontes configuradas. Usando fallback (somente desenvolvimento).');
}

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
export const supabase = createClient(resolved.url, resolved.key);