import { supabase } from './supabase-config.js';
import './info-card.js';

// Função para formatar valores monetários
const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

// Helper: normaliza nomes de propriedades vindo da RPC (aceita snake_case e camelCase)
function normalizeDashboardPayload(raw) {
    if (!raw) return {};

    // Alguns deployments/RPCs retornam objeto com chaves em snake_case.
    // Mapeamos as duas formas para garantir compatibilidade.
    return {
        faturamentoDia: raw.faturamentoDia ?? raw.faturamento_dia ?? 0,
        faturamentoSemana: raw.faturamentoSemana ?? raw.faturamento_semana ?? 0,
        faturamentoMes: raw.faturamentoMes ?? raw.faturamento_mes ?? 0,
        totalAgendamentosSemana: raw.totalAgendamentosSemana ?? raw.total_agendamentos_semana ?? 0,
        listaAgendamentosSemana: raw.listaAgendamentosSemana ?? raw.lista_agendamentos_semana ?? raw.lista_agendamentos ?? [],
        graficoServicosMes: raw.graficoServicosMes ?? raw.grafico_servicos_mes ?? raw.grafico_servicos ?? []
    };
};

// Função para renderizar os cards de métricas
function renderMetrics(data) {
    const faturamentoDiaElement = document.getElementById('metric-faturamento-dia');
    const faturamentoSemanaElement = document.getElementById('metric-faturamento-semana');
    const faturamentoMesElement = document.getElementById('metric-faturamento-mes');
    const agendamentosSemanaElement = document.getElementById('metric-agendamentos-semana');

    if (faturamentoDiaElement) faturamentoDiaElement.value = formatCurrency(data.faturamentoDia);
    if (faturamentoSemanaElement) faturamentoSemanaElement.value = formatCurrency(data.faturamentoSemana);
    if (faturamentoMesElement) faturamentoMesElement.value = formatCurrency(data.faturamentoMes);
    if (agendamentosSemanaElement) agendamentosSemanaElement.value = data.totalAgendamentosSemana || 0;
}

// --- FUNÇÃO ATUALIZADA ---
// Função para extrair nomes de cliente/pets de um registro de agendamento (flexível)
function extractAgendamentoDisplayFields(ag) {
    // possíveis formatos:
    // - ag.cliente_nome ou ag.cliente (obj) ou ag.clientes_nome
    // - ag.pets_nomes (array de strings)
    // - ag.pets (array de objetos with nome) ou ag.agendamento_detalhes -> contains pets
    const clienteNome = ag.cliente_nome ?? ag.cliente?.nome ?? ag.clientes_nome ?? ag.clientes?.nome ?? ag.nome_cliente ?? 'Cliente Excluído';

    let petsNomes = [];
    if (Array.isArray(ag.pets_nomes) && ag.pets_nomes.length) petsNomes = ag.pets_nomes;
    else if (Array.isArray(ag.pets) && ag.pets.length) petsNomes = ag.pets.map(p => p.nome).filter(Boolean);
    else if (Array.isArray(ag.agendamento_detalhes) && ag.agendamento_detalhes.length) {
        petsNomes = ag.agendamento_detalhes.map(d => (d.pets?.nome || d.pet_nome || d.pet?.nome)).filter(Boolean);
    } else if (Array.isArray(ag.pets_names)) petsNomes = ag.pets_names;

    return {
        clienteNome,
        petsNomes
    };
}

// Função para renderizar a lista de agendamentos da semana
function renderAgendamentosSemana(agendamentos) {
    const listaEl = document.getElementById('agendamentos-semana-lista');
    if (!listaEl) return;

    // MELHORIA APLICADA AQUI: Filtra para mostrar apenas agendamentos futuros
    const agora = new Date();
    const safeList = agendamentos || [];

    // Alguns registros podem vir como strings de datas; garantimos parsing seguro
    const agendamentosParsed = safeList.map(ag => {
        return {
            ...ag,
            data_hora_inicio: ag.data_hora_inicio ?? ag.data_hora ?? ag.start_time ?? ag.data_hora_inicio_iso ?? ag.data_hora_inicio_string
        };
    });

    const agendamentosFuturos = agendamentosParsed.filter(ag => {
        try {
            const dt = new Date(ag.data_hora_inicio);
            return !isNaN(dt.getTime()) && dt >= agora;
        } catch {
            return false;
        }
    });

    if (agendamentosFuturos.length === 0) {
        listaEl.innerHTML = '<li>Nenhum agendamento futuro para esta semana.</li>';
        return;
    }

    listaEl.innerHTML = agendamentosFuturos.map(ag => {
        const dataAgendamento = new Date(ag.data_hora_inicio);
        const diaDaSemana = dataAgendamento.toLocaleDateString('pt-BR', { weekday: 'long' });
        const hora = dataAgendamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const { clienteNome, petsNomes } = extractAgendamentoDisplayFields(ag);

        const nomesPets = (petsNomes || []).length ? petsNomes.join(', ') : (ag.pet_nome || ag.pet?.nome || '—');

        return `
            <li>
                <div class="agendamento-info">
                    <strong><i class="fas fa-user"></i> ${clienteNome}</strong>
                    <span><i class="fas fa-paw"></i> ${nomesPets}</span>
                </div>
                <div class="agendamento-hora">${diaDaSemana}, ${hora}</div>
            </li>
        `;
    }).join('');
}

// Função para renderizar o gráfico de serviços do mês
function renderGraficoServicos(servicos) {
    const ctx = document.getElementById('servicos-chart')?.getContext('2d');
    if (!ctx) return;

    const safeServicos = servicos || [];

    if (!safeServicos || safeServicos.length === 0) {
        // opcional: limpar gráfico antigo
        if (window.servicosChart instanceof Chart) {
            window.servicosChart.destroy();
        }
        return;
    }

    // Suporta objetos com chaves em snake_case ou camelCase: nome / quantidade OR nome / quantidade_total / count
    const labels = safeServicos.map(s => s.nome ?? s.servico_nome ?? s.label ?? '—');
    const values = safeServicos.map(s => Number(s.quantidade ?? s.quantidade_total ?? s.count ?? s.total ?? 0));

    const backgroundColors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
        '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
    ];

    // Para evitar que um gráfico antigo seja renderizado sobre o novo
    if (window.servicosChart instanceof Chart) {
        try { window.servicosChart.destroy(); } catch (err) { /* ignore */ }
    }

    window.servicosChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nº de Realizações',
                data: values,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: false
                }
            }
        }
    });
}

// Função principal que chama a RPC e distribui os dados
async function carregarDadosDashboard() {
    // Verifica se a RPC existe pode variar; tentamos a RPC que você mencionou.
    try {
        const { data: rpcRaw, error: rpcError } = await supabase.rpc('get_dashboard_metrics');

        if (rpcError) {
            // Se a RPC não existir, tentamos uma query fallback simples para preencher alguns cards
            console.warn('RPC get_dashboard_metrics falhou:', rpcError);

            // Fallback: buscar alguns KPIs diretamente
            const hojeInicio = new Date(); hojeInicio.setHours(0,0,0,0);
            const hojeFim = new Date(); hojeFim.setHours(23,59,59,999);

            const [{ count: clientesCount }, { data: faturamentos }] = await Promise.all([
                supabase.from('clientes').select('id', { count: 'exact', head: true }),
                supabase.from('agendamentos').select('valor_cobrado').gte('data_hora_inicio', hojeInicio.toISOString()).lte('data_hora_inicio', hojeFim.toISOString()).eq('status', 'Realizado')
            ].map(p => p.catch ? p : p)); // protecao - a Promise.all abaixo continuará

            // calcular faturamento hoje se faturamentos for array
            let faturamentoHoje = 0;
            if (Array.isArray(faturamentos)) faturamentoHoje = faturamentos.reduce((s, r) => s + Number(r.valor_cobrado || 0), 0);

            // Renderiza o mínimo de dados
            renderMetrics({
                faturamentoDia: faturamentoHoje,
                faturamentoSemana: 0,
                faturamentoMes: 0,
                totalAgendamentosSemana: 0
            });
            // Não fazemos gráficos no fallback
            return;
        }

        // normaliza chaves
        const payload = Array.isArray(rpcRaw) && rpcRaw.length === 1 ? rpcRaw[0] : rpcRaw;
        const data = normalizeDashboardPayload(payload);

        renderMetrics(data);
        renderAgendamentosSemana(data.listaAgendamentosSemana);
        renderGraficoServicos(data.graficoServicosMes);
    } catch (err) {
        console.error('Erro inesperado ao carregar métricas do dashboard:', err);
        alert('Não foi possível carregar os dados do painel. Verifique o console para mais detalhes.');
    }
}


export function setupDashboard() {
    // Garante que o código só vai rodar se estivermos na view 'inicio'
    if (document.getElementById('view-inicio')) {
        carregarDadosDashboard();
    }
}