import { supabase } from '/js/supabase-config.js';
import { uploadFilesToStorage } from '/js/upload.js';

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
  try { 
    Toastify({ 
      text: mensagem, 
      duration: 3000, 
      gravity: "top", 
      position: "right", 
      style: { background: "#4CAF50" }  // Corrigido
    }).showToast(); 
  }
  catch(e){ 
    alert(mensagem); 
  }
};

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

/* Função para aplicar estilos de ajuste nas imagens de modais */
function applyModalImageStyles(img) {
  if (!img) return;
  img.style.maxWidth = '85vw';
  img.style.maxHeight = '80vh';
  img.style.width = 'auto';
  img.style.height = 'auto';
  img.style.objectFit = 'contain';
  img.style.margin = 'auto';
}

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
  return modal;
}

// Variáveis para elementos do modal
const modalEl = ensureModalMarkup();
const modalImage = modalEl.querySelector('#modalImage') || document.getElementById('modalImage') || document.getElementById('adocao-modal-image') || document.querySelector('.am-media');
const modalPrevBtn = modalEl.querySelector('#modal-prev-btn') || document.getElementById('modal-prev-btn') || document.querySelector('.am-prev');
const modalNextBtn = modalEl.querySelector('#modal-next-btn') || document.getElementById('modal-next-btn') || document.querySelector('.am-next');
const modalCloseBtn = modalEl.querySelector('.close-modal') || document.querySelector('.am-close');

let modalState = { images: [], index: 0, isOpen: false };

function openImageModal(images, startIndex = 0) {
  // Encontra elementos do modal se não estiverem já referenciados
  const modal = modalEl || document.getElementById('imageModal') || document.getElementById('adocao-modal') || document.querySelector('.adocao-modal');
  const img = modalImage || document.getElementById('modalImage') || document.getElementById('adocao-modal-image') || document.querySelector('.am-media');
  
  if (!modal || !img) {
    console.error('Elementos do modal não encontrados');
    return;
  }
  
  modalState.images = Array.isArray(images) ? images : normalizeArrayField(images);
  modalState.index = Math.max(0, Math.min(startIndex || 0, modalState.images.length - 1));
  
  // Aplica estilos ao modal para centralizar
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  if (modal.classList) modal.classList.add('open');
  
  modalState.isOpen = true;
  renderModalImage();
  
  // Configura botões de navegação
  const prev = modalPrevBtn || modal.querySelector('.am-prev') || modal.querySelector('#modal-prev-btn');
  const next = modalNextBtn || modal.querySelector('.am-next') || modal.querySelector('#modal-next-btn');
  
  if (modalState.images.length > 1) {
    if (prev) prev.style.display = 'inline-block';
    if (next) next.style.display = 'inline-block';
  } else {
    if (prev) prev.style.display = 'none';
    if (next) next.style.display = 'none';
  }
  
  try { modal.focus(); } catch (e) {}
}

function renderModalImage() {
  if (!modalImage) return;
  
  const url = modalState.images[modalState.index] || '';
  
  // Aplica estilos antes e depois de carregar a imagem
  applyModalImageStyles(modalImage);
  modalImage.onload = function() {
    applyModalImageStyles(this);
  };
  
  modalImage.src = url;
  modalImage.alt = `Imagem ${modalState.index + 1} de ${modalState.images.length}`;
}

function closeImageModal() {
  if (!modalEl) return;
  modalEl.style.display = 'none';
  if (modalEl.classList) modalEl.classList.remove('open');
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

// Adiciona event listeners para o modal
if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeImageModal);
if (modalEl) modalEl.addEventListener('click', (ev) => { if (ev.target === modalEl) closeImageModal(); });
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

/* =========================
   Modal image size fix - versão corrigida sem bloqueio de interface
   ========================= */
(function setupModalImageFixes() {
  // Adiciona estilos CSS via tag <style>, mas com seletores mais específicos
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    /* Aplicar apenas quando o modal estiver realmente aberto */
    #imageModal.open, #adocao-modal.open, .adocao-modal.open, .modal.open {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }
    
    /* Estilos para as imagens dentro dos modais */
    #modalImage, #adocao-modal-image, .am-media, #imageModal img, #adocao-modal img {
      max-width: 85vw !important;
      max-height: 80vh !important;
      width: auto !important;
      height: auto !important;
      object-fit: contain !important;
      margin: auto !important;
    }
    
    @media (max-width: 768px) {
      #modalImage, #adocao-modal-image, .am-media, #imageModal img, #adocao-modal img {
        max-width: 90vw !important;
        max-height: 70vh !important;
      }
    }
    
    @media (max-width: 480px) {
      #modalImage, #adocao-modal-image, .am-media, #imageModal img, #adocao-modal img {
        max-width: 95vw !important;
        max-height: 60vh !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Função para ajustar apenas imagens em modais ABERTOS
  function adjustModalImages() {
    // Encontrar apenas modais que estão realmente abertos
    const openModals = document.querySelectorAll('#imageModal[style*="display: flex"], #adocao-modal[style*="display: flex"], .adocao-modal[style*="display: flex"], .adocao-modal.open, #imageModal.open');
    
    // Se não houver modais abertos, não faz nada
    if (!openModals.length) return;
    
    // Ajusta imagens apenas nos modais abertos
    openModals.forEach(modal => {
      const images = modal.querySelectorAll('img');
      images.forEach(img => {
        img.style.maxWidth = '85vw';
        img.style.maxHeight = '80vh';
        img.style.width = 'auto';
        img.style.height = 'auto';
        img.style.objectFit = 'contain';
        img.style.margin = 'auto';
      });
    });
  }
  
  // Observer para detectar quando um modal é aberto
  if (window.MutationObserver) {
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        // Verificamos apenas mudanças de estilo e classe
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'class')) {
          
          const target = mutation.target;
          
          // Se for um modal e estiver sendo aberto
          if ((target.id === 'imageModal' || target.id === 'adocao-modal' || 
               target.classList.contains('adocao-modal')) && 
              (target.style.display === 'flex' || target.style.display === 'block' ||
               target.classList.contains('open'))) {
            
            // Aplicamos os ajustes
            setTimeout(() => {
              const images = target.querySelectorAll('img');
              images.forEach(img => {
                img.style.maxWidth = '85vw';
                img.style.maxHeight = '80vh';
                img.style.width = 'auto';
                img.style.height = 'auto';
                img.style.objectFit = 'contain';
              });
            }, 50);
          }
        }
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class']
    });
  }
  
  // Aplicar quando clicado em elementos que possam abrir modais
  document.addEventListener('click', (event) => {
    // Detecta cliques em imagens ou botões que possam abrir modais
    if (event.target.classList.contains('adocao-imagem') || 
        event.target.closest('.adocao-imagem')) {
      setTimeout(adjustModalImages, 100);
    }
  }, true);
})();

// Função para alternar o status de adoção (adotado/disponível)
export async function toggleAdocaoStatus(id, statusAtual) {
  try {
    const novoStatus = !statusAtual;
    const { data, error } = await supabase
      .from('pets_adocao')
      .update({ adotado: novoStatus })
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao atualizar status:', error);
      mostrarErro('Não foi possível atualizar o status da adoção.');
      return false;
    }
    
    mostrarSucesso(`Anúncio marcado como ${novoStatus ? 'Adotado' : 'Disponível'} com sucesso!`);
    return true;
  } catch (err) {
    console.error('Toggle adoção erro:', err);
    mostrarErro('Erro ao processar sua solicitação.');
    return false;
  }
}

// Função para excluir anúncio de adoção
export async function excluirAdocao(id) {
  try {
    const { error } = await supabase
      .from('pets_adocao')
      .delete()
      .eq('id', id);
      
    if (error) {
      console.error('Erro ao excluir anúncio:', error);
      mostrarErro('Não foi possível excluir o anúncio.');
      return false;
    }
    
    mostrarSucesso('Anúncio excluído com sucesso!');
    return true;
  } catch (err) {
    console.error('Excluir adoção erro:', err);
    mostrarErro('Erro ao processar sua solicitação.');
    return false;
  }
}

// Função para buscar detalhes de um anúncio para edição
export async function obterAdocaoParaEdicao(id) {
  try {
    const { data, error } = await supabase
      .from('pets_adocao')
      .select('*')
      .eq('id', id)
      .single();
      
    if (error) {
      console.error('Erro ao obter detalhes do anúncio:', error);
      mostrarErro('Não foi possível carregar os detalhes do anúncio.');
      return null;
    }
    
    return data;
  } catch (err) {
    console.error('Obter adoção erro:', err);
    mostrarErro('Erro ao processar sua solicitação.');
    return null;
  }
}

// Função para salvar anúncio editado
export async function salvarEdicaoAdocao(id, dadosAtualizados) {
  try {
    const { data, error } = await supabase
      .from('pets_adocao')
      .update(dadosAtualizados)
      .eq('id', id)
      .select()
      .single();
      
    if (error) {
      console.error('Erro ao salvar edição:', error);
      mostrarErro('Não foi possível salvar as alterações.');
      return false;
    }
    
    mostrarSucesso('Anúncio atualizado com sucesso!');
    return true;
  } catch (err) {
    console.error('Salvar edição erro:', err);
    mostrarErro('Erro ao processar sua solicitação.');
    return false;
  }
}

// Variável para controle de inicialização única do dashboard
let dashboardInicializado = false;

// Função para configurar handlers no dashboard
export function setupDashboardAdocao() {
  // Evitar inicialização duplicada
  if (dashboardInicializado) return;
  dashboardInicializado = true;
  
  console.log('Dashboard de adoções iniciado');
  
  const tabelaAdocao = document.getElementById('tabela-adocao');
  if (!tabelaAdocao) return;
  
  // Buscar modal de edição
  const modalEditAdocao = document.getElementById('modal-edit-adocao');
  const formEditAdocao = modalEditAdocao ? document.getElementById('form-edit-adocao') : null;
  
  // Event delegation para botões da tabela
  tabelaAdocao.addEventListener('click', async (event) => {
    // Botão de toggle status
    if (event.target.closest('.btn-toggle-adocao')) {
      const btn = event.target.closest('.btn-toggle-adocao');
      const id = btn.dataset.id;
      const statusAtual = btn.dataset.status === 'true';
      
      if (confirm(`Confirma ${statusAtual ? 'disponibilizar' : 'marcar como adotado'} este anúncio?`)) {
        const success = await toggleAdocaoStatus(id, statusAtual);
        if (success) {
          await carregarAnunciosDashboard();
        }
      }
    }
    
    // Botão de excluir
    else if (event.target.closest('.btn-delete-adocao')) {
      const btn = event.target.closest('.btn-delete-adocao');
      const id = btn.dataset.id;
      
      if (confirm('Tem certeza que deseja excluir este anúncio? Esta ação não pode ser desfeita.')) {
        const success = await excluirAdocao(id);
        if (success) {
          await carregarAnunciosDashboard();
        }
      }
    }
    
    // Botão de editar
    else if (event.target.closest('.btn-edit-adocao')) {
      const btn = event.target.closest('.btn-edit-adocao');
      const id = btn.dataset.id;
      
      await abrirModalEdicao(id);
    }
  });
  
  // Função para abrir o modal de edição
  async function abrirModalEdicao(id) {
    // Se não temos o modal ou o form, vamos criar um
    if (!modalEditAdocao || !formEditAdocao) {
      console.error("Modal de edição não encontrado! Criando um temporário.");
      criarModalEdicao();
      return; // Após criar, recarregue a página
    }
    
    // Buscar dados do anúncio
    const anuncio = await obterAdocaoParaEdicao(id);
    if (!anuncio) return;
    
    console.log("Abrindo modal com dados:", anuncio);
    
    // Preencher formulário
    if (formEditAdocao.querySelector('#edit-nome-pet'))
      formEditAdocao.querySelector('#edit-nome-pet').value = getField(anuncio, 'nome_pet', 'nomePet') || '';
    
    if (formEditAdocao.querySelector('#edit-idade-pet'))
      formEditAdocao.querySelector('#edit-idade-pet').value = getField(anuncio, 'idadePet', 'idade_pet') || '';
    
    if (formEditAdocao.querySelector('#edit-cidade'))
      formEditAdocao.querySelector('#edit-cidade').value = anuncio.cidade || '';
    
    if (formEditAdocao.querySelector('#edit-tutor-nome'))
      formEditAdocao.querySelector('#edit-tutor-nome').value = getField(anuncio, 'tutorNome', 'tutor_nome') || '';
    
    if (formEditAdocao.querySelector('#edit-tutor-telefone'))
      formEditAdocao.querySelector('#edit-tutor-telefone').value = getField(anuncio, 'tutorTelefone', 'tutor_telefone') || '';
    
    if (formEditAdocao.querySelector('#edit-tutor-email'))
      formEditAdocao.querySelector('#edit-tutor-email').value = getField(anuncio, 'tutorEmail', 'tutor_email') || '';
    
    if (formEditAdocao.querySelector('#edit-observacoes'))
      formEditAdocao.querySelector('#edit-observacoes').value = anuncio.observacoes || '';
    
    // Status adotado
    const selectStatus = formEditAdocao.querySelector('#edit-status');
    if (selectStatus) {
      selectStatus.value = anuncio.adotado ? 'adotado' : 'disponivel';
    }
    
    // Mostrar previews das imagens existentes
    const fotosPreview = formEditAdocao.querySelector('#edit-adocao-fotos-preview');
    if (fotosPreview) {
      fotosPreview.innerHTML = '';
      
      const imagens = normalizeArrayField(getField(anuncio, 'imagens_url_arr', 'imagens_url', 'imagensURL_arr') || anuncio.fotos);
      if (imagens && imagens.length) {
        imagens.forEach((url, index) => {
          const previewItem = document.createElement('div');
          previewItem.classList.add('preview-item');
          previewItem.innerHTML = `
            <div class="preview-image-wrapper">
              <img src="${escapeHtml(url)}" alt="Imagem ${index+1}" class="preview-image-thumbnail">
              <button type="button" class="btn-remove-foto" data-url="${escapeHtml(url)}" title="Remover foto">&times;</button>
            </div>
          `;
          fotosPreview.appendChild(previewItem);
        });
      }
    }
    
    // Armazenar ID para o salvamento
    formEditAdocao.dataset.adocaoId = id;
    
    // Abrir o modal
    modalEditAdocao.style.display = 'block';
    
    // Handler para remover imagens
    const btnRemoveFotos = formEditAdocao.querySelectorAll('.btn-remove-foto');
    btnRemoveFotos.forEach(btn => {
      btn.addEventListener('click', function() {
        const url = this.dataset.url;
        this.closest('.preview-item').remove();
      });
    });
    
    // Handler para upload de novas fotos
    const noveFotosInput = formEditAdocao.querySelector('#edit-fotos');
    const noveFotosPreview = formEditAdocao.querySelector('#edit-novas-fotos-preview');
    
    if (noveFotosInput && noveFotosPreview) {
      noveFotosInput.value = ''; // Limpar input anterior
      noveFotosPreview.innerHTML = ''; // Limpar preview anterior
      
      noveFotosInput.addEventListener('change', () => {
        noveFotosPreview.innerHTML = '';
        const files = noveFotosInput.files;
        for (const file of files) {
          const reader = new FileReader();
          reader.onload = function (e) {
            const previewItem = document.createElement('div');
            previewItem.classList.add('preview-item');
            previewItem.innerHTML = `
              <img src="${e.target.result}" alt="${file.name}" class="preview-image-thumbnail">
              <span class="preview-file-name">${file.name}</span>
            `;
            noveFotosPreview.appendChild(previewItem);
          }
          reader.readAsDataURL(file);
        }
      });
    }
  }
  
  // Função para criar modal de edição se não existir
  function criarModalEdicao() {
    // Se o modal já existe, não crie outro
    if (document.getElementById('modal-edit-adocao')) return;
    
    // Criar elemento do modal
    const modalEl = document.createElement('div');
    modalEl.id = 'modal-edit-adocao';
    modalEl.className = 'modal-admin';
    modalEl.innerHTML = `
      <div class="modal-admin-content">
        <span class="close-modal-admin">&times;</span>
        <h2>Editar Anúncio de Adoção</h2>
        <form id="form-edit-adocao" class="dashboard-form">
          <div class="form-group">
            <label for="edit-nome-pet">Nome do Pet</label>
            <input type="text" id="edit-nome-pet" required>
          </div>
          <div class="form-group">
            <label for="edit-idade-pet">Idade do Pet</label>
            <input type="text" id="edit-idade-pet">
          </div>
          <div class="form-group">
            <label for="edit-cidade">Cidade</label>
            <input type="text" id="edit-cidade">
          </div>
          <div class="form-group">
            <label for="edit-tutor-nome">Nome do Tutor/Responsável</label>
            <input type="text" id="edit-tutor-nome" required>
          </div>
          <div class="form-group">
            <label for="edit-tutor-telefone">Telefone do Tutor</label>
            <input type="tel" id="edit-tutor-telefone" required>
          </div>
          <div class="form-group">
            <label for="edit-tutor-email">Email do Tutor</label>
            <input type="email" id="edit-tutor-email">
          </div>
          <div class="form-group">
            <label for="edit-status">Status</label>
            <select id="edit-status" required>
              <option value="disponivel">Disponível</option>
              <option value="adotado">Adotado</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label for="edit-observacoes">Observações</label>
            <textarea id="edit-observacoes" rows="4"></textarea>
          </div>
          
          <!-- Fotos existentes -->
          <div class="form-group full-width">
            <label>Fotos Atuais</label>
            <div id="edit-adocao-fotos-preview" class="preview-container"></div>
          </div>
          
          <!-- Novas fotos -->
          <div class="form-group full-width">
            <label for="edit-fotos">Adicionar Novas Fotos</label>
            <input type="file" id="edit-fotos" multiple accept="image/*">
            <div id="edit-novas-fotos-preview" class="preview-container"></div>
          </div>
          
          <div class="form-group full-width">
            <button type="submit" class="btn-principal">Salvar Alterações</button>
          </div>
        </form>
      </div>
    `;
    
    // Adicionar ao final do body
    document.body.appendChild(modalEl);
    
    // Após adicionar, mostrar alerta para o usuário
    mostrarSucesso("Modal de edição adicionado! Por favor, tente editar novamente.");
    
    // Reconfigurar o dashboard após adicionar
    setupDashboardAdocao();
  }
  
  // Setup do formulário de edição
  if (formEditAdocao) {
    // Remover listeners antigos para evitar duplicidade
    const clonedForm = formEditAdocao.cloneNode(true);
    formEditAdocao.parentNode.replaceChild(clonedForm, formEditAdocao);
    
    // Adicionar novo listener
    clonedForm.addEventListener('submit', async function(e) {
      e.preventDefault();
      
      const id = this.dataset.adocaoId;
      if (!id) {
        mostrarErro('ID do anúncio não encontrado.');
        return;
      }
      
      const submitBtn = this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Salvando...';
      }
      
      // Pegar imagens existentes que não foram removidas
      const fotosPreview = this.querySelector('#edit-adocao-fotos-preview');
      const imagensExistentes = Array.from(fotosPreview.querySelectorAll('.preview-image-thumbnail'))
        .map(img => img.src)
        .filter(url => url.startsWith('http')); // Filtra apenas URLs reais
      
      // Fazer upload das novas imagens (se houver)
      const novasFotos = this.querySelector('#edit-fotos');
      let novasFotosUrls = [];
      
      if (novasFotos && novasFotos.files.length > 0) {
        try {
          novasFotosUrls = await uploadFilesToStorage(novasFotos.files, {
            bucket: 'petshop-assets',
            folder: 'adocao_fotos'
          });
        } catch (error) {
          console.error('Erro ao fazer upload de novas fotos', error);
          mostrarErro('Não foi possível fazer upload das novas fotos.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Salvar Alterações';
          }
          return;
        }
      }
      
      // Combinando imagens existentes com novas
      const todasImagens = [...imagensExistentes, ...novasFotosUrls];
      
      // Preparar dados atualizados
      const dadosAtualizados = {
        nome_pet: this.querySelector('#edit-nome-pet').value,
        idadePet: this.querySelector('#edit-idade-pet').value,
        cidade: this.querySelector('#edit-cidade').value,
        tutorNome: this.querySelector('#edit-tutor-nome').value,
        tutorTelefone: this.querySelector('#edit-tutor-telefone').value,
        tutorEmail: this.querySelector('#edit-tutor-email').value,
        observacoes: this.querySelector('#edit-observacoes').value,
        adotado: this.querySelector('#edit-status').value === 'adotado',
        imagens_url_arr: todasImagens
      };
      
      // Salvar alterações
      const success = await salvarEdicaoAdocao(id, dadosAtualizados);
      
      if (success) {
        // Fechar modal
        modalEditAdocao.style.display = 'none';
        // Recarregar tabela
        await carregarAnunciosDashboard();
      }
      
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Salvar Alterações';
      }
    });
  }
  
  // Setup botões de fechar modal
  const closeButtons = document.querySelectorAll('.close-modal-admin');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', function() {
      const modal = this.closest('.modal-admin');
      if (modal) modal.style.display = 'none';
    });
  });
  
  // Fechar modal clicando fora
  window.addEventListener('click', function(e) {
    if (e.target.classList.contains('modal-admin')) {
      e.target.style.display = 'none';
    }
  });
  
  // Inicializar carregamento da tabela
  carregarAnunciosDashboard();
}

/* auto init para dashboard.html - com garantia de execução única */
(function initDashboard() {
  // Verificar se estamos na página dashboard com a tabela de adoção
  const isDashboard = document.getElementById('tabela-adocao') !== null;
  if (isDashboard) {
    console.log("Página de dashboard detectada - inicializando gerenciamento de adoções");
    setupDashboardAdocao();
  }
})();
