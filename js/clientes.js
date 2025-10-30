// petshop-site/js/clientes.js
// Ajustado para nomes do banco (snake_case), tratamento de erros UNIQUE pelas constraints,
// uso de IDs como strings e normalização de arrays/datas.

import { supabase } from './supabase-config.js';
import { mostrarSucesso, mostrarErro } from './notificacoes.js';

export function setupClientes() {
    const formCadastrarClientePet = document.getElementById('form-cadastrar-cliente-pet');
    const tabelaClientesBody = document.querySelector('#tabela-clientes tbody');
    const btnAddPet = document.getElementById('btn-add-pet');
    const petsContainer = document.getElementById('pets-container');
    const editModal = document.getElementById('edit-client-modal');
    const viewPetsModal = document.getElementById('view-pets-modal');
    const formEditarCliente = document.getElementById('form-editar-cliente');
    const petsModalBody = document.getElementById('pets-modal-body');
    const petsModalOwnerName = document.getElementById('pets-modal-owner-name');
    const editPetsContainer = document.getElementById('edit-pets-container');
    const btnAddPetNoModal = document.getElementById('btn-add-pet-no-modal');
    const modalHistorico = document.getElementById('modal-historico-cliente');
    const historicoContainer = document.getElementById('historico-timeline-container');
    const historicoNomeCliente = document.getElementById('historico-cliente-nome');
    const tabelaClientesPendentesBody = document.querySelector('#tabela-clientes-pendentes tbody');
    const contadorClientesPendentes = document.getElementById('contador-clientes-pendentes');
    const btnRefreshClientesPendentes = document.getElementById('btn-refresh-clientes-pendentes');
    const btnExportarClientes = document.getElementById('btn-exportar-clientes');

    let petCounter = 0;
    let listaRacas = [];

    if (btnRefreshClientesPendentes) {
        btnRefreshClientesPendentes.addEventListener('click', async () => {
            const icon = btnRefreshClientesPendentes.querySelector('i');
            icon.classList.add('spin');
            btnRefreshClientesPendentes.disabled = true;
            await carregarClientesPendentes();
            setTimeout(() => {
                icon.classList.remove('spin');
                btnRefreshClientesPendentes.disabled = false;
            }, 500);
        });
    }

    const btnRefreshClientes = document.getElementById('btn-refresh-clientes');
    if (btnRefreshClientes) {
        btnRefreshClientes.addEventListener('click', async () => {
            const icon = btnRefreshClientes.querySelector('i');
            icon.classList.add('spin');
            btnRefreshClientes.disabled = true;
            await carregarClientes();
            setTimeout(() => {
                icon.classList.remove('spin');
                btnRefreshClientes.disabled = false;
            }, 500);
        });
    }

    async function carregarBairros() {
        const selectBairro = document.getElementById('cliente-bairro');
        if (!selectBairro) return;
        const { data: bairros } = await supabase.from('bairros').select('nome').order('nome');
        if (bairros) {
            selectBairro.innerHTML = '<option value="">Selecione um bairro</option>';
            bairros.forEach(b => selectBairro.insertAdjacentHTML('beforeend', `<option value="${b.nome}">${b.nome}</option>`));
        }
    }

    async function carregarRacas() {
        const { data } = await supabase.from('racas').select('nome').order('nome');
        if (data) listaRacas = data;
    }

    async function carregarClientes() {
        if (!tabelaClientesBody) return;

        const { data: clientes, error } = await supabase.from('clientes').select('id, nome, telefone, endereco, pets(count)').order('id', { ascending: true });

        if (error) {
            console.error('Erro ao buscar clientes:', error);
            return;
        }

        tabelaClientesBody.innerHTML = '';

        if (clientes && Array.isArray(clientes)) {
            clientes.forEach(cliente => {
                const petCount = (cliente.pets && cliente.pets[0]) ? cliente.pets[0].count : 0;
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${String(cliente.id).padStart(5, '0')}</td>
                    <td>${cliente.nome}</td>
                    <td>${cliente.telefone || ''}</td>
                    <td>${cliente.endereco || ''}</td>
                    <td>${petCount}</td>
                    <td class="actions-cell">
                        <button class="btn-history" data-id="${cliente.id}" data-name="${cliente.nome}" title="Histórico de Serviços"><i class="fas fa-history"></i></button>
                        <button class="btn-view-pets" data-id="${cliente.id}" data-name="${cliente.nome}" title="Ver Pets"><i class="fas fa-paw"></i></button>
                        <button class="btn-edit" data-id="${cliente.id}" title="Editar Cliente"><i class="fas fa-edit"></i></button>
                        <button class="btn-delete" data-id="${cliente.id}" title="Excluir Cliente"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                tabelaClientesBody.appendChild(tr);
            });
        }
    }

    const adicionarFormularioPet = () => {
        if (!petsContainer) return;
        petCounter++;
        const racasOptions = listaRacas.map(r => `<option value="${r.nome}">${r.nome}</option>`).join('');
        const petFormHTML = `
            <div class="pet-form-template" id="pet-form-${petCounter}">
                <button type="button" class="btn-remove-pet" title="Remover este pet">&times;</button>
                <h4><i class="fas fa-paw"></i> Dados do Pet</h4>
                <div class="form-group"><label>Nome*</label><input type="text" class="pet-nome" required></div>
                <div class="form-group"><label>Raça</label><select class="pet-raca"><option value="">Selecione</option>${racasOptions}<option value="Outra">Outra</option></select></div>
                <div class="form-group"><label>Idade (anos)</label><input type="number" class="pet-idade"></div>
                <div class="form-group"><label>Peso (kg)</label><input type="text" class="pet-peso"></div>
                <div class="form-group"><label>Sexo</label><select class="pet-sexo"><option value="Macho">Macho</option><option value="Fêmea">Fêmea</option></select></div>
                <div class="form-group">
                    <label>Porte</label>
                    <select class="pet-porte">
                        <option value="Mini">Mini</option>
                        <option value="Pequeno">Pequeno</option>
                        <option value="Medio">Médio</option>
                        <option value="Grande">Grande</option>
                    </select>
                </div>
                <div class="form-group full-width"><label>Foto</label><input type="file" class="pet-foto" accept="image/*"></div>
                <div class="form-group full-width"><label>Observações</label><textarea class="pet-obs" rows="2"></textarea></div>
            </div>
        `;
        petsContainer.insertAdjacentHTML('beforeend', petFormHTML);
    };

    if (formCadastrarClientePet) {
        formCadastrarClientePet.addEventListener('submit', async (e) => {
            e.preventDefault();

            const clienteData = {
                nome: document.getElementById('cliente-nome').value.trim(),
                telefone: document.getElementById('cliente-telefone').value.trim(),
                email: document.getElementById('cliente-email').value.trim() || null,
                cpf: document.getElementById('cliente-cpf').value.trim() || null,
                endereco: document.getElementById('cliente-endereco').value.trim(),
                bairro: document.getElementById('cliente-bairro').value
            };

            if (!clienteData.nome) {
                mostrarErro('O nome do cliente é obrigatório.');
                return;
            }

            const { data: novoCliente, error: clienteError } = await supabase
                .from('clientes')
                .insert(clienteData)
                .select()
                .single();

            if (clienteError) {
                const msg = clienteError.message || '';
                if (msg.includes('clientes_cpf_key')) mostrarErro('Erro: O CPF informado já está cadastrado.');
                else if (msg.includes('clientes_email_key')) mostrarErro('Erro: O e-mail informado já está cadastrado.');
                else if (msg.includes('clientes_telefone_key')) mostrarErro('Erro: O telefone informado já está cadastrado.');
                else mostrarErro('Erro ao cadastrar cliente: ' + clienteError.message);
                return;
            }

            const petForms = petsContainer.querySelectorAll('.pet-form-template');
            for (const form of petForms) {
                const fotoFile = form.querySelector('.pet-foto').files[0];
                let fotoUrl = null;

                if (fotoFile) {
                    const filePath = `pets_fotos/${novoCliente.id}-${Date.now()}-${fotoFile.name}`;
                    const { error: uploadError } = await supabase.storage.from('petshop-assets').upload(filePath, fotoFile);
                    if (!uploadError) {
                        const { data } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
                        fotoUrl = data.publicUrl;
                    } else {
                        console.error('Erro no upload da foto:', uploadError.message);
                    }
                }

                await supabase.from('pets').insert({
                    cliente_id: novoCliente.id,
                    nome: form.querySelector('.pet-nome').value,
                    raca: form.querySelector('.pet-raca').value,
                    idade: form.querySelector('.pet-idade').value || null,
                    peso: form.querySelector('.pet-peso').value,
                    sexo: form.querySelector('.pet-sexo').value,
                    porte: form.querySelector('.pet-porte').value,
                    observacoes: form.querySelector('.pet-obs').value,
                    foto_url: fotoUrl
                });
            }

            mostrarSucesso('Cliente e pets cadastrados com sucesso!');
            formCadastrarClientePet.reset();
            petsContainer.innerHTML = '';
            adicionarFormularioPet();
            await carregarClientes();
        });
    }

    if (tabelaClientesBody) {
        tabelaClientesBody.addEventListener('click', async (e) => {
            const viewBtn = e.target.closest('.btn-view-pets');
            const editBtn = e.target.closest('.btn-edit');
            const deleteBtn = e.target.closest('.btn-delete');
            const historyBtn = e.target.closest('.btn-history');

            if (viewBtn) {
                const clienteId = viewBtn.dataset.id;
                const { data: pets, error } = await supabase.from('pets').select('*').eq('cliente_id', clienteId);
                if (error) { mostrarErro('Erro ao buscar pets.'); return; }

                petsModalOwnerName.textContent = viewBtn.dataset.name;
                petsModalBody.innerHTML = pets.length === 0 ? '<p>Este cliente não possui pets cadastrados.</p>' : '';
                pets.forEach(pet => {
                    petsModalBody.innerHTML += `
                        <div class="pet-card">
                            <img src="${pet.foto_url || 'images/default-pet-avatar.png'}" alt="Foto do Pet">
                            <h4>${pet.nome}</h4>
                            <p><strong>Raça:</strong> ${pet.raca || 'N/A'}</p>
                            <p><strong>Idade:</strong> ${pet.idade ? pet.idade + ' anos' : 'N/A'}</p>
                            <p><strong>Peso:</strong> ${pet.peso || 'N/A'}</p>
                            <p><strong>Sexo:</strong> ${pet.sexo || 'N/A'}</p>
                            <p><strong>Porte:</strong> ${pet.porte || 'N/A'}</p>
                            <div class="pet-card-obs"><p><strong>Obs:</strong> ${pet.observacoes || 'Nenhuma'}</p></div>
                        </div>
                    `;
                });
                viewPetsModal.style.display = 'block';
            }

            if (editBtn) {
                const clienteId = editBtn.dataset.id;
                const { data: cliente } = await supabase.from('clientes').select('*').eq('id', clienteId).single();
                if (cliente) {
                    document.getElementById('edit-cliente-id').value = cliente.id;
                    document.getElementById('edit-cliente-nome').value = cliente.nome;
                    document.getElementById('edit-cliente-telefone').value = cliente.telefone;
                    document.getElementById('edit-cliente-email').value = cliente.email;
                    document.getElementById('edit-cliente-cpf').value = cliente.cpf;
                    document.getElementById('edit-cliente-endereco').value = cliente.endereco;
                }

                editPetsContainer.innerHTML = 'Carregando pets...';
                const { data: pets } = await supabase.from('pets').select('*').eq('cliente_id', clienteId);
                editPetsContainer.innerHTML = '';
                if (pets) pets.forEach(pet => gerarFormularioPetEdicao(pet));
                editModal.style.display = 'block';
            }

            if (deleteBtn) {
                const clienteId = deleteBtn.dataset.id;
                if (confirm('Tem certeza? Excluir um cliente também removerá todos os seus pets e fotos permanentemente.')) {
                    const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
                    if (error) mostrarErro('Erro ao excluir: ' + error.message);
                    else { mostrarSucesso('Cliente excluído!'); await carregarClientes(); }
                }
            }

            if (historyBtn) {
                const clienteId = historyBtn.dataset.id;
                const clienteNome = historyBtn.dataset.name;
                await carregarHistoricoCliente(clienteId, clienteNome);
            }
        });
    }

    const gerarFormularioPetEdicao = (pet = {}) => {
        const petId = pet.id || `new-${Date.now()}`;
        const racasOptions = listaRacas.map(r => `<option value="${r.nome}" ${pet.raca === r.nome ? 'selected' : ''}>${r.nome}</option>`).join('');
        const formHTML = `
            <form class="dashboard-form edit-pet-form" data-pet-id="${petId}">
                <input type="hidden" class="pet-id-input" value="${pet.id || ''}">
                <div class="form-group full-width" style="text-align: center;">
                    <img src="${pet.foto_url || 'images/default-pet-avatar.png'}" alt="Foto do Pet" class="pet-photo-preview" style="max-width: 120px; height: 120px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
                </div>
                <div class="form-group"><label>Nome</label><input type="text" class="edit-pet-nome" value="${pet.nome || ''}" required></div>
                <div class="form-group"><label>Raça</label><select class="edit-pet-raca">${racasOptions}<option value="Outra" ${pet.raca === 'Outra' ? 'selected' : ''}>Outra</option></select></div>
                <div class="form-group"><label>Idade</label><input type="number" class="edit-pet-idade" value="${pet.idade || ''}"></div>
                <div class="form-group"><label>Peso</label><input type="text" class="edit-pet-peso" value="${pet.peso || ''}"></div>
                <div class="form-group"><label>Sexo</label>
                    <select class="edit-pet-sexo">
                        <option value="Macho" ${pet.sexo === 'Macho' ? 'selected' : ''}>Macho</option>
                        <option value="Fêmea" ${pet.sexo === 'Fêmea' ? 'selected' : ''}>Fêmea</option>
                    </select>
                </div>
                <div class="form-group"><label>Porte</label>
                    <select class="edit-pet-porte">
                        <option value="Mini" ${pet.porte === 'Mini' ? 'selected' : ''}>Mini</option>
                        <option value="Pequeno" ${pet.porte === 'Pequeno' ? 'selected' : ''}>Pequeno</option>
                        <option value="Medio" ${pet.porte === 'Medio' ? 'selected' : ''}>Médio</option>
                        <option value="Grande" ${pet.porte === 'Grande' ? 'selected' : ''}>Grande</option>
                    </select>
                </div>
                <div class="form-group full-width"><label>Observações</label><textarea class="edit-pet-obs" rows="2">${pet.observacoes || ''}</textarea></div>
                <div class="form-group full-width"><label>Alterar Foto</label><input type="file" class="edit-pet-foto-input" accept="image/*"></div>
                <div class="actions-cell">
                    <button type="button" class="btn-delete-pet btn-delete">Excluir Pet</button>
                    <button type="submit" class="btn-save-pet btn-principal">Salvar Pet</button>
                </div>
            </form>
        `;
        editPetsContainer.insertAdjacentHTML('beforeend', formHTML);
    };

    if (btnAddPetNoModal) btnAddPetNoModal.addEventListener('click', () => gerarFormularioPetEdicao());

    if (editPetsContainer) {
        editPetsContainer.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!e.target.classList.contains('edit-pet-form')) return;

            const form = e.target;
            const petId = form.querySelector('.pet-id-input').value;
            const clienteId = document.getElementById('edit-cliente-id').value;

            let petData = {
                nome: form.querySelector('.edit-pet-nome').value,
                raca: form.querySelector('.edit-pet-raca').value,
                idade: form.querySelector('.edit-pet-idade').value || null,
                peso: form.querySelector('.edit-pet-peso').value,
                sexo: form.querySelector('.edit-pet-sexo').value,
                porte: form.querySelector('.edit-pet-porte').value,
                observacoes: form.querySelector('.edit-pet-obs').value,
                cliente_id: clienteId
            };

            const fotoFile = form.querySelector('.edit-pet-foto-input').files[0];
            if (fotoFile) {
                const filePath = `pets_fotos/${clienteId}-${petId || Date.now()}-${fotoFile.name}`;
                const { error: uploadError } = await supabase.storage.from('petshop-assets').upload(filePath, fotoFile, { upsert: true });
                if (uploadError) { alert('Erro no upload da foto: ' + uploadError.message); return; }
                const { data } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
                petData.foto_url = data.publicUrl;
            }

            if (petId) {
                const { error } = await supabase.from('pets').update(petData).eq('id', petId);
                if (error) mostrarErro('Erro ao atualizar pet: ' + error.message);
                else mostrarSucesso('Pet atualizado com sucesso!');
            } else {
                const { data: newPet, error } = await supabase.from('pets').insert(petData).select().single();
                if (error) mostrarErro('Erro ao salvar novo pet: ' + error.message);
                else {
                    mostrarSucesso('Novo pet salvo com sucesso!');
                    form.querySelector('.pet-id-input').value = newPet.id;
                }
            }
        });

        editPetsContainer.addEventListener('click', async (e) => {
            if (e.target.classList.contains('btn-delete-pet')) {
                if (!confirm('Tem certeza que deseja excluir este pet?')) return;
                const form = e.target.closest('.edit-pet-form');
                const petId = form.querySelector('.pet-id-input').value;
                if (petId) {
                    const { error } = await supabase.from('pets').delete().eq('id', petId);
                    if (error) mostrarErro('Erro ao excluir pet: ' + error.message);
                    else { mostrarSucesso('Pet excluído com sucesso!'); form.remove(); }
                } else form.remove();
            }
        });
    }

    if (formEditarCliente) {
        formEditarCliente.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-cliente-id').value;
            const { error } = await supabase.from('clientes').update({
                nome: document.getElementById('edit-cliente-nome').value,
                telefone: document.getElementById('edit-cliente-telefone').value,
                email: document.getElementById('edit-cliente-email').value,
                cpf: document.getElementById('edit-cliente-cpf').value,
                endereco: document.getElementById('edit-cliente-endereco').value,
            }).eq('id', id);

            if (error) mostrarErro('Erro ao salvar cliente: ' + error.message);
            else {
                mostrarSucesso('Dados do cliente atualizados!');
                editModal.style.display = 'none';
                await carregarClientes();
            }
        });
    }

    document.addEventListener('click', e => {
        if (e.target.classList.contains('btn-remove-pet')) e.target.closest('.pet-form-template, .edit-pet-form').remove();
    });

    if (btnAddPet) btnAddPet.addEventListener('click', adicionarFormularioPet);

    async function carregarHistoricoCliente(clienteId, clienteNome) {
        if (!modalHistorico || !historicoContainer || !historicoNomeCliente) return;
        historicoNomeCliente.textContent = clienteNome;
        historicoContainer.innerHTML = '<p>Carregando histórico...</p>';
        modalHistorico.style.display = 'block';

        const { data: agendamentos, error } = await supabase
            .from('agendamentos')
            .select(`
                id,
                data_hora_inicio,
                valor_cobrado,
                status,
                agendamento_detalhes (
                    pets (nome),
                    servicos (nome)
                )
            `)
            .eq('cliente_id', clienteId)
            .order('data_hora_inicio', { ascending: false });

        if (error) {
            historicoContainer.innerHTML = '<p class="error">Erro ao carregar o histórico.</p>';
            console.error(error);
            return;
        }

        if (!agendamentos || agendamentos.length === 0) {
            historicoContainer.innerHTML = '<p>Nenhum serviço registrado para este cliente.</p>';
            return;
        }

        historicoContainer.innerHTML = '';
        agendamentos.forEach(ag => {
            const dataAgendamento = new Date(ag.data_hora_inicio);
            const petsServicos = {};
            (ag.agendamento_detalhes || []).forEach(detalhe => {
                const petNome = detalhe.pets?.nome || 'Pet Removido';
                if (!petsServicos[petNome]) petsServicos[petNome] = [];
                petsServicos[petNome].push(detalhe.servicos?.nome || 'Serviço Removido');
            });
            const timelineItem = `
                <div class="timeline-item">
                    <div class="timeline-icon"><i class="fas fa-cut"></i></div>
                    <span class="timeline-date">${dataAgendamento.toLocaleDateString('pt-BR')} às ${dataAgendamento.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</span>
                    <div class="timeline-content">
                        <h4>Agendamento #${String(ag.id).padStart(5, '0')}</h4>
                        ${Object.entries(petsServicos).map(([pet, servicos]) => `
                            <div>
                                <p><strong>Pet:</strong> ${pet}</p>
                                <ul class="servicos-list-timeline">
                                    ${servicos.map(s => `<li>${s}</li>`).join('')}
                                </ul>
                            </div>
                        `).join('')}
                        <hr style="margin: 0.5rem 0;">
                        <p><strong>Status:</strong> <span class="status-badge status-${(ag.status || 'agendado').toLowerCase()}">${ag.status}</span></p>
                        <p><strong>Valor Total:</strong> R$ ${ag.valor_cobrado ? ag.valor_cobrado.toFixed(2) : '0.00'}</p>
                    </div>
                </div>
            `;
            historicoContainer.innerHTML += timelineItem;
        });
    }

    async function carregarClientesPendentes() {
        if (!tabelaClientesPendentesBody) return;

        const { data: clientes, error } = await supabase
            .from('clientes')
            .select('*')
            .eq('status', 'pendente')
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Erro ao carregar clientes pendentes:', error);
            tabelaClientesPendentesBody.innerHTML = `<tr><td colspan="5">Erro ao carregar dados.</td></tr>`;
            return;
        }

        if (contadorClientesPendentes) {
            if ((clientes || []).length > 0) {
                contadorClientesPendentes.textContent = clientes.length;
                contadorClientesPendentes.style.display = 'flex';
            } else contadorClientesPendentes.style.display = 'none';
        }

        if (!clientes || clientes.length === 0) {
            tabelaClientesPendentesBody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Nenhum cliente pendente no momento.</td></tr>`;
            return;
        }

        tabelaClientesPendentesBody.innerHTML = '';
        clientes.forEach(cliente => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${cliente.nome}</td>
                <td>${cliente.telefone}</td>
                <td>${cliente.email || '-'}</td>
                <td>${cliente.endereco || '-'}, ${cliente.bairro || ''}</td>
                <td class="actions-cell">
                    <button class="btn-approve" data-id="${cliente.id}" title="Aprovar Cadastro"><i class="fas fa-check-circle"></i></button>
                    <button class="btn-reject btn-delete" data-id="${cliente.id}" title="Rejeitar Cadastro"><i class="fas fa-user-times"></i></button>
                </td>
            `;
            tabelaClientesPendentesBody.appendChild(tr);
        });
    }

    if (tabelaClientesPendentesBody) {
        tabelaClientesPendentesBody.addEventListener('click', async (e) => {
            const approveBtn = e.target.closest('.btn-approve');
            const rejectBtn = e.target.closest('.btn-reject');

            if (approveBtn) {
                const clienteId = approveBtn.dataset.id;
                if (confirm('Deseja aprovar o cadastro deste cliente?')) {
                    const { error } = await supabase.from('clientes').update({ status: 'ativo' }).eq('id', clienteId);
                    if (error) alert('Erro ao aprovar cliente: ' + error.message);
                    else { alert('Cliente aprovado com sucesso!'); await carregarClientesPendentes(); await carregarClientes(); }
                }
            }

            if (rejectBtn) {
                const clienteId = rejectBtn.dataset.id;
                if (confirm('ATENÇÃO: Rejeitar este cadastro irá excluir o cliente, seus pets e os agendamentos pendentes associados. Deseja continuar?')) {
                    await supabase.from('agendamentos').update({ status: 'cancelado' }).eq('cliente_id', clienteId).eq('status', 'pendente');
                    const { error } = await supabase.from('clientes').delete().eq('id', clienteId);
                    if (error) alert('Erro ao rejeitar cadastro: ' + error.message);
                    else { alert('Cadastro rejeitado e excluído com sucesso.'); await carregarClientesPendentes(); }
                }
            }
        });
    }

    async function exportarClientesParaCSV() {
        const { data: clientes, error } = await supabase.from('clientes').select(`
            id, nome, telefone, email, cpf, endereco, bairro,
            pets(nome, raca)
        `).order('nome');

        if (error) {
            console.error('Erro ao exportar clientes:', error);
            alert('Não foi possível exportar a lista de clientes.');
            return;
        }

        if (!clientes || clientes.length === 0) {
            alert('Nenhum cliente para exportar.');
            return;
        }

        const csvRows = [];
        const headers = ['ID', 'Nome', 'Telefone', 'E-mail', 'CPF', 'Endereço', 'Bairro', 'Pets (Nome - Raça)'];
        csvRows.push(headers.join(';'));

        for (const cliente of clientes) {
            const petsInfo = (cliente.pets || []).map(p => `${p.nome} - ${p.raca}`).join(', ');
            const row = [
                cliente.id,
                `"${cliente.nome}"`,
                cliente.telefone || '',
                cliente.email || '',
                cliente.cpf || '',
                `"${cliente.endereco}"` || '',
                `"${cliente.bairro}"` || '',
                `"${petsInfo}"`
            ];
            csvRows.push(row.join(';'));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'lista_clientes.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    if (btnExportarClientes) btnExportarClientes.addEventListener('click', exportarClientesParaCSV);

    async function init() {
        await carregarRacas();
        await carregarBairros();
        await carregarClientes();
        await carregarClientesPendentes();
        adicionarFormularioPet();
    }
    init();
}