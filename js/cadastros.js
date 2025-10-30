import { supabase } from './supabase-config.js';
import { mostrarSucesso, mostrarErro } from './notificacoes.js';

export function setupCadastros() {
    // --- Variáveis para Bairros ---
    const tabelaBairrosBody = document.querySelector('#tabela-bairros tbody');
    const formBairro = document.getElementById('form-cadastrar-bairro');
    const modalEditarBairro = document.getElementById('modal-editar-bairro');
    const formEditarBairro = document.getElementById('form-editar-bairro');
    const tabelaRacasBody = document.querySelector('#tabela-racas tbody');
    const formRaca = document.getElementById('form-cadastrar-raca');
    const racasDropdowns = document.querySelectorAll('.pet-raca, .edit-pet-raca');
    const modalEditarRaca = document.getElementById('modal-editar-raca');
    const formEditarRaca = document.getElementById('form-editar-raca');
    const tabelaServicosBody = document.querySelector('#tabela-servicos tbody');
    const formCadastrarServico = document.getElementById('form-cadastrar-servico');
    const produtoSelect = document.getElementById('produto-select');
    const produtosUtilizadosTbody = document.getElementById('produtos-utilizados-tbody');
    const custoTotalInput = document.getElementById('servico-custo-total');
    const modalEditarServico = document.getElementById('edit-service-modal');
    const formEditarServico = document.getElementById('form-editar-servico');
    const editProdutoSelect = document.getElementById('edit-produto-select');
    const editProdutosUtilizadosTbody = document.getElementById('edit-produtos-utilizados-tbody');
    const editCustoTotalInput = document.getElementById('edit-servico-custo-total');
    let produtosDisponiveis = [];
    let servicosAdicionaisCache = [];
    const tabelaFornecedoresBody = document.querySelector('#tabela-fornecedores tbody');
    const formFornecedor = document.getElementById('form-cadastrar-fornecedor');
    const modalEditarFornecedor = document.getElementById('modal-editar-fornecedor');
    const formEditarFornecedor = document.getElementById('form-editar-fornecedor');
    const formCadastrarStory = document.getElementById('form-cadastrar-story');
    const storiesGridAdmin = document.getElementById('stories-grid-admin');
    const btnRefreshServicos = document.getElementById('btn-refresh-servicos');
    const tabelaPagamentosBody = document.querySelector('#tabela-pagamentos tbody');
    const formPagamento = document.getElementById('form-cadastrar-pagamento');
    const modalEditarPagamento = document.getElementById('modal-editar-pagamento');
    const formEditarPagamento = document.getElementById('form-editar-pagamento');
    const formGerenciarHorarios = document.getElementById('form-gerenciar-horarios');

 
    // ====== FORMAS DE PAGAMENTO ======== //
    async function carregarTabelaPagamentos() {
        if (!tabelaPagamentosBody) return;
        const { data: formas, error } = await supabase.from('formas_pagamento').select('*').order('nome');
        if (error) { mostrarErro('Erro ao carregar formas de pagamento.'); return; }
        tabelaPagamentosBody.innerHTML = '';
        if (formas && Array.isArray(formas)) { // <-- CORREÇÃO
            formas.forEach(f => {
                const taxaFormatada = (typeof f.taxa_percentual === 'number') ? f.taxa_percentual.toFixed(2) + '%' : '0.00%';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${f.nome}</td><td>${taxaFormatada}</td><td class="actions-cell"><button class="btn-edit-pagamento btn-edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete-pagamento btn-delete" data-id="${f.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaPagamentosBody.appendChild(tr);
            });
        }
    }

    if (formPagamento) {
        formPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('pagamento-nome').value.trim();
            const taxa = parseFloat(document.getElementById('pagamento-taxa').value.replace(',', '.')) || 0;

            if (!nome) {
                mostrarErro('O nome da forma de pagamento é obrigatório.');
                return;
            }

            const { error } = await supabase.from('formas_pagamento').insert({ nome, taxa_percentual: taxa });
            if (error) {
                // VERIFICA SE O ERRO É DE NOME DUPLICADO
                if (error.message.includes('formas_pagamento_nome_key')) {
                    mostrarErro(`A forma de pagamento "${nome}" já está cadastrada.`);
                } else {
                    // MOSTRA OUTROS ERROS GENÉRICOS
                    mostrarErro('Erro ao salvar: ' + error.message);
                }
            } else {
                mostrarSucesso('Forma de pagamento salva com sucesso!');
                formPagamento.reset();
                await carregarTabelaPagamentos();
            }
        });
    }
    
    if (tabelaPagamentosBody) {
        tabelaPagamentosBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit-pagamento');
            const deleteBtn = e.target.closest('.btn-delete-pagamento');

            if (editBtn) {
                const id = editBtn.dataset.id;
                const { data: f, error } = await supabase.from('formas_pagamento').select('*').eq('id', id).single();
                if (error || !f) {
                    mostrarErro('Erro ao buscar dados.');
                    return;
                }
                document.getElementById('edit-pagamento-id').value = f.id;
                document.getElementById('edit-pagamento-nome').value = f.nome;
                document.getElementById('edit-pagamento-taxa').value = f.taxa_percentual;
                modalEditarPagamento.style.display = 'block';
            }

            if (deleteBtn) {
                if (confirm('Tem certeza que deseja excluir esta forma de pagamento?')) {
                    const { error } = await supabase.from('formas_pagamento').delete().eq('id', deleteBtn.dataset.id);
                    if (error) {
                        mostrarErro('Erro ao excluir: ' + error.message);
                    } else {
                        mostrarSucesso('Excluído com sucesso!');
                        await carregarTabelaPagamentos();
                    }
                }
            }
        });
    }

    if (formEditarPagamento) {
        formEditarPagamento.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-pagamento-id').value;
            const nome = document.getElementById('edit-pagamento-nome').value.trim();
            const taxa = parseFloat(document.getElementById('edit-pagamento-taxa').value.replace(',', '.')) || 0;

            const { error } = await supabase.from('formas_pagamento').update({ nome, taxa_percentual: taxa }).eq('id', id);
            if (error) {
                mostrarErro('Erro ao atualizar: ' + error.message);
            } else {
                mostrarSucesso('Atualizado com sucesso!');
                modalEditarPagamento.style.display = 'none';
                await carregarTabelaPagamentos();
            }
        });
    }

    if (btnRefreshServicos) {
        btnRefreshServicos.addEventListener('click', async () => {
            const icon = btnRefreshServicos.querySelector('i');
            icon.classList.add('spin');
            btnRefreshServicos.disabled = true;
            await carregarServicos();
            setTimeout(() => {
                icon.classList.remove('spin');
                btnRefreshServicos.disabled = false;
            }, 500);
        });
    }

    // --- LÓGICA PARA PRÉ-VISUALIZAÇÃO DE IMAGENS (CADASTRO DE SERVIÇO) ---
    const servicoFotosInput = document.getElementById('servico-fotos');
    const servicoFotosPreview = document.getElementById('servico-fotos-preview');

    if (servicoFotosInput && servicoFotosPreview) {
        servicoFotosInput.addEventListener('change', () => {
            servicoFotosPreview.innerHTML = ''; // Limpa a pré-visualização anterior
            const files = servicoFotosInput.files;

            if (files.length > 3) {
                mostrarErro('Você pode selecionar no máximo 3 fotos.');
                servicoFotosInput.value = ''; // Limpa os arquivos selecionados
                return;
            }

            for (const file of files) {
                const reader = new FileReader();

                reader.onload = function(e) {
                    const previewItem = document.createElement('div');
                    previewItem.classList.add('preview-item');
                    
                    previewItem.innerHTML = `
                        <img src="${e.target.result}" alt="${file.name}" class="preview-image-thumbnail">
                        <span class="preview-file-name">${file.name}</span>
                        <div class="progress-container">
                            <div class="progress-bar"></div>
                        </div>
                    `;
                    servicoFotosPreview.appendChild(previewItem);
                }
                
                reader.readAsDataURL(file); // Lê o arquivo para gerar a URL da miniatura
            }
        });
    }
    
    // --- Função para Carregar os Stories no Admin ---
    async function carregarStoriesAdmin() {
        if (!storiesGridAdmin) return;
        const { data: stories, error } = await supabase.from('stories').select('*').order('created_at', { ascending: false });
        if (error) { storiesGridAdmin.innerHTML = '<p>Erro ao carregar stories.</p>'; return; }
        if (!stories || stories.length === 0) { storiesGridAdmin.innerHTML = '<p>Nenhum story cadastrado.</p>'; return; } // <-- CORREÇÃO
        storiesGridAdmin.innerHTML = '';
        stories.forEach(story => {
            storiesGridAdmin.innerHTML += `<div class="story-card-admin"><img src="${story.media_url}" alt="Story"><button class="btn-delete-story btn-delete" data-id="${story.id}" data-url="${story.media_url}"><i class="fas fa-trash-alt"></i></button></div>`;
        });
    }

    
    // --- Evento de Envio do Formulário de Novo Story ---

    if (formCadastrarStory) {
        formCadastrarStory.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mediaFile = document.getElementById('story-media').files[0];
            if (!mediaFile) return;

            // Identifica o tipo de mídia
            const mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';

            // 1. Faz o upload da mídia
            const filePath = `stories_media/${Date.now()}-${mediaFile.name}`;
            const { error: uploadError } = await supabase.storage
                .from('petshop-assets')
                .upload(filePath, mediaFile);

            if (uploadError) {
                alert('Erro no upload da mídia: ' + uploadError.message);
                return;
            }

            // 2. Pega a URL pública
            const { data: urlData } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
            
            // 3. Insere a URL e o tipo de mídia na tabela 'stories'
            const { error: insertError } = await supabase
                .from('stories')
                .insert({ 
                    media_url: urlData.publicUrl,
                    media_type: mediaType // Salva se é 'image' ou 'video'
                });

            if (insertError) {
                alert('Erro ao salvar o story: ' + insertError.message);
            } else {
                alert('Story adicionado com sucesso!');
                formCadastrarStory.reset();
                await carregarStoriesAdmin();
            }
        });
    }

    // --- Evento de Clique para Excluir Story ---
    if (storiesGridAdmin) {
        storiesGridAdmin.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.btn-delete-story');
            if (deleteBtn) {
                if (!confirm('Tem certeza que deseja excluir este story?')) return;

                const storyId = deleteBtn.dataset.id;
                const storyUrl = deleteBtn.dataset.url;

                // 1. Deleta o registro da tabela 'stories'
                const { error: deleteDbError } = await supabase
                    .from('stories')
                    .delete()
                    .eq('id', storyId);
                
                if (deleteDbError) {
                    alert('Erro ao deletar o story do banco de dados: ' + deleteDbError.message);
                    return;
                }

                // 2. Deleta o arquivo de imagem do Storage
                try {
                    const filePath = new URL(storyUrl).pathname.split('/petshop-assets/')[1];
                    await supabase.storage.from('petshop-assets').remove([filePath]);
                } catch (storageError) {
                    console.warn("Aviso: Não foi possível remover o arquivo do Storage.", storageError);
                }
                
                alert('Story excluído com sucesso!');
                await carregarStoriesAdmin();
            }
        });
    }

    // ====== BAIRROS ====== //
    async function carregarTabelaBairros() {
        if (!tabelaBairrosBody) return;
        const { data: bairros, error } = await supabase.from('bairros').select('*').order('id');
        if (error) { console.error("Erro ao carregar bairros:", error); return; }
        tabelaBairrosBody.innerHTML = '';
        if (bairros && Array.isArray(bairros)) { // <-- CORREÇÃO
            bairros.forEach(b => {
                const valorFormatado = b.valor_tele_busca ? `R$ ${b.valor_tele_busca.toFixed(2)}` : 'R$ 0.00';
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(b.id).padStart(5, '0')}</td><td>${b.nome}</td><td>${valorFormatado}</td><td class="actions-cell"><button class="btn-edit-bairro btn-edit" data-id="${b.id}" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete-bairro btn-delete" data-id="${b.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaBairrosBody.appendChild(tr);
            });
        }
    }

    if (formBairro) {
        formBairro.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nomeInput = document.getElementById('bairro-nome');
            const valorInput = document.getElementById('bairro-valor-tele');
            const nome = nomeInput.value.trim();
            const valor = parseFloat(valorInput.value.replace(',', '.')) || 0; // Converte para número

            if(!nome) { alert('Por favor, digite o nome do bairro.'); return; }

            const { error } = await supabase.from('bairros').insert({ nome, valor_tele_busca: valor });
            if (error) { alert('Erro ao cadastrar bairro: ' + error.message); } 
            else {
                alert('Bairro cadastrado com sucesso!');
                nomeInput.value = '';
                valorInput.value = '';
                await carregarTabelaBairros();
            }
        });
    }

    if (tabelaBairrosBody) {
        tabelaBairrosBody.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit-bairro');
            const deleteBtn = e.target.closest('.btn-delete-bairro'); // <-- Linha adicionada

            // Lógica para o botão de Editar
            if (editBtn) {
                const bairroId = editBtn.dataset.id;
                const { data: bairro, error } = await supabase.from('bairros').select('*').eq('id', bairroId).single();

                if (error || !bairro) {
                    alert('Erro ao buscar dados do bairro.');
                    return;
                }

                document.getElementById('edit-bairro-id').value = bairro.id;
                document.getElementById('edit-bairro-nome').value = bairro.nome;
                document.getElementById('edit-bairro-valor-tele').value = bairro.valor_tele_busca ? bairro.valor_tele_busca.toFixed(2) : '';

                if (modalEditarBairro) modalEditarBairro.style.display = 'block';
            }

            // Lógica para o botão de Excluir (adicionada)
            if (deleteBtn) {
                const bairroId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este bairro?')) {
                    const { error } = await supabase.from('bairros').delete().eq('id', bairroId);

                    if (error) {
                        alert('Erro ao excluir o bairro: ' + error.message);
                    } else {
                        alert('Bairro excluído com sucesso!');
                        await carregarTabelaBairros(); // Recarrega a tabela
                    }
                }
            }
        });
    }

    if(formEditarBairro) {
        formEditarBairro.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-bairro-id').value;
            const nome = document.getElementById('edit-bairro-nome').value.trim();
            const valor = parseFloat(document.getElementById('edit-bairro-valor-tele').value.replace(',', '.')) || 0;

            if(!nome) { alert('O nome do bairro não pode ser vazio.'); return; }

            const { error } = await supabase.from('bairros').update({ nome, valor_tele_busca: valor }).eq('id', id);
            if(error) { alert('Erro ao atualizar o bairro: ' + error.message); }
            else {
                alert('Bairro atualizado com sucesso!');
                if (modalEditarBairro) modalEditarBairro.style.display = 'none';
                await carregarTabelaBairros();
            }
        });
    }

    // ====== Raças ======
    async function carregarTabelaRacas() {
        if (!tabelaRacasBody) return;
        const { data: racas, error } = await supabase.from('racas').select('*').order('id');
        if (error) { console.error("Erro ao carregar raças:", error); return; }
        tabelaRacasBody.innerHTML = '';
        if (racas && Array.isArray(racas)) { // <-- CORREÇÃO
            racas.forEach(r => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(r.id).padStart(5, '0')}</td><td>${r.nome}</td><td class="actions-cell"><button class="btn-edit-raca btn-edit" data-id="${r.id}" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete-raca btn-delete" data-id="${r.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaRacasBody.appendChild(tr);
            });
        }
    }

    async function carregarRacas() {
        const { data: racas, error } = await supabase.from('racas').select('*').order('nome');
        if (error) { console.error("Erro ao carregar raças para os dropdowns:", error); return; }
        if (racas && Array.isArray(racas)) { // <-- CORREÇÃO
            racasDropdowns.forEach(drop => {
                if (drop) {
                    drop.innerHTML = '<option value="">Selecione</option>';
                    racas.forEach(r => {
                        drop.insertAdjacentHTML('beforeend', `<option value="${r.nome}">${r.nome}</option>`);
                    });
                    drop.insertAdjacentHTML('beforeend', `<option value="Outra">Outra</option>`);
                }
            });
        }
    }

    if (formRaca) {
        formRaca.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('raca-nome').value;
            const { error } = await supabase.from('racas').insert({ nome });
            if (error) alert('Erro: ' + error.message);
            else {
                formRaca.reset();
                await carregarTabelaRacas();
                await carregarRacas();
            }
        });
    }

    // ====== AÇÕES NA LISTA DE RAÇAS (EDITAR E EXCLUIR) ======
    if (tabelaRacasBody) {
        tabelaRacasBody.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit-raca');
            const deleteBtn = e.target.closest('.btn-delete-raca');

            // Lógica para Editar
            if (editBtn) {
                const racaId = editBtn.dataset.id;
                const { data: raca, error } = await supabase.from('racas').select('*').eq('id', racaId).single();
                
                if(error || !raca) { alert('Erro ao buscar dados da raça.'); return; }

                document.getElementById('edit-raca-id').value = raca.id;
                document.getElementById('edit-raca-nome').value = raca.nome;
                if (modalEditarRaca) modalEditarRaca.style.display = 'block';
            }

            // Lógica para Excluir
            if (deleteBtn) {
                const racaId = deleteBtn.dataset.id;
                const confirmDelete = confirm('Tem certeza que deseja excluir esta raça?');
                
                if (confirmDelete) {
                    const { error } = await supabase.from('racas').delete().eq('id', racaId);
                    if (error) {
                        alert('Erro ao excluir a raça: ' + error.message);
                    } else {
                        alert('Raça excluída com sucesso!');
                        await carregarTabelaRacas();
                        await carregarRacas(); // Atualiza os dropdowns em outros formulários
                    }
                }
            }
        });
    }

    if(formEditarRaca) {
        formEditarRaca.addEventListener('submit', async function(e) {
            e.preventDefault();
            const id = document.getElementById('edit-raca-id').value;
            const nome = document.getElementById('edit-raca-nome').value.trim();

            if(!nome) { alert('O nome da raça não pode ser vazio.'); return; }
            
            const { error } = await supabase.from('racas').update({ nome }).eq('id', id);

            if(error) {
                alert('Erro ao atualizar a raça: ' + error.message);
            } else {
                alert('Raça atualizada com sucesso!');
                if (modalEditarRaca) modalEditarRaca.style.display = 'none';
                await carregarTabelaRacas();
                await carregarRacas(); // Atualiza os dropdowns em outros formulários
            }
        });
    }
    
    if (formCadastrarServico) {
        formCadastrarServico.addEventListener('submit', async e => {
            e.preventDefault();

            // --- VALIDAÇÃO ---
            const nomeServico = document.getElementById('servico-nome').value.trim();
            const valorServico = document.getElementById('servico-valor').value;
            if (!nomeServico || !valorServico) {
                alert('Por favor, preencha pelo menos o Nome e o Valor do serviço.');
                return;
            }

            // --- MONTA O OBJETO DO SERVIÇO ---
            const servicoData = {
                nome: nomeServico,
                valor: parseFloat(valorServico.replace(',', '.')) || 0,
                duracao_minutos: parseInt(document.getElementById('servico-duracao').value) || null,
                descricao: document.getElementById('servico-descricao').value.trim(),
                mostrar_site: document.getElementById('servico-mostrar-site').checked,
                tipo_servico: document.getElementById('servico-tipo').value
            };

            // --- CRIA O NOVO SERVIÇO ---
            const { data: servicoResult, error: createError } = await supabase
                .from('servicos')
                .insert([servicoData])
                .select()
                .single();

            if (createError) {
                alert('Falha ao criar o novo serviço: ' + createError.message);
                return;
            }

            // --- SALVA OS PRODUTOS ASSOCIADOS ---
            const produtosParaSalvar = [];
            produtosUtilizadosTbody.querySelectorAll('tr').forEach(linha => {
                produtosParaSalvar.push({
                    servico_id: servicoResult.id,
                    produto_id: parseInt(linha.dataset.produtoId),
                    quantidade_utilizada: parseFloat(linha.querySelector('input').value)
                });
            });

            if (produtosParaSalvar.length > 0) {
                const { error: insertProdutosError } = await supabase.from('servico_produtos').insert(produtosParaSalvar);
                if (insertProdutosError) {
                    alert('Serviço criado, mas houve um erro ao salvar os produtos associados.');
                }
            }
            
            // --- SALVA AS FOTOS DO SERVIÇO ---
            const fotosInput = document.getElementById('servico-fotos');
            if (fotosInput.files.length > 0) {
                const novasImagensUrls = await uploadServicoImagens(servicoResult.id, fotosInput.files);
                if (novasImagensUrls.length > 0) {
                    await supabase.from('servicos').update({ imagens_url: novasImagensUrls }).eq('id', servicoResult.id);
                }
            }

            // --- FINALIZAÇÃO E FEEDBACK ---
            alert(`Serviço "${servicoResult.nome}" cadastrado com sucesso!`);
            formCadastrarServico.reset();
            produtosUtilizadosTbody.innerHTML = '';
            document.getElementById('servico-fotos-preview').innerHTML = '';
            calcularCustoTotal();
            await carregarServicos();
        });
    }
    
    async function uploadServicoImagens(servicoId, files) {
        const urls = [];
        // Itera sobre a lista de arquivos do input
        for (const file of files) {
            const filePath = `servicos_fotos/${servicoId}/${Date.now()}-${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('petshop-assets')
                .upload(filePath, file);

            if (uploadError) {
                console.error('Erro no upload da imagem:', uploadError.message);
                continue; // Pula para a próxima imagem em caso de erro
            }
            
            // Se o upload deu certo, pega a URL pública
            const { data: urlData } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
            urls.push(urlData.publicUrl);
        }
        return urls;
    }

    if(formEditarServico){

        const previewContainer = document.getElementById('edit-servico-fotos-preview');
        previewContainer.addEventListener('click', async (e) => {
            if (!e.target.classList.contains('btn-delete-foto-servico')) return;

            if (!confirm('Tem certeza que deseja excluir esta foto permanentemente?')) return;

            const button = e.target;
            const imageUrlToDelete = button.dataset.url;
            const servicoId = document.getElementById('edit-servico-id').value;

            button.disabled = true;

            // 1. Busca as URLs de imagem atuais do serviço no banco
            const { data: servico, error: fetchError } = await supabase
                .from('servicos')
                .select('imagens_url')
                .eq('id', servicoId)
                .single();

            if (fetchError || !servico) {
                alert('Erro ao buscar o serviço para atualizar as fotos.');
                button.disabled = false;
                return;
            }

            // 2. Remove a URL da imagem a ser deletada da lista
            const newImageUrls = servico.imagens_url.filter(url => url !== imageUrlToDelete);

            // 3. Atualiza o registro no banco com a nova lista de URLs
            const { error: updateError } = await supabase
                .from('servicos')
                .update({ imagens_url: newImageUrls })
                .eq('id', servicoId);

            if (updateError) {
                alert('Erro ao remover a URL da foto: ' + updateError.message);
                button.disabled = false;
                return;
            }

            // 4. (Opcional, mas recomendado) Deleta o arquivo do Supabase Storage
            try {
                const filePath = new URL(imageUrlToDelete).pathname.split('/petshop-assets/')[1];
                if (filePath) {
                    await supabase.storage.from('petshop-assets').remove([filePath]);
                }
            } catch(storageError) {
                console.warn("Aviso: Não foi possível remover o arquivo do Storage.", storageError);
            }

            // 5. Remove o elemento da imagem da tela
            button.closest('.preview-image-wrapper').remove();
            alert('Foto excluída com sucesso!');
        });
        
        formEditarServico.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-servico-id').value;

            // ADICIONE A VALIDAÇÃO DE FOTOS
            const fotosInput = document.getElementById('edit-servico-fotos');
            if (fotosInput.files.length > 3) {
                return alert('Você pode enviar no máximo 3 fotos.');
            }

            // CRIE O OBJETO COM OS NOVOS DADOS
            const servicoData = {
                nome: document.getElementById('edit-servico-nome').value,
                valor: parseFloat(document.getElementById('edit-servico-valor').value.replace(',', '.')) || null,
                duracao_minutos: parseInt(document.getElementById('edit-servico-duracao').value) || null,
                descricao: document.getElementById('edit-servico-descricao').value,
                mostrar_site: document.getElementById('edit-servico-mostrar-site').checked,
                tipo_servico: document.getElementById('edit-servico-tipo').value // Coleta o tipo
            };
                
            // ADICIONE A LÓGICA DE UPLOAD DE NOVAS FOTOS
            if (fotosInput.files.length > 0) {
                // OPCIONAL: Adicionar lógica para deletar as fotos antigas do Storage aqui
                const novasImagensUrls = await uploadServicoImagens(id, fotosInput.files);
                // Sobrescreve o array de imagens com o novo
                servicoData.imagens_url = novasImagensUrls; 
            }

            // Altere a chamada 'update' para usar o novo objeto 'servicoData'
            const { error: updateError } = await supabase.from('servicos').update(servicoData).eq('id', id);
            if (updateError) { alert('Erro ao atualizar o serviço: ' + updateError.message); return; }
            
            if (servicoData.tipo_servico === 'principal') {
            // 1. Deleta todas as associações antigas para este serviço principal
            await supabase.from('servicos_adicionais_associados').delete().eq('servico_principal_id', id);

            // 2. Coleta e insere as novas associações
            const adicionaisParaSalvar = [];
            document.querySelectorAll('#edit-servicos-adicionais-list .selected-item').forEach(item => {
                adicionaisParaSalvar.push({
                    servico_principal_id: id,
                    servico_adicional_id: item.dataset.id
                });
            });

            if (adicionaisParaSalvar.length > 0) {
                await supabase.from('servicos_adicionais_associados').insert(adicionaisParaSalvar);
            }
        }

            const { error: deleteError } = await supabase.from('servico_produtos').delete().eq('servico_id', id);
            if (deleteError) { alert('Erro ao atualizar produtos do serviço (passo 1): ' + deleteError.message); return; }

            const produtosParaInserir = [];
            editProdutosUtilizadosTbody.querySelectorAll('tr').forEach(linha => {
                produtosParaInserir.push({
                    servico_id: id,
                    produto_id: linha.dataset.produtoId,
                    quantidade_utilizada: parseFloat(linha.querySelector('.qtd-produto-servico').value)
                });
            });

            if (produtosParaInserir.length > 0) {
                const { error: insertError } = await supabase.from('servico_produtos').insert(produtosParaInserir);
                if (insertError) { alert('Erro ao atualizar produtos do serviço (passo 2): ' + insertError.message); return; }
            }

            alert('Serviço atualizado com sucesso!');
            modalEditarServico.style.display = 'none';
            await carregarServicos();
        });
    }

    // Função para carregar produtos no dropdown
    async function carregarProdutosParaServicos() {
        if (!produtoSelect && !editProdutoSelect) return;
        const { data: produtos, error } = await supabase.from('produtos').select('id, nome, preco_custo, unidade_medida').order('nome');
        if (error) { console.error('Erro ao carregar produtos:', error); return; }
        produtosDisponiveis = produtos || []; // <-- CORREÇÃO
        if (produtosDisponiveis.length > 0) {
            const optionsHtml = produtosDisponiveis.map(p => {
                const custoFormatado = p.preco_custo ? `(Custo: R$ ${p.preco_custo.toFixed(2)})` : '(Custo não informado)';
                return `<option value="${p.id}">${p.nome} ${custoFormatado}</option>`;
            }).join('');
            if(produtoSelect) produtoSelect.innerHTML = '<option value="">Selecione um produto para adicionar</option>' + optionsHtml;
            if(editProdutoSelect) editProdutoSelect.innerHTML = '<option value="">Selecione um produto para adicionar</option>' + optionsHtml;
        }
    }

    async function carregarTabelaFornecedores() {
        if (!tabelaFornecedoresBody) return;
        const { data: fornecedores, error } = await supabase.from('fornecedores').select('*').order('id');
        if (error) { console.error("Erro ao carregar fornecedores:", error); return; }
        tabelaFornecedoresBody.innerHTML = '';
        if (fornecedores && Array.isArray(fornecedores)) { // <-- CORREÇÃO
            fornecedores.forEach(f => {
                const tr = document.createElement('tr');
                tr.innerHTML = `<td>${String(f.id).padStart(5, '0')}</td><td>${f.nome}</td><td>${f.telefone || '-'}</td><td>${f.email || '-'}</td><td>${f.cnpj || '-'}</td><td class="actions-cell"><button class="btn-edit-fornecedor btn-edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete-fornecedor btn-delete" data-id="${f.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaFornecedoresBody.appendChild(tr);
            });
        }
    }
    
     // Função carregar Servicos
    async function carregarServicos() {
        if (!tabelaServicosBody) return;
        const { data: servicos, error } = await supabase.from('servicos').select(`id, nome, valor, duracao_minutos, mostrar_site, imagens_url, tipo_servico, servico_produtos (quantidade_utilizada, produtos ( preco_custo ))`).order('id');
        if (error) { console.error('Erro ao carregar serviços:', error); return; }
        tabelaServicosBody.innerHTML = '';
        if (servicos && Array.isArray(servicos)) { // <-- CORREÇÃO
            servicos.forEach(s => {
                let custoTotal = 0;
                if (s.servico_produtos && Array.isArray(s.servico_produtos)) { // <-- CORREÇÃO EXTRA
                    s.servico_produtos.forEach(sp => {
                        const custoProduto = sp.produtos ? sp.produtos.preco_custo : 0;
                        custoTotal += (sp.quantidade_utilizada || 0) * (custoProduto || 0);
                    });
                }
                const valorVenda = s.valor || 0;
                const lucroEstimado = valorVenda - custoTotal;
                const tr = document.createElement('tr');
                const imageUrl = (s.imagens_url && s.imagens_url.length > 0) ? s.imagens_url[0] : 'images/default-service.png';
                const tipoServicoFormatado = s.tipo_servico ? s.tipo_servico.charAt(0).toUpperCase() + s.tipo_servico.slice(1) : 'Não definido';
                tr.innerHTML = `<td><img src="${imageUrl}" alt="Foto de ${s.nome}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td><td>${String(s.id).padStart(5, '0')}</td><td>${s.nome} ${s.mostrar_site ? '<i class="fas fa-eye" style="color: #10b981;" title="Visível no site"></i>' : ''}</td><td><strong>${tipoServicoFormatado}</strong></td><td>R$ ${valorVenda.toFixed(2)}</td><td style="color: #dc3545;">R$ ${custoTotal.toFixed(2)}</td><td style="font-weight: bold; color: ${lucroEstimado >= 0 ? '#10b981' : '#dc3545'};">R$ ${lucroEstimado.toFixed(2)}</td><td>${s.duracao_minutos || '-'}</td><td class="actions-cell"><button class="btn-edit-servico btn-edit" data-id="${s.id}" title="Editar"><i class="fas fa-edit"></i></button><button class="btn-delete-servico btn-delete" data-id="${s.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button></td>`;
                tabelaServicosBody.appendChild(tr);
            });
        }
    }

    // Listener para os botões de Ação na tabela de Serviços (Editar e Excluir)
    if (tabelaServicosBody) {
        tabelaServicosBody.addEventListener('click', async function(e) {
            const editBtn = e.target.closest('.btn-edit-servico');
            const deleteBtn = e.target.closest('.btn-delete-servico');

            if (editBtn) {
                const servicoId = editBtn.dataset.id;

                const { data: servico, error } = await supabase
                    .from('servicos')
                    .select(`
                        *, 
                        servico_produtos(*, produtos(id, nome, preco_custo, unidade_medida)),
                        servicos_adicionais_associados!servico_principal_id ( servicos_ad:servico_adicional_id (id, nome) )
                    `)
                    .eq('id', servicoId)
                    .single();

                if(error || !servico) {
                    console.error("Erro Supabase:", error); // Adiciona um log para depuração
                    alert('Erro ao buscar dados do serviço.'); 
                    return; 
                }

                document.getElementById('edit-servico-id').value = servico.id;
                document.getElementById('edit-servico-nome').value = servico.nome;
                document.getElementById('edit-servico-tipo').value = servico.tipo_servico;
                document.getElementById('edit-servico-valor').value = servico.valor ? servico.valor.toFixed(2) : '';
                document.getElementById('edit-servico-duracao').value = servico.duracao_minutos || '';
                document.getElementById('edit-servico-descricao').value = servico.descricao || '';
                document.getElementById('edit-servico-mostrar-site').checked = servico.mostrar_site;

                const containerAdicionais = document.getElementById('container-adicionais');
                if (servico.tipo_servico === 'principal') {
                    containerAdicionais.style.display = 'block';
                    await carregarServicosAdicionais();
                    const listContainer = document.getElementById('edit-servicos-adicionais-list');
                    listContainer.innerHTML = '';
                    servico.servicos_adicionais_associados.forEach(assoc => {
                        renderizarAdicionalNaLista(assoc.servicos_ad);
                    });
                } else {
                    containerAdicionais.style.display = 'none';
                }

                const fotosPreviewContainer = document.getElementById('edit-servico-fotos-preview');
                fotosPreviewContainer.innerHTML = '';
                if (servico.imagens_url && servico.imagens_url.length > 0) {
                    servico.imagens_url.forEach(url => {
                        fotosPreviewContainer.innerHTML += `
                            <div class="preview-image-wrapper">
                                <img src="${url}" class="preview-image">
                                <button type="button" class="btn-delete-foto-servico" data-url="${url}">&times;</button>
                            </div>
                        `;
                    });
                }

                editProdutosUtilizadosTbody.innerHTML = '';
                servico.servico_produtos.forEach(sp => {
                    adicionarProdutoNaTabelaEdicao(sp.produtos, sp.quantidade_utilizada);
                });

                // ADICIONE AS DUAS LINHAS ABAIXO
                let custoTotal = 0;
                editProdutosUtilizadosTbody.querySelectorAll('tr').forEach(linha => {
                    custoTotal += parseFloat(linha.dataset.subtotal) || 0;
                });
                editCustoTotalInput.value = custoTotal.toFixed(2);

                modalEditarServico.style.display = 'block';
            }

            if (deleteBtn) {
                const servicoId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este serviço? Esta ação é irreversível.')) {
                    await supabase.from('servicos_adicionais_associados').delete().or(`servico_principal_id.eq.${servicoId},servico_adicional_id.eq.${servicoId}`);
                    await supabase.from('servico_produtos').delete().eq('servico_id', servicoId);
                    const { error } = await supabase.from('servicos').delete().eq('id', servicoId);
                    if (error) { alert('Erro ao excluir: ' + error.message); }
                    else {
                        alert('Serviço excluído com sucesso!');
                        await carregarServicos();
                    }
                }
            }
        });
    }


    // Listener para o botão Cancelar Edição
    const btnCancelarEdicaoServico = document.getElementById('btn-cancelar-edicao-servico');
    if (btnCancelarEdicaoServico) {
        btnCancelarEdicaoServico.addEventListener('click', () => {
            // Limpa e reseta o formulário para o modo "Cadastro"
            formCadastrarServico.reset();
            document.getElementById('servico-id').value = '';
            produtosUtilizadosTbody.innerHTML = '';
            calcularCustoTotal();
            
            document.getElementById('form-title-servico').textContent = 'Cadastrar Novo Serviço';
            document.getElementById('btn-salvar-servico').textContent = 'Salvar Serviço';
            btnCancelarEdicaoServico.style.display = 'none'; // Esconde o botão "Cancelar"
        });
    }

    async function carregarServicosAdicionais() {
        if (servicosAdicionaisCache.length === 0) {
            const { data, error } = await supabase
                .from('servicos')
                .select('id, nome')
                .eq('tipo_servico', 'adicional')
                .order('nome');
            if (!error) servicosAdicionaisCache = data;
        }
        const select = document.getElementById('edit-servico-adicional-select');
        select.innerHTML = '<option value="">Selecione um adicional...</option>';
        servicosAdicionaisCache.forEach(s => {
            select.innerHTML += `<option value="${s.id}">${s.nome}</option>`;
        });
    }

    function renderizarAdicionalNaLista(servico) {
        const listContainer = document.getElementById('edit-servicos-adicionais-list');
        const itemHtml = `
            <div class="selected-item" data-id="${servico.id}">
                <span>${servico.nome}</span>
                <button type="button" class="btn-delete-adicional-item btn-delete">&times;</button>
            </div>
        `;
        listContainer.insertAdjacentHTML('beforeend', itemHtml);
    }

    // --- FUNÇÃO PARA ADICIONAR PRODUTOS NA TABELA DE EDIÇÃO (CORREÇÃO) ---
    function adicionarProdutoNaTabelaEdicao(produto, quantidade) {
        if (!produto || !editProdutosUtilizadosTbody) return;

        const tr = document.createElement('tr');
        tr.dataset.produtoId = produto.id;

        const subtotal = (parseFloat(quantidade) || 0) * (produto.preco_custo || 0);
        tr.dataset.subtotal = subtotal;

        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td>
            <td><input type="number" class="qtd-produto-servico" value="${quantidade}" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td>
            <td class="subtotal-custo">R$ ${subtotal.toFixed(2)}</td>
            <td class="actions-cell">
                <button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button>
            </td>
        `;
        editProdutosUtilizadosTbody.appendChild(tr);
    }

    // Função Lógica do Modal de Edição
    function setupEditModalListeners() {
        if (!editProdutoSelect || !editProdutosUtilizadosTbody) return;

        const calcularCusto = (tbody, inputDestino) => {
            let custoTotal = 0;
            tbody.querySelectorAll('tr').forEach(linha => {
                custoTotal += parseFloat(linha.dataset.subtotal) || 0;
            });
            inputDestino.value = custoTotal.toFixed(2);
        };

        editProdutoSelect.addEventListener('change', () => {
            const produtoId = editProdutoSelect.value;
            if (!produtoId) return;
            if (editProdutosUtilizadosTbody.querySelector(`tr[data-produto-id="${produtoId}"]`)) {
                alert('Este produto já foi adicionado.');
                editProdutoSelect.value = '';
                return;
            }
            const produto = produtosDisponiveis.find(p => p.id == produtoId);
            if (produto) {
                const tr = document.createElement('tr');
                tr.dataset.produtoId = produto.id;
                tr.dataset.subtotal = "0";
                tr.innerHTML = `<td>${produto.nome}</td><td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td><td><input type="number" class="qtd-produto-servico" value="1" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td><td class="subtotal-custo">R$ 0.00</td><td class="actions-cell"><button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button></td>`;
                editProdutosUtilizadosTbody.appendChild(tr);
                tr.querySelector('input').dispatchEvent(new Event('input')); 
            }
            editProdutoSelect.value = '';
        });

        editProdutosUtilizadosTbody.addEventListener('input', e => {
            if (e.target.classList.contains('qtd-produto-servico')) {
                 const tr = e.target.closest('tr');
                 const produto = produtosDisponiveis.find(p => p.id == tr.dataset.produtoId);
                 
                 // Adicionada verificação de segurança
                 if (!produto) {
                    console.error(`Produto com ID ${tr.dataset.produtoId} não encontrado no cache.`);
                    return;
                 }

                 const subtotal = (parseFloat(e.target.value) || 0) * (produto.preco_custo || 0);
                 tr.dataset.subtotal = subtotal;
                 tr.querySelector('.subtotal-custo').textContent = `R$ ${subtotal.toFixed(2)}`;
                 calcularCusto(editProdutosUtilizadosTbody, editCustoTotalInput);
            }
        });

        editProdutosUtilizadosTbody.addEventListener('click', e => {
            if (e.target.closest('.btn-delete-produto-servico')) {
                e.target.closest('tr').remove();
                calcularCusto(editProdutosUtilizadosTbody, editCustoTotalInput);
            }
        });

        const adicionalSelect = document.getElementById('edit-servico-adicional-select');
        const adicionaisList = document.getElementById('edit-servicos-adicionais-list');

        adicionalSelect.addEventListener('change', () => {
            const servicoId = adicionalSelect.value;
            if (!servicoId) return;

            // Evita adicionar o mesmo serviço duas vezes
            if (adicionaisList.querySelector(`.selected-item[data-id="${servicoId}"]`)) {
                adicionalSelect.value = '';
                return;
            }

            const servico = servicosAdicionaisCache.find(s => s.id == servicoId);
            if (servico) {
                renderizarAdicionalNaLista(servico);
            }
            adicionalSelect.value = '';
        });

        adicionaisList.addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-adicional-item')) {
                e.target.closest('.selected-item').remove();
            }
        });
    }

    // Função para calcular o custo total
    function calcularCustoTotal() {
        let custoTotal = 0;
        const linhas = produtosUtilizadosTbody.querySelectorAll('tr');
        linhas.forEach(linha => {
            const subtotal = parseFloat(linha.dataset.subtotal) || 0;
            custoTotal += subtotal;
        });
        custoTotalInput.value = custoTotal.toFixed(2);
    }

    // Adiciona o produto selecionado na tabela
    if (produtoSelect) {
        produtoSelect.addEventListener('change', () => {
            const produtoId = produtoSelect.value;
            if (!produtoId) return;

            // Evita adicionar o mesmo produto duas vezes
            if (produtosUtilizadosTbody.querySelector(`tr[data-produto-id="${produtoId}"]`)) {
                alert('Este produto já foi adicionado.');
                produtoSelect.value = '';
                return;
            }

            const produto = produtosDisponiveis.find(p => p.id == produtoId);
            if (produto) {
                const tr = document.createElement('tr');
                tr.dataset.produtoId = produto.id;
                tr.dataset.subtotal = "0";
                
                // --- AJUSTE AQUI ---
                tr.innerHTML = `
                    <td>${produto.nome}</td>
                    <td>R$ ${produto.preco_custo ? produto.preco_custo.toFixed(2) : '0.00'}</td>
                    <td><input type="number" class="qtd-produto-servico" value="1" min="0.0001" step="0.0001" style="width: 110px;" required> (${produto.unidade_medida || 'UN'})</td>
                    <td class="subtotal-custo">R$ 0.00</td>
                    <td class="actions-cell">
                        <button type="button" class="btn-delete-produto-servico btn-delete"><i class="fas fa-trash-alt"></i></button>
                    </td>
                `;
                produtosUtilizadosTbody.appendChild(tr);
                // Dispara o evento de input para calcular o custo inicial do item adicionado
                tr.querySelector('.qtd-produto-servico').dispatchEvent(new Event('input'));
            }
            produtoSelect.value = ''; // Reseta o select
        });
    }

    // Atualiza o subtotal e o total ao alterar a quantidade
    if (produtosUtilizadosTbody) {
        produtosUtilizadosTbody.addEventListener('input', (e) => {
            if (e.target.classList.contains('qtd-produto-servico')) {
                const tr = e.target.closest('tr');
                const produtoId = tr.dataset.produtoId;
                const produto = produtosDisponiveis.find(p => p.id == produtoId);
                
                // Adicionada verificação de segurança
                if (!produto) {
                    console.error(`Produto com ID ${produtoId} não encontrado no cache.`);
                    return;
                }
                
                const quantidade = parseFloat(e.target.value) || 0;
                const custoUnitario = produto.preco_custo || 0;
                
                const subtotal = quantidade * custoUnitario;
                tr.dataset.subtotal = subtotal;
                tr.querySelector('.subtotal-custo').textContent = `R$ ${subtotal.toFixed(2)}`;
                
                calcularCustoTotal();
            }
        });
        
        // Remove um produto da lista
        produtosUtilizadosTbody.addEventListener('click', (e) => {
             const deleteBtn = e.target.closest('.btn-delete-produto-servico');
             if(deleteBtn) {
                 deleteBtn.closest('tr').remove();
                 calcularCustoTotal();
             }
        });
    }

    // ======= Fornecedor ========
    async function carregarTabelaFornecedores() {
        if (!tabelaFornecedoresBody) return;
        const { data: fornecedores, error } = await supabase.from('fornecedores').select('*').order('id');
        if (error) { console.error("Erro ao carregar fornecedores:", error); return; }

        tabelaFornecedoresBody.innerHTML = '';
        fornecedores.forEach(f => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${String(f.id).padStart(5, '0')}</td>
                <td>${f.nome}</td>
                <td>${f.telefone || '-'}</td>
                <td>${f.email || '-'}</td>
                <td>${f.cnpj || '-'}</td>
                <td class="actions-cell">
                    <button class="btn-edit-fornecedor btn-edit" data-id="${f.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-fornecedor btn-delete" data-id="${f.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tabelaFornecedoresBody.appendChild(tr);
        });
    }

    if (formFornecedor) {
        formFornecedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const fornecedorData = {
                nome: document.getElementById('fornecedor-nome').value,
                cnpj: document.getElementById('fornecedor-cnpj').value,
                email: document.getElementById('fornecedor-email').value,
                telefone: document.getElementById('fornecedor-telefone').value,
                endereco: document.getElementById('fornecedor-endereco').value
            };

            const { error } = await supabase.from('fornecedores').insert(fornecedorData);
            if (error) {
                alert('Erro ao cadastrar fornecedor: ' + error.message);
            } else {
                alert('Fornecedor cadastrado com sucesso!');
                formFornecedor.reset();
                await carregarTabelaFornecedores();
                await carregarFornecedoresDropdown();
            }
        });
    }

    if (tabelaFornecedoresBody) {
        tabelaFornecedoresBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit-fornecedor');
            const deleteBtn = e.target.closest('.btn-delete-fornecedor');

            if (editBtn) {
                const fornecedorId = editBtn.dataset.id;
                const { data: f, error } = await supabase.from('fornecedores').select('*').eq('id', fornecedorId).single();
                if (error || !f) { alert('Erro ao carregar dados do fornecedor.'); return; }

                document.getElementById('edit-fornecedor-id').value = f.id;
                document.getElementById('edit-fornecedor-nome').value = f.nome;
                document.getElementById('edit-fornecedor-cnpj').value = f.cnpj;
                document.getElementById('edit-fornecedor-email').value = f.email;
                document.getElementById('edit-fornecedor-telefone').value = f.telefone;
                document.getElementById('edit-fornecedor-endereco').value = f.endereco;
                if (modalEditarFornecedor) modalEditarFornecedor.style.display = 'block';
            }

            if (deleteBtn) {
                const fornecedorId = deleteBtn.dataset.id;
                if (confirm('Tem certeza que deseja excluir este fornecedor?')) {
                    const { error } = await supabase.from('fornecedores').delete().eq('id', fornecedorId);
                    if (error) { alert('Erro ao excluir fornecedor: ' + error.message); }
                    else {
                        alert('Fornecedor excluído com sucesso!');
                        await carregarTabelaFornecedores();
                        await carregarFornecedoresDropdown();
                    }
                }
            }
        });
    }

    if(formEditarFornecedor) {
        formEditarFornecedor.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edit-fornecedor-id').value;
            const fornecedorData = {
                nome: document.getElementById('edit-fornecedor-nome').value,
                cnpj: document.getElementById('edit-fornecedor-cnpj').value,
                email: document.getElementById('edit-fornecedor-email').value,
                telefone: document.getElementById('edit-fornecedor-telefone').value,
                endereco: document.getElementById('edit-fornecedor-endereco').value
            };
            const { error } = await supabase.from('fornecedores').update(fornecedorData).eq('id', id);
            if (error) { alert('Erro ao atualizar fornecedor: ' + error.message); }
            else {
                alert('Fornecedor atualizado com sucesso!');
                if (modalEditarFornecedor) modalEditarFornecedor.style.display = 'none';
                await carregarTabelaFornecedores();
                await carregarFornecedoresDropdown();
            }
        });
    }

    async function carregarHorariosParaGerenciamento() {
        if (!formGerenciarHorarios) return;
        const { data: horarios, error } = await supabase.from('horarios_padrao').select('*').order('dia_semana', { ascending: true });
        if (error) { return; }
        const horariosSafe = horarios || []; // <-- CORREÇÃO
        const diasDaSemana = ["Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira", "Sábado"];
        formGerenciarHorarios.innerHTML = '';
        diasDaSemana.forEach((nomeDia, index) => {
            const horarioDoDia = horariosSafe.find(h => h.dia_semana === index) || {};
            const horariosEmTexto = horarioDoDia.horarios ? horarioDoDia.horarios.join(', ') : '';
            const diaHtml = `<div class="dashboard-form" style="grid-template-columns: 80px 1fr 1fr; align-items: center; gap: 1rem; border-bottom: 1px solid #f1f5f9; padding-bottom: 1rem;"><input type="hidden" class="dia-semana-id" value="${index}"><div class="form-group" style="flex-direction: row; align-items: center; gap: 10px;"><input type="checkbox" id="ativo-${index}" class="horario-ativo" ${horarioDoDia.ativo ? 'checked' : ''} style="width: auto;"><label for="ativo-${index}" style="margin: 0; font-size: 1.2rem; font-family: 'Poppins';">${nomeDia}</label></div><div class="form-group" style="grid-column: 2 / span 2;"><label>Horários disponíveis (separados por vírgula)</label><input type="text" class="horarios-lista" value="${horariosEmTexto}" placeholder="Ex: 09:00, 09:40, 10:20, 11:00"></div></div>`;
            formGerenciarHorarios.innerHTML += diaHtml;
        });
    }

    if (formGerenciarHorarios) {
        formGerenciarHorarios.addEventListener('submit', async (e) => {
            e.preventDefault();
            const dadosParaSalvar = [];

            formGerenciarHorarios.querySelectorAll('.dashboard-form').forEach(linhaDia => {
                const horariosTexto = linhaDia.querySelector('.horarios-lista').value;
                // Converte o texto "09:00, 09:40" em um array de texto limpo ['09:00', '09:40']
                const horariosArray = horariosTexto.split(',').map(h => h.trim()).filter(h => h);

                dadosParaSalvar.push({
                    dia_semana: parseInt(linhaDia.querySelector('.dia-semana-id').value),
                    ativo: linhaDia.querySelector('.horario-ativo').checked,
                    horarios: horariosArray
                });
            });

            const { error } = await supabase
                .from('horarios_padrao')
                .upsert(dadosParaSalvar, { onConflict: 'dia_semana' });

            if (error) {
                alert('Erro ao salvar os horários: ' + error.message);
            } else {
                alert('Horários de atendimento atualizados com sucesso!');
            }
        });
    }

    // Inicialização
    carregarTabelaBairros();
    carregarTabelaRacas();
    carregarRacas();
    carregarServicos();
    carregarTabelaFornecedores();
    carregarProdutosParaServicos();
    setupEditModalListeners();
    carregarStoriesAdmin();
    carregarHorariosParaGerenciamento();
    carregarTabelaPagamentos();

}