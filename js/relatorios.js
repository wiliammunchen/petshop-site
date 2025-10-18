import { supabase } from './supabase-config.js';

// --- FUNÇÕES AUXILIARES ---
const formatCurrency = (value) => (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getPeriodRange(period, startDate, endDate) {
    if (period === 'personalizado') {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        return { start: start.toISOString(), end: end.toISOString() };
    }
    
    const now = new Date();
    let start, end;
    now.setHours(0, 0, 0, 0);

    switch (period) {
        case 'hoje':
            start = new Date(now);
            end = new Date(now);
            end.setHours(23, 59, 59, 999);
            break;
        case 'semana':
            const firstDayOfWeek = now.getDate() - now.getDay();
            start = new Date(now.setDate(firstDayOfWeek));
            end = new Date(start);
            end.setDate(start.getDate() + 6);
            end.setHours(23, 59, 59, 999);
            break;
        case 'mes':
            start = new Date(now.getFullYear(), now.getMonth(), 1);
            end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            end.setHours(23, 59, 59, 999);
            break;
        case 'trimestre':
            const currentMonth = now.getMonth();
            const quarterStartMonth = Math.floor(currentMonth / 3) * 3;
            start = new Date(now.getFullYear(), quarterStartMonth, 1);
            end = new Date(now.getFullYear(), quarterStartMonth + 3, 0);
            end.setHours(23, 59, 59, 999);
            break;
    }
    return { start: start.toISOString(), end: end.toISOString() };
}

function setupDateFilters(formId) {
    const form = document.getElementById(formId);
    if (!form) return;

    const periodoSelect = form.querySelector('select[id*="-periodo"]');
    const dataInicioInput = form.querySelector('input[id*="-data-inicio"]');
    const dataFimInput = form.querySelector('input[id*="-data-fim"]');

    periodoSelect.addEventListener('change', () => {
        const isPersonalizado = periodoSelect.value === 'personalizado';
        dataInicioInput.disabled = !isPersonalizado;
        dataFimInput.disabled = !isPersonalizado;
        if (!isPersonalizado) {
            dataInicioInput.value = '';
            dataFimInput.value = '';
        }
    });
}

// Substitua a função antiga por esta
function imprimirConteudo(elementId, tituloRelatorio, periodoTexto) {
    const conteudoDiv = document.getElementById(elementId);
    if (!conteudoDiv) {
        console.error("Elemento para impressão não encontrado:", elementId);
        return;
    }

    const printWindow = window.open('', '_blank', 'height=800,width=800');
    
    printWindow.document.write('<html><head><title>Imprimir - ' + tituloRelatorio + '</title>');
    printWindow.document.write('<link rel="stylesheet" href="css/impressao.css" type="text/css" media="all">');
    printWindow.document.write('</head><body class="print-body">');

    // --- NOVO CABEÇALHO PADRÃO ---
    printWindow.document.write(`
        <div class="print-header">
            <img src="images/logo-petshop.png" alt="Logo Espaço PetShop">
            <div>
                <h1>${tituloRelatorio}</h1>
                <h2>${periodoTexto}</h2>
            </div>
        </div>
    `);

    printWindow.document.write(`<div class="print-content-wrapper">${conteudoDiv.innerHTML}</div>`);
    
    printWindow.document.write(`
        <div class="print-note no-print">
            <p>Use o atalho Ctrl+P (ou Cmd+P no Mac) para imprimir.</p>
        </div>
    `);

    printWindow.document.write('</body></html>');
    
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
    }, 500);
}

function getPeriodoDescricao(form) {
    const periodoSelect = form.querySelector('select[id*="-periodo"]');
    const periodo = periodoSelect.value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;

    let descricao = periodoSelect.options[periodoSelect.selectedIndex].text;
    if (periodo === 'personalizado' && dataInicio && dataFim) {
        const dataInicioFormatada = new Date(dataInicio + 'T12:00:00').toLocaleDateString('pt-BR');
        const dataFimFormatada = new Date(dataFim + 'T12:00:00').toLocaleDateString('pt-BR');
        descricao = `De ${dataInicioFormatada} a ${dataFimFormatada}`;
    }
    return `Período: ${descricao}`;
}

// ============================================ //
// ====== RELATÓRIOS OPERACIONAIS ============= //
// ============================================ //

async function gerarRelatorioAgendamentosPorPeriodo(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-agendamentos-periodo');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-agendamentos-periodo');
    const periodo = form.querySelector('select[id*="-periodo"]').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const status = document.getElementById('agendamentos-periodo-status').value;
    
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    let query = supabase
        .from('agendamentos')
        .select('id', { count: 'exact' })
        .gte('data_hora_inicio', start)
        .lte('data_hora_inicio', end);

    if (status !== 'todos') {
        query = query.eq('status', status);
    } else {
        query = query.not('status', 'eq', 'Cancelado');
    }

    const { count, error } = await query;

    if (error) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao gerar relatório: ${error.message}</p>`;
        return;
    }

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Total de Agendamentos: ${count}</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-agendamentos-periodo" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="info-card">
            <div class="card-icon" style="background-color: #dbeafe; color: #3b82f6;"><i class="fas fa-calendar-alt"></i></div>
            <div class="card-content">
                <h3>Total de Agendamentos</h3>
                <p>${count}</p>
            </div>
        </div>
    `;
}

async function gerarRelatorioServicosMaisRealizados(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-servicos-mais-realizados');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-servicos-mais-realizados');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);
    
    const { data, error } = await supabase
        .from('agendamentos')
        .select(`agendamento_detalhes(servicos(nome))`)
        .gte('data_hora_inicio', start)
        .lte('data_hora_inicio', end)
        .eq('status', 'Realizado');

    if (error) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao gerar relatório: ${error.message}</p>`;
        return;
    }

    const contagem = data
        .flatMap(agendamento => agendamento.agendamento_detalhes)
        .reduce((acc, detalhe) => {
            const nomeServico = detalhe.servicos?.nome || "Serviço Removido";
            acc[nomeServico] = (acc[nomeServico] || 0) + 1;
            return acc;
        }, {});

    const sortedServicos = Object.entries(contagem).sort(([, a], [, b]) => b - a);

    if (sortedServicos.length === 0) {
        resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Serviços Mais Realizados</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-servicos-mais-realizados" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <p>Nenhum serviço realizado no período.</p>`;
        return;
    }

    const tableRows = sortedServicos.map(([nome, quantidade]) => `
        <tr>
            <td>${nome}</td>
            <td>${quantidade}</td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Serviços Mais Realizados</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-servicos-mais-realizados" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Serviço</th>
                        <th>Quantidade Realizada</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
    `;
}

async function gerarRelatorioTaxaComparecimento(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-taxa-comparecimento');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-taxa-comparecimento');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    // CHAMADA OTIMIZADA USANDO A NOVA FUNÇÃO RPC
    const { data, error } = await supabase.rpc('relatorio_taxa_comparecimento', {
        start_date: start,
        end_date: end
    });

    if (error) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao gerar relatório: ${error.message}</p>`;
        return;
    }

    const realizados = data.realizados;
    const faltas = data.faltas;
    const total = realizados + faltas;
    const taxa = total > 0 ? (realizados / total) * 100 : 0;

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Taxa de Comparecimento</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-taxa-comparecimento" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="info-card" style="border-left-color: #10b981;"><div class="card-icon" style="background-color: #d1fae5; color: #10b981;"><i class="fas fa-check"></i></div><div class="card-content"><h3>Compareceram</h3><p>${realizados}</p></div></div>
            <div class="info-card" style="border-left-color: #ef4444;"><div class="card-icon" style="background-color: #fee2e2; color: #ef4444;"><i class="fas fa-user-slash"></i></div><div class="card-content"><h3>Faltaram</h3><p>${faltas}</p></div></div>
            <div class="info-card" style="border-left-color: #4f46e5;"><div class="card-icon" style="background-color: #eef2ff; color: #4f46e5;"><i class="fas fa-percentage"></i></div><div class="card-content"><h3>Taxa de Comparecimento</h3><p>${taxa.toFixed(1)}%</p></div></div>
        </div>
    `;
}

async function gerarRelatorioTempoMedio(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-tempo-medio-servico');
    if (!resultadoDiv) return;
    
    resultadoDiv.innerHTML = '<p>Calculando tempo médio real dos serviços...</p>';
    
    const form = document.getElementById('form-filtro-tempo-medio-servico');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    // A chamada RPC agora envia as datas para o banco de dados filtrar
    const { data, error } = await supabase.rpc('relatorio_tempo_medio_real', {
        start_date: start,
        end_date: end
    });

    if (error) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao calcular o tempo médio: ${error.message}</p>`;
        return;
    }

    if (!data || data.length === 0) {
        resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Tempo Médio por Serviço</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-tempo-medio-servico" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <p>Nenhum serviço foi finalizado no período selecionado para calcular a média.</p>`;
        return;
    }

    const tableRows = data.map(servico => `
        <tr>
            <td>${servico.nome_servico}</td>
            <td><strong>${Math.round(servico.tempo_medio_minutos)} minutos</strong></td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Tempo Médio por Serviço</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-tempo-medio-servico" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead>
                    <tr>
                        <th>Serviço</th>
                        <th>Tempo Médio Real de Execução</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>
        <p style="font-size: 0.8rem; color: #666; margin-top: 1rem;">* A média é calculada com base no tempo entre a hora agendada e a hora em que o serviço foi marcado como "Realizado".</p>
    `;
}


// ============================================ //
// ====== RELATÓRIOS FINANCEIROS ============== //
// ============================================ //

async function gerarRelatorioFaturamentoPorServico(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-faturamento-servico');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-faturamento-servico');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);
    
    const { data, error } = await supabase.rpc('relatorio_faturamento_por_servico', {
        start_date: start,
        end_date: end
    });

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    if (data.length === 0) { resultadoDiv.innerHTML = '<p>Nenhum faturamento no período para serviços realizados.</p>'; return; }

    const tableRows = data.map(item => `
        <tr>
            <td>${item.nome_servico}</td>
            <td>${item.quantidade}</td>
            <td>${formatCurrency(item.faturamento_total)}</td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Faturamento por Serviço</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-faturamento-servico" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead><tr><th>Serviço</th><th>Quantidade</th><th>Faturamento Total</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function gerarRelatorioTicketMedio(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-ticket-medio');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-ticket-medio');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    const { data, error } = await supabase
        .from('agendamentos')
        .select('valor_cobrado')
        .gte('data_hora_inicio', start).lte('data_hora_inicio', end)
        .eq('status', 'Realizado');

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    
    const totalFaturado = data.reduce((sum, item) => sum + item.valor_cobrado, 0);
    const numeroDeVendas = data.length;
    const ticketMedio = numeroDeVendas > 0 ? totalFaturado / numeroDeVendas : 0;

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Ticket Médio por Visita</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-ticket-medio" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="info-card"><div class="card-icon"><i class="fas fa-dollar-sign"></i></div><div class="card-content"><h3>Faturamento Total</h3><p>${formatCurrency(totalFaturado)}</p></div></div>
            <div class="info-card"><div class="card-icon"><i class="fas fa-hashtag"></i></div><div class="card-content"><h3>Nº de Vendas</h3><p>${numeroDeVendas}</p></div></div>
            <div class="info-card"><div class="card-icon"><i class="fas fa-user-tag"></i></div><div class="card-content"><h3>Ticket Médio</h3><p>${formatCurrency(ticketMedio)}</p></div></div>
        </div>
    `;
}

async function gerarRelatorioReceitasPeriodo(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-receitas-periodo');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';
    
    const form = document.getElementById('form-filtro-receitas-periodo');
    const periodoDescricao = getPeriodoDescricao(form); // LINHA ADICIONADA
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value; // Verifique se esta linha também foi corrigida
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);
    
    const { data, error } = await supabase
        .from('agendamentos')
        .select('valor_cobrado')
        .gte('data_hora_inicio', start).lte('data_hora_inicio', end)
        .eq('status', 'Realizado');

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    
    const faturamentoTotal = data.reduce((sum, item) => sum + item.valor_cobrado, 0);
    const numeroVendas = data.length;

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Receitas por Período</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-receitas-periodo" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <span class="report-period-info" style="display:none;">${periodoDescricao}</span> 
        <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr;">
            <div class="info-card" style="border-left-color: #10b981;"><div class="card-icon" style="background-color: #d1fae5; color: #10b981;"><i class="fas fa-cash-register"></i></div><div class="card-content"><h3>Receita Total no Período</h3><p>${formatCurrency(faturamentoTotal)}</p></div></div>
            <div class="info-card"><div class="card-icon"><i class="fas fa-hashtag"></i></div><div class="card-content"><h3>Nº de Vendas</h3><p>${numeroVendas}</p></div></div>
        </div>
    `;
}

// Substitua a função inteira por esta versão corrigida
async function gerarRelatorioLucroReal(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-lucro-real');
    resultadoDiv.innerHTML = '<p>Calculando lucro real...</p>';

    const form = document.getElementById('form-filtro-lucro-real');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    // 1. Busca os valores de frete dos bairros primeiro
    const { data: bairros, error: bairrosError } = await supabase
        .from('bairros')
        .select('nome, valor_tele_busca');

    if (bairrosError) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao buscar dados dos bairros: ${bairrosError.message}</p>`;
        return;
    }
    // Cria um mapa para fácil acesso: { "Nome do Bairro": valor }
    const mapaValoresTransporte = new Map(bairros.map(b => [b.nome, b.valor_tele_busca]));

    // 2. Pega os agendamentos realizados no período com os dados necessários
    const { data: agendamentos, error } = await supabase
        .from('agendamentos')
        .select(`
            valor_cobrado,
            tipo_entrega,
            clientes ( bairro ),
            formas_pagamento ( taxa_percentual )
        `)
        .gte('data_hora_inicio', start)
        .lte('data_hora_inicio', end)
        .eq('status', 'Realizado');

    if (error) {
        resultadoDiv.innerHTML = `<p class="error">Erro ao buscar agendamentos: ${error.message}</p>`;
        return;
    }

    if (agendamentos.length === 0) {
        resultadoDiv.innerHTML = '<p>Nenhum agendamento realizado encontrado no período para calcular o lucro.</p>';
        return;
    }

    // 3. Calcula os totais usando os dados buscados
    let faturamentoBrutoTotal = 0;
    let totalTaxasCartao = 0;
    let totalTransporte = 0;

    agendamentos.forEach(ag => {
        faturamentoBrutoTotal += ag.valor_cobrado || 0;

        let valorTransporte = 0;
        if (ag.tipo_entrega === 'Busca-e-Entrega' && ag.clientes?.bairro) {
            // Usa o mapa para encontrar o valor do transporte
            valorTransporte = mapaValoresTransporte.get(ag.clientes.bairro) || 0;
            totalTransporte += valorTransporte;
        }

        const valorServicos = (ag.valor_cobrado || 0) - valorTransporte;
        
        if (ag.formas_pagamento && ag.formas_pagamento.taxa_percentual > 0) {
            const taxa = (ag.formas_pagamento.taxa_percentual / 100);
            totalTaxasCartao += valorServicos * taxa;
        }
    });

    const faturamentoLiquido = faturamentoBrutoTotal - totalTransporte - totalTaxasCartao;

    // 4. Exibe os resultados
    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Relatório de Lucro Real</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-lucro-real" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr 1fr;">
            <div class="info-card">
                <div class="card-icon" style="background-color: #dbeafe; color: #3b82f6;"><i class="fas fa-dollar-sign"></i></div>
                <div class="card-content">
                    <h3>Faturamento Bruto</h3>
                    <p>${formatCurrency(faturamentoBrutoTotal)}</p>
                </div>
            </div>
            <div class="info-card" style="border-left-color: #fca5a5;">
                <div class="card-icon" style="background-color: #fee2e2; color: #ef4444;"><i class="fas fa-credit-card"></i></div>
                <div class="card-content">
                    <h3>(-) Taxas de Pagamento</h3>
                    <p>${formatCurrency(totalTaxasCartao)}</p>
                </div>
            </div>
             <div class="info-card" style="border-left-color: #fca5a5;">
                <div class="card-icon" style="background-color: #fee2e2; color: #ef4444;"><i class="fas fa-truck"></i></div>
                <div class="card-content">
                    <h3>(-) Valor do Transporte</h3>
                    <p>${formatCurrency(totalTransporte)}</p>
                </div>
            </div>
        </div>
        <div class="info-card" style="margin-top: 1.5rem; border-left-color: #4ade80; text-align: center; display: block;">
             <div class="card-content">
                <h3 style="font-size: 1.2rem;">Lucro Real no Período</h3>
                <p style="font-size: 2.5rem; color: #15803d;">${formatCurrency(faturamentoLiquido)}</p>
            </div>
        </div>
    `;
}

// =================================================== //
// ====== RELATÓRIOS DE CLIENTES E PETS ============== //
// =================================================== //

async function gerarRelatorioClientesFrequentes(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-clientes-frequentes');
    resultadoDiv.innerHTML = '<p>Gerando ranking...</p>';

    const form = document.getElementById('form-filtro-clientes-frequentes');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    const { data, error } = await supabase.rpc('relatorio_clientes_frequentes', {
        start_date: start,
        end_date: end
    });

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    if (data.length === 0) { resultadoDiv.innerHTML = '<p>Nenhum agendamento encontrado no período.</p>'; return; }

    const tableRows = data.map((item, index) => `
        <tr>
            <td><strong>#${index + 1}</strong></td>
            <td>${item.nome_cliente}</td>
            <td>${item.total_agendamentos}</td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Clientes Mais Frequentes</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-clientes-frequentes" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead><tr><th>Posição</th><th>Cliente</th><th>Nº de Agendamentos</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

async function gerarRelatorioNovosClientes(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-novos-clientes');
    resultadoDiv.innerHTML = '<p>Gerando relatório...</p>';

    const form = document.getElementById('form-filtro-novos-clientes');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    const { count, error } = await supabase
        .from('clientes')
        .select('id', { count: 'exact' })
        .gte('created_at', start)
        .lte('created_at', end);

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Novos Clientes no Período</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-novos-clientes" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="info-card" style="border-left-color: #8b5cf6;">
            <div class="card-icon" style="background-color: #f5f3ff; color: #8b5cf6;"><i class="fas fa-user-plus"></i></div>
            <div class="card-content">
                <h3>Novos Clientes no Período</h3>
                <p>${count}</p>
            </div>
        </div>`;
}

// 11. Consumo de Insumos por Serviço
async function gerarRelatorioConsumoServico(e) {
    e.preventDefault();
    const resultadoDiv = document.getElementById('resultado-consumo-servico');
    resultadoDiv.innerHTML = '<p>Gerando relatório de consumo...</p>';

    const form = document.getElementById('form-filtro-consumo-servico');
    const periodo = form.querySelector('select').value;
    const dataInicio = form.querySelector('input[id*="-data-inicio"]').value;
    const dataFim = form.querySelector('input[id*="-data-fim"]').value;
    const { start, end } = getPeriodRange(periodo, dataInicio, dataFim);

    const { data, error } = await supabase.rpc('relatorio_consumo_insumos', {
        start_date: start,
        end_date: end
    });

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    if (data.length === 0) { resultadoDiv.innerHTML = '<p>Nenhum consumo de insumo registrado para serviços realizados no período.</p>'; return; }
    
    const tableRows = data.map(item => `
        <tr>
            <td>${item.nome_produto}</td>
            <td>${item.total_consumido.toFixed(4)} ${item.unidade_medida || ''}</td>
            <td>${formatCurrency(item.custo_total)}</td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Consumo de Insumos por Serviço</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-consumo-servico" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead><tr><th>Produto</th><th>Total Consumido</th><th>Custo Total</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}

// 12. Reposição Necessária
async function gerarRelatorioReposicao() {
    const resultadoDiv = document.getElementById('resultado-reposicao');
    if (!resultadoDiv) return;
    resultadoDiv.innerHTML = '<p>Verificando estoque...</p>';
    
    const { data, error } = await supabase
        .rpc('produtos_com_estoque_baixo');

    if (error) { resultadoDiv.innerHTML = `<p class="error">Erro: ${error.message}</p>`; return; }
    
    if (data.length === 0) { resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Reposição Necessária</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-reposicao" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <p>Ótima notícia! Nenhum item precisa de reposição no momento.</p>
    `; return; }

    const tableRows = data.map(item => `
        <tr style="background-color: #fee2e2;">
            <td>${item.nome}</td>
            <td><strong>${item.qtd_disponivel} ${item.unidade_medida || ''}</strong></td>
            <td>${item.estoque_minimo} ${item.unidade_medida || ''}</td>
        </tr>
    `).join('');

    resultadoDiv.innerHTML = `
        <div class="header-actions no-print">
            <h3>Reposição Necessária</h3>
            <button class="btn-secondary btn-print" data-print-target="resultado-reposicao" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
        </div>
        <div class="table-wrapper">
            <table class="dashboard-table">
                <thead><tr><th>Produto</th><th>Estoque Atual</th><th>Estoque Mínimo</th></tr></thead>
                <tbody>${tableRows}</tbody>
            </table>
        </div>`;
}


// --- Função Principal de Setup ---
export function setupRelatorios() {
    // Escopo local para as funções relacionadas ao histórico de pets
    let clientesComPetsCache = [];
    
    async function carregarClientesEPetsParaFiltro() {
        const selectCliente = document.getElementById('historico-selecionar-cliente');
        if (!selectCliente) return;

        // CORREÇÃO: Adicionado .eq('status', 'ativo') para filtrar apenas clientes ativos
        const { data, error } = await supabase
            .from('clientes')
            .select('id, nome, pets (id, nome)')
            .eq('status', 'ativo') // <-- ESTA É A LINHA ADICIONADA
            .order('nome');
        
        if (error) {
            console.error("Erro ao carregar clientes e pets:", error);
            return;
        }

        clientesComPetsCache = data;
        selectCliente.innerHTML = '<option value="">Selecione um cliente</option>';
        clientesComPetsCache.forEach(cliente => {
            // Adiciona apenas clientes que têm pets cadastrados
            if (cliente.pets && cliente.pets.length > 0) {
                 selectCliente.innerHTML += `<option value="${cliente.id}">${cliente.nome}</option>`;
            }
        });
    }

    function popularPetsDoCliente(clienteId) {
        const selectPet = document.getElementById('historico-selecionar-pet');
        const resultadoDiv = document.getElementById('resultado-historico-pet');
        
        selectPet.innerHTML = '<option value="">Selecione um pet</option>';
        resultadoDiv.innerHTML = '<p>Selecione um cliente e um pet para ver o histórico.</p>';
        
        const clienteSelecionado = clientesComPetsCache.find(c => c.id == clienteId);

        if (clienteSelecionado && clienteSelecionado.pets.length > 0) {
            clienteSelecionado.pets.forEach(pet => {
                selectPet.innerHTML += `<option value="${pet.id}">${pet.nome}</option>`;
            });
            selectPet.disabled = false;
        } else {
            selectPet.disabled = true;
            selectPet.innerHTML = '<option value="">Nenhum pet encontrado</option>';
        }
    }

    async function gerarRelatorioHistoricoPet(petId) {
        const resultadoDiv = document.getElementById('resultado-historico-pet');
        resultadoDiv.innerHTML = '<p>Buscando histórico completo...</p>';
    
        const { data: detalhes, error } = await supabase
            .from('agendamento_detalhes')
            .select(`
                agendamentos (
                    id,
                    data_hora_inicio,
                    valor_cobrado,
                    status,
                    tipo_entrega,
                    observacoes,
                    formas_pagamento ( nome )
                ),
                servicos ( nome, tipo_servico )
            `)
            .eq('pet_id', petId)
            .order('data_hora_inicio', { foreignTable: 'agendamentos', ascending: false });
    
        if (error) {
            resultadoDiv.innerHTML = `<p class="error">Erro ao buscar histórico: ${error.message}</p>`;
            return;
        }
    
        if (detalhes.length === 0) {
            resultadoDiv.innerHTML = '<p>Nenhum serviço registrado para este pet.</p>';
            return;
        }
    
        const historicoAgrupado = detalhes.reduce((acc, detalhe) => {
            const ag = detalhe.agendamentos;
            if (!ag) return acc; // Pula detalhes sem agendamento associado
    
            if (!acc[ag.id]) {
                acc[ag.id] = {
                    data: new Date(ag.data_hora_inicio),
                    status: ag.status,
                    valor: ag.valor_cobrado,
                    transporte: ag.tipo_entrega,
                    observacoes: ag.observacoes,
                    formaPagamento: ag.formas_pagamento?.nome || 'Não informado',
                    servicoPrincipal: null,
                    servicosAdicionais: []
                };
            }
    
            if (detalhe.servicos.tipo_servico === 'principal') {
                acc[ag.id].servicoPrincipal = detalhe.servicos.nome;
            } else {
                acc[ag.id].servicosAdicionais.push(detalhe.servicos.nome);
            }
    
            return acc;
        }, {});
    
        let conteudoHtml = '';
        for (const id in historicoAgrupado) {
            const item = historicoAgrupado[id];
            const statusClass = (item.status || 'agendado').toLowerCase();
    
            conteudoHtml += `
                <div class="timeline-item">
                    <div class="timeline-icon"><i class="fas fa-cut"></i></div>
                    <div class="timeline-date">
                        ${item.data.toLocaleDateString('pt-BR')} às ${item.data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </div>
                    <div class="timeline-content">
                        <h4>Agendamento #${String(id).padStart(5, '0')}</h4>
                        <ul class="history-details-list">
                            <li><strong>Serviço Principal:</strong> ${item.servicoPrincipal || 'N/A'}</li>
                            ${
                                item.servicosAdicionais.length > 0
                                ? `<li><strong>Serviços Adicionais:</strong> ${item.servicosAdicionais.join(', ')}</li>`
                                : ''
                            }
                            <li><strong>Transporte:</strong> ${item.transporte || 'Não informado'}</li>
                            <li><strong>Forma de Pagamento:</strong> ${item.formaPagamento}</li>
                            ${
                                item.observacoes
                                ? `<li><strong>Observações:</strong> ${item.observacoes}</li>`
                                : ''
                            }
                        </ul>
                        <hr style="margin: 0.5rem 0;">
                        <p><strong>Status:</strong> <span class="status-badge status-${statusClass}">${item.status}</span></p>
                        <p><strong>Valor Total (Agendamento):</strong> ${formatCurrency(item.valor)}</p>
                    </div>
                </div>
            `;
        }
    
        resultadoDiv.innerHTML = `
            <div class="header-actions no-print">
                <h3>Histórico de Serviços</h3>
                <button class="btn-secondary btn-print" data-print-target="resultado-historico-pet" title="Imprimir Relatório"><i class="fas fa-print"></i> Imprimir</button>
            </div>
            <div class="timeline-container">
                ${conteudoHtml}
            </div>
        `;
    }
    
    // Fim do escopo local para o histórico de pets

    setupDateFilters('form-filtro-agendamentos-periodo');
    setupDateFilters('form-filtro-servicos-mais-realizados');
    setupDateFilters('form-filtro-taxa-comparecimento');
    setupDateFilters('form-filtro-tempo-medio-servico');
    setupDateFilters('form-filtro-faturamento-servico');
    setupDateFilters('form-filtro-ticket-medio');
    setupDateFilters('form-filtro-receitas-periodo');
    setupDateFilters('form-filtro-clientes-frequentes');
    setupDateFilters('form-filtro-novos-clientes');
    setupDateFilters('form-filtro-consumo-servico');
    setupDateFilters('form-filtro-lucro-real');

    document.getElementById('form-filtro-agendamentos-periodo')?.addEventListener('submit', gerarRelatorioAgendamentosPorPeriodo);
    document.getElementById('form-filtro-servicos-mais-realizados')?.addEventListener('submit', gerarRelatorioServicosMaisRealizados);
    document.getElementById('form-filtro-taxa-comparecimento')?.addEventListener('submit', gerarRelatorioTaxaComparecimento);
    document.getElementById('form-filtro-tempo-medio-servico')?.addEventListener('submit', gerarRelatorioTempoMedio);
    
    document.getElementById('form-filtro-faturamento-servico')?.addEventListener('submit', gerarRelatorioFaturamentoPorServico);
    document.getElementById('form-filtro-ticket-medio')?.addEventListener('submit', gerarRelatorioTicketMedio);
    document.getElementById('form-filtro-receitas-periodo')?.addEventListener('submit', gerarRelatorioReceitasPeriodo);
    document.getElementById('form-filtro-lucro-real')?.addEventListener('submit', gerarRelatorioLucroReal);
    
    document.getElementById('form-filtro-clientes-frequentes')?.addEventListener('submit', gerarRelatorioClientesFrequentes);
    document.getElementById('form-filtro-novos-clientes')?.addEventListener('submit', gerarRelatorioNovosClientes);
    
    carregarClientesEPetsParaFiltro();
    document.getElementById('historico-selecionar-cliente')?.addEventListener('change', (e) => popularPetsDoCliente(e.target.value));
    document.getElementById('historico-selecionar-pet')?.addEventListener('change', (e) => { if (e.target.value) gerarRelatorioHistoricoPet(e.target.value); });
    
    document.getElementById('form-filtro-consumo-servico')?.addEventListener('submit', gerarRelatorioConsumoServico);
    gerarRelatorioReposicao();

    document.addEventListener('click', (e) => {
        const printButton = e.target.closest('.btn-print');
        if (printButton) {
            const targetId = printButton.dataset.printTarget;
            // Pega o título do H3 mais próximo dentro do mesmo container do relatório
            const titulo = printButton.closest('.dashboard-section').querySelector('h2, h3')?.textContent || 'Relatório';
            const form = printButton.closest('.dashboard-section').querySelector('.relatorio-filtros');
            const periodoTexto = form ? getPeriodoDescricao(form) : '';
            imprimirConteudo(targetId, titulo, periodoTexto);
        }
    });
}