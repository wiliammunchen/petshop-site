import { supabase } from './supabase-config.js';
import { gerarImpressaoAgendamento } from './impressao.js';

// Função auxiliar copiada de relatorios.js para uso local
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
    }
    return { start: start.toISOString(), end: end.toISOString() };
}

export function setupAgendamentos() {
    // --- SELETORES DO DOM ---
    const tabelaAgendamentosBody = document.querySelector('#tabela-agendamentos tbody');
    const btnNovoAgendamento = document.getElementById('btn-novo-agendamento');
    const modal = document.getElementById('modal-agendamento');
    const form = document.getElementById('form-agendamento');
    const tituloModal = document.getElementById('modal-agendamento-titulo');
    const btnImprimir = document.getElementById('btn-imprimir-agendamento');
    const selectCliente = document.getElementById('agendamento-cliente');
    const petsEServicosContainer = document.getElementById('pets-e-servicos-container');
    const inputValorTotal = document.getElementById('agendamento-valor-total');
    const selectTransporte = document.getElementById('agendamento-entrega');
    const selectFormaPagamento = document.getElementById('agendamento-pagamento');

    // --- SELETORES DOS NOVOS FILTROS ---
    const formFiltros = document.getElementById('form-filtros-agenda');
    const filtroPeriodo = document.getElementById('agenda-periodo');
    const filtroDataInicio = document.getElementById('agenda-data-inicio');
    const filtroDataFim = document.getElementById('agenda-data-fim');
    const filtroStatus = document.getElementById('agenda-status');

    let formasDePagamentoCache = [];
    let servicosPrincipais = [];
    let servicosAdicionais = [];
    let clientesECachePets = {};

    // --- LÓGICA DOS FILTROS ---
    if (formFiltros) {
        filtroPeriodo.addEventListener('change', () => {
            const isPersonalizado = filtroPeriodo.value === 'personalizado';
            filtroDataInicio.disabled = !isPersonalizado;
            filtroDataFim.disabled = !isPersonalizado;
            if (!isPersonalizado) {
                filtroDataInicio.value = '';
                filtroDataFim.value = '';
            }
            carregarAgendamentos();
        });

        [filtroDataInicio, filtroDataFim, filtroStatus].forEach(el => {
            el?.addEventListener('change', carregarAgendamentos);
        });
    }

    async function updateAgendamentoStatus(agendamentoId, novoStatus) {
        const { data: agendamento, error: fetchError } = await supabase
            .from('agendamentos')
            .select('data_hora_inicio')
            .eq('id', agendamentoId)
            .single();

        if (fetchError) {
            alert(`Erro ao buscar dados do agendamento: ${fetchError.message}`);
            return;
        }

        const startTime = new Date(agendamento.data_hora_inicio);
        const now = new Date();

        if (novoStatus === 'Realizado' && now < startTime) {
            const proceed = confirm(
                "AVISO: Este agendamento está marcado para uma data/hora futura.\n\n" +
                "Marcá-lo como 'Realizado' agora não será considerado no cálculo do tempo médio de execução.\n\n" +
                "Deseja continuar mesmo assim?"
            );
            if (!proceed) {
                return;
            }
        }
        
        let updateData = { status: novoStatus };
        if (novoStatus === 'Realizado') {
            updateData.data_hora_fim = now.toISOString();
        }

        const { error } = await supabase
            .from('agendamentos')
            .update(updateData)
            .eq('id', agendamentoId);

        if (error) {
            alert(`Erro ao atualizar o status: ${error.message}`);
        } else {
            alert('Status do agendamento atualizado com sucesso!');
            await carregarAgendamentos();
        }
    }

    async function carregarFormasDePagamento() {
        if (!selectFormaPagamento) return;
        const { data, error } = await supabase.from('formas_pagamento').select('*').order('nome');
        if (error) {
            console.error('Erro ao carregar formas de pagamento', error);
            return;
        }
        formasDePagamentoCache = data;
        selectFormaPagamento.innerHTML = '<option value="">Selecione...</option>';
        formasDePagamentoCache.forEach(f => {
            selectFormaPagamento.innerHTML += `<option value="${f.id}" data-taxa="${f.taxa_percentual}">${f.nome}</option>`;
        });
    }

    async function carregarAgendamentos() {
        if (!tabelaAgendamentosBody) return;

        tabelaAgendamentosBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Carregando agendamentos...</td></tr>';

        const { start, end } = getPeriodRange(filtroPeriodo.value, filtroDataInicio.value, filtroDataFim.value);
        const status = filtroStatus.value;

        let query = supabase.from('agendamentos')
            .select(`
                id, status, data_hora_inicio, valor_cobrado, 
                cliente_id, clientes (nome, status), 
                agendamento_detalhes(pets(nome))
            `)
            .gte('data_hora_inicio', start)
            .lte('data_hora_inicio', end)
            .order('data_hora_inicio', { ascending: false });
        
        if (status !== 'todos') {
            query = query.eq('status', status);
        } else {
            query = query.not('status', 'in', '("cancelado", "pendente")');
        }

        const { data, error } = await query;

        if (error) {
            console.error("Erro ao carregar agendamentos:", error);
            tabelaAgendamentosBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Erro ao carregar agendamentos.</td></tr>';
            return;
        }

        if (!data || data.length === 0) {
            tabelaAgendamentosBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Nenhum agendamento encontrado para os filtros selecionados.</td></tr>';
            return;
        }

        tabelaAgendamentosBody.innerHTML = '';
        data.forEach(ag => {
            const dataHora = new Date(ag.data_hora_inicio);
            const statusCapitalized = ag.status ? (ag.status.charAt(0).toUpperCase() + ag.status.slice(1)) : 'Pendente';
            const statusClass = (ag.status || 'pendente').toLowerCase().replace(' ', '-');

            const clientePendente = ag.clientes?.status === 'pendente';
            const linhaClass = clientePendente ? 'cliente-pendente' : (ag.status === 'pendente' ? 'pendente' : '');

            let clienteInfo = ag.clientes?.nome || '<span style="color: #cc0000;">Cliente Removido</span>';
            let petInfo = [...new Set(ag.agendamento_detalhes.map(d => d.pets?.nome).filter(Boolean))].join(', ');

            if (clientePendente) {
                clienteInfo += ' <span class="status-badge status-pendente" style="font-size: 0.7rem;">CADASTRO PENDENTE</span>';
            }

            let actionButtons = `
                <button class="btn-status-realizado" data-id="${ag.id}" title="Marcar como Realizado"><i class="fas fa-check"></i></button>
                <button class="btn-status-faltou" data-id="${ag.id}" title="Marcar como Faltou"><i class="fas fa-user-slash"></i></button>
                <button class="btn-edit-agendamento btn-edit" data-id="${ag.id}" title="Editar"><i class="fas fa-edit"></i></button>
                <button class="btn-print-agendamento" data-id="${ag.id}" title="Imprimir"><i class="fas fa-print"></i></button>
                <button class="btn-cancel-agendamento" data-id="${ag.id}" title="Cancelar Agendamento" style="color: #f59e0b;"><i class="fas fa-calendar-times"></i></button>
                <button class="btn-delete-agendamento btn-delete" data-id="${ag.id}" title="Excluir Agendamento"><i class="fas fa-trash-alt"></i></button>
            `;

            tabelaAgendamentosBody.innerHTML += `
                <tr class="${linhaClass}">
                    <td><span class="status-badge status-${statusClass}">${statusCapitalized}</span></td>
                    <td>${dataHora.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td>${clienteInfo}</td>
                    <td>${petInfo}</td>
                    <td>${(ag.valor_cobrado || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                    <td class="actions-cell">${actionButtons}</td>
                </tr>
            `;
        });
    }

async function carregarClientesEServicos() {
        const { data: bairros, error: bairrosError } = await supabase.from('bairros').select('nome, valor_tele_busca');
        if (bairrosError) {
            console.error("Erro ao carregar bairros:", bairrosError);
            return;
        }
        
        const mapaValoresBairros = {};
        bairros.forEach(b => {
            mapaValoresBairros[b.nome] = b.valor_tele_busca;
        });

        const { data: clientes, error: clientesError } = await supabase
            .from('clientes')
            .select('id, nome, bairro, pets(id, nome)')
            .order('nome');

        if (clientesError) {
            console.error("Erro ao carregar clientes:", clientesError);
            return;
        }

        selectCliente.innerHTML = '<option value="">Selecione um cliente...</option>';
        clientes.forEach(c => {
            selectCliente.innerHTML += `<option value="${c.id}">${c.nome}</option>`;
            
            const valorTele = mapaValoresBairros[c.bairro] || 0;

            clientesECachePets[c.id] = {
                pets: c.pets,
                valorTeleBusca: valorTele
            };
        });

        const { data: servicos } = await supabase.from('servicos').select('id, nome, valor, tipo_servico').order('nome');
        if (servicos) {
            servicosPrincipais = servicos.filter(s => s.tipo_servico === 'principal');
            servicosAdicionais = servicos.filter(s => s.tipo_servico === 'adicional');
        }
    }

    function atualizarValorTotal() {
        let totalServicos = 0;
        document.querySelectorAll('.pet-servicos-card').forEach(card => {
            const principalSelect = card.querySelector('.servico-principal');
            if (principalSelect && principalSelect.value) {
                const selectedOption = principalSelect.options[principalSelect.selectedIndex];
                totalServicos += parseFloat(selectedOption.dataset.valor) || 0;
            }
            card.querySelectorAll('.servico-item').forEach(item => {
                totalServicos += parseFloat(item.dataset.valor) || 0;
            });
        });
        let taxaTransporte = 0;
        if (selectTransporte.value === 'Busca-e-Entrega') {
            const clienteId = selectCliente.value;
            if (clienteId && clientesECachePets[clienteId]) {
                taxaTransporte = parseFloat(clientesECachePets[clienteId].valorTeleBusca) || 0;
            }
        }
        const totalGeral = totalServicos + taxaTransporte;
        inputValorTotal.value = totalGeral.toFixed(2);
    }

    function renderizarPetCard(pet) {
        const servicosPrincipaisOptions = servicosPrincipais.map(s => `<option value="${s.id}" data-valor="${s.valor || 0}">${s.nome}</option>`).join('');
        const servicosAdicionaisOptions = servicosAdicionais.map(s => `<option value="${s.id}" data-valor="${s.valor || 0}">${s.nome}</option>`).join('');
        return `
            <div class="pet-servicos-card" data-pet-id="${pet.id}">
                <div class="pet-servicos-card-header">
                    <h4><i class="fas fa-paw"></i> ${pet.nome}</h4>
                </div>
                <div class="dashboard-form">
                    <div class="form-group full-width">
                        <label>Serviço Principal*</label>
                        <select class="servico-principal" required><option value="">Selecione um serviço</option>${servicosPrincipaisOptions}</select>
                    </div>
                    <div class="form-group full-width">
                        <label>Serviços Adicionais</label>
                        <select class="servico-adicional"><option value="">Adicionar adicional...</option>${servicosAdicionaisOptions}</select>
                    </div>
                </div>
                <ul class="servicos-adicionados-lista"></ul>
            </div>
        `;
    }

    async function abrirModalDeEdicao(id) {
        const { data: ag } = await supabase.from('agendamentos').select('*, agendamento_detalhes(*)').eq('id', id).single();
        if (!ag) { alert("Agendamento não encontrado!"); return; }
        form.reset();
        await carregarClientesEServicos();
        tituloModal.innerHTML = `<i class="fas fa-edit"></i> Editar Agendamento #${String(id).padStart(5,'0')}`;
        document.getElementById('agendamento-id').value = id;
        selectCliente.value = ag.cliente_id;
        selectCliente.dispatchEvent(new Event('change'));
        setTimeout(() => {
            ag.agendamento_detalhes.forEach(detalhe => {
                const card = petsEServicosContainer.querySelector(`.pet-servicos-card[data-pet-id="${detalhe.pet_id}"]`);
                if(card) {
                    const servico = [...servicosPrincipais, ...servicosAdicionais].find(s => s.id == detalhe.servico_id);
                    if(servico) {
                        if (servico.tipo_servico === 'principal') {
                            card.querySelector('.servico-principal').value = servico.id;
                        } else {
                            const lista = card.querySelector('.servicos-adicionados-lista');
                            lista.innerHTML += `<li class="servico-item" data-servico-id="${servico.id}" data-valor="${servico.valor}"><span>${servico.nome}</span><span>R$ ${(servico.valor || 0).toFixed(2)} <button type="button" class="btn-delete-servico-item btn-delete">&times;</button></span></li>`;
                        }
                    }
                }
            });
            atualizarValorTotal();
        }, 200);
        const dataHora = new Date(ag.data_hora_inicio);
        document.getElementById('agendamento-data').value = dataHora.toISOString().split('T')[0];
        document.getElementById('agendamento-hora').value = dataHora.toTimeString().slice(0,5);
        document.getElementById('agendamento-entrega').value = ag.tipo_entrega || 'Cliente Traz';
        document.getElementById('agendamento-obs').value = ag.observacoes;
        selectFormaPagamento.value = ag.forma_pagamento_id || '';
        btnImprimir.style.display = 'inline-block';
        btnImprimir.onclick = () => gerarImpressaoAgendamento(id);
        modal.style.display = 'block';
    }

    btnNovoAgendamento?.addEventListener('click', async () => { 
        await carregarClientesEServicos();
        form.reset();
        document.getElementById('agendamento-id').value = '';
        tituloModal.innerHTML = '<i class="fas fa-calendar-plus"></i> Novo Agendamento';
        petsEServicosContainer.innerHTML = '<p class="placeholder-text">Selecione um cliente para adicionar pets.</p>';
        btnImprimir.style.display = 'none';
        modal.style.display = 'block';
    });

    selectCliente?.addEventListener('change', () => {
        const clienteId = selectCliente.value;
        const pets = clientesECachePets[clienteId]?.pets || [];
        petsEServicosContainer.innerHTML = '';
        if (pets.length > 0) {
            pets.forEach(pet => petsEServicosContainer.innerHTML += renderizarPetCard(pet));
        } else {
            petsEServicosContainer.innerHTML = '<p class="placeholder-text">Este cliente não possui pets cadastrados.</p>';
        }
        atualizarValorTotal(); 
    });

    petsEServicosContainer?.addEventListener('change', (e) => {
        const target = e.target;
        if (!target) return;
        const card = target.closest('.pet-servicos-card');
        if (target.classList.contains('servico-principal')) {
            atualizarValorTotal();
        } else if (target.classList.contains('servico-adicional')) {
            const selectedOption = target.options[target.selectedIndex];
            const servicoId = selectedOption.value;
            if (!servicoId) return;
            const listaAdicionais = card.querySelector('.servicos-adicionados-lista');
            const servicoPrincipalId = card.querySelector('.servico-principal').value;
            if (servicoId === servicoPrincipalId || listaAdicionais.querySelector(`[data-servico-id="${servicoId}"]`)) {
                target.value = '';
                return;
            }
            const servico = servicosAdicionais.find(s => s.id == servicoId);
            if (servico) {
                listaAdicionais.innerHTML += `<li class="servico-item" data-servico-id="${servico.id}" data-valor="${servico.valor}"><span>${servico.nome}</span><span>R$ ${servico.valor.toFixed(2)} <button type="button" class="btn-delete-servico-item btn-delete">&times;</button></span></li>`;
            }
            atualizarValorTotal();
            target.value = '';
        }
    });

    petsEServicosContainer?.addEventListener('click', (e) => {
        if (e.target.closest('.btn-delete-servico-item')) {
            e.target.closest('.servico-item').remove();
            atualizarValorTotal();
        }
    });

    selectTransporte?.addEventListener('change', () => {
        atualizarValorTotal(); 
    });

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('agendamento-id').value;
        const clienteId = selectCliente.value;
        if (!clienteId) {
            alert('É obrigatório selecionar um cliente para salvar o agendamento.');
            return;
        }
        const detalhesParaInserir = [];
        let isValid = true;
        document.querySelectorAll('.pet-servicos-card').forEach(card => {
            const petId = card.dataset.petId;
            const servicoPrincipalSelect = card.querySelector('.servico-principal');
            const servicoPrincipalId = servicoPrincipalSelect.value;
            if (!servicoPrincipalId) {
                alert(`O serviço principal do pet ${card.querySelector('h4').textContent.replace(/<i.*<\/i>/, '').trim()} é obrigatório.`);
                isValid = false;
                return;
            }
            const servicoPrincipal = [...servicosPrincipais, ...servicosAdicionais].find(s => s.id === parseInt(servicoPrincipalId, 10));
            if (servicoPrincipal) {
                detalhesParaInserir.push({ pet_id: parseInt(petId, 10), servico_id: servicoPrincipal.id, valor_cobrado: parseFloat(servicoPrincipal.valor) });
            }
            card.querySelectorAll('.servico-item').forEach(item => {
                const servicoAdicional = [...servicosPrincipais, ...servicosAdicionais].find(s => s.id == item.dataset.servicoId);
                detalhesParaInserir.push({ pet_id: parseInt(petId, 10), servico_id: servicoAdicional.id, valor_cobrado: parseFloat(item.dataset.valor) });
            });
        });
        if (!isValid) return;
        if (detalhesParaInserir.length === 0) {
            alert('Adicione pelo menos um serviço a um pet.');
            return;
        }
        const pagamentoOption = selectFormaPagamento.options[selectFormaPagamento.selectedIndex];
        const formaPagamentoId = pagamentoOption.value ? parseInt(pagamentoOption.value) : null;
        const agendamentoData = {
            cliente_id: clienteId,
            data_hora_inicio: new Date(`${document.getElementById('agendamento-data').value}T${document.getElementById('agendamento-hora').value}`).toISOString(),
            status: 'Agendado',
            valor_cobrado: parseFloat(inputValorTotal.value),
            observacoes: document.getElementById('agendamento-obs').value,
            tipo_entrega: document.getElementById('agendamento-entrega').value,
            forma_pagamento_id: formaPagamentoId
        };
        let agendamentoResult;
        try {
            if (id) {
                const { data, error } = await supabase.from('agendamentos').update(agendamentoData).eq('id', id).select().single();
                if (error) throw new Error(error.message);
                agendamentoResult = data;
                await supabase.from('agendamento_detalhes').delete().eq('agendamento_id', id);
            } else {
                const { data, error } = await supabase.from('agendamentos').insert(agendamentoData).select().single();
                if (error) throw new Error(error.message);
                agendamentoResult = data;
            }
            const detalhesComAgendamentoId = detalhesParaInserir.map(d => ({ ...d, agendamento_id: agendamentoResult.id }));
            await supabase.from('agendamento_detalhes').insert(detalhesComAgendamentoId);
            alert('Agendamento salvo com sucesso!');
            modal.style.display = 'none';
            await carregarAgendamentos();
        } catch (error) {
            alert('Falha na solicitação: ' + error.message);
        }
    });

    tabelaAgendamentosBody?.addEventListener('click', async (e) => {
        const editBtn = e.target.closest('.btn-edit-agendamento');
        const printBtn = e.target.closest('.btn-print-agendamento');
        const cancelBtn = e.target.closest('.btn-cancel-agendamento');
        const deleteBtn = e.target.closest('.btn-delete-agendamento'); // <-- Seletor do botão de excluir
        const realizadoBtn = e.target.closest('.btn-status-realizado');
        const faltouBtn = e.target.closest('.btn-status-faltou');

        if (editBtn) {
            abrirModalDeEdicao(editBtn.dataset.id);
        }
        else if (cancelBtn) {
            if (confirm('Deseja CANCELAR este agendamento? O status será alterado para "Cancelado".')) {
                await updateAgendamentoStatus(cancelBtn.dataset.id, 'cancelado');
            }
        }
        // LÓGICA DO BOTÃO EXCLUIR ADICIONADA AQUI
        else if (deleteBtn) {
            const id = deleteBtn.dataset.id;
            if (confirm(`ATENÇÃO: Deseja EXCLUIR PERMANENTEMENTE o agendamento #${String(id).padStart(5, '0')}?\n\nEsta ação não pode ser desfeita.`)) {
                await supabase.from('agendamento_detalhes').delete().eq('agendamento_id', id);
                const { error } = await supabase.from('agendamentos').delete().eq('id', id);

                if (error) {
                    alert('Erro ao excluir agendamento: ' + error.message);
                } else {
                    alert('Agendamento excluído com sucesso!');
                    await carregarAgendamentos();
                }
            }
        }
        else if (realizadoBtn) {
            if (confirm('Deseja marcar este agendamento como "Realizado"?')) {
                updateAgendamentoStatus(realizadoBtn.dataset.id, 'Realizado');
            }
        }
        else if (faltouBtn) {
            if (confirm('Deseja marcar este agendamento como "Faltou"?')) {
                updateAgendamentoStatus(faltouBtn.dataset.id, 'Faltou');
            }
        }
        else if (printBtn) {
            gerarImpressaoAgendamento(printBtn.dataset.id);
        }
    });

    // --- CARREGAMENTO INICIAL ---
    carregarAgendamentos();
    carregarClientesEServicos();
    carregarFormasDePagamento();
}