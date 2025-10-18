// petshop-site/js/adocao.js
// Versão revisada: consulta uma amostra da tabela para detectar colunas, monta payload
// somente com colunas existentes e usa uploadFilesToStorage para upload de imagens.
// Inclui handler delegado para slider (prev/next/click/keyboard).

import { supabase } from './supabase-config.js';
import { normalizeArrayField, firstArrayItem } from './utils/normalizeArray.js';
import { uploadFilesToStorage } from './upload.js';

const mostrarErro = (mensagem) => alert(mensagem);
const mostrarSucesso = (mensagem) => alert(mensagem);

const listContainer = document.getElementById('adocao-list') || document.querySelector('.adocao-list');
const detailContainer = document.getElementById('adocao-detail') || document.querySelector('.adocao-detail');

// Helper de leitura: prefere snake_case, fallback para camelCase
function val(record, snake, camel) {
  return record?.[snake] ?? record?.[camel];
}
function snakeToCamel(s) {
  return s.replace(/_([a-z0-9])/g, (_, ch) => ch.toUpperCase());
}
function camelToSnake(s) {
  return s.replace(/([A-Z])/g, '_$1').toLowerCase();
}
function firstImageField(record) {
  return firstArrayItem(record.imagens_url ?? record.imagensURL ?? record.imagens_url_arr ?? record.imagensURL_arr);
}

// Cache das colunas da tabela pets_adocao para evitar chamadas repetidas
let _petsAdocaoColumnsCache = null;
async function getPetsAdocaoColumns() {
  if (_petsAdocaoColumnsCache) return _petsAdocaoColumnsCache;
  try {
    const { data, error } = await supabase
      .from('pets_adocao')
      .select('*')
      .limit(1);

    if (error) {
      console.warn('getPetsAdocaoColumns: erro ao selecionar amostra de pets_adocao:', error);
      _petsAdocaoColumnsCache = [
        'id','created_at','nome_pet','idadePet','cidade','tutorNome','tutorTelefone','tutorEmail',
        'adotado','observacoes','imagens_url','imagens_url_arr','imagensURL_arr'
      ];
      return _petsAdocaoColumnsCache;
    }

    const sample = (data && data[0]) || null;
    if (sample) {
      _petsAdocaoColumnsCache = Object.keys(sample);
      console.log('getPetsAdocaoColumns: detectadas colunas (via sample):', _petsAdocaoColumnsCache);
      return _petsAdocaoColumnsCache;
    }

    console.warn('getPetsAdocaoColumns: tabela pets_adocao aparentemente vazia — usando fallback conservador.');
    _petsAdocaoColumnsCache = [
      'id','created_at','nome_pet','idadePet','cidade','tutorNome','tutorTelefone','tutorEmail',
      'adotado','observacoes','imagens_url','imagens_url_arr','imagensURL_arr'
    ];
    return _petsAdocaoColumnsCache;
  } catch (err) {
    console.warn('getPetsAdocaoColumns: exception', err);
    _petsAdocaoColumnsCache = [
      'id','created_at','nome_pet','idadePet','cidade','tutorNome','tutorTelefone','tutorEmail',
      'adotado','observacoes','imagens_url','imagens_url_arr','imagensURL_arr'
    ];
    return _petsAdocaoColumnsCache;
  }
}

function buildPayloadFromLogical(logical, existingColumns) {
  const payload = {};
  const map = {
    tutorNome: ['tutor_nome', 'tutorNome'],
    tutorTelefone: ['tutor_telefone', 'tutorTelefone'],
    tutorEmail: ['tutor_email', 'tutorEmail'],
    cidade: ['cidade', 'cidade'],
    nomePet: ['nome_pet', 'nomePet'],
    idadePet: ['idade_pet', 'idadePet'],
    observacoes: ['observacoes', 'observacoes'],
    imagensURL: ['imagens_url', 'imagensURL']
  };

  for (const [logicalKey, [snake, camel]] of Object.entries(map)) {
    const value = logical[logicalKey];
    const hasSnake = existingColumns.includes(snake);
    const hasCamel = existingColumns.includes(camel);
    if (hasSnake) payload[snake] = value;
    else if (hasCamel) payload[camel] = value;
  }
  return payload;
}

export async function fetchAdocoes() {
  const { data, error } = await supabase
    .from('pets_adocao')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar adoções', error);
    return [];
  }
  return data || [];
}

export function renderGallery(containerEl, record) {
  if (!containerEl) return;
  const images = normalizeArrayField(record.imagens_url ?? record.imagensURL ?? record.imagens_url_arr ?? record.imagensURL_arr);
  containerEl.innerHTML = '';
  if (!images.length) {
    containerEl.innerHTML = '<div class="no-images">Sem imagens</div>';
    return;
  }
  const wrapper = document.createElement('div');
  wrapper.className = 'gallery';
  images.forEach((url, i) => {
    const img = document.createElement('img');
    img.src = url;
    img.alt = `${val(record,'nome_pet','nomePet') || 'pet'}-${i}`;
    img.width = 200;
    img.loading = 'lazy';
    img.classList.add('adocao-imagem');
    if (i === 0) img.classList.add('active');
    img.dataset.index = String(i);
    wrapper.appendChild(img);
  });
  // if more than one image, add slider buttons
  if (images.length > 1) {
    const prev = document.createElement('button');
    prev.className = 'slider-btn prev';
    prev.dataset.direction = '-1';
    prev.innerHTML = '&#10094;';
    const next = document.createElement('button');
    next.className = 'slider-btn next';
    next.dataset.direction = '1';
    next.innerHTML = '&#10095;';
    const container = document.createElement('div');
    container.className = 'card-imagem-container';
    container.appendChild(wrapper);
    container.appendChild(prev);
    container.appendChild(next);
    containerEl.appendChild(container);
    return;
  }

  // single image container
  const container = document.createElement('div');
  container.className = 'card-imagem-container';
  container.appendChild(wrapper);
  containerEl.appendChild(container);
}

export function renderList(records) {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  records.forEach(rec => {
    const card = document.createElement('div');
    card.className = 'adocao-card';
    const thumb = firstImageField(rec) || '/images/default-pet-avatar.png';
    card.innerHTML = `
      <img src="${thumb}" alt="${val(rec,'nome_pet','nomePet') || ''}" width="120" />
      <div class="info">
        <h3>${val(rec,'nome_pet','nomePet') || ''}</h3>
        <p>${val(rec,'cidade','cidade') || ''}</p>
        <button data-id="${rec.id}" class="btn-view">Ver</button>
      </div>
    `;
    const viewBtn = card.querySelector('.btn-view');
    if (viewBtn) viewBtn.addEventListener('click', () => showDetail(rec.id));
    listContainer.appendChild(card);
  });
}

export async function showDetail(id) {
  const { data, error } = await supabase.from('pets_adocao').select('*').eq('id', id).single();
  if (error) {
    console.error('Erro ao buscar pet', error);
    return;
  }
  if (!detailContainer) return;
  // container for gallery + info
  detailContainer.innerHTML = `
    <h2>${val(data,'nome_pet','nomePet') || ''}</h2>
    <div id="gallery-${id}" class="gallery-container"></div>
    <p>${data.observacoes ?? ''}</p>
    <button id="edit-images-${id}" class="btn-edit-images">Editar imagens</button>
  `;
  renderGallery(document.getElementById(`gallery-${id}`), data);

  const editBtn = document.getElementById(`edit-images-${id}`);
  if (editBtn) {
    editBtn.addEventListener('click', async () => {
      const raw = prompt('Cole as URLs das imagens separadas por vírgula:');
      if (!raw) return;
      const urls = raw.split(',').map(s => s.trim()).filter(Boolean);
      if (!urls.length) return;
      try {
        await updateImages(id, urls);
        const updated = await supabase.from('pets_adocao').select('*').eq('id', id).single();
        renderGallery(document.getElementById(`gallery-${id}`), updated.data);
      } catch (err) {
        console.error('Erro ao atualizar imagens:', err);
        mostrarErro('Erro ao atualizar imagens. Veja console.');
      }
    });
  }
}

export async function updateImages(id, urlsArray) {
  const cols = await getPetsAdocaoColumns();
  const logical = { imagensURL: urlsArray };
  const payload = buildPayloadFromLogical(logical, cols);
  if (Object.keys(payload).length === 0) {
    throw new Error('Nenhuma coluna de imagens encontrada no schema para atualizar.');
  }
  const { data, error } = await supabase.from('pets_adocao').update(payload).eq('id', id).select();
  if (error) {
    console.error('Erro ao atualizar imagens', error);
    throw error;
  }
  return data;
}

(async function init() {
  const registros = await fetchAdocoes();
  renderList(registros);
})();

async function carregarAnuncios() {
  const adocaoGrid = document.getElementById('adocao-grid');
  if (!adocaoGrid) return;

  const { data: anuncios, error } = await supabase
    .from('pets_adocao')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar anúncios:', error);
    adocaoGrid.innerHTML = '<p>Não foi possível carregar os anúncios. Tente novamente mais tarde.</p>';
    return;
  }

  if (!anuncios || anuncios.length === 0) {
    adocaoGrid.innerHTML = '<p>Nenhum pet para adoção no momento. Seja o primeiro a anunciar!</p>';
    return;
  }

  adocaoGrid.innerHTML = '';
  anuncios.forEach(anuncio => {
    // render card content including images with buttons
    const fotos = normalizeArrayField(anuncio.imagens_url ?? anuncio.imagensURL ?? anuncio.imagens_url_arr ?? anuncio.imagensURL_arr);
    const anuncioCard = document.createElement('div');
    anuncioCard.classList.add('adocao-card');

    let imagensHtml = '';
    if (fotos.length > 0) {
      imagensHtml = fotos.map((foto, index) => `<img src="${foto}" alt="Foto de ${val(anuncio,'nome_pet','nomePet')}" class="adocao-imagem ${index === 0 ? 'active' : ''}" data-index="${index}">`).join('');
    } else {
      imagensHtml = '<img src="images/default-pet-avatar.png" alt="Foto padrão de pet" class="adocao-imagem active" data-index="0">';
    }

    anuncioCard.innerHTML = `
      <div class="card-imagem-container">
        ${anuncio.adotado ? '<div class="adotado-banner">ADOTADO</div>' : ''}
        <div class="gallery">${imagensHtml}</div>
        ${(fotos.length > 1) ? `<button class="slider-btn prev" data-direction="-1">&#10094;</button><button class="slider-btn next" data-direction="1">&#10095;</button>` : ''}
      </div>
      <div class="adocao-card-info">
        <h3>${val(anuncio,'nome_pet','nomePet')}</h3>
        <p><i class="fas fa-paw"></i> <strong>Idade:</strong> ${val(anuncio,'idade_pet','idadePet') || ''}</p>
        <p><i class="fas fa-map-marker-alt"></i> <strong>Cidade:</strong> ${val(anuncio,'cidade','cidade') || ''}</p>
        <p><i class="fas fa-info-circle"></i> <strong>Obs:</strong> ${anuncio.observacoes || 'Nenhuma'}</p>
        <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${val(anuncio,'tutor_email','tutorEmail') || ''}</p>
        <hr class="card-divider">
        <p><strong>Contato:</strong> ${val(anuncio,'tutor_nome','tutorNome') || ''}</p>
        <a href="${(val(anuncio,'tutor_telefone','tutorTelefone')||'') ? `https://api.whatsapp.com/send?phone=55${String(val(anuncio,'tutor_telefone','tutorTelephone')).replace(/\\D/g,'')}` : '#'}" target="_blank" class="btn-principal" style="width: 100%; text-align:center; margin-top: 10px; ${anuncio.adotado ? 'background-color: #6c757d; pointer-events: none;' : ''}">
          <i class="fab fa-whatsapp"></i> ${anuncio.adotado ? 'Já Adotado' : 'Falar com o responsável'}
        </a>
      </div>
    `;
    adocaoGrid.appendChild(anuncioCard);
  });
}

export async function carregarAnunciosDashboard() {
  const tabelaBody = document.querySelector('#tabela-adocao tbody');
  if (!tabelaBody) return;

  const { data: anuncios, error } = await supabase
    .from('pets_adocao')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar anúncios de adoção:', error);
    tabelaBody.innerHTML = '<tr><td colspan="6">Erro ao carregar anúncios. Verifique o console.</td></tr>';
    return;
  }

  tabelaBody.innerHTML = '';
  if (!anuncios || anuncios.length === 0) {
    tabelaBody.innerHTML = '<tr><td colspan="6" style="text-align: center;">Nenhum anúncio cadastrado.</td></tr>';
    return;
  }

  for (const anuncio of anuncios) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="status-badge ${anuncio.adotado ? 'status-realizado' : 'status-agendado'}">
          ${anuncio.adotado ? 'Adotado' : 'Disponível'}
        </span>
      </td>
      <td>${val(anuncio,'nome_pet','nomePet')}</td>
      <td>${val(anuncio,'tutor_nome','tutorNome')}</td>
      <td>${val(anuncio,'tutor_telefone','tutorTelefone')}</td>
      <td>${val(anuncio,'cidade','cidade')}</td>
      <td class="actions-cell">
        <button type="button" class="btn-edit-adocao btn-edit" data-id="${anuncio.id}" title="Editar Anúncio"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn-toggle-adocao" data-id="${anuncio.id}" data-status="${anuncio.adotado}" title="${anuncio.adotado ? 'Marcar como Disponível' : 'Marcar como Adotado'}"><i class="fas ${anuncio.adotado ? 'fa-undo' : 'fa-check-circle'}"></i></button>
        <button type="button" class="btn-delete-adocao btn-delete" data-id="${anuncio.id}" title="Excluir Anúncio"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tabelaBody.appendChild(tr);
  }
}

function attachModalCloseHandlers(modal) {
  if (!modal) return;
  if (modal.dataset.listenersAttached === 'true') return;
  modal.addEventListener('click', (ev) => { if (ev.target === modal) modal.style.display = 'none'; });
  modal.querySelectorAll('.close-modal-admin').forEach(btn => btn.addEventListener('click', () => modal.style.display = 'none'));
  const escHandler = (ev) => { if (ev.key === 'Escape' && modal.style.display === 'block') modal.style.display = 'none'; };
  document.addEventListener('keydown', escHandler);
  modal.dataset.listenersAttached = 'true';
}

// ===== Slider: handler delegado para prev/next, clique em imagem e set de data-index =====
(function attachAdocaoSliderHandlers() {
  const adocaoGrid = document.getElementById('adocao-grid');
  if (!adocaoGrid) return;

  // Função auxiliar: garante que cada imagem tenha data-index numérico
  function ensureImageIndexes(container) {
    const imgs = Array.from(container.querySelectorAll('.adocao-imagem'));
    imgs.forEach((img, i) => {
      img.dataset.index = String(i);
      // Se não houver active, marca a primeira
      if (!container.querySelector('.adocao-imagem.active')) {
        imgs[0].classList.add('active');
      }
    });
  }

  // Inicializa índices para todos os containers já renderizados
  adocaoGrid.querySelectorAll('.card-imagem-container').forEach(ensureImageIndexes);

  // Delegated click handler para prev/next buttons e clique em imagem
  adocaoGrid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.slider-btn');
    if (btn) {
      const container = btn.closest('.card-imagem-container');
      if (!container) return;
      const images = Array.from(container.querySelectorAll('.adocao-imagem'));
      if (!images.length) return;
      // garante que todos tenham índice
      images.forEach((img, i) => { if (img.dataset.index == null) img.dataset.index = String(i); });

      const active = container.querySelector('.adocao-imagem.active') || images[0];
      const current = parseInt(active.dataset.index || '0', 10);
      const direction = parseInt(btn.dataset.direction || '1', 10); // -1 ou 1
      let nextIndex = (current + direction + images.length) % images.length;

      active.classList.remove('active');
      images.forEach(img => img.classList.remove('active'));
      images[nextIndex].classList.add('active');
      return;
    }

    // clique direto na imagem avança 1
    const img = ev.target.closest('.adocao-imagem');
    if (img && img.closest('.card-imagem-container')) {
      const container = img.closest('.card-imagem-container');
      const images = Array.from(container.querySelectorAll('.adocao-imagem'));
      if (!images.length) return;
      images.forEach((im, i) => { if (im.dataset.index == null) im.dataset.index = String(i); });
      const active = container.querySelector('.adocao-imagem.active') || images[0];
      const current = parseInt(active.dataset.index || '0', 10);
      const nextIndex = (current + 1) % images.length;
      active.classList.remove('active');
      images.forEach(im => im.classList.remove('active'));
      images[nextIndex].classList.add('active');
    }
  });

  // Keyboard navigation: quando foco estiver dentro um card (ou no body), permite ← / →
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const container = document.querySelector('.card-imagem-container:has(.adocao-imagem.active)') ||
                      document.querySelector('.card-imagem-container');
    if (!container) return;
    const images = Array.from(container.querySelectorAll('.adocao-imagem'));
    if (!images.length) return;
    images.forEach((im, i) => { if (im.dataset.index == null) im.dataset.index = String(i); });
    const active = container.querySelector('.adocao-imagem.active') || images[0];
    const current = parseInt(active.dataset.index || '0', 10);
    const dir = ev.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (current + dir + images.length) % images.length;
    active.classList.remove('active');
    images.forEach(im => im.classList.remove('active'));
    images[nextIndex].classList.add('active');
  });

  // Quando novos cards forem adicionados (ex.: após carregarAnuncios), garanta índices
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const container = node.querySelector?.('.card-imagem-container') || (node.classList && node.classList.contains('card-imagem-container') ? node : null);
        if (container) ensureImageIndexes(container);
      }
    }
  });
  observer.observe(adocaoGrid, { childList: true, subtree: true });
})();

export function setupAdocao() {
  // Setup for public page (adocao.html)
  const formAdocao = document.getElementById('form-adocao');
  if (formAdocao) {
    carregarAnuncios();
    const adocaoFotosInput = document.getElementById('fotos');
    const adocaoFotosPreview = document.getElementById('adocao-fotos-preview');

    if (adocaoFotosInput && adocaoFotosPreview) {
      adocaoFotosInput.addEventListener('change', () => {
        adocaoFotosPreview.innerHTML = '';
        const files = adocaoFotosInput.files;
        if (files.length > 3) {
          mostrarErro('Você pode selecionar no máximo 3 fotos.');
          adocaoFotosInput.value = '';
          return;
        }
        for (const file of files) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.classList.add('preview-item');
            
            // Create elements safely to prevent XSS
            const img = document.createElement('img');
            img.src = e.target.result;
            img.alt = file.name; // Safe - set as attribute
            img.className = 'preview-image-thumbnail';
            
            const fileNameSpan = document.createElement('span');
            fileNameSpan.className = 'preview-file-name';
            fileNameSpan.textContent = file.name; // Safe - textContent auto-escapes
            
            previewItem.appendChild(img);
            previewItem.appendChild(fileNameSpan);
            adocaoFotosPreview.appendChild(previewItem);
          }
          reader.readAsDataURL(file);
        }
      });
    }

    formAdocao.addEventListener('submit', async (e) => {
      e.preventDefault();
      const submitButton = formAdocao.querySelector('button[type="submit"]');
      submitButton.disabled = true;
      submitButton.textContent = 'Enviando...';

      const fotosUrls = [];
      if (adocaoFotosInput && adocaoFotosInput.files && adocaoFotosInput.files.length > 0) {
        try {
          const uploaded = await uploadFilesToStorage(adocaoFotosInput.files, { bucket: 'petshop-assets', folder: 'adocao_fotos' });
          console.log('Upload concluído. URLs:', uploaded);
          fotosUrls.push(...uploaded);
        } catch (err) {
          console.error('Erro no uploadFilesToStorage:', err);
          mostrarErro('Erro ao fazer upload das imagens: ' + (err.message || JSON.stringify(err)));
          submitButton.disabled = false;
          submitButton.textContent = 'Publicar Anúncio';
          return;
        }
      }

      const logical = {
        tutorNome: document.getElementById('nome').value,
        tutorTelefone: document.getElementById('telefone').value,
        tutorEmail: document.getElementById('email').value,
        cidade: document.getElementById('cidade').value,
        nomePet: document.getElementById('nome_pet').value,
        idadePet: document.getElementById('idade_pet').value,
        observacoes: document.getElementById('observacoes').value,
        imagensURL: fotosUrls
      };

      const cols = await getPetsAdocaoColumns();
      const payload = buildPayloadFromLogical(logical, cols);
      if (Object.keys(payload).length === 0) {
        mostrarErro('Nenhuma coluna válida encontrada no schema para inserir o anúncio.');
        submitButton.disabled = false;
        submitButton.textContent = 'Publicar Anúncio';
        return;
      }

      const { data, error } = await supabase.from('pets_adocao').insert(payload);
      if (error) {
        mostrarErro('Erro ao salvar o anúncio: ' + (error.message || JSON.stringify(error)));
        console.error('Payload enviado:', payload, 'Erro:', error);
      } else {
        mostrarSucesso('Anúncio publicado com sucesso!');
        formAdocao.reset();
        if (adocaoFotosPreview) adocaoFotosPreview.innerHTML = '';
        await carregarAnuncios();
      }

      submitButton.disabled = false;
      submitButton.textContent = 'Publicar Anúncio';
    });
  }

  // Setup for dashboard (dashboard.html)
  setupAdocaoDashboard();
}

// Dashboard-specific setup
function setupAdocaoDashboard() {
  const viewGerenciarAdocao = document.getElementById('view-gerenciar-adocao');
  if (!viewGerenciarAdocao) return;

  // Load adoption announcements when dashboard loads
  carregarAnunciosDashboard();

  // Refresh button handler
  const btnRefresh = document.getElementById('btn-refresh-adocao');
  if (btnRefresh) {
    btnRefresh.addEventListener('click', async () => {
      btnRefresh.disabled = true;
      btnRefresh.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Atualizando...';
      await carregarAnunciosDashboard();
      btnRefresh.disabled = false;
      btnRefresh.innerHTML = '<i class="fas fa-sync-alt"></i> Atualizar';
    });
  }

  // Event delegation for table buttons (edit, toggle, delete)
  const tabelaBody = document.querySelector('#tabela-adocao tbody');
  if (tabelaBody) {
    tabelaBody.addEventListener('click', async (e) => {
      const btnEdit = e.target.closest('.btn-edit-adocao');
      const btnToggle = e.target.closest('.btn-toggle-adocao');
      const btnDelete = e.target.closest('.btn-delete-adocao');

      if (btnEdit) {
        const id = btnEdit.dataset.id;
        await abrirModalEditarAdocao(id);
      } else if (btnToggle) {
        const id = btnToggle.dataset.id;
        const currentStatus = btnToggle.dataset.status === 'true';
        await toggleAdotadoStatus(id, currentStatus);
      } else if (btnDelete) {
        const id = btnDelete.dataset.id;
        await excluirAnuncio(id);
      }
    });
  }

  // Edit modal form handler
  const formEditarAdocao = document.getElementById('form-editar-adocao');
  if (formEditarAdocao) {
    formEditarAdocao.addEventListener('submit', async (e) => {
      e.preventDefault();
      await salvarEdicaoAdocao();
    });
  }
}

// Function to open edit modal
async function abrirModalEditarAdocao(id) {
  const { data: anuncio, error } = await supabase
    .from('pets_adocao')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Erro ao buscar anúncio:', error);
    mostrarErro('Erro ao carregar dados do anúncio.');
    return;
  }

  const modal = document.getElementById('modal-editar-adocao');
  if (!modal) return;

  // Populate form fields
  document.getElementById('edit-adocao-id').value = anuncio.id;
  document.getElementById('edit-adocao-nome-pet').value = val(anuncio, 'nome_pet', 'nomePet') || '';
  document.getElementById('edit-adocao-idade-pet').value = val(anuncio, 'idade_pet', 'idadePet') || '';
  document.getElementById('edit-adocao-observacoes').value = anuncio.observacoes || '';
  document.getElementById('edit-adocao-tutor-nome').value = val(anuncio, 'tutor_nome', 'tutorNome') || '';
  document.getElementById('edit-adocao-tutor-telefone').value = val(anuncio, 'tutor_telefone', 'tutorTelefone') || '';
  document.getElementById('edit-adocao-tutor-email').value = val(anuncio, 'tutor_email', 'tutorEmail') || '';
  document.getElementById('edit-adocao-cidade').value = val(anuncio, 'cidade', 'cidade') || '';

  modal.style.display = 'block';
  attachModalCloseHandlers(modal);
}

// Function to save edited adoption
async function salvarEdicaoAdocao() {
  const id = document.getElementById('edit-adocao-id').value;

  const logical = {
    nomePet: document.getElementById('edit-adocao-nome-pet').value,
    idadePet: document.getElementById('edit-adocao-idade-pet').value,
    observacoes: document.getElementById('edit-adocao-observacoes').value,
    tutorNome: document.getElementById('edit-adocao-tutor-nome').value,
    tutorTelefone: document.getElementById('edit-adocao-tutor-telefone').value,
    tutorEmail: document.getElementById('edit-adocao-tutor-email').value,
    cidade: document.getElementById('edit-adocao-cidade').value
  };

  const cols = await getPetsAdocaoColumns();
  const payload = buildPayloadFromLogical(logical, cols);

  if (Object.keys(payload).length === 0) {
    mostrarErro('Nenhuma coluna válida encontrada para atualizar.');
    return;
  }

  const { error } = await supabase
    .from('pets_adocao')
    .update(payload)
    .eq('id', id);

  if (error) {
    console.error('Erro ao atualizar anúncio:', error);
    mostrarErro('Erro ao salvar alterações: ' + error.message);
  } else {
    mostrarSucesso('Anúncio atualizado com sucesso!');
    document.getElementById('modal-editar-adocao').style.display = 'none';
    await carregarAnunciosDashboard();
  }
}

// Function to toggle adopted status
async function toggleAdotadoStatus(id, currentStatus) {
  const newStatus = !currentStatus;
  const { error } = await supabase
    .from('pets_adocao')
    .update({ adotado: newStatus })
    .eq('id', id);

  if (error) {
    console.error('Erro ao alterar status:', error);
    mostrarErro('Erro ao alterar status de adoção: ' + error.message);
  } else {
    mostrarSucesso(newStatus ? 'Pet marcado como adotado!' : 'Pet marcado como disponível!');
    await carregarAnunciosDashboard();
  }
}

// Function to delete announcement
async function excluirAnuncio(id) {
  if (!confirm('Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.')) {
    return;
  }

  const { error } = await supabase
    .from('pets_adocao')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Erro ao excluir anúncio:', error);
    mostrarErro('Erro ao excluir anúncio: ' + error.message);
  } else {
    mostrarSucesso('Anúncio excluído com sucesso!');
    await carregarAnunciosDashboard();
  }
}