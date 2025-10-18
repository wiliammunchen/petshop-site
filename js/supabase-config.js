// Substitua todo o conteúdo de supabase-config.js por este bloco:

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Suas chaves de acesso ao projeto Supabase
const SUPABASE_URL = 'https://ppjnhgpdmffykuviwwqa.supabase.co'; 
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBwam5oZ3BkbWZmeWt1dml3d3FhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0NDgwMzQsImV4cCI6MjA3MzAyNDAzNH0.7unRSu9moaz4Y4MhB0EKV5M5CEJz_w6Qa1jfcIUUOc8';

// Cria e exporta o cliente Supabase para ser usado em outros arquivos
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);