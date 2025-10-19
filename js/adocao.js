// js/adocao.js
// Versão consolidada e revisada — contém:
// - todas as funções necessárias para a página adocao.html (fetch, insert, update, render, gallery, modal/slider, keyboard nav)
// - normalização de campos de imagem (várias variantes de nomes no schema)
// - usa o cliente supabase existente (import { supabase } from '/js/supabase-config.js')
// - mantém compatibilidade com uploadFilesToStorage (importado de /js/upload.js)

import { supabase } from '/js/supabase-config.js';
import { uploadFilesToStorage } from '/js/upload.js';

/* =========================
   Utilitários (inclusos aqui para evitar dependência extra)
   ========================= */

/**
 * Normaliza vários formatos de campo de imagens para um array de URLs.
 * Aceita: array, string JSON (ex: '["a","b"]'), CSV 'a,b', texto único, campos null/undefined.
 */
function normalizeArrayField(field) {
  if (field === null || field === undefined) return [];
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
  try {
    return Array.from(field).filter(Boolean);
  } catch (e) {
    return [];
  }
}

/**
 * getField: tenta vários nomes de campo no objeto e retorna o primeiro encontrado.
 * Uso: getField(obj, 'tutorNome', 'tutor_nome', 'tutorTelefone')
 */
function getField(obj, ...names) {
  for (const n of names) {
    if (n in obj && obj[n] != null) return obj[n];
  }
  return undefined;
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const mostrarErro = (mensagem) => {
  try { Toastify({ text: mensagem, duration: 4000, gravity: "top", position: "right" }).showToast(); }
  catch(e){ alert(mensagem); }
};
const mostrarSucesso = (mensagem) => {
  try { Toastify({ text: mensagem, duration: 3000, gravity: "top", position: "right", backgroundColor: "#4CAF50" }).showToast(); }
  catch(e){ alert(mensagem); }
}

/* =========================
   Funções DB relacionadas a pets_adocao
   ========================= */

/**
 * Busca adoções (padroniza imagens em imagens_array).
 * Usa nomes do schema: imagens_url_arr, imagens_url, imagensURL_arr, tutorNome, tutorTelefone, adotado.
 */
export async function fetchAdocoes({ onlyDisponiveis = true } = {}) {
  try {
    let q = supabase.from('pets_adocao').select('*').order('created_at', { ascending: false });
    if (onlyDisponiveis) q = q.eq('adotado', false);
    const { data, error } = await q;
    if (error) {
      console.error('fetchAdocoes erro', error);
      return [];
    }
    return (data || []).map(row => {
      const imagens = normalizeArrayField(getField(row, 'imagens_url_arr', 'imagens_url', 'imagensURL_arr', 'imagens_url_arr') || row.imagens_url || row.imagensURL_arr || row.fotos);
      return { ...row, imagens_array: imagens };
    });
  } catch (err) {
    console.error('fetchAdocoes exception', err);
    return [];
  }
}

/**
 * Obtém uma adoção por id com imagens normalizadas.
 */
export async function getAdocaoById(id) {
  if (id == null) return null;
  const { data, error } = await supabase.from('pets_adocao').select('*').eq('id', id).maybeSingle();
  if (error) {
    console.error('getAdocaoById erro', error);
    return null;
  }
  if (!data) return null;
  const imagens = normalizeArrayField(getField(data, 'imagens_url_arr', 'imagens_url', 'imagensURL_arr') ?? data.fotos);
  return { ...data, imagens_array: imagens };
}

/**
 * Publica/insere um novo anúncio de adoção.
 * Usa os nomes de coluna do schema (nome_pet, idadePet, tutorNome, tutorTelefone, tutorEmail, imagens_url_arr).
 * Retorna o registro inserido ou null em caso de erro.
 */
export async function publicarAdocao(logicalPayload) {
  try {
    const payload = {
      nome_pet: logicalPayload.nomePet ?? logicalPayload.nome_pet ?? logicalPayload.nome,
      // idadePet no schema usa camelCase 'idadePet'
      idadePet: logicalPayload.idadePet ?? logicalPayload.idade_pet ?? logicalPayload.idade,
      cidade: logicalPayload.cidade ?? null,
      tutorNome: logicalPayload.tutorNome ?? logicalPayload.tutor_nome ?? logicalPayload.tutor,
      tutorTelefone: logicalPayload.tutorTelefone ?? logicalPayload.tutor_telefone ?? logicalPayload.telefone,
      tutorEmail: logicalPayload.tutorEmail ?? logicalPayload.tutor_email ?? logicalPayload.email,
      observacoes: logicalPayload.observacoes ?? null,
      imagens_url_arr: logicalPayload.imagensURL ?? logicalPayload.imagens_url ?? logicalPayload.imagens ?? [],
      adotado: false,
      created_at: new Date().toISOString()
    };
    const { data, error } = await supabase.from('pets_adocao').insert([payload]).select().maybeSingle();
    if (error) {
      console.error('publicarAdocao erro', error);
      return null;
    }
    return data || null;
  } catch (err) {
    console.error('publicarAdocao exception', err);
    return null;
  }
}

/**
 * Atualiza o array de imagens de um anúncio pelo id (atualiza imagens_url_arr).
 * Retorna registro atualizado ou null.
 */
export async function updateAdocaoImages(id, imagensArray) {
  if (id == null) throw new Error('id é obrigatório para updateAdocaoImages');
  const { data, error } = await supabase.from('pets_adocao').update({ imagens_url_arr: imagensArray }).eq('id', id).select().maybeSingle();
  if (error) {
    console.error('updateAdocaoImages erro', error);
    return null;
  }
  return data || null;
}

/* =========================
   UI: Gallery, Cards, Modal, Slider, Keyboard
   ========================= */

const listContainer = document.getElementById('adocao-grid') || document.querySelector('.adocao-grid');
const detailContainer = document.getElementById('gallery-container') || document.querySelector('.adocao-detail');

/* Ensure modal markup exists. If page doesn't include it, create a minimal modal and append to body. */
function ensureModalMarkup() {
  let modal = document.getElementById('imageModal');
  if (modal) return modal;

  modal = document.createElement('div');
  modal.id = 'imageModal';
  modal.className = 'image-modal';
  modal.style.display = 'none';
  modal.innerHTML = `
    <div class="modal-content">
      <button class="close-modal" aria-label="Fechar">&times;</button>
      <button id="modal-prev-btn" class="modal-nav prev" aria-label="Anterior">&#10094;</button>
      <img id="modalImage" src="" alt="Imagem do anúncio" />
      <button id="modal-next-btn" class="modal-nav next" aria-label="Próxima">&#10095;</button>
    </div>
  `;
  document.body.appendChild(modal);
  // basic styles can be provided globaly; this just ensures elements exist
  return modal;
}

const modalEl = ensureModalMarkup();
const modalImage = modalEl.querySelector('#modalImage');
const modalPrevBtn = modalEl.querySelector('#modal-prev-btn');
const modalNextBtn = modalEl.querySelector('#modal-next-btn');
const modalCloseBtn = modalEl.querySelector('.close-modal');

let modalState = { images: [], index: 0, isOpen: false };

function renderModalImage() {
  const url = modalState.images[modalState.index] || '';
  modalImage.src = url;
  modalImage.alt = `Imagem ${modalState.index + 1} de ${modalState.images.length}`;
}

function openImageModal(images = [], startIndex = 0) {
  modalState.images = Array.isArray(images) ? images : normalizeArrayField(images);
  modalState.index = Math.max(0, Math.min(startIndex || 0, modalState.images.length - 1));
  modalEl.style.display = 'flex';
  modalState.isOpen = true;
  renderModalImage();
  // show/hide nav based on count
  if (modalState.images.length > 1) {
    modalPrevBtn.style.display = 'inline-block';
    modalNextBtn.style.display = 'inline-block';
  } else {
    modalPrevBtn.style.display = 'none';
    modalNextBtn.style.display = 'none';
  }
  try { modalEl.focus(); } catch (e) {}
}

function closeImageModal() {
  modalEl.style.display = 'none';
  modalState.images = [];
  modalState.index = 0;
  modalState.isOpen = false;
}

function modalNext() {
  if (!modalState.images.length) return;
  modalState.index = (modalState.index + 1) % modalState.images.length;
  renderModalImage();
}
function modalPrev() {
  if (!modalState.images.length) return;
  modalState.index = (modalState.index - 1 + modalState.images.length) % modalState.images.length;
  renderModalImage();
}

if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeImageModal);
modalEl.addEventListener('click', (ev) => { if (ev.target === modalEl) closeImageModal(); });
if (modalPrevBtn) modalPrevBtn.addEventListener('click', modalPrev);
if (modalNextBtn) modalNextBtn.addEventListener('click', modalNext);

// Keyboard navigation for modal
document.addEventListener('keydown', (ev) => {
  if (!modalState.isOpen) return;
  if (ev.key === 'ArrowLeft') { ev.preventDefault(); modalPrev(); }
  else if (ev.key === 'ArrowRight') { ev.preventDefault(); modalNext(); }
  else if (ev.key === 'Escape') { ev.preventDefault(); closeImageModal(); }
});

/**
 * Renders a gallery (larger view area) for a record (uses imagens_array).
 * Useful for detail pages.
 */
export function renderGallery(containerEl, record) {
  if (!containerEl) return;
  const images = normalizeArrayField(getField(record, 'imagens_url_arr', 'imagens_url', 'imagensURL_arr') ?? record.imagens_array ?? record.imagens_url ?? record.fotos);
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
    img.alt = `${getField(record, 'nome_pet', 'nomePet', 'nome') || 'pet'}-${i+1}`;
    img.loading = 'lazy';
    img.className = 'adocao-imagem';
    if (i === 0) img.classList.add('active');
    img.dataset.index = String(i);
    wrapper.appendChild(img);
  });
  // If multiple, include prev/next
  const container = document.createElement('div');
  container.className = 'card-imagem-container';
  container.appendChild(wrapper);
  if (images.length > 1) {
    const prev = document.createElement('button');
    prev.className = 'slider-btn prev';
    prev.dataset.direction = '-1';
    prev.innerHTML = '&#10094;';
    const next = document.createElement('button');
    next.className = 'slider-btn next';
    next.dataset.direction = '1';
    next.innerHTML = '&#10095;';
    container.appendChild(prev);
    container.appendChild(next);
  }
  containerEl.appendChild(container);
}

/**
 * Renderiza a lista de anúncios (cards). Cada card mantém dataset.images com o array JSON.
 */
export function renderList(registros = [], containerSelector = '#adocao-grid') {
  const container = document.querySelector(containerSelector);
  if (!container) {
    console.warn('Container de anúncios não encontrado:', containerSelector);
    return;
  }
  container.innerHTML = '';

  if (!registros || registros.length === 0) {
    container.innerHTML = '<p>Nenhum anúncio disponível no momento.</p>';
    return;
  }

  const fragment = document.createDocumentFragment();

  registros.forEach(item => {
    const card = document.createElement('div');
    card.className = 'adocao-card';

    const imagens = normalizeArrayField(item.imagens_array ?? getField(item, 'imagens_url_arr', 'imagens_url', 'imagensURL_arr') ?? item.fotos ?? []);
    const hasMultiple = imagens.length > 1;
    card.dataset.images = JSON.stringify(imagens);

    const imagensHtml = imagens.length
      ? imagens.map((foto, index) => `<img src="${escapeHtml(foto)}" alt="${escapeHtml(getField(item,'nome_pet','nomePet','nome') || 'pet')}-${index+1}" class="adocao-imagem ${index===0 ? 'active' : ''}" data-index="${index}" loading="lazy">`).join('')
      : `<img src="images/default-pet-avatar.png" alt="Foto padrão de pet" class="adocao-imagem active" data-index="0">`;

    const adotado = Boolean(getField(item, 'adotado', 'adotado'));
    const tutorName = getField(item, 'tutorNome', 'tutor_nome', 'tutor', 'tutorNome') || '';
    const tutorTelefone = getField(item, 'tutorTelefone', 'tutor_telefone', 'telefone') || '';
    const phoneOnly = String(tutorTelefone).replace(/\D+/g, '');
    const whatsappHref = phoneOnly ? `https://api.whatsapp.com/send?phone=55${phoneOnly}` : '#';

    card.innerHTML = `
      <div class="card-imagem-container" ${hasMultiple ? 'data-has-slider="1"' : ''}>
        ${adotado ? '<div class="adotado-banner">ADOTADO</div>' : ''}
        <div class="gallery">${imagensHtml}</div>
        ${hasMultiple ? `<button class="slider-btn prev" data-direction="-1" aria-label="Anterior">&#10094;</button><button class="slider-btn next" data-direction="1" aria-label="Próxima">&#10095;</button>` : ''}
      </div>
      <div class="adocao-card-info">
        <h3>${escapeHtml(getField(item,'nome_pet','nomePet','nome') || 'Sem nome')}</h3>
        <p><strong>Idade:</strong> ${escapeHtml(getField(item,'idadePet','idade_pet','idade') || '')}</p>
        <p><strong>Cidade:</strong> ${escapeHtml(getField(item,'cidade','cidade') || '')}</p>
        <p>${escapeHtml(item.observacoes || 'Nenhuma')}</p>
        <p><strong>Contato:</strong> ${escapeHtml(tutorName)}</p>
        <a href="${whatsappHref}" target="_blank" class="btn-principal" style="width: 100%; text-align:center; margin-top: 10px; ${adotado ? 'background-color: #6c757d; pointer-events: none;' : ''}">
          <i class="fab fa-whatsapp"></i> ${adotado ? 'Já Adotado' : 'Falar com o responsável'}
        </a>
      </div>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
}

/* Delegated handlers for cards: slider buttons and image click -> open modal.
   Also keyboard navigation for card-level slider (when modal closed).
*/
(function attachCardHandlers() {
  const grid = document.getElementById('adocao-grid');
  if (!grid) return;

  const ensureIndexes = (container) => {
    const imgs = container.querySelectorAll('.adocao-imagem');
    imgs.forEach((img, i) => { img.dataset.index = String(i); });
    if (!container.querySelector('.adocao-imagem.active')) {
      const first = container.querySelector('.adocao-imagem');
      if (first) first.classList.add('active');
    }
  };

  // init existing
  grid.querySelectorAll('.card-imagem-container').forEach(ensureIndexes);

  grid.addEventListener('click', (ev) => {
    const btn = ev.target.closest('.slider-btn');
    if (btn) {
      const container = btn.closest('.card-imagem-container');
      if (!container) return;
      const images = Array.from(container.querySelectorAll('.adocao-imagem'));
      if (!images.length) return;
      const active = container.querySelector('.adocao-imagem.active') || images[0];
      const current = parseInt(active.dataset.index || '0', 10);
      const direction = parseInt(btn.dataset.direction || '1', 10);
      const nextIndex = (current + direction + images.length) % images.length;
      images.forEach(img => img.classList.remove('active'));
      images[nextIndex].classList.add('active');
      return;
    }

    const img = ev.target.closest('.adocao-imagem');
    if (img && img.closest('.card-imagem-container')) {
      const card = img.closest('.adocao-card');
      if (!card) return;
      const imagesJson = card.dataset.images || '[]';
      let imagesArr = [];
      try { imagesArr = JSON.parse(imagesJson); } catch (e) { imagesArr = []; }
      if (!imagesArr.length) {
        imagesArr = Array.from(card.querySelectorAll('.adocao-imagem')).map(i => i.src).filter(Boolean);
      }
      const idx = parseInt(img.dataset.index || '0', 10);
      openImageModal(imagesArr, idx);
    }
  });

  // keyboard arrow navigation when modal closed
  document.addEventListener('keydown', (ev) => {
    if (modalState.isOpen) return;
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const container = document.querySelector('.card-imagem-container:has(.adocao-imagem.active)') || document.querySelector('.card-imagem-container');
    if (!container) return;
    const images = Array.from(container.querySelectorAll('.adocao-imagem'));
    if (!images.length) return;
    const active = container.querySelector('.adocao-imagem.active') || images[0];
    const current = parseInt(active.dataset.index || '0', 10);
    const dir = ev.key === 'ArrowLeft' ? -1 : 1;
    const nextIndex = (current + dir + images.length) % images.length;
    images.forEach(im => im.classList.remove('active'));
    images[nextIndex].classList.add('active');
  });

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        const container = node.querySelector?.('.card-imagem-container') || (node.classList && node.classList.contains('card-imagem-container') ? node : null);
        if (container) ensureIndexes(container);
      }
    }
  });
  observer.observe(grid, { childList: true, subtree: true });
})();

/* =========================
   Data loading / Dashboard helpers / Form handling
   ========================= */

/**
 * carregarAnuncios: lê pets_adocao e renderiza cards
 */
export async function carregarAnuncios() {
  const adocaoGrid = document.getElementById('adocao-grid');
  if (!adocaoGrid) return;
  const anuncios = await fetchAdocoes({ onlyDisponiveis: true });
  renderList(anuncios, '#adocao-grid');
}

/**
 * carregarAnunciosDashboard: popula tabela do dashboard (compatibilidade)
 */
export async function carregarAnunciosDashboard() {
  const tabelaBody = document.querySelector('#tabela-adocao tbody');
  if (!tabelaBody) return;

  const { data: anuncios, error } = await supabase.from('pets_adocao').select('*').order('created_at', { ascending: false });
  if (error) {
    console.error('Erro ao carregar anúncios de adoção:', error);
    return;
  }
  tabelaBody.innerHTML = '';
  for (const anuncio of anuncios || []) {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <span class="status-badge ${anuncio.adotado ? 'status-realizado' : 'status-agendado'}">
          ${anuncio.adotado ? 'Adotado' : 'Disponível'}
        </span>
      </td>
      <td>${escapeHtml(getField(anuncio,'nome_pet','nomePet') || '')}</td>
      <td>${escapeHtml(getField(anuncio,'tutorNome','tutor_nome') || '')}</td>
      <td>${escapeHtml(getField(anuncio,'tutorTelefone','tutor_telefone') || '')}</td>
      <td>${escapeHtml(getField(anuncio,'cidade','cidade') || '')}</td>
      <td class="actions-cell">
        <button type="button" class="btn-edit-adocao btn-edit" data-id="${anuncio.id}" title="Editar Anúncio"><i class="fas fa-edit"></i></button>
        <button type="button" class="btn-toggle-adocao" data-id="${anuncio.id}" data-status="${anuncio.adotado}" title="${anuncio.adotado ? 'Marcar como Disponível' : 'Marcar como Adotado'}"><i class="fas ${anuncio.adotado ? 'fa-undo' : 'fa-check-circle'}"></i></button>
        <button type="button" class="btn-delete-adocao btn-delete" data-id="${anuncio.id}" title="Excluir Anúncio"><i class="fas fa-trash-alt"></i></button>
      </td>
    `;
    tabelaBody.appendChild(tr);
  }
}

/**
 * setupAdocao: inicializa formulário e handlers.
 * Mantém compatibilidade com uploadFilesToStorage para subir imagens.
 */
export function setupAdocao() {
  const formAdocao = document.getElementById('form-adocao');
  if (!formAdocao) return;

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
          previewItem.innerHTML = `<img src="${e.target.result}" alt="${file.name}" class="preview-image-thumbnail"><span class="preview-file-name">${file.name}</span>`;
          adocaoFotosPreview.appendChild(previewItem);
        }
        reader.readAsDataURL(file);
      }
    });
  }

  formAdocao.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitButton = formAdocao.querySelector('button[type="submit"]');
    if (submitButton) { submitButton.disabled = true; submitButton.textContent = 'Enviando...'; }

    const fotosUrls = [];
    if (adocaoFotosInput && adocaoFotosInput.files && adocaoFotosInput.files.length > 0) {
      if (typeof uploadFilesToStorage === 'function') {
        try {
          const uploaded = await uploadFilesToStorage(adocaoFotosInput.files, { bucket: 'petshop-assets', folder: 'adocao_fotos' });
          fotosUrls.push(...uploaded);
        } catch (err) {
          console.error('Erro no uploadFilesToStorage:', err);
          mostrarErro('Erro ao fazer upload das imagens: ' + (err.message || JSON.stringify(err)));
          if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Publicar Anúncio'; }
          return;
        }
      } else {
        mostrarErro('uploadFilesToStorage não implementado.');
        if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Publicar Anúncio'; }
        return;
      }
    }

    const logical = {
      tutorNome: document.getElementById('nome')?.value || '',
      tutorTelefone: document.getElementById('telefone')?.value || '',
      tutorEmail: document.getElementById('email')?.value || '',
      cidade: document.getElementById('cidade')?.value || '',
      nomePet: document.getElementById('nome_pet')?.value || '',
      idadePet: document.getElementById('idade_pet')?.value || '',
      observacoes: document.getElementById('observacoes')?.value || '',
      imagensURL: fotosUrls
    };

    const inserted = await publicarAdocao(logical);
    if (!inserted) {
      mostrarErro('Erro ao salvar o anúncio.');
    } else {
      mostrarSucesso('Anúncio publicado com sucesso!');
      formAdocao.reset();
      if (adocaoFotosPreview) adocaoFotosPreview.innerHTML = '';
      await carregarAnuncios();
    }

    if (submitButton) { submitButton.disabled = false; submitButton.textContent = 'Publicar Anúncio'; }
  });
}

/* auto init in public pages */
(async function init() {
  try {
    if (document.getElementById('adocao-grid') || document.querySelector('.adocao-grid')) {
      setupAdocao();
    }
  } catch (err) {
    console.error('init adocao', err);
  }
})();