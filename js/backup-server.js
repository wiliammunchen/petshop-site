// Cliente: upload do arquivo e chamada da Edge Function
import { supabase } from './supabase-config.js';
import { mostrarErro, mostrarSucesso } from './notificacoes.js';

async function iniciarImportacaoServidor(e) {
  e.preventDefault();
  const fileInput = document.getElementById('arquivo-backup');
  const file = fileInput?.files?.[0];
  if (!file) { mostrarErro('Selecione um arquivo .json'); return; }

  const filename = `backup_${Date.now()}_${file.name}`;
  const path = `backups/${filename}`;

  try {
    // 1) Upload para Storage (bucket 'backups')
    const { error: uploadError } = await supabase.storage.from('backups').upload(path, file, { upsert: true });
    if (uploadError) { throw uploadError; }

    // 2) Chamar Edge Function
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      mostrarErro('Sessão expirada. Faça login novamente.');
      return;
    }

    const accessToken = (await supabase.auth.getSession()).data?.session?.access_token;
    if (!accessToken) {
      mostrarErro('Token de acesso não encontrado. Faça login novamente.');
      return;
    }

    // Substitua <YOUR_FUNCTION_URL> pela URL da sua função no Supabase (ex: https://<project>.functions.supabase.co/restore-backup)
    const FUNCTION_URL = '<YOUR_FUNCTION_URL>';

    const res = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ path }),
    });

    const result = await res.json();
    if (!res.ok) {
      console.error('Erro função restore:', result);
      mostrarErro(result?.error || 'Falha na restauração');
      return;
    }

    mostrarSucesso('Restauração iniciada com sucesso. ' + (result?.message || ''));
  } catch (err) {
    console.error('Erro iniciarImportacaoServidor:', err);
    mostrarErro(err.message || 'Falha ao iniciar importação.');
  }
}   