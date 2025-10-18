// js/servicos.js (VERSÃO COMPLETA E REVISADA)
// Mantém funcionalidades existentes e garante normalização de imagens/arrays.
// Usa normalizeArrayField para aceitar imagens_url (text[]), imagensURL (camelCase), imagens_url_arr, etc.

import { supabase } from './supabase-config.js';
import { normalizeArrayField, firstArrayItem } from './utils/normalizeArray.js';

const listContainer = document.getElementById('servicos-list') || document.querySelector('.servicos-list');

export async function fetchServicos() {
  const { data, error } = await supabase
    .from('servicos')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar serviços', error);
    return [];
  }
  return data || [];
}

export function renderServicos(records) {
  if (!listContainer) return;
  listContainer.innerHTML = '';
  records.forEach(rec => {
    const thumb = firstArrayItem(rec.imagens_url ?? rec.imagensURL ?? rec.imagens_url_arr ?? rec.imagensURL_arr) || '/images/default-service.png';
    const card = document.createElement('div');
    card.className = 'servico-card';
    card.innerHTML = `
      <img src="${thumb}" alt="${rec.nome || ''}" width="140" />
      <div class="info">
        <h3>${rec.nome || ''}</h3>
        <p>R$ ${rec.valor ?? '-'}</p>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

(async function init() {
  const regs = await fetchServicos();
  renderServicos(regs);
})();

//
// Public rendering helpers (used in services page)
//

function renderizarServicos(container, servicos) {
    if (!container) return;
    if (!servicos || servicos.length === 0) {
        container.innerHTML = '<p>Nenhum serviço disponível nesta categoria no momento.</p>';
        return;
    }

    container.innerHTML = ''; // Limpa o container antes de adicionar os novos cards
    servicos.forEach(servico => {
        const fotos = normalizeArrayField(servico.imagens_url ?? servico.imagensURL ?? servico.imagens_url_arr ?? servico.imagensURL_arr);
        const card = `
            <div class="servico-card">
                <div class="card-imagem-container">
                    ${(fotos.length > 0) ?
                        fotos.map((foto, index) => `<img src="${foto}" alt="Foto de ${servico.nome}" class="adocao-imagem ${index === 0 ? 'active' : ''}" data-index="${index}">`).join('') :
                        '<img src="images/default-service.png" alt="Imagem padrão de serviço" class="adocao-imagem active">'
                    }
                    ${(fotos.length > 1) ?
                        `<button class="slider-btn prev" data-direction="-1">&#10094;</button>
                         <button class="slider-btn next" data-direction="1">&#10095;</button>` : ''
                    }
                </div>
                <div class="servico-card-info">
                    <h3>${servico.nome}</h3>
                    <p class="servico-preco">R$ ${servico.valor ? Number(servico.valor).toFixed(2).replace('.', ',') : 'Consulte'}</p>
                    <p class="servico-descricao">${servico.descricao || 'Descrição não disponível.'}</p>
                    <a href="agendamento.html" class="btn-principal">Agendar Agora</a>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}

export async function carregarServicosPublicos() {
    const gridPrincipais = document.getElementById('servicos-grid-principais');
    const gridAdicionais = document.getElementById('servicos-grid-adicionais');

    if (!gridPrincipais || !gridAdicionais) return;

    const { data: servicos, error } = await supabase
        .from('servicos')
        .select('nome, valor, descricao, imagens_url, tipo_servico')
        .eq('mostrar_site', true)
        .order('nome', { ascending: true });

    if (error) {
        gridPrincipais.innerHTML = '<p>Erro ao carregar os serviços. Tente novamente mais tarde.</p>';
        gridAdicionais.innerHTML = '';
        console.error(error);
        return;
    }

    const servicosPrincipais = (servicos || []).filter(s => s.tipo_servico === 'principal');
    const servicosAdicionais = (servicos || []).filter(s => s.tipo_servico === 'adicional');

    renderizarServicos(gridPrincipais, servicosPrincipais);
    renderizarServicos(gridAdicionais, servicosAdicionais);
}

// Setup público (para páginas que exibem serviços)
export function setupServicosPublicos() {
    if (!document.getElementById('servicos-grid-principais')) return;

    carregarServicosPublicos();

    // Delegated listener for slider controls
    const servicosContainer = document.getElementById('servicos-lista') || document.body;
    servicosContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.slider-btn');
        if (!btn) return;
        const direction = parseInt(btn.dataset.direction, 10);
        const container = btn.closest('.card-imagem-container');
        if (!container) return;

        const images = Array.from(container.querySelectorAll('.adocao-imagem'));
        const activeImage = container.querySelector('.adocao-imagem.active');
        if (!activeImage || images.length <= 1) return;

        let newIndex = parseInt(activeImage.dataset.index, 10) + direction;
        if (newIndex < 0) newIndex = images.length - 1;
        if (newIndex >= images.length) newIndex = 0;

        activeImage.classList.remove('active');
        images.forEach(img => img.classList.remove('active'));
        images[newIndex].classList.add('active');
    });
}

export default {
  fetchServicos,
  renderServicos,
  carregarServicosPublicos,
  setupServicosPublicos
};