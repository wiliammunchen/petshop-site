import { supabase } from './supabase-config.js';

// Helper para garantir que valores de "imagens_url" sejam arrays
function safeArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    // supabase às vezes retorna strings no formato "{url1,url2}"
    return val.replace(/^{|}$/g, '').split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Função auxiliar para renderizar os cards em um container específico
function renderizarServicos(container, servicos) {
    if (!container) return;
    const lista = servicos || [];
    if (lista.length === 0) {
        container.innerHTML = '<p>Nenhum serviço disponível nesta categoria no momento.</p>';
        return;
    }

    container.innerHTML = ''; // Limpa o container antes de adicionar os novos cards
    lista.forEach(servico => {
        const fotos = safeArray(servico.imagens_url);
        const imagensHtml = (fotos.length > 0)
            ? fotos.map((foto, index) => `<img src="${foto}" alt="Foto de ${servico.nome || ''}" class="adocao-imagem ${index === 0 ? 'active' : ''}" data-index="${index}">`).join('')
            : '<img src="images/default-service.png" alt="Imagem padrão de serviço" class="adocao-imagem active">';

        const sliderButtons = (fotos.length > 1)
            ? `<button class="slider-btn prev" data-direction="-1">&#10094;</button>
               <button class="slider-btn next" data-direction="1">&#10095;</button>`
            : '';

        const valorText = (servico.valor != null && !Number.isNaN(Number(servico.valor)))
            ? `R$ ${Number(servico.valor).toFixed(2).replace('.', ',')}`
            : 'Consulte';

        const descricao = servico.descricao || servico.resumo || 'Descrição não disponível.';

        const nome = servico.nome || servico.titulo || 'Serviço';

        const card = `
            <div class="servico-card" data-servico-id="${servico.id || ''}">
                <div class="card-imagem-container">
                    ${imagensHtml}
                    ${sliderButtons}
                </div>
                <div class="servico-card-info">
                    <h3>${nome}</h3>
                    <p class="servico-preco">${valorText}</p>
                    <p class="servico-descricao">${descricao}</p>
                    <a href="agendamento.html" class="btn-principal" data-servico-id="${servico.id || ''}">Agendar Agora</a>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', card);
    });
}


async function carregarServicosPublicos() {
    const gridPrincipais = document.getElementById('servicos-grid-principais');
    const gridAdicionais = document.getElementById('servicos-grid-adicionais');

    if (!gridPrincipais || !gridAdicionais) return;

    const { data: servicos, error } = await supabase
        .from('servicos')
        .select('id, nome, valor, descricao, imagens_url, tipo_servico, mostrar_site')
        .eq('mostrar_site', true)
        .order('nome', { ascending: true });

    if (error) {
        gridPrincipais.innerHTML = '<p>Erro ao carregar os serviços. Tente novamente mais tarde.</p>';
        gridAdicionais.innerHTML = ''; // Limpa o outro grid
        console.error('Erro carregarServicosPublicos:', error);
        return;
    }

    const lista = servicos || [];
    // Separa os serviços em duas listas (proteção caso tipo_servico falte)
    const servicosPrincipais = lista.filter(s => (s.tipo_servico || 'principal') === 'principal');
    const servicosAdicionais = lista.filter(s => (s.tipo_servico || 'principal') === 'adicional');

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
    const servicosContainer = document.getElementById('servicos-lista') || document.body;
    servicosContainer.addEventListener('click', (e) => {
        const sliderBtn = e.target.closest('.slider-btn');
        if (sliderBtn) {
            const direction = parseInt(sliderBtn.dataset.direction, 10) || 0;
            const container = sliderBtn.closest('.card-imagem-container');
            if (!container) return;

            const images = Array.from(container.querySelectorAll('.adocao-imagem'));
            const activeImage = container.querySelector('.adocao-imagem.active');
            if (!activeImage || images.length <= 1) return;

            // garante parse seguro do data-index (caso não exista)
            const currentIndex = Number(activeImage.dataset.index || images.findIndex(img => img.classList.contains('active')) || 0);
            let newIndex = currentIndex + direction;

            if (newIndex < 0) newIndex = images.length - 1;
            else if (newIndex >= images.length) newIndex = 0;

            activeImage.classList.remove('active');
            const nextImg = images[newIndex];
            if (nextImg) nextImg.classList.add('active');
        }

        // suporte: clique no botão "Agendar Agora" encaminha para agendamento com serviço selecionado
        const agendarBtn = e.target.closest('.btn-principal[data-servico-id]');
        if (agendarBtn) {
            const servicoId = agendarBtn.dataset.servicoId;
            // adiciona query param service se quiser pré-selecionar no agendamento
            const url = new URL(window.location.origin + '/agendamento.html');
            if (servicoId) url.searchParams.set('servico_id', servicoId);
            window.location.href = url.toString();
        }
    });
}