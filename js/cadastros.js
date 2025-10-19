// js/cadastros.js (VERSÃO COMPLETA E REVISADA)
// Mantém todas as funcionalidades do admin: bairros, raças, fornecedores, serviços, produtos, stories, pagamentos, horários.
// Normaliza arrays de imagens quando necessário e usa a configuração do supabase.

import { mostrarSucesso, mostrarErro } from './notificacoes.js';
import { supabase } from './supabase-config.js';
import { normalizeArrayField } from './utils/normalizeArray.js';

async function fetchAdocoesAdmin() {
  try {
    const { data, error } = await supabase.from('adocoes').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return data ?? [];
  } catch (err) {
    console.error('fetchAdocoesAdmin error', err);
    return [];
  }
}

function buildActionsCell(anuncio) {
  const wrapper = document.createElement('div');
  wrapper.className = 'actions-cell';

  // Edit
  const btnEdit = document.createElement('button');
  btnEdit.className = 'btn-edit';
  btnEdit.title = 'Editar';
  btnEdit.innerHTML = '<i class="fas fa-edit"></i>';
  btnEdit.addEventListener('click', () => openEditModal(anuncio));
  wrapper.appendChild(btnEdit);

  // Toggle status
  const btnToggle = document.createElement('button');
  btnToggle.className = anuncio.status === 'adotado' ? 'btn-status-realizado' : 'btn-status-faltou';
  btnToggle.title = anuncio.status === 'adotado' ? 'Marcar como disponível' : 'Marcar como adotado';
  btnToggle.innerHTML = anuncio.status === 'adotado' ? '<i class="fas fa-undo"></i>' : '<i class="fas fa-check"></i>';
  btnToggle.addEventListener('click', async () => {
    await toggleStatus(anuncio.id, anuncio.status === 'adotado' ? 'disponivel' : 'adotado');
    loadGerenciarAdocao(); // reload list
  });
  wrapper.appendChild(btnToggle);

  // Delete
  const btnDelete = document.createElement('button');
  btnDelete.className = 'btn-delete';
  btnDelete.title = 'Excluir';
  btnDelete.innerHTML = '<i class="fas fa-trash"></i>';
  btnDelete.addEventListener('click', async () => {
    if (!confirm('Deseja mesmo excluir este anúncio? Esta ação é irreversível.')) return;
    await deleteAnuncio(anuncio.id);
    loadGerenciarAdocao();
  });
  wrapper.appendChild(btnDelete);

  return wrapper;
}

async function toggleStatus(id, novoStatus) {
  try {
    const { error } = await supabase.from('adocoes').update({ status: novoStatus }).eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('toggleStatus error', err);
    alert('Falha ao alterar status.');
    return false;
  }
}

async function deleteAnuncio(id) {
  try {
    const { error } = await supabase.from('adocoes').delete().eq('id', id);
    if (error) throw error;
    return true;
  } catch (err) {
    console.error('deleteAnuncio error', err);
    alert('Erro ao excluir anúncio.');
    return false;
  }
}

function openEditModal(anuncio) {
  // Exemplo simples: abrir modal com campos para editar nome_pet, cidade, telefone, observacoes, status
  // Implemente seu modal existente ou adapte para usar o modal padrão do projeto.
  const modal = document.getElementById('modal-edit-adocao');
  if (!modal) {
    alert('Modal de edição não encontrado. Crie um modal com id "modal-edit-adocao" e campos para edição.');
    return;
  }
  // Preenche campos (assumindo ids: edit-nome_pet, edit-cidade, edit-telefone, edit-observacoes, edit-status, edit-id)
  modal.querySelector('#edit-id').value = anuncio.id;
  modal.querySelector('#edit-nome_pet').value = anuncio.nome_pet || '';
  modal.querySelector('#edit-cidade').value = anuncio.cidade || '';
  modal.querySelector('#edit-telefone').value = anuncio.telefone || '';
  modal.querySelector('#edit-observacoes').value = anuncio.observacoes || '';
  modal.querySelector('#edit-status').value = anuncio.status || 'disponivel';
  modal.style.display = 'block';
}

async function saveEditFromModal(ev) {
  ev.preventDefault();
  const modal = document.getElementById('modal-edit-adocao');
  const id = modal.querySelector('#edit-id').value;
  const nome_pet = modal.querySelector('#edit-nome_pet').value;
  const cidade = modal.querySelector('#edit-cidade').value;
  const telefone = modal.querySelector('#edit-telefone').value;
  const observacoes = modal.querySelector('#edit-observacoes').value;
  const status = modal.querySelector('#edit-status').value;

  try {
    const { error } = await supabase.from('adocoes').update({ nome_pet, cidade, telefone, observacoes, status }).eq('id', id);
    if (error) throw error;
    modal.style.display = 'none';
    loadGerenciarAdocao();
    alert('Anúncio atualizado com sucesso.');
  } catch (err) {
    console.error('saveEditFromModal error', err);
    alert('Erro ao salvar alterações.');
  }
}

// Render list in the admin area, table container with id #adocoes-admin-table (crie no HTML se não existir)
export async function loadGerenciarAdocao() {
  const container = document.querySelector('#adocoes-admin-table');
  if (!container) {
    console.warn('Container #adocoes-admin-table não encontrado. Insira um elemento <div id="adocoes-admin-table"></div> no view gerenciar-adocao.');
    return;
  }

  const registros = await fetchAdocoesAdmin();

  // Build table
  const table = document.createElement('table');
  table.className = 'dashboard-table';
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Foto</th>
      <th>Nome</th>
      <th>Cidade</th>
      <th>Contato</th>
      <th>Status</th>
      <th class="actions-cell-header">Ações</th>
    </tr>
  `;
  table.appendChild(thead);

  const tbody = document.createElement('tbody');

  registros.forEach(item => {
    const tr = document.createElement('tr');
    tr.dataset.id = item.id;
    tr.className = item.status === 'disponivel' ? '' : (item.status === 'adotado' ? 'cliente-pendente' : '');
    const photo = (Array.isArray(item.fotos) && item.fotos[0]) ? item.fotos[0] : (item.fotos || 'images/no-photo.png');
    tr.innerHTML = `
      <td><img src="${photo}" style="width:60px;height:60px;object-fit:cover;border-radius:8px"></td>
      <td>${escapeHtml(item.nome_pet || '')}</td>
      <td>${escapeHtml(item.cidade || '')}</td>
      <td>${escapeHtml(item.telefone || '')}</td>
      <td><span class="status-badge ${item.status === 'disponivel' ? 'status-agendado' : (item.status === 'adotado' ? 'status-realizado' : '')}">${escapeHtml(item.status || '')}</span></td>
      <td></td>
    `;
    const actionsCell = buildActionsCell(item);
    tr.querySelector('td:last-child').appendChild(actionsCell);
    tbody.appendChild(tr);
  });

  table.appendChild(tbody);
  container.innerHTML = '';
  container.appendChild(table);

  // Hook modal save
  const saveBtn = document.querySelector('#modal-edit-adocao #modal-save-btn');
  if (saveBtn) {
    saveBtn.onclick = saveEditFromModal;
  }
}

// helper escape
function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* Auto-load when view is shown: certifique-se que sua navegação chama loadGerenciarAdocao() quando o view 'gerenciar-adocao' for ativado */
document.addEventListener('DOMContentLoaded', () => {
  // opcional: se você já determina que view está ativa no load inicial:
  const currentView = document.querySelector('.view.active');
  if (currentView && currentView.id === 'view-gerenciar-adocao') {
    loadGerenciarAdocao();
  }
});

// Pet form (simplificado) - mantém compatibilidade com a estrutura existente
const petForm = document.getElementById('pet-form');
if (petForm) {
  petForm.addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const form = ev.target;
    const formData = new FormData(form);

    const id = formData.get('id'); // vazio para novo
    const nomePet = formData.get('nomePet')?.toString() ?? '';
    const cidade = formData.get('cidade')?.toString() ?? '';
    const observacoes = formData.get('observacoes')?.toString() ?? '';

    // Imagens field can be CSV, JSON string or file input; here we check 'imagens' field first
    const imagensRaw = formData.get('imagens')?.toString() ?? '';
    const imagensArray = normalizeArrayField(imagensRaw);

    try {
      if (id) {
        const { error } = await supabase.from('pets_adocao').update({
          nomePet, cidade, observacoes, imagens_url: imagensArray
        }).eq('id', Number(id));
        if (error) throw error;
        mostrarSucesso('Atualizado com sucesso');
      } else {
        const { error } = await supabase.from('pets_adocao').insert([{
          nomePet, cidade, observacoes, imagens_url: imagensArray
        }]);
        if (error) throw error;
        mostrarSucesso('Cadastrado com sucesso');
        form.reset();
      }
    } catch (err) {
      console.error('Erro ao salvar pet', err);
      mostrarErro('Erro ao salvar. Veja console.');
    }
  });
}

//
// Setup geral de cadastros (admin)
//
export function setupCadastros() {
    // Element references
    const tabelaBairrosBody = document.querySelector('#tabela-bairros tbody');
    const formBairro = document.getElementById('form-cadastrar-bairro');
    const modalEditarBairro = document.getElementById('modal-editar-bairro');
    const formEditarBairro = document.getElementById('form-editar-bairro');

    const tabelaRacasBody = document.querySelector('#tabela-racas tbody');
    const formRaca = document.getElementById('form-cadastrar-raca');
    const racasDropdowns = document.querySelectorAll('.pet-raca, .edit-pet-raca');
    const modalEditarRaca = document.getElementById('modal-editar-raca');
    const formEditarRaca = document.getElementById('form-editar-raca');

    const tabelaServicosBody = document.querySelector('#tabela-servicos tbody');
    const formCadastrarServico = document.getElementById('form-cadastrar-servico');
    const produtoSelect = document.getElementById('produto-select');
    const produtosUtilizadosTbody = document.getElementById('produtos-utilizados-tbody');
    const custoTotalInput = document.getElementById('servico-custo-total');
    const modalEditarServico = document.getElementById('edit-service-modal');
    const formEditarServico = document.getElementById('form-editar-servico');
    const editProdutoSelect = document.getElementById('edit-produto-select');
    const editProdutosUtilizadosTbody = document.getElementById('edit-produtos-utilizados-tbody');
    const editCustoTotalInput = document.getElementById('edit-servico-custo-total');

    let produtosDisponiveis = [];
    let servicosAdicionaisCache = [];

    const tabelaFornecedoresBody = document.querySelector('#tabela-fornecedores tbody');
    const formFornecedor = document.getElementById('form-cadastrar-fornecedor');
    const modalEditarFornecedor = document.getElementById('modal-editar-fornecedor');
    const formEditarFornecedor = document.getElementById('form-editar-fornecedor');

    const formCadastrarStory = document.getElementById('form-cadastrar-story');
    const storiesGridAdmin = document.getElementById('stories-grid-admin');

    const btnRefreshServicos = document.getElementById('btn-refresh-servicos');

    const tabelaPagamentosBody = document.querySelector('#tabela-pagamentos tbody');
    const formPagamento = document.getElementById('form-cadastrar-pagamento');
    const modalEditarPagamento = document.getElementById('modal-editar-pagamento');
    const formEditarPagamento = document.getElementById('form-editar-pagamento');

    const formGerenciarHorarios = document.getElementById('form-gerenciar-horarios');

    //
    // Formas de pagamento
    //
    async function carregarTabelaPagamentos() {
        if (!tabelaPagamentosBody) return;
        const { data: formas, error } = await supabase.from('formas_pagamento').select('*').order('nome');
        if (error) { mostrarErro('Erro ao carregar formas de pagamento.'); return; }
        tabelaPagamentosBody.innerHTML = '';
        if (formas && Array.isArray(formas)) {
            formas.forEach(f => {
                const taxaFormatada = (typeof f.taxa_percentual === 'number') ? f.taxa_percentual.toFixed(2) + '%' : '0.00%';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${f.nome}</td><td>${taxaFormatada}</td><td class="actions-cell"><button class="btn-edit-pagamento btn-edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn-delete-pagamento btn-delete" data-id="${f.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaPagamentosBody.appendChild(tr);
            });
        }
    }

    if (formPagamento) {
        formPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('pagamento-nome').value.trim();
            const taxa = parseFloat(document.getElementById('pagamento-taxa').value.replace(',', '.')) || 0;

            if (!nome) {
                mostrarErro('O nome da forma de pagamento é obrigatório.');
                return;
            }

            const { error } = await supabase.from('formas_pagamento').insert({ nome, taxa_percentual: taxa });
            if (error) {
                if (error.message && error.message.includes('formas_pagamento_nome_key')) {
                    mostrarErro(`A forma de pagamento "${nome}" já está cadastrada.`);
                } else {
                    mostrarErro('Erro ao salvar: ' + (error.message || String(error)));
                }
            } else {
                mostrarSucesso('Forma de pagamento salva com sucesso!');
                formPagamento.reset();
                await carregarTabelaPagamentos();
            }
        });
    }

    if (tabelaPagamentosBody) {
        tabelaPagamentosBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit-pagamento');
            const deleteBtn = e.target.closest('.btn-delete-pagamento');

            if (editBtn) {
                const id = editBtn.dataset.id;
                const { data: f, error } = await supabase.from('formas_pagamento').select('*').eq('id', id).single();
                if (error || !f) { mostrarErro('Erro ao buscar dados.'); return; }
                document.getElementById('edit-pagamento-id').value = f.id;
                document.getElementById('edit-pagamento-nome').value = f.nome;
                document.getElementById('edit-pagamento-taxa').value = f.taxa_percentual;
                if (modalEditarPagamento) modalEditarPagamento.style.display = 'block';
            }

            if (deleteBtn) {
                if (!confirm('Tem certeza que deseja excluir esta forma de pagamento?')) return;
                const { error } = await supabase.from('formas_pagamento').delete().eq('id', deleteBtn.dataset.id);
                if (error) { mostrarErro('Erro ao excluir: ' + error.message); }
                else { mostrarSucesso('Excluído com sucesso!'); await carregarTabelaPagamentos(); }
            }
        });
    }

    if (formEditarPagamento) {
        formEditarPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-pagamento-id').value;
            const nome = document.getElementById('edit-pagamento-nome').value.trim();
            const taxa = parseFloat(document.getElementById('edit-pagamento-taxa').value.replace(',', '.')) || 0;

            const { error } = await supabase.from('formas_pagamento').update({ nome, taxa_percentual: taxa }).eq('id', id);
            if (error) { mostrarErro('Erro ao atualizar: ' + error.message); }
            else { mostrarSucesso('Atualizado com sucesso!'); if (modalEditarPagamento) modalEditarPagamento.style.display = 'none'; await carregarTabelaPagamentos(); }
        });
    }

    if (btnRefreshServicos) {
        btnRefreshServicos.addEventListener('click', async () => {
            const icon = btnRefreshServicos.querySelector('i');
            if (icon) icon.classList.add('spin');
            btnRefreshServicos.disabled = true;
            await carregarServicos();
            setTimeout(() => {
                if (icon) icon.classList.remove('spin');
                btnRefreshServicos.disabled = false;
            }, 500);
        });
    }

    //
    // Pré-visualização de imagens para serviço (cadastro)
    //
    const servicoFotosInput = document.getElementById('servico-fotos');
    const servicoFotosPreview = document.getElementById('servico-fotos-preview');

    if (servicoFotosInput && servicoFotosPreview) {
        servicoFotosInput.addEventListener('change', () => {
            servicoFotosPreview.innerHTML = '';
            const files = servicoFotosInput.files;

            if (files.length > 3) {
                mostrarErro('Você pode selecionar no máximo 3 fotos.');
                servicoFotosInput.value = '';
                return;
            }

            for (const file of files) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.classList.add('preview-item');
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}" class="preview-image-thumbnail">
                        <span class="preview-file-name">${file.name}</span>
                        <div class="progress-container"><div class="progress-bar"></div></div>
                    `;
                    servicoFotosPreview.appendChild(previewItem);
                }
                reader.readAsDataURL(file);
            }
        });
    }

    //
    // Stories admin
    //
    async function carregarStoriesAdmin() {
        if (!storiesGridAdmin) return;
        const { data: stories, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
        if (error) { storiesGridAdmin.innerHTML = '<p>Erro ao carregar stories.</p>'; return; }
        if (!stories || stories.length === 0) { storiesGridAdmin.innerHTML = '<p>Nenhum story cadastrado.</p>'; return; }
        storiesGridAdmin.innerHTML = '';
        stories.forEach(story => {
            storiesGridAdmin.insertAdjacentHTML('beforeend', `<div class="story-card-admin"><img src="${story.media_url}" alt="Story"><button class="btn-delete-story btn-delete" data-id="${story.id}" data-url="${story.media_url}">Excluir</button></div>`);
        });
    }

    if (formCadastrarStory) {
        formCadastrarStory.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mediaFile = document.getElementById('story-media').files[0];
            if (!mediaFile) return;

            const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
            const filePath = `stories_media/${Date.now()}-${mediaFile.name}`;
            const { error: uploadError } = await supabase.storage.from('petshop-assets').upload(filePath, mediaFile);
            if (uploadError) { mostrarErro('Erro no upload da mídia: ' + uploadError.message); return; }

            const { data: urlData } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);

            const { error: insertError } = await supabase.from('stories').insert({
                media_url: urlData.publicUrl,
                media_type: mediaType
            });

            if (insertError) { mostrarErro('Erro ao salvar o story: ' + insertError.message); }
            else { mostrarSucesso('Story adicionado com sucesso!'); formCadastrarStory.reset(); await carregarStoriesAdmin(); }
        });
    }

    if (storiesGridAdmin) {
        storiesGridAdmin.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.btn-delete-story');
            if (!deleteBtn) return;
            if (!confirm('Tem certeza que deseja excluir este story?')) return;

            const storyId = deleteBtn.dataset.id;
            const storyUrl = deleteBtn.dataset.url;

            const { error: deleteDbError } = await supabase.from('stories').delete().eq('id', storyId);
            if (deleteDbError) { mostrarErro('Erro ao deletar o story do banco de dados: ' + deleteDbError.message); return; }

            try {
                const filePath = new URL(storyUrl).pathname.split('/petshop-assets/')[1];
                if (filePath) await supabase.storage.from('petshop-assets').remove([filePath]);
            } catch (storageError) {
                console.warn("Aviso: Não foi possível remover o arquivo do Storage.", storageError);
            }

            mostrarSucesso('Story excluído com sucesso!');
            await carregarStoriesAdmin();
        });
    }

    //
    // Bairros
    //
    async function carregarTabelaBairros() {
        if (!tabelaBairrosBody) return;
        const { data: bairros, error } = await supabase.from('bairros').select('*').order('id');
        if (error) { console.error("Erro ao carregar bairros:", error); return; }
        tabelaBairrosBody.innerHTML = '';
        if (bairros && Array.isArray(bairros)) {
            bairros.forEach(b => {
                const valorFormatado = (typeof b.valor_tele_busca === 'number') ? `R$ ${b.valor_tele_busca.toFixed(2)}` : 'R$ 0.00';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(b.id).padStart(5, '0')}</td><td>${b.nome}</td><td>${valorFormatado}</td><td class="actions-cell"><button class="btn-edit-bairro btn-edit" data-id="${b.id}" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn-delete-bairro btn-delete" data-id="${b.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaBairrosBody.appendChild(tr);
            });
        }
    }

    if (formBairro) {
        formBairro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nomeInput = document.getElementById('bairro-nome');
            const valorInput = document.getElementById('bairro-valor-tele');
            const nome = nomeInput.value.trim();
            const valor = parseFloat(valorInput.value.replace(',', '.')) || 0;

            if(!nome) { mostrarErro('Por favor, digite o nome do bairro.'); return; }

            const { error } = await supabase.from('bairros').insert({ nome, valor_tele_busca: valor });
            if (error) { mostrarErro('Erro ao cadastrar bairro: ' + error.message); } 
            else { mostrarSucesso('Bairro cadastrado com sucesso!'); nomeInput.value = ''; valorInput.value = ''; await carregarTabelaBairros(); }
        });
    }

    if (tabelaBairrosBody) {
        tabelaBairrosBody.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit-bairro');
            const deleteBtn = e.target.closest('.btn-delete-bairro');

            if (editBtn) {
                const bairroId = editBtn.dataset.id;
                const { data: bairro, error } = await supabase.from('bairros').select('*').eq('id', bairroId).single();
                if (error || !bairro) { mostrarErro('Erro ao buscar dados do bairro.'); return; }

                document.getElementById('edit-bairro-id').value = bairro.id;
                document.getElementById('edit-bairro-nome').value = bairro.nome || '';
                document.getElementById('edit-bairro-valor-tele').value = bairro.valor_tele_busca ? bairro.valor_tele_busca.toFixed(2) : '';

                if (modalEditarBairro) modalEditarBairro.style.display = 'block';
            }

            if (deleteBtn) {
                const bairroId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este bairro?')) {
                    const { error } = await supabase.from('bairros').delete().eq('id', bairroId);
                    if (error) mostrarErro('Erro ao excluir o bairro: ' + error.message);
                    else { mostrarSucesso('Bairro excluído com sucesso!'); await carregarTabelaBairros(); }
                }
            }
        });
    }

    if (formEditarBairro) {
        formEditarBairro.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-bairro-id').value;
            const nome = document.getElementById('edit-bairro-nome').value.trim();
            const valor = parseFloat(document.getElementById('edit-bairro-valor-tele').value.replace(',', '.')) || 0;

            if(!nome) { mostrarErro('O nome do bairro não pode ser vazio.'); return; }

            const { error } = await supabase.from('bairros').update({ nome, valor_tele_busca: valor }).eq('id', id);
            if(error) { mostrarErro('Erro ao atualizar o bairro: ' + error.message); }
            else { mostrarSucesso('Bairro atualizado com sucesso!'); if (modalEditarBairro) modalEditarBairro.style.display = 'none'; await carregarTabelaBairros(); }
        });
    }

    //
    // Raças
    //
    async function carregarTabelaRacas() {
        if (!tabelaRacasBody) return;
        const { data: racas, error } = await supabase.from('racas').select('*').order('id');
        if (error) { console.error("Erro ao carregar raças:", error); return; }
        tabelaRacasBody.innerHTML = '';
        if (racas && Array.isArray(racas)) {
            racas.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(r.id).padStart(5, '0')}</td><td>${r.nome}</td><td class="actions-cell"><button class="btn-edit-raca btn-edit" data-id="${r.id}" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn-delete-raca btn-delete" data-id="${r.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaRacasBody.appendChild(tr);
            });
        }
    }

    async function carregarRacas() {
        const { data: racas, error } = await supabase.from('racas').select('*').order('nome');
        if (error) { console.error("Erro ao carregar raças para os dropdowns:", error); return; }
        if (racas && Array.isArray(racas)) {
            racasDropdowns.forEach(drop => {
                if (drop) {
                    drop.innerHTML = '<option value="">Selecione</option>';
                    racas.forEach(r => { drop.insertAdjacentHTML('beforeend', `<option value="${r.nome}">${r.nome}</option>`); });
                    drop.insertAdjacentHTML('beforeend', `<option value="Outra">Outra</option>`);
                }
            });
        }
    }

    if (formRaca) {
        formRaca.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('raca-nome').value;
            const { error } = await supabase.from('racas').insert({ nome });
            if (error) mostrarErro('Erro: ' + error.message);
            else { formRaca.reset(); await carregarTabelaRacas(); await carregarRacas(); }
        });
    }

    if (tabelaRacasBody) {
        tabelaRacasBody.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit-raca');
            const deleteBtn = e.target.closest('.btn-delete-raca');

            if (editBtn) {
                const racaId = editBtn.dataset.id;
                const { data: raca, error } = await supabase.from('racas').select('*').eq('id', racaId).single();
                if(error || !raca) { mostrarErro('Erro ao buscar dados da raça.'); return; }
                document.getElementById('edit-raca-id').value = raca.id;
                document.getElementById('edit-raca-nome').value = raca.nome;
                if (modalEditarRaca) modalEditarRaca.style.display = 'block';
            }

            if (deleteBtn) {
                const racaId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir esta raça?')) {
                    const { error } = await supabase.from('racas').delete().eq('id', racaId);
                    if (error) mostrarErro('Erro ao excluir a raça: ' + error.message);
                    else { mostrarSucesso('Raça excluída com sucesso!'); await carregarTabelaRacas(); await carregarRacas(); }
                }
            }
        });
    }

    if (formEditarRaca) {
        formEditarRaca.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-raca-id').value;
            const nome = document.getElementById('edit-raca-nome').value.trim();
            if(!nome) { mostrarErro('O nome da raça não pode ser vazio.'); return; }
            const { error } = await supabase.from('racas').update({ nome }).eq('id', id);
            if(error) mostrarErro('Erro ao atualizar a raça: ' + error.message);
            else { mostrarSucesso('Raça atualizada com sucesso!'); if (modalEditarRaca) modalEditarRaca.style.display = 'none'; await carregarTabelaRacas(); await carregarRacas(); }
        });
    }

    //
    // Produtos / Serviços management (resumido / completo)
    //
    async function carregarProdutosParaServicos() {
        if (!produtoSelect && !editProdutoSelect) return;
        const { data: produtos, error } = await supabase.from('produtos').select('id, nome, preco_custo, unidade_medida').order('nome');
        if (error) { console.error('Erro ao carregar produtos:', error); return; }
        produtosDisponiveis = produtos || [];
        if (produtosDisponiveis.length > 0) {
            const optionsHtml = produtosDisponiveis.map(p => {
                const custoFormatado = (typeof p.preco_custo === 'number') ? `(Custo: R$ ${p.preco_custo.toFixed(2)})` : '(Custo não informado)';
                return `<option value="${p.id}">${p.nome} ${custoFormatado}</option>`;
            }).join('');
            if(produtoSelect) produtoSelect.innerHTML = '<option value="">Selecione um produto para adicionar</option>' + optionsHtml;
            if(editProdutoSelect) editProdutoSelect.innerHTML = '<option value="">Selecione um produto para adicionar</option>' + optionsHtml;
        }
    }

    async function carregarTabelaFornecedores() {
        if (!tabelaFornecedoresBody) return;
        const { data: fornecedores, error } = await supabase.from('fornecedores').select('*').order('id');
        if (error) { console.error("Erro ao carregar fornecedores:", error); return; }
        tabelaFornecedoresBody.innerHTML = '';
        if (fornecedores && Array.isArray(fornecedores)) {
            fornecedores.forEach(f => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(f.id).padStart(5, '0')}</td><td>${f.nome}</td><td>${f.telefone || '-'}</td><td>${f.email || '-'}</td><td>${f.cnpj || '-'}</td><td class="actions-cell"><button class="btn-edit-fornecedor btn-edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn-delete-fornecedor btn-delete" data-id="${f.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaFornecedoresBody.appendChild(tr);
            });
        }
    }

    if (formFornecedor) {
        formFornecedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fornecedorData = {
                nome: document.getElementById('fornecedor-nome').value,
                cnpj: document.getElementById('fornecedor-cnpj').value,
                email: document.getElementById('fornecedor-email').value,
                telefone: document.getElementById('fornecedor-telefone').value,
                endereco: document.getElementById('fornecedor-endereco').value
            };
            const { error } = await supabase.from('fornecedores').insert(fornecedorData);
            if (error) mostrarErro('Erro ao cadastrar fornecedor: ' + error.message);
            else { mostrarSucesso('Fornecedor cadastrado com sucesso!'); formFornecedor.reset(); await carregarTabelaFornecedores(); }
        });
    }

    if (tabelaFornecedoresBody) {
        tabelaFornecedoresBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit-fornecedor');
            const deleteBtn = e.target.closest('.btn-delete-fornecedor');

            if (editBtn) {
                const fornecedorId = editBtn.dataset.id;
                const { data: f, error } = await supabase.from('fornecedores').select('*').eq('id', fornecedorId).single();
                if (error || !f) { mostrarErro('Erro ao carregar dados do fornecedor.'); return; }
                document.getElementById('edit-fornecedor-id').value = f.id;
                document.getElementById('edit-fornecedor-nome').value = f.nome;
                document.getElementById('edit-fornecedor-cnpj').value = f.cnpj;
                document.getElementById('edit-fornecedor-email').value = f.email;
                document.getElementById('edit-fornecedor-telefone').value = f.telefone;
                document.getElementById('edit-fornecedor-endereco').value = f.endereco;
                if (modalEditarFornecedor) modalEditarFornecedor.style.display = 'block';
            }

            if (deleteBtn) {
                const fornecedorId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
                    const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedorId);
                    if (error) mostrarErro('Erro ao excluir fornecedor: ' + error.message);
                    else { mostrarSucesso('Fornecedor excluído com sucesso!'); await carregarTabelaFornecedores(); }
                }
            }
        });
    }

    //
    // Carregar serviços (admin table)
    //
    async function carregarServicos() {
        if (!tabelaServicosBody) return;
        const { data: servicos, error } = await supabase.from('servicos').select(`
            id, nome, valor, duracao_minutos, mostrar_site, imagens_url, tipo_servico,
            servico_produtos ( quantidade_utilizada, produto_id, produtos ( id, nome, preco_custo ) )
        `);
        if (error) { console.error('Erro ao carregar serviços:', error); return; }
        tabelaServicosBody.innerHTML = '';
        if (servicos && Array.isArray(servicos)) {
            servicos.forEach(s => {
                let custoTotal = 0;
                if (s.servico_produtos && Array.isArray(s.servico_produtos)) {
                    s.servico_produtos.forEach(sp => {
                        const custoProduto = sp.produtos ? sp.produtos.preco_custo : 0;
                        custoTotal += (sp.quantidade_utilizada || 0) * (custoProduto || 0);
                    });
                }
                const valorVenda = s.valor || 0;
                const lucroEstimado = valorVenda - custoTotal;
                const imageUrl = (s.imagens_url && s.imagens_url.length > 0) ? s.imagens_url[0] : 'images/default-service.png';
                const tipoServicoFormatado = s.tipo_servico ? s.tipo_servico.charAt(0).toUpperCase() + s.tipo_servico.slice(1) : 'Não definido';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td><img src="${imageUrl}" alt="Foto de ${s.nome}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td><td>${String(s.id).padStart(5, '0')}</td><td>${s.nome}</td><td>R$ ${valorVenda.toFixed(2)}</td><td>R$ ${custoTotal.toFixed(2)}</td><td>R$ ${lucroEstimado.toFixed(2)}</td><td>${tipoServicoFormatado}</td><td class="actions-cell"><button class="btn-edit-servico btn-edit" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button> <button class="btn-delete-servico btn-delete" data-id="${s.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaServicosBody.appendChild(tr);
            });
        }
    }

    //
    // Cadastro de serviços - criação e associação de produtos
    //
    if (formCadastrarServico) {
        formCadastrarServico.addEventListener('submit', async e => {
            e.preventDefault();
            const nomeServico = document.getElementById('servico-nome').value.trim();
            const valorServico = document.getElementById('servico-valor').value;
            if (!nomeServico || !valorServico) { mostrarErro('Por favor, preencha pelo menos o Nome e o Valor do serviço.'); return; }

            const servicoData = {
                nome: nomeServico,
                valor: parseFloat(valorServico.replace(',', '.')) || 0,
                duracao_minutos: parseInt(document.getElementById('servico-duracao').value) || null,
                descricao: document.getElementById('servico-descricao').value.trim(),
                mostrar_site: document.getElementById('servico-mostrar-site').checked,
                tipo_servico: document.getElementById('servico-tipo').value
            };

            const { data: servicoResult, error: createError } = await supabase
                .from('servicos')
                .insert([servicoData])
                .select()
                .single();

            if (createError) { mostrarErro('Falha ao criar o novo serviço: ' + createError.message); return; }

            // Produtos associados
            const produtosParaSalvar = [];
            if (produtosUtilizadosTbody) {
                produtosUtilizadosTbody.querySelectorAll('tr').forEach(linha => {
                    produtosParaSalvar.push({
                        servico_id: servicoResult.id,
                        produto_id: parseInt(linha.dataset.produtoId),
                        quantidade_utilizada: parseFloat(linha.querySelector('input').value) || 0
                    });
                });
            }

            if (produtosParaSalvar.length > 0) {
                const { error: insertProdutosError } = await supabase.from('servico_produtos').insert(produtosParaSalvar);
                if (insertProdutosError) mostrarErro('Serviço criado, mas houve um erro ao salvar os produtos associados.');
            }

            // Upload fotos do serviço
            const fotosInput = document.getElementById('servico-fotos');
            if (fotosInput && fotosInput.files.length > 0) {
                const novasImagensUrls = await uploadServicoImagens(servicoResult.id, fotosInput.files);
                if (novasImagensUrls.length > 0) {
                    await supabase.from('servicos').update({ imagens_url: novasImagensUrls }).eq('id', servicoResult.id);
                }
            }

            mostrarSucesso(`Serviço "${servicoResult.nome}" cadastrado com sucesso!`);
            formCadastrarServico.reset();
            if (produtosUtilizadosTbody) produtosUtilizadosTbody.innerHTML = '';
            const preview = document.getElementById('servico-fotos-preview');
            if (preview) preview.innerHTML = '';
            if (custoTotalInput) custoTotalInput.value = '0.00';
            await carregarServicos();
        });
    }

    async function uploadServicoImagens(servicoId, files) {
        const urls = [];
        for (const file of files) {
            const filePath = `servicos_fotos/${servicoId}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage.from('petshop-assets').upload(filePath, file);
            if (uploadError) { console.error('Erro no upload da imagem:', uploadError.message); continue; }
            const { data: urlData } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
            urls.push(urlData.publicUrl);
        }
        return urls;
    }

    //
    // Edição de serviço (remover fotos, atualizar dados, produtos associados)
    //
    if (formEditarServico) {
        const previewContainer = document.getElementById('edit-servico-fotos-preview');
        if (previewContainer) {
            previewContainer.addEventListener('click', async (e) => {
                if (!e.target.classList.contains('btn-delete-foto-servico')) return;
                if (!confirm('Tem certeza que deseja excluir esta foto permanentemente?')) return;
                const button = e.target;
                const imageUrlToDelete = button.dataset.url;
                const servicoId = document.getElementById('edit-servico-id').value;

                button.disabled = true;

                const { data: servico, error: fetchError } = await supabase.from('servicos').select('imagens_url').eq('id', servicoId).single();
                if (fetchError || !servico) { mostrarErro('Erro ao buscar o serviço para atualizar as fotos.'); button.disabled = false; return; }

                const newImageUrls = (servico.imagens_url || []).filter(url => url !== imageUrlToDelete);
                const { error: updateError } = await supabase.from('servicos').update({ imagens_url: newImageUrls }).eq('id', servicoId);
                if (updateError) { mostrarErro('Erro ao remover a URL da foto: ' + updateError.message); button.disabled = false; return; }

                try {
                    const filePath = new URL(imageUrlToDelete).pathname.split('/petshop-assets/')[1];
                    if (filePath) await supabase.storage.from('petshop-assets').remove([filePath]);
                } catch (storageError) {
                    console.warn("Aviso: Não foi possível remover o arquivo do Storage.", storageError);
                }

                button.closest('.preview-image-wrapper')?.remove();
                mostrarSucesso('Foto excluída com sucesso!');
            });
        }

        formEditarServico.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-servico-id').value;
            const fotosInput = document.getElementById('edit-servico-fotos');
            if (fotosInput && fotosInput.files.length > 3) { mostrarErro('Você pode enviar no máximo 3 fotos.'); return; }

            const servicoData = {
                nome: document.getElementById('edit-servico-nome').value,
                valor: parseFloat(document.getElementById('edit-servico-valor').value.replace(',', '.')) || null,
                duracao_minutos: parseInt(document.getElementById('edit-servico-duracao').value) || null,
                descricao: document.getElementById('edit-servico-descricao').value,
                mostrar_site: document.getElementById('edit-servico-mostrar-site').checked,
                tipo_servico: document.getElementById('edit-servico-tipo').value
            };

            if (fotosInput && fotosInput.files.length > 0) {
                const novasImagensUrls = await uploadServicoImagens(id, fotosInput.files);
                if (novasImagensUrls.length > 0) servicoData.imagens_url = novasImagensUrls;
            }

            const { error: updateError } = await supabase.from('servicos').update(servicoData).eq('id', id);
            if (updateError) { mostrarErro('Erro ao atualizar o serviço: ' + updateError.message); return; }

            // Atualiza associações de adicionais e produtos conforme a UI (similar ao código original)
            // Remove antigas associações e insere novas (se for principal)
            if (servicoData.tipo_servico === 'principal') {
                await supabase.from('servicos_adicionais_associados').delete().eq('servico_principal_id', id);
                const adicionaisParaSalvar = [];
                document.querySelectorAll('#edit-servicos-adicionais-list .selected-item').forEach(item => {
                    adicionaisParaSalvar.push({
                        servico_principal_id: id,
                        servico_adicional_id: item.dataset.id
                    });
                });
                if (adicionaisParaSalvar.length > 0) await supabase.from('servicos_adicionais_associados').insert(adicionaisParaSalvar);
            }

            // Atualiza produtos utilizados
            await supabase.from('servico_produtos').delete().eq('servico_id', id);
            const produtosParaInserir = [];
            if (editProdutosUtilizadosTbody) {
                editProdutosUtilizadosTbody.querySelectorAll('tr').forEach(linha => {
                    produtosParaInserir.push({
                        servico_id: id,
                        produto_id: linha.dataset.produtoId,
                        quantidade_utilizada: parseFloat(linha.querySelector('.qtd-produto-servico').value) || 0
                    });
                });
            }
            if (produtosParaInserir.length > 0) {
                const { error: insertError } = await supabase.from('servico_produtos').insert(produtosParaInserir);
                if (insertError) mostrarErro('Erro ao atualizar produtos do serviço: ' + insertError.message);
            }

            mostrarSucesso('Serviço atualizado com sucesso!');
            if (modalEditarServico) modalEditarServico.style.display = 'none';
            await carregarServicos();
        });
    }

    //
    // Produtos utilizados - adicionar/remover e cálculo de custo
    //
    function adicionarProdutoNaTabelaEdicao(produto, quantidade) {
        if (!produto || !editProdutosUtilizadosTbody) return;
        const tr = document.createElement('tr');
        tr.dataset.produtoId = produto.id;
        const subtotal = (parseFloat(quantidade) || 0) * (produto.preco_custo || 0);
        tr.dataset.subtotal = subtotal;
        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td>
            <td><input type="number" class="qtd-produto-servico" value="${quantidade}" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td>
            <td class="subtotal-custo">R$ ${subtotal.toFixed(2)}</td>
            <td class="actions-cell"><button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button></td>
        `;
        editProdutosUtilizadosTbody.appendChild(tr);
    }

    function setupEditModalListeners() {
        if (!editProdutoSelect || !editProdutosUtilizadosTbody) return;
        const calcularCusto = (tbody, inputDestino) => {
            let custoTotal = 0;
            tbody.querySelectorAll('tr').forEach(linha => { custoTotal += parseFloat(linha.dataset.subtotal) || 0; });
            if (inputDestino) inputDestino.value = custoTotal.toFixed(2);
        };

        if (editProdutoSelect) {
            editProdutoSelect.addEventListener('change', () => {
                const produtoId = editProdutoSelect.value;
                if (!produtoId) return;
                if (editProdutosUtilizadosTbody.querySelector(`tr[data-produto-id="${produtoId}"]`)) {
                    mostrarErro('Este produto já foi adicionado.');
                    editProdutoSelect.value = '';
                    return;
                }
                const produto = produtosDisponiveis.find(p => p.id == produtoId);
                if (produto) {
                    const tr = document.createElement('tr');
                    tr.dataset.produtoId = produto.id;
                    tr.dataset.subtotal = "0";
                    tr.innerHTML = `<td>${produto.nome}</td><td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td><td><input type="number" class="qtd-produto-servico" value="1" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td><td class="subtotal-custo">R$ 0.00</td><td class="actions-cell"><button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button></td>`;
                    editProdutosUtilizadosTbody.appendChild(tr);
                    tr.querySelector('input').dispatchEvent(new Event('input'));
                }
                editProdutoSelect.value = '';
            });
        }

        if (editProdutosUtilizadosTbody) {
            editProdutosUtilizadosTbody.addEventListener('input', e => {
                if (e.target.classList.contains('qtd-produto-servico')) {
                    const tr = e.target.closest('tr');
                    const produto = produtosDisponiveis.find(p => p.id == tr.dataset.produtoId);
                    if (!produto) { console.error(`Produto com ID ${tr.dataset.produtoId} não encontrado no cache.`); return; }
                    const subtotal = (parseFloat(e.target.value) || 0) * (produto.preco_custo || 0);
                    tr.dataset.subtotal = subtotal;
                    tr.querySelector('.subtotal-custo').textContent = `R$ ${subtotal.toFixed(2)}`;
                    calcularCusto(editProdutosUtilizadosTbody, editCustoTotalInput);
                }
            });

            editProdutosUtilizadosTbody.addEventListener('click', e => {
                if (e.target.closest('.btn-delete-produto-servico')) {
                    e.target.closest('tr').remove();
                    calcularCusto(editProdutosUtilizadosTbody, editCustoTotalInput);
                }
            });
        }

        const adicionalSelect = document.getElementById('edit-servico-adicional-select');
        const adicionaisList = document.getElementById('edit-servicos-adicionais-list');
        if (adicionalSelect && adicionaisList) {
            adicionalSelect.addEventListener('change', () => {
                const servicoId = adicionalSelect.value;
                if (!servicoId) return;
                if (adicionaisList.querySelector(`.selected-item[data-id="${servicoId}"]`)) { adicionalSelect.value = ''; return; }
                const servico = servicosAdicionaisCache.find(s => s.id == servicoId);
                if (servico) renderizarAdicionalNaLista(servico);
                adicionalSelect.value = '';
            });
            adicionaisList.addEventListener('click', (e) => {
                if (e.target.classList.contains('btn-delete-adicional-item')) e.target.closest('.selected-item').remove();
            });
        }
    }

    // Calcular custo total (cadastro)
    function calcularCustoTotal() {
        if (!produtosUtilizadosTbody || !custoTotalInput) return;
        let custoTotal = 0;
        produtosUtilizadosTbody.querySelectorAll('tr').forEach(linha => { custoTotal += parseFloat(linha.dataset.subtotal) || 0; });
        custoTotalInput.value = custoTotal.toFixed(2);
    }

    if (produtoSelect) {
        produtoSelect.addEventListener('change', () => {
            const produtoId = produtoSelect.value;
            if (!produtoId) return;
            if (produtosUtilizadosTbody.querySelector(`tr[data-produto-id="${produtoId}"]`)) {
                mostrarErro('Este produto já foi adicionado.');
                produtoSelect.value = '';
                return;
            }
            const produto = produtosDisponiveis.find(p => p.id == produtoId);
            if (produto) {
                const tr = document.createElement('tr');
                tr.dataset.produtoId = produto.id;
                tr.dataset.subtotal = "0";
                tr.innerHTML = `
                    <td>${produto.nome}</td>
                    <td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td>
                    <td><input type="number" class="qtd-produto-servico" value="1" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td>
                    <td class="subtotal-custo">R$ 0.00</td>
                    <td class="actions-cell"><button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button></td>
                `;
                produtosUtilizadosTbody.appendChild(tr);
                tr.querySelector('.qtd-produto-servico').dispatchEvent(new Event('input'));
            }
            produtoSelect.value = '';
        });
    }

    if (produtosUtilizadosTbody) {
        produtosUtilizadosTbody.addEventListener('input', (e) => {
            if (e.target.classList.contains('qtd-produto-servico')) {
                const tr = e.target.closest('tr');
                const produto = produtosDisponiveis.find(p => p.id == tr.dataset.produtoId);
                if (!produto) { console.error(`Produto com ID ${tr.dataset.produtoId} não encontrado no cache.`); return; }
                const quantidade = parseFloat(e.target.value) || 0;
                const subtotal = quantidade * (produto.preco_custo || 0);
                tr.dataset.subtotal = subtotal;
                tr.querySelector('.subtotal-custo').textContent = `R$ ${subtotal.toFixed(2)}`;
                calcularCustoTotal();
            }
        });

        produtosUtilizadosTbody.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.btn-delete-produto-servico');
            if (deleteBtn) { deleteBtn.closest('tr').remove(); calcularCustoTotal(); }
        });
    }

    //
    // Horários padrão (gerenciamento)
    //
    async function carregarHorariosParaGerenciamento() {
        if (!formGerenciarHorarios) return;
        const { data: horarios, error } = await supabase.from('horarios_padrao').select('*').order('dia_semana', { ascending: true });
        if (error) { console.error('Erro ao carregar horários:', error); return; }
        const horariosSafe = horarios || [];
        const diasDaSemana = ["Domingo","Segunda-feira","Terça-feira","Quarta-feira","Quinta-feira","Sexta-feira","Sábado"];
        formGerenciarHorarios.innerHTML = '';
        diasDaSemana.forEach((nomeDia, index) => {
            const horarioDoDia = horariosSafe.find(h => h.dia_semana === index) || {};
            const horariosEmTexto = horarioDoDia.horarios ? (Array.isArray(horarioDoDia.horarios) ? horarioDoDia.horarios.join(', ') : String(horarioDoDia.horarios)) : '';
            const diaHtml = `<div class="dashboard-form" style="display:flex;align-items:center;gap:1rem;margin-bottom:12px;">
                <input type="hidden" class="dia-semana-id" value="${index}">
                <div style="width:120px;"><strong>${nomeDia}</strong></div>
                <div style="flex:1;"><input class="horarios-lista" type="text" value="${horariosEmTexto}" placeholder="ex: 09:00, 09:40" style="width:100%;"></div>
                <div style="width:120px;text-align:center;"><label>Ativo <input class="horario-ativo" type="checkbox" ${horarioDoDia.ativo ? 'checked' : ''}></label></div>
            </div>`;
            formGerenciarHorarios.insertAdjacentHTML('beforeend', diaHtml);
        });
    }

    if (formGerenciarHorarios) {
        formGerenciarHorarios.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosParaSalvar = [];
            formGerenciarHorarios.querySelectorAll('.dashboard-form').forEach(linhaDia => {
                const horariosTexto = linhaDia.querySelector('.horarios-lista').value;
                const horariosArray = horariosTexto.split(',').map(h => h.trim()).filter(h => h);
                dadosParaSalvar.push({
                    dia_semana: parseInt(linhaDia.querySelector('.dia-semana-id').value, 10),
                    ativo: linhaDia.querySelector('.horario-ativo').checked,
                    horarios: horariosArray
                });
            });

            const { error } = await supabase.from('horarios_padrao').upsert(dadosParaSalvar, { onConflict: 'dia_semana' });
            if (error) mostrarErro('Erro ao salvar os horários: ' + error.message);
            else mostrarSucesso('Horários de atendimento atualizados com sucesso!');
        });
    }

    //
    // Inicialização: carrega dados necessários
    //
    carregarTabelaBairros();
    carregarTabelaRacas();
    carregarRacas();
    carregarServicos();
    carregarTabelaFornecedores();
    carregarProdutosParaServicos();
    setupEditModalListeners();
    carregarStoriesAdmin();
    carregarHorariosParaGerenciamento();
    carregarTabelaPagamentos();
}