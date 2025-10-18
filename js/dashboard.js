import { supabase } from './supabase-config.js';
import './info-card.js';

// Função para formatar valores monetários
const formatCurrency = (value) => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
// Função para renderizar a lista de agendamentos da semana
function renderAgendamentosSemana(agendamentos) {
    const listaEl = document.getElementById('agendamentos-semana-lista');
    if (!listaEl) return;

    // MELHORIA APLICADA AQUI: Filtra para mostrar apenas agendamentos futuros
    const agora = new Date();
    const agendamentosFuturos = (agendamentos || []).filter(ag => new Date(ag.data_hora_inicio) >= agora);

    if (agendamentosFuturos.length === 0) {
        listaEl.innerHTML = '<li>Nenhum agendamento futuro para esta semana.</li>';
        return;
    }

    listaEl.innerHTML = agendamentosFuturos.map(ag => {
        const dataAgendamento = new Date(ag.data_hora_inicio);
        const diaDaSemana = dataAgendamento.toLocaleDateString('pt-BR', { weekday: 'long' });
        const hora = dataAgendamento.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const nomeCliente = ag.cliente_nome || 'Cliente Excluído';
        const nomesPets = (ag.pets_nomes || []).join(', ');

        return `
            <li>
                <div class="agendamento-info">
                    <strong><i class="fas fa-user"></i> ${nomeCliente}</strong>
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

    if (!servicos || servicos.length === 0) {
        // Opcional: mostrar uma mensagem se não houver dados
        return;
    }

    const labels = servicos.map(s => s.nome);
    const values = servicos.map(s => s.quantidade);
    
    const backgroundColors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', 
        '#8b5cf6', '#d946ef', '#ec4899', '#64748b'
    ];

    // Para evitar que um gráfico antigo seja renderizado sobre o novo
    if (window.servicosChart instanceof Chart) {
        window.servicosChart.destroy();
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
    const { data, error } = await supabase.rpc('get_dashboard_metrics');

    if (error) {
        console.error('Erro ao buscar métricas do dashboard:', error);
        alert('Não foi possível carregar os dados do painel. Verifique o console para mais detalhes.');
        return;
    }

    if (data) {
        renderMetrics(data);
        renderAgendamentosSemana(data.listaAgendamentosSemana);
        renderGraficoServicos(data.graficoServicosMes);
    }
}


export function setupDashboard() {
    // Garante que o código só vai rodar se estivermos na view 'inicio'
    if (document.getElementById('view-inicio')) {
        carregarDadosDashboard();
    }
}