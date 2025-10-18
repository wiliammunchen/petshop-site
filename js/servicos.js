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


// Função auxiliar para renderizar os cards em um container específico
function renderizarServicos(container, servicos) {
    if (servicos.length === 0) {
        container.innerHTML = '<p>Nenhum serviço disponível nesta categoria no momento.</p>';
        return;
    }

    container.innerHTML = ''; // Limpa o container antes de adicionar os novos cards
    servicos.forEach(servico => {
        const fotos = servico.imagens_url || [];
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
                    <p class="servico-preco">R$ ${servico.valor ? servico.valor.toFixed(2).replace('.', ',') : 'Consulte'}</p>
                    <p class="servico-descricao">${servico.descricao || 'Descrição não disponível.'}</p>
                    <a href="agendamento.html" class="btn-principal">Agendar Agora</a>
                </div>
            </div>
        `;
        container.innerHTML += card;
    });
}


async function carregarServicosPublicos() {
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
        gridAdicionais.innerHTML = ''; // Limpa o outro grid
        console.error(error);
        return;
    }

    // Separa os serviços em duas listas
    const servicosPrincipais = servicos.filter(s => s.tipo_servico === 'principal');
    const servicosAdicionais = servicos.filter(s => s.tipo_servico === 'adicional');

    // Renderiza cada lista em seu respectivo container
    renderizarServicos(gridPrincipais, servicosPrincipais);
    renderizarServicos(gridAdicionais, servicosAdicionais);
}

// Função principal de setup
export function setupServicosPublicos() {
    // Adiciona uma verificação para garantir que estamos na página de serviços
    if (!document.getElementById('servicos-grid-principais')) {
        return;
    }

    carregarServicosPublicos();

    // Adiciona o listener de eventos a um container pai para funcionar em ambos os grids
    const servicosContainer = document.getElementById('servicos-lista');
    servicosContainer.addEventListener('click', (e) => {
        if (e.target.classList.contains('slider-btn')) {
            const direction = parseInt(e.target.dataset.direction, 10);
            const container = e.target.closest('.card-imagem-container');
            if (!container) return;

            const images = container.querySelectorAll('.adocao-imagem');
            const activeImage = container.querySelector('.adocao-imagem.active');
            if (!activeImage || images.length <= 1) return;

            let newIndex = parseInt(activeImage.dataset.index, 10) + direction;

            if (newIndex < 0) {
                newIndex = images.length - 1;
            } else if (newIndex >= images.length) {
                newIndex = 0;
            }

            activeImage.classList.remove('active');
            images[newIndex].classList.add('active');
        }
    });
}