// Ajustes para usar nomes do esquema (cliente_id, agendamentos, agendamento_detalhes, valor_tele_busca)
// e tratar ids como strings; normalização de arrays e datas em ISO.

import { supabase } from './supabase-config.js';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('form-agendamento-publico');
    if (!form) return;

    // --- Seletores de Campos ---
    const selectBairroCliente = document.getElementById('cliente-bairro');
    const inputData = document.getElementById('data-agendamento');
    const horariosContainer = document.getElementById('horarios-disponiveis-container');
    const submitButton = form.querySelector('button[type="submit"]');
    const petsContainer = document.getElementById('pets-container');
    const btnAddPet = document.getElementById('btn-add-pet');
    const selectTeleBusca = document.getElementById('tele-busca');
    const avisoTeleBusca = document.getElementById('aviso-tele-busca');
    
    let listaServicosCache = [];
    let listaRacasCache = [];

    async function carregarRacasParaPet(selectElement) {
        if (!selectElement) return;
        if (listaRacasCache.length === 0) {
            const { data } = await supabase.from('racas').select('nome').order('nome');
            listaRacasCache = data || [];
        }
        selectElement.innerHTML = '<option value="">Selecione uma raça</option>';
        listaRacasCache.forEach(r => selectElement.innerHTML += `<option value="${r.nome}">${r.nome}</option>`);
        selectElement.innerHTML += `<option value="SRD">Sem Raça Definida (SRD)</option><option value="Outra">Outra</option>`;
    }

    async function carregarServicosPrincipaisParaPet(selectElement) {
        if (!selectElement) return;
        if (listaServicosCache.length === 0) {
            const { data } = await supabase.from('servicos').select('id, nome, tipo_servico, valor').eq('mostrar_site', true).order('nome');
            listaServicosCache = data || [];
        }
        selectElement.innerHTML = '<option value="">Selecione um serviço</option>';
        listaServicosCache
            .filter(s => s.tipo_servico === 'principal')
            .forEach(s => selectElement.innerHTML += `<option value="${s.id}" data-nome="${s.nome}">${s.nome}</option>`);
    }

    async function carregarServicosAdicionaisParaPet(containerElement, petId) {
        if (!containerElement) return;
        if (listaServicosCache.length === 0) {
            const { data } = await supabase.from('servicos').select('id, nome, tipo_servico, valor').eq('mostrar_site', true).order('nome');
            listaServicosCache = data || [];
        }

        const adicionais = listaServicosCache.filter(s => s.tipo_servico === 'adicional');
        if (adicionais.length > 0) {
            containerElement.innerHTML = `
                <label>Serviços Adicionais (Opcional)</label>
                <div class="checkbox-grid">
                    ${adicionais.map(s => `
                        <div class="checkbox-item">
                            <input type="checkbox" id="adicional-${petId}-${s.id}" class="pet-servico-adicional" value="${s.id}" data-nome="${s.nome}">
                            <label for="adicional-${petId}-${s.id}">${s.nome}</label>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }

    function adicionarFormularioPet() {
        if (!petsContainer) return;
        const petId = `pet_${Date.now()}`;
        const petFormHTML = `
            <div class="pet-form-template" id="${petId}">
                <button type="button" class="btn-remove-pet" title="Remover este pet">&times;</button>
                <div class="form-grid">
                    <div class="form-group"><label>Nome do Pet*</label><input type="text" class="pet-nome" required></div>
                    <div class="form-group"><label>Raça*</label><select class="pet-raca" required><option value="">Carregando...</option></select></div>
                    <div class="form-group"><label>Idade (anos)</label><input type="number" class="pet-idade"></div>
                    <div class="form-group"><label>Peso (kg)</label><input type="number" class="pet-peso"></div>
                    <div class="form-group"><label>Sexo*</label><select class="pet-sexo" required><option value="Macho">Macho</option><option value="Fêmea">Fêmea</option></select></div>
                    <div class="form-group"><label>Porte*</label><select class="pet-porte" required><option value="Mini">Mini</option><option value="Pequeno">Pequeno</option><option value="Medio">Médio</option></select></div>

                    <div class="form-group full-width"><label>Serviço Principal*</label><select class="pet-servico-principal" required><option value="">Carregando...</option></select></div>
                    <div class="adicionais-container"></div>
                </div>
            </div>
        `;
        petsContainer.insertAdjacentHTML('beforeend', petFormHTML);

        const novoPetForm = document.getElementById(petId);
        carregarRacasParaPet(novoPetForm.querySelector('.pet-raca'));
        carregarServicosPrincipaisParaPet(novoPetForm.querySelector('.pet-servico-principal'));
        carregarServicosAdicionaisParaPet(novoPetForm.querySelector('.adicionais-container'), petId);
    }

    async function carregarDadosIniciais() {
        if (selectBairroCliente) {
            const { data: bairros } = await supabase.from('bairros').select('nome').order('nome');
            if (bairros) {
                selectBairroCliente.innerHTML = '<option value="">Selecione seu bairro</option>';
                bairros.forEach(b => selectBairroCliente.innerHTML += `<option value="${b.nome}">${b.nome}</option>`);
            }
        }
        adicionarFormularioPet();
    }

    async function atualizarHorariosDisponiveis() {
        const dataSelecionada = inputData.value;
        if (!dataSelecionada) return;
        horariosContainer.innerHTML = '<p>Verificando horários...</p>';
        const dataObj = new Date(dataSelecionada + 'T12:00:00');
        const diaDaSemana = dataObj.getDay();

        const { data: horariosPadrao } = await supabase.from('horarios_padrao').select('horarios').eq('dia_semana', diaDaSemana).eq('ativo', true).single();
        if (!horariosPadrao || !horariosPadrao.horarios || horariosPadrao.horarios.length === 0) {
            horariosContainer.innerHTML = '<p class="horario-indisponivel">Desculpe, não há atendimento neste dia.</p>';
            return;
        }
        const todosOsSlots = horariosPadrao.horarios;
        const inicioDoDia = new Date(dataObj); inicioDoDia.setHours(0, 0, 0, 0);
        const fimDoDia = new Date(dataObj); fimDoDia.setHours(23, 59, 59, 999);

        const { data: agendamentos } = await supabase.from('agendamentos').select('data_hora_inicio').gte('data_hora_inicio', inicioDoDia.toISOString()).lte('data_hora_inicio', fimDoDia.toISOString()).in('status', ['confirmado', 'pendente', 'Agendado', 'Realizado']);
        const horariosOcupados = (agendamentos || []).map(ag => new Date(ag.data_hora_inicio).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }));
        const horariosLivres = todosOsSlots.filter(horario => !horariosOcupados.includes(horario));
        if (horariosLivres.length === 0) {
            horariosContainer.innerHTML = '<p class="horario-indisponivel">Todos os horários para este dia foram preenchidos.</p>';
            return;
        }
        horariosContainer.innerHTML = '';
        horariosLivres.forEach(horario => horariosContainer.innerHTML += `<button type="button" class="horario-btn">${horario}</button>`);
    }

    if (selectTeleBusca && avisoTeleBusca) {
        selectTeleBusca.addEventListener('change', () => {
            if (selectTeleBusca.value === 'sim') {
                avisoTeleBusca.style.display = 'flex';
            } else {
                avisoTeleBusca.style.display = 'none';
            }
        });
    }

    if (btnAddPet) btnAddPet.addEventListener('click', adicionarFormularioPet);

    if (petsContainer) {
        petsContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-remove-pet')) {
                if (petsContainer.querySelectorAll('.pet-form-template').length > 1) {
                    e.target.closest('.pet-form-template').remove();
                } else {
                    alert('É necessário cadastrar pelo menos um pet.');
                }
            }
        });
    }
    
    if (inputData) inputData.addEventListener('change', atualizarHorariosDisponiveis);

    if (horariosContainer) {
        horariosContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('horario-btn')) {
                const numPets = document.querySelectorAll('.pet-form-template').length;
                const horariosSelecionados = document.querySelectorAll('.horario-btn.selected').length;
                
                if (e.target.classList.contains('selected')) {
                    e.target.classList.remove('selected');
                } else if (horariosSelecionados < numPets) {
                    e.target.classList.add('selected');
                } else {
                    alert('Você deve selecionar um horário para cada pet. Remova um pet ou desmarque um horário para selecionar outro.');
                }
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const petForms = document.querySelectorAll('.pet-form-template');
            const horariosSelecionados = document.querySelectorAll('.horario-btn.selected');
            
            if (petForms.length !== horariosSelecionados.length) {
                alert('É necessário selecionar um horário para cada pet. Por favor, selecione ' + petForms.length + ' horários.');
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Solicitação de Agendamento';
                return;
            }

            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';

            try {
                // --- 1. Dados do Cliente ---
                const dadosClienteForm = {
                    nome: document.getElementById('cliente-nome').value,
                    telefone: document.getElementById('cliente-telefone').value,
                    email: document.getElementById('cliente-email').value || null,
                    cpf: document.getElementById('cliente-cpf').value || null,
                    endereco: document.getElementById('cliente-endereco').value,
                    bairro: document.getElementById('cliente-bairro').value
                };
                
                let clienteId;
                const { data: clienteExistente } = await supabase
                    .from('clientes')
                    .select('id')
                    .or(`telefone.eq.${dadosClienteForm.telefone},cpf.eq.${dadosClienteForm.cpf}`)
                    .limit(1)
                    .single();

                if (clienteExistente) {
                    clienteId = clienteExistente.id; // mantemos como string
                } else {
                    const { data: novoCliente, error: createClientError } = await supabase
                        .from('clientes')
                        .insert({ ...dadosClienteForm, status: 'pendente' })
                        .select('id')
                        .single();
                    if (createClientError) throw new Error('Erro ao criar seu cadastro: ' + createClientError.message);
                    clienteId = novoCliente.id;
                }
                
                // --- 2. Coleta dados de todos os pets e serviços ---
                const petsParaSalvar = [];
                for (const formPet of petForms) {
                    const servicoPrincipalId = formPet.querySelector('.pet-servico-principal').value;
                    const adicionaisIds = Array.from(formPet.querySelectorAll('.pet-servico-adicional:checked')).map(cb => cb.value);
                    const todosServicosIds = [servicoPrincipalId, ...adicionaisIds].filter(id => id);

                    if (todosServicosIds.length === 0) {
                        alert('Por favor, selecione pelo menos um serviço para cada pet.');
                        submitButton.disabled = false;
                        submitButton.textContent = 'Enviar Solicitação de Agendamento';
                        return;
                    }
                    
                    petsParaSalvar.push({
                        nome: formPet.querySelector('.pet-nome').value,
                        raca: formPet.querySelector('.pet-raca').value,
                        idade: formPet.querySelector('.pet-idade').value || null,
                        peso: formPet.querySelector('.pet-peso').value || null,
                        sexo: formPet.querySelector('.pet-sexo').value,
                        porte: formPet.querySelector('.pet-porte').value,
                        servicos_ids: todosServicosIds
                    });
                }
                
                // --- 3. Calcula o valor total antes de criar o agendamento ---
                const servicosSelecionadosIds = petsParaSalvar.flatMap(p => p.servicos_ids);
                
                const { data: servicosComValor } = await supabase
                    .from('servicos')
                    .select('id, valor')
                    .in('id', servicosSelecionadosIds);
                const valoresServicos = new Map((servicosComValor || []).map(s => [String(s.id), s.valor]));

                let valorTotal = 0;
                servicosSelecionadosIds.forEach(id => {
                    valorTotal += Number(valoresServicos.get(String(id)) || 0);
                });
                
                if (selectTeleBusca.value === 'sim') {
                    const { data: bairro } = await supabase
                        .from('bairros')
                        .select('valor_tele_busca')
                        .eq('nome', dadosClienteForm.bairro)
                        .single();
                    if (bairro) {
                        valorTotal += bairro.valor_tele_busca || 0;
                    }
                }
                
                // --- 4. Cria o ÚNICO agendamento ---
                const horarioPrincipal = horariosSelecionados[0].textContent; // Pega o primeiro horário selecionado
                // Monta ISO com timezone - assumimos local -03:00 (Brasil) — já fazia antes, mantemos
                const dataHoraCompleta = `${inputData.value}T${horarioPrincipal}:00-03:00`;
                const agendamentoData = {
                    cliente_id: clienteId,
                    data_hora_inicio: dataHoraCompleta,
                    status: 'pendente',
                    valor_cobrado: valorTotal,
                    tipo_entrega: selectTeleBusca.value === 'sim' ? 'Busca-e-Entrega' : 'Cliente Traz',
                    observacoes: 'Solicitação de agendamento via site.'
                };

                const { data: novoAgendamento, error: createAgendamentoError } = await supabase
                    .from('agendamentos')
                    .insert(agendamentoData)
                    .select('id')
                    .single();
                if (createAgendamentoError) throw new Error('Erro ao criar o agendamento: ' + createAgendamentoError.message);

                // --- 5. Cria todos os pets e seus detalhes ---
                const detalhesParaInserir = [];
                for (const pet of petsParaSalvar) {
                    const dadosPet = {
                        nome: pet.nome,
                        raca: pet.raca,
                        idade: pet.idade || null,
                        peso: pet.peso || null,
                        sexo: pet.sexo,
                        porte: pet.porte,
                        cliente_id: clienteId
                    };
                    const { data: novoPet, error: createPetError } = await supabase
                        .from('pets')
                        .insert(dadosPet)
                        .select('id')
                        .single();
                    if (createPetError) throw new Error(`Erro ao cadastrar o pet ${pet.nome}: ` + createPetError.message);

                    pet.servicos_ids.forEach(servicoId => {
                         detalhesParaInserir.push({ agendamento_id: novoAgendamento.id, pet_id: novoPet.id, servico_id: servicoId });
                    });
                }
                
                const { error: createDetalheError } = await supabase.from('agendamento_detalhes').insert(detalhesParaInserir);
                if (createDetalheError) throw new Error('Erro ao registrar os serviços do agendamento: ' + createDetalheError.message);

                alert('Solicitação de agendamento enviada com sucesso! Seus dados serão analisados e entraremos em contato para confirmar.');
                form.reset();
                petsContainer.innerHTML = '';
                adicionarFormularioPet();
                atualizarHorariosDisponiveis();

            } catch (error) {
                alert('Falha na solicitação: ' + (error.message || error));
            } finally {
                submitButton.disabled = false;
                submitButton.textContent = 'Enviar Solicitação de Agendamento';
            }
        });
    }

    // --- INICIALIZAÇÃO ---
    carregarDadosIniciais();
});