// js/db-utils.js
// Utilitários para acessar o schema fornecido com supabase-js.
// Ajuste import path do supabase conforme seu projeto.

import { supabase } from '/js/supabase-config.js';

/**
 * Converte id retornado pelo supabase (string para bigint) em Number/BigInt.
 * Use Number() se souber que ids < 2**53, caso contrário use BigInt.
 */
export function parseDbId(idValue, preferBigInt = false) {
  if (idValue == null) return null;
  if (typeof idValue === 'number') return idValue;
  if (typeof idValue === 'string') {
    if (preferBigInt) return BigInt(idValue);
    const n = Number(idValue);
    return Number.isNaN(n) ? BigInt(idValue) : n;
  }
  return idValue;
}

/**
 * Normaliza vários formatos de campo de imagens para um array de URLs.
 * Aceita: array, string JSON (ex: '["a","b"]'), CSV 'a,b', texto único.
 */
export function normalizeArrayField(field) {
  if (!field && field !== 0) return [];
  if (Array.isArray(field)) return field.filter(Boolean);
  if (typeof field === 'string') {
    const s = field.trim();
    // tentativa JSON
    if ((s.startsWith('[') && s.endsWith(']')) || s.startsWith('"')) {
      try {
        const parsed = JSON.parse(s);
        if (Array.isArray(parsed)) return parsed.filter(Boolean);
      } catch (e) { /* ignore */ }
    }
    // CSV fallback
    if (s.includes(',')) return s.split(',').map(x => x.trim()).filter(Boolean);
    if (s) return [s];
    return [];
  }
  return [];
}

/**
 * Busca cliente por telefone (normalizado). Retorna objeto cliente ou null.
 */
export async function getClienteByTelefone(telefoneRaw) {
  if (!telefoneRaw) return null;
  const telefone = telefoneRaw.replace(/\D+/g, '');
  const { data, error } = await supabase
    .from('clientes')
    .select('*')
    .ilike('telefone', `%${telefone}%`)
    .limit(1);
  if (error) {
    console.error('getClienteByTelefone erro', error);
    return null;
  }
  return (data && data[0]) || null;
}

/**
 * Cria cliente se não existir, usando telefone/email únicos.
 * Retorna: { cliente, created: boolean }
 */
export async function getOrCreateCliente({ nome, telefone, email, endereco, cpf }) {
  // Primeiro tenta por telefone, depois por email
  let cliente = null;
  if (telefone) {
    cliente = await getClienteByTelefone(telefone);
  }
  if (!cliente && email) {
    const { data, error } = await supabase.from('clientes').select('*').eq('email', email).maybeSingle();
    if (error) {
      console.error('getOrCreateCliente - busca por email erro', error);
    } else if (data) cliente = data;
  }
  if (cliente) return { cliente, created: false };

  // cria novo cliente
  const payload = { nome, telefone, email, endereco, cpf, created_at: new Date().toISOString() };
  const { data, error } = await supabase.from('clientes').insert([payload]).select().maybeSingle();
  if (error) {
    console.error('getOrCreateCliente - insert erro', error);
    return { cliente: null, created: false, error };
  }
  return { cliente: data, created: true };
}

/**
 * Pega pet por id (garante existência). Retorna pet ou null.
 */
export async function getPetById(petId) {
  if (petId == null) return null;
  const { data, error } = await supabase.from('pets').select('*').eq('id', petId).maybeSingle();
  if (error) {
    console.error('getPetById erro', error);
    return null;
  }
  return data || null;
}

/**
 * Pega servico por id.
 */
export async function getServicoById(servicoId) {
  if (servicoId == null) return null;
  const { data, error } = await supabase.from('servicos').select('*').eq('id', servicoId).maybeSingle();
  if (error) {
    console.error('getServicoById erro', error);
    return null;
  }
  return data || null;
}

/**
 * Exemplo de criação de agendamento com detalhes (cliente_id deve existir).
 * NOTA: não é transacional no cliente. Para atomicidade, mover lógica para RPC/Edge function.
 * payload: {
 *   cliente_id,
 *   data_hora_inicio,
 *   data_hora_fim,
 *   observacoes,
 *   forma_pagamento_id,
 *   detalhes: [{ pet_id, servico_id, valor_cobrado }, ...]
 * }
 */
export async function createAgendamentoWithDetails(payload) {
  if (!payload || !payload.cliente_id || !Array.isArray(payload.detalhes) || payload.detalhes.length === 0) {
    throw new Error('payload inválido para createAgendamentoWithDetails');
  }

  // 1) criar agendamento
  const agendamentoPayload = {
    cliente_id: payload.cliente_id,
    data_hora_inicio: payload.data_hora_inicio,
    data_hora_fim: payload.data_hora_fim ?? null,
    observacoes: payload.observacoes ?? null,
    forma_pagamento_id: payload.forma_pagamento_id ?? null,
    taxa_pagamento_percentual: payload.taxa_pagamento_percentual ?? 0
  };
  const { data: agendamentoData, error: agError } = await supabase
    .from('agendamentos')
    .insert([agendamentoPayload])
    .select()
    .maybeSingle();

  if (agError || !agendamentoData) {
    console.error('Erro ao criar agendamento', agError);
    return { success: false, error: agError };
  }

  const agendamento_id = agendamentoData.id;

  // 2) inserir detalhes (atenção: se qualquer insert falhar, agendamento já foi criado)
  const detalhesPayload = payload.detalhes.map(d => ({
    agendamento_id,
    pet_id: d.pet_id,
    servico_id: d.servico_id,
    valor_cobrado: d.valor_cobrado ?? null
  }));

  const { data: detalhesData, error: detError } = await supabase
    .from('agendamento_detalhes')
    .insert(detalhesPayload)
    .select();

  if (detError) {
    // Em caso de erro, ideal: chamar RPC para rollback, ou registrar para operação manual.
    console.error('Erro ao inserir agendamento_detalhes', detError);
    return { success: false, agendamento: agendamentoData, error: detError };
  }

  return { success: true, agendamento: agendamentoData, detalhes: detalhesData };
}

/**
 * Lista agendamentos com detalhes, pets e servicos embutidos.
 * Exemplos de select aninhado: '*, agendamento_detalhes(*, pets(*), servicos(*))'
 */
export async function fetchAgendamentosComDetalhes({ filtro = {} } = {}) {
  let query = supabase.from('agendamentos').select(`
    *,
    agendamento_detalhes(
      *,
      pets(*),
      servicos(*)
    )
  `).order('data_hora_inicio', { ascending: false });

  if (filtro.cliente_id) query = query.eq('cliente_id', filtro.cliente_id);
  if (filtro.status) query = query.eq('status', filtro.status);

  const { data, error } = await query;
  if (error) {
    console.error('fetchAgendamentosComDetalhes erro', error);
    return [];
  }
  return data || [];
}

/**
 * Funções para pets_adocao - usar nomes conforme schema: tutorNome, tutorTelefone, imagens_url_arr, imagens_url, imagensURL_arr
 */
export async function fetchAdocoes({ onlyDisponiveis = true } = {}) {
  let q = supabase.from('pets_adocao').select('*').order('created_at', { ascending: false });
  if (onlyDisponiveis) q = q.eq('adotado', false);
  const { data, error } = await q;
  if (error) {
    console.error('fetchAdocoes erro', error);
    return [];
  }
  // normalize images fields
  return (data || []).map(row => {
    const imagens = normalizeArrayField(row.imagens_url_arr ?? row.imagens_url ?? row.imagensURL_arr);
    return { ...row, imagens_array: imagens };
  });
}

export async function getAdocaoById(id) {
  const { data, error } = await supabase.from('pets_adocao').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getAdocaoById erro', error);
    return null;
  }
  if (!data) return null;
  const imagens = normalizeArrayField(data.imagens_url_arr ?? data.imagens_url ?? data.imagensURL_arr);
  return { ...data, imagens_array: imagens };
}

export async function updateAdocaoImages(id, imagensArray) {
  const { data, error } = await supabase.from('pets_adocao').update({ imagens_url_arr: imagensArray }).eq('id', id).select().maybeSingle();
  if (error) {
    console.error('updateAdocaoImages erro', error);
    return null;
  }
  return data;
}