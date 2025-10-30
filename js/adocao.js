// petshop-site/js/adocao.js — ajustado para nomes do esquema e normalização de campos

import { supabase } from './supabase-config.js';

const mostrarErro = (mensagem) => alert(mensagem);
const mostrarSucesso = (mensagem) => alert(mensagem);

// Helper para normalizar campos vindos de pets_adocao com nomes inconsistentes
function normalizeAdocaoRecord(r) {
    if (!r) return r;
    // Possíveis variações: nome_pet / nomePet, tutorTelefone / tutorTelefone, imagens_url / imagensURL / imagens_url_arr ...
    const nome_pet = r.nome_pet || r.nomePet || r.nome || r.nomePet;
    const idadePet = r.idadePet || r.idade || r.idade_pet;
    const tutorNome = r.tutorNome || r.tutor_nome || r.tutor || r.tutorName;
    const tutorTelefone = r.tutorTelefone || r.tutor_telefone || r.tutorTelefone;
    const tutorEmail = r.tutorEmail || r.tutor_email || r.tutorEmail;
    const cidade = r.cidade || r.city;
    const adotado = typeof r.adotado === 'boolean' ? r.adotado : (r.adotado === 't' || r.adotado === 'true' ? true : false);
    // imagens: prioriza imagens_url, imagens_url_arr, imagensURL_arr, imagensURL
    const imagens = r.imagens_url || r.imagens_url_arr || r.imagensURL_arr || r.imagensURL || r.imagens || [];
    // garante array
    const imagens_arr = Array.isArray(imagens) ? imagens : (imagens ? String(imagens).replace(/^{|}$/g, '').split(',').map(s => s.trim()) : []);
    return {
        ...r,
        nome_pet,
        idadePet,
        tutorNome,
        tutorTelefone,
        tutorEmail,
        cidade,
        adotado,
        imagens: imagens_arr
    };
}

async function carregarAnuncios() {
    const adocaoGrid = document.getElementById('adocao-grid');
    if (!adocaoGrid) return;

    const { data: anunciosRaw, error } = await supabase
        .from('pets_adocao')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar anúncios:', error);
        adocaoGrid.innerHTML = '<p>Não foi possível carregar os anúncios. Tente novamente mais tarde.</p>';
        return;
    }

    const anuncios = (anunciosRaw || []).map(normalizeAdocaoRecord);

    if (!anuncios || anuncios.length === 0) {
        adocaoGrid.innerHTML = '<p>Nenhum pet para adoção no momento. Seja o primeiro a anunciar!</p>';
        return;
    }

    adocaoGrid.innerHTML = '';
    anuncios.forEach(anuncio => {
        const fotos = anuncio.imagens || [];
        const anuncioCard = document.createElement('div');
        anuncioCard.classList.add('adocao-card');

        const numeroLimpo = anuncio.tutorTelefone ? anuncio.tutorTelefone.replace(/\D/g, '') : '';
        const textoMensagem = encodeURIComponent(`Olá! Vi o anúncio de ${anuncio.nome_pet} para adoção no site Espaço Pet e gostaria de mais informações.`);
        const linkWhatsApp = numeroLimpo ? `https://api.whatsapp.com/send?phone=55${numeroLimpo}&text=${textoMensagem}` : '#';

        anuncioCard.innerHTML = `
            <div class="card-imagem-container">
                ${anuncio.adotado ? '<div class="adotado-banner">ADOTADO</div>' : ''}
                ${(fotos.length > 0) ?
                    fotos.map((foto, index) => `<img src="${foto}" alt="Foto de ${anuncio.nome_pet}" class="adocao-imagem ${index === 0 ? 'active' : ''}" data-index="${index}">`).join('') :
                    '<img src="images/default-pet-avatar.png" alt="Foto padrão de pet" class="adocao-imagem active">'
                }
                ${(fotos.length > 1) ?
                    `<button class="slider-btn prev" data-direction="-1">&#10094;</button>
                     <button class="slider-btn next" data-direction="1">&#10095;</button>` : ''
                }
            </div>
            <div class="adocao-card-info">
                <h3>${anuncio.nome_pet}</h3>
                <p><i class="fas fa-paw"></i> <strong>Idade:</strong> ${anuncio.idadePet || 'N/I'}</p>
                <p><i class="fas fa-map-marker-alt"></i> <strong>Cidade:</strong> ${anuncio.cidade || 'N/I'}</p>
                <p><i class="fas fa-info-circle"></i> <strong>Obs:</strong> ${anuncio.observacoes || 'Nenhuma'}</p>
                <p><i class="fas fa-envelope"></i> <strong>Email:</strong> ${anuncio.tutorEmail || '-'}</p>
                <hr class="card-divider">
                <p><strong>Contato:</strong> ${anuncio.tutorNome || '-'}</p>
                <a href="${linkWhatsApp}" 
                   target="_blank" 
                   class="btn-principal" 
                   style="width: 100%; text-align:center; margin-top: 10px; ${anuncio.adotado ? 'background-color: #6c757d; pointer-events: none;' : ''}">
                    <i class="fab fa-whatsapp"></i> ${anuncio.adotado ? 'Já Adotado' : 'Falar com o responsável'}
                </a>
            </div>
        `;
        adocaoGrid.appendChild(anuncioCard);
    });
}

async function carregarAnunciosDashboard() {
    const tabelaBody = document.querySelector('#tabela-adocao tbody');
    if (!tabelaBody) return;

    const { data: anunciosRaw, error } = await supabase
        .from('pets_adocao')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Erro ao carregar anúncios de adoção:', error);
        return;
    }

    const anuncios = (anunciosRaw || []).map(normalizeAdocaoRecord);

    tabelaBody.innerHTML = '';
    for (const anuncio of anuncios) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>
                <span class="status-badge ${anuncio.adotado ? 'status-realizado' : 'status-agendado'}">
                    ${anuncio.adotado ? 'Adotado' : 'Disponível'}
                </span>
            </td>
            <td>${anuncio.nome_pet}</td>
            <td>${anuncio.tutorNome || '-'}</td>
            <td>${anuncio.tutorTelefone || '-'}</td>
            <td>${anuncio.cidade || '-'}</td>
            <td class="actions-cell">
                <button type="button" class="btn-edit-adocao btn-edit" data-id="${anuncio.id}" title="Editar Anúncio">
                    <i class="fas fa-edit"></i>
                </button>
                <button type="button" class="btn-toggle-adocao" data-id="${anuncio.id}" data-status="${anuncio.adotado}" title="${anuncio.adotado ? 'Marcar como Disponível' : 'Marcar como Adotado'}">
                    <i class="fas ${anuncio.adotado ? 'fa-undo' : 'fa-check-circle'}"></i>
                </button>
                <button type="button" class="btn-delete-adocao btn-delete" data-id="${anuncio.id}" title="Excluir Anúncio">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        tabelaBody.appendChild(tr);
    }
}

function attachModalCloseHandlers(modal) {
    if (!modal) return;
    if (modal.dataset.listenersAttached === 'true') return;
    modal.addEventListener('click', (ev) => {
        if (ev.target === modal) {
            modal.style.display = 'none';
        }
    });
    modal.querySelectorAll('.close-modal-admin').forEach(btn => {
        btn.addEventListener('click', () => modal.style.display = 'none');
    });
    const escHandler = (ev) => {
        if (ev.key === 'Escape' && modal.style.display === 'block') {
            modal.style.display = 'none';
        }
    };
    document.addEventListener('keydown', escHandler);
    modal.dataset.listenersAttached = 'true';
}

export function setupAdocao() {

    const formAdocao = document.getElementById('form-adocao');
    if (formAdocao) {
        carregarAnuncios();
        const adocaoFotosInput = document.getElementById('fotos');
        const adocaoFotosPreview = document.getElementById('adocao-fotos-preview');

        if (adocaoFotosInput && adocaoFotosPreview) {
            adocaoFotosInput.addEventListener('change', () => {
                adocaoFotosPreview.innerHTML = '';
                const files = adocaoFotosInput.files;
                if (files.length > 3) {
                    mostrarErro('Você pode selecionar no máximo 3 fotos.');
                    adocaoFotosInput.value = '';
                    return;
                }
                for (const file of files) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const previewItem = document.createElement('div');
                        previewItem.classList.add('preview-item');
                        previewItem.innerHTML = `<img src="${e.target.result}" alt="${file.name}" class="preview-image-thumbnail"><span class="preview-file-name">${file.name}</span>`;
                        adocaoFotosPreview.appendChild(previewItem);
                    }
                    reader.readAsDataURL(file);
                }
            });
        }
        formAdocao.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitButton = formAdocao.querySelector('button[type="submit"]');
            submitButton.disabled = true;
            submitButton.textContent = 'Enviando...';
            
            const fotosUrls = [];
            if (adocaoFotosInput.files.length > 0) {
                for (const foto of adocaoFotosInput.files) {
                    const filePath = `adocao_fotos/${Date.now()}-${foto.name}`;
                    const { error: uploadError } = await supabase.storage.from('petshop-assets').upload(filePath, foto);
                    if (uploadError) {
                        mostrarErro('Erro ao fazer upload da imagem: ' + uploadError.message);
                        submitButton.disabled = false;
                        submitButton.textContent = 'Publicar Anúncio';
                        return;
                    }
                    const { data: urlData } = supabase.storage.from('petshop-assets').getPublicUrl(filePath);
                    fotosUrls.push(urlData.publicUrl);
                }
            }

            const anuncioData = {
                nome_pet: document.getElementById('nome_pet').value,
                idadePet: document.getElementById('idade_pet').value,
                cidade: document.getElementById('cidade').value,
                tutorNome: document.getElementById('nome').value,
                tutorTelefone: document.getElementById('telefone').value,
                tutorEmail: document.getElementById('email').value,
                observacoes: document.getElementById('observacoes').value,
                imagens_url: fotosUrls,
                adotado: false
            };

            const { error: insertError } = await supabase.from('pets_adocao').insert(anuncioData);

            if (insertError) {
                mostrarErro('Erro ao salvar o anúncio: ' + insertError.message);
            } else {
                mostrarSucesso('Anúncio publicado com sucesso!');
                formAdocao.reset();
                if (adocaoFotosPreview) adocaoFotosPreview.innerHTML = '';
                await carregarAnuncios();
            }

            submitButton.disabled = false;
            submitButton.textContent = 'Publicar Anúncio';
        });
    }

    const tabelaAdocao = document.getElementById('tabela-adocao');
    if (tabelaAdocao) {
        carregarAnunciosDashboard();

        tabelaAdocao.addEventListener('click', async (e) => {
            try {
                const editButton = e.target.closest('.btn-edit-adocao');
                const deleteButton = e.target.closest('.btn-delete-adocao');
                const toggleButton = e.target.closest('.btn-toggle-adocao');
                const refreshButton = e.target.closest('#btn-refresh-adocao');

                if (editButton) {
                    const modalEditar = document.getElementById('modal-editar-adocao');
                    if (!modalEditar) {
                        alert('Erro: modal de edição não encontrado no DOM.');
                        return;
                    }
                    if (modalEditar.parentElement !== document.body) {
                        document.body.appendChild(modalEditar);
                    }
                    modalEditar.style.position = 'fixed';
                    modalEditar.style.zIndex = '10000';
                    attachModalCloseHandlers(modalEditar);

                    const anuncioId = editButton.dataset.id;
                    const { data: anuncioRaw, error } = await supabase.from('pets_adocao').select('*').eq('id', anuncioId).single();

                    if (error || !anuncioRaw) {
                        console.error('Erro ao carregar os dados do anúncio para edição:', error);
                        return alert('Erro ao carregar os dados do anúncio para edição.');
                    }

                    const anuncio = normalizeAdocaoRecord(anuncioRaw);

                    const fieldMap = [
                        ['edit-adocao-id', anuncio.id],
                        ['edit-adocao-nome-pet', anuncio.nome_pet || ''],
                        ['edit-adocao-idade-pet', anuncio.idadePet || ''],
                        ['edit-adocao-observacoes', anuncio.observacoes || ''],
                        ['edit-adocao-tutor-nome', anuncio.tutorNome || ''],
                        ['edit-adocao-tutor-telefone', anuncio.tutorTelefone || ''],
                        ['edit-adocao-tutor-email', anuncio.tutorEmail || ''],
                        ['edit-adocao-cidade', anuncio.cidade || '']
                    ];
                    fieldMap.forEach(([id, val]) => {
                        const el = document.getElementById(id);
                        if (el) el.value = val;
                    });

                    modalEditar.style.display = 'block';
                    const firstInput = modalEditar.querySelector('input, textarea, select');
                    if (firstInput) try { firstInput.focus(); } catch (ignore) {}
                    return;
                }

                if (deleteButton) {
                    if (!confirm('Tem certeza que deseja excluir este anúncio permanentemente?')) return;
                    const { error } = await supabase.from('pets_adocao').delete().eq('id', deleteButton.dataset.id);
                    if (error) { alert('Erro ao excluir o anúncio: ' + error.message); } 
                    else { alert('Anúncio excluído com sucesso!'); await carregarAnunciosDashboard(); }
                    return;
                }
                
                if (toggleButton) {
                    const novoStatus = !(toggleButton.dataset.status === 'true');
                    const { error } = await supabase.from('pets_adocao').update({ adotado: novoStatus }).eq('id', toggleButton.dataset.id);
                    if (error) { alert('Erro ao atualizar o status: ' + error.message); }
                    else { alert(`Pet marcado como ${novoStatus ? 'Adotado' : 'Disponível'}!`); await carregarAnunciosDashboard(); }
                    return;
                }

                if (refreshButton) {
                     const icon = refreshButton.querySelector('i');
                     icon.classList.add('spin');
                     refreshButton.disabled = true;
                     await carregarAnunciosDashboard();
                     setTimeout(() => {
                         icon.classList.remove('spin');
                         refreshButton.disabled = false;
                     }, 500);
                }
            } catch (err) {
                console.error('Erro no handler de eventos da tabela de adoção:', err);
            }
        });

        const formEditar = document.getElementById('form-editar-adocao');
        if (formEditar) {
            formEditar.addEventListener('submit', async (e) => {
                e.preventDefault();
                const modalEditar = document.getElementById('modal-editar-adocao');
                const id = document.getElementById('edit-adocao-id').value;
                const dadosAtualizados = {
                    nome_pet: document.getElementById('edit-adocao-nome-pet').value,
                    idadePet: document.getElementById('edit-adocao-idade-pet').value,
                    observacoes: document.getElementById('edit-adocao-observacoes').value,
                    tutorNome: document.getElementById('edit-adocao-tutor-nome').value,
                    tutorTelefone: document.getElementById('edit-adocao-tutor-telefone').value,
                    tutorEmail: document.getElementById('edit-adocao-tutor-email').value,
                    cidade: document.getElementById('edit-adocao-cidade').value,
                };
                const { error } = await supabase.from('pets_adocao').update(dadosAtualizados).eq('id', id);
                if (error) { alert('Erro ao atualizar o anúncio: ' + error.message); }
                else {
                    alert('Anúncio atualizado com sucesso!');
                    if (modalEditar) modalEditar.style.display = 'none';
                    await carregarAnunciosDashboard();
                }
            });
        }
    }
}