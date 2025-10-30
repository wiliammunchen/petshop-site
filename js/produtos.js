// petshop-site/js/produtos.js
// Adequado ao novo esquema (snake_case), validações de array/null, tratamento de IDs como strings,
// uso de mostrarSucesso/mostrarErro para feedback e proteções ao acessar o DOM.

import { supabase } from './supabase-config.js';
import { mostrarSucesso, mostrarErro } from './notificacoes.js';

export function setupProdutos() {
    // --- Variáveis DOM ---
    const formCadastrarProduto = document.getElementById('form-cadastrar-produto');
    const tabelaProdutosBody = document.querySelector('#tabela-produtos tbody');
    const formEditarProduto = document.getElementById('form-editar-produto');
    const modalEditarProduto = document.getElementById('modal-editar-produto');
    const formCategoria = document.getElementById('form-cadastrar-categoria');
    const tabelaCategoriasBody = document.querySelector('#tabela-categorias tbody');
    const modalEditarCategoria = document.getElementById('modal-editar-categoria');
    const formEditarCategoria = document.getElementById('form-editar-categoria');

    // --- Utilitários ---
    async function carregarDropdown({ tabela, seletor, ordem = 'nome' }) {
        const selects = document.querySelectorAll(seletor);
        if (!selects.length) return;

        const { data, error } = await supabase.from(tabela).select('*').order(ordem);
        if (error) {
            console.error(`Erro ao carregar ${tabela}:`, error);
            selects.forEach(select => {
                select.innerHTML = '<option value="">Erro ao carregar</option>';
            });
            return;
        }

        // Garante que 'data' seja array antes de usar
        if (data && Array.isArray(data)) {
            selects.forEach(select => {
                select.innerHTML = '<option value="">Selecione</option>';
                data.forEach(item => {
                    select.insertAdjacentHTML('beforeend', `<option value="${item.id}">${item.nome}</option>`);
                });
            });
        } else {
            selects.forEach(select => {
                select.innerHTML = '<option value="">Nenhuma opção encontrada</option>';
            });
        }
    }

    async function handleDelete({ tabela, id, onSuccess }) {
        if (!confirm('Tem certeza que deseja excluir?')) return;
        const { error } = await supabase.from(tabela).delete().eq('id', id);
        if (error) {
            mostrarErro(`Erro ao excluir: ${error.message}`);
        } else {
            mostrarSucesso(`${tabela.charAt(0).toUpperCase() + tabela.slice(1)} excluído com sucesso!`);
            if (onSuccess) await onSuccess();
        }
    }

    // --- Produtos ---
    async function carregarProdutos() {
        if (!tabelaProdutosBody) return;
        const { data: produtos, error } = await supabase
            .from('produtos')
            .select(`id, nome, preco_venda, imagem_url, qtd_disponivel, ativo, categorias (nome), fornecedores (nome)`)
            .order('id');

        if (error) { 
            console.error('Erro ao buscar produtos:', error); 
            tabelaProdutosBody.innerHTML = `<tr><td colspan="9">Erro ao carregar produtos.</td></tr>`;
            return; 
        }

        tabelaProdutosBody.innerHTML = '';
        if (produtos && Array.isArray(produtos)) {
            produtos.forEach(p => {
                const precoText = (p.preco_venda != null) ? `R$ ${Number(p.preco_venda).toFixed(2)}` : '-';
                tabelaProdutosBody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${String(p.id).padStart(5, '0')}</td>
                        <td><img src="${p.imagem_url || 'images/default-product.png'}" style="width:50px;height:50px;object-fit:cover;border-radius:4px;"></td>
                        <td>${p.nome}</td>
                        <td>${p.categorias?.nome || '-'}</td>
                        <td>${p.fornecedores?.nome || '-'}</td>
                        <td>${precoText}</td>
                        <td>${p.qtd_disponivel != null ? p.qtd_disponivel : '-'}</td>
                        <td>${p.ativo ? 'Ativo' : 'Inativo'}</td>
                        <td class="actions-cell">
                            <button class="btn-edit-produto btn-edit" data-id="${p.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete-produto btn-delete" data-id="${p.id}"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `);
            });
        } else {
            tabelaProdutosBody.innerHTML = `<tr><td colspan="9" style="text-align:center;">Nenhum produto cadastrado.</td></tr>`;
        }
    }
    
    // Cadastrar produto
    if (formCadastrarProduto) {
        formCadastrarProduto.addEventListener('submit', async e => {
            e.preventDefault();
            const data = {
                nome: document.getElementById('produto-nome')?.value?.trim(),
                preco_custo: parseFloat((document.getElementById('produto-preco-custo')?.value || '').replace(',', '.')) || 0,
                preco_venda: parseFloat((document.getElementById('produto-preco-venda')?.value || '').replace(',', '.')) || 0,
                qtd_disponivel: parseInt(document.getElementById('produto-qtd')?.value) || 0,
                categoria_id: document.getElementById('produto-categoria')?.value || null,
                fornecedor_id: document.getElementById('produto-fornecedor')?.value || null,
                descricao: document.getElementById('produto-descricao')?.value || null,
                codigo_barras: document.getElementById('produto-cod-barras')?.value || null
            };

            if (!data.nome) {
                return mostrarErro('Nome do produto é obrigatório.');
            }

            const { data: novo, error } = await supabase.from('produtos').insert(data).select().single();
            if (error) return mostrarErro('Erro ao cadastrar: ' + error.message);

            const file = document.getElementById('produto-imagem')?.files?.[0];
            if (file) {
                const path = `produtos_fotos/${novo.id}/${Date.now()}-${file.name}`;
                const { error: upErr } = await supabase.storage.from('petshop-assets').upload(path, file);
                if (!upErr) {
                    const { data: url } = supabase.storage.from('petshop-assets').getPublicUrl(path);
                    await supabase.from('produtos').update({ imagem_url: url.publicUrl }).eq('id', novo.id);
                } else {
                    console.warn('Erro upload imagem produto:', upErr.message);
                }
            }

            mostrarSucesso('Produto cadastrado!');
            formCadastrarProduto.reset();
            await carregarProdutos();
        });
    }

    // Editar produto
    if (formEditarProduto) {
        formEditarProduto.addEventListener('submit', async e => {
            e.preventDefault();
            const id = document.getElementById('edit-produto-id')?.value;
            if (!id) return mostrarErro('ID do produto não informado.');

            const data = {
                nome: document.getElementById('edit-produto-nome')?.value?.trim(),
                preco_custo: parseFloat((document.getElementById('edit-produto-preco-custo')?.value || '').replace(',', '.')) || 0,
                preco_venda: parseFloat((document.getElementById('edit-produto-preco-venda')?.value || '').replace(',', '.')) || 0,
                qtd_disponivel: parseInt(document.getElementById('edit-produto-qtd')?.value) || 0,
                categoria_id: document.getElementById('edit-produto-categoria')?.value || null,
                fornecedor_id: document.getElementById('edit-produto-fornecedor')?.value || null
            };

            const file = document.getElementById('edit-produto-imagem')?.files?.[0];
            if (file) {
                const path = `produtos_fotos/${id}/${Date.now()}-${file.name}`;
                const { error: upErr } = await supabase.storage.from('petshop-assets').upload(path, file, { upsert: true });
                if (!upErr) {
                    const { data: url } = supabase.storage.from('petshop-assets').getPublicUrl(path);
                    data.imagem_url = url.publicUrl;
                } else {
                    console.warn('Erro upload imagem:', upErr.message);
                }
            }

            const { error } = await supabase.from('produtos').update(data).eq('id', id);
            if (error) mostrarErro('Erro ao atualizar: ' + error.message);
            else {
                mostrarSucesso('Produto atualizado!');
                if (modalEditarProduto) modalEditarProduto.style.display = 'none';
                await carregarProdutos();
            }
        });
    }

    // Eventos tabela produtos
    if (tabelaProdutosBody) {
        tabelaProdutosBody.addEventListener('click', async e => {
            const editBtn = e.target.closest('.btn-edit-produto');
            const delBtn = e.target.closest('.btn-delete-produto');
            if (editBtn) {
                const produtoId = editBtn.dataset.id;
                const { data: p, error } = await supabase.from('produtos').select('*').eq('id', produtoId).single();
                if (!error && p) {
                    document.getElementById('edit-produto-id').value = p.id;
                    document.getElementById('edit-produto-nome').value = p.nome || '';
                    document.getElementById('edit-produto-preco-custo').value = p.preco_custo ?? '';
                    document.getElementById('edit-produto-preco-venda').value = p.preco_venda ?? '';
                    document.getElementById('edit-produto-qtd').value = p.qtd_disponivel ?? 0;
                    document.getElementById('edit-produto-categoria').value = p.categoria_id ?? '';
                    document.getElementById('edit-produto-fornecedor').value = p.fornecedor_id ?? '';
                    if (modalEditarProduto) modalEditarProduto.style.display = 'block';
                } else {
                    mostrarErro('Erro ao carregar dados do produto.');
                    console.error(error);
                }
            }
            if (delBtn) {
                await handleDelete({ tabela: 'produtos', id: delBtn.dataset.id, onSuccess: carregarProdutos });
            }
        });
    }

    // Categorias
    async function carregarTabelaCategorias() {
        if (!tabelaCategoriasBody) return;
        const { data, error } = await supabase.from('categorias').select('*').order('id');
        if (error) { console.error("Erro ao carregar categorias:", error); tabelaCategoriasBody.innerHTML = `<tr><td colspan="3">Erro ao carregar categorias.</td></tr>`; return; }
        tabelaCategoriasBody.innerHTML = '';
        if (data && Array.isArray(data)) {
            data.forEach(c => {
                tabelaCategoriasBody.insertAdjacentHTML('beforeend', `
                    <tr>
                        <td>${String(c.id).padStart(5, '0')}</td>
                        <td>${c.nome}</td>
                        <td class="actions-cell">
                            <button class="btn-edit-categoria btn-edit" data-id="${c.id}"><i class="fas fa-edit"></i></button>
                            <button class="btn-delete-categoria btn-delete" data-id="${c.id}"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    </tr>
                `);
            });
        } else {
            tabelaCategoriasBody.innerHTML = `<tr><td colspan="3" style="text-align:center;">Nenhuma categoria cadastrada.</td></tr>`;
        }
    }

    if (formCategoria) {
        formCategoria.addEventListener('submit', async e => {
            e.preventDefault();
            const nome = document.getElementById('categoria-nome')?.value?.trim();
            if (!nome) return mostrarErro('Digite o nome da categoria.');
            const { error } = await supabase.from('categorias').insert({ nome });
            if (!error) {
                mostrarSucesso('Categoria cadastrada!');
                formCategoria.reset();
                await carregarTabelaCategorias();
                await carregarDropdown({ tabela: 'categorias', seletor: '#produto-categoria, #edit-produto-categoria' });
            } else {
                mostrarErro('Erro ao cadastrar categoria: ' + error.message);
            }
        });
    }

    if (tabelaCategoriasBody) {
        tabelaCategoriasBody.addEventListener('click', async e => {
            const editBtn = e.target.closest('.btn-edit-categoria');
            const delBtn = e.target.closest('.btn-delete-categoria');
            if (editBtn) {
                const { data: c, error } = await supabase.from('categorias').select('*').eq('id', editBtn.dataset.id).single();
                if (!error && c) {
                    document.getElementById('edit-categoria-id').value = c.id;
                    document.getElementById('edit-categoria-nome').value = c.nome;
                    if (modalEditarCategoria) modalEditarCategoria.style.display = 'block';
                } else {
                    mostrarErro('Erro ao carregar categoria.');
                }
            }
            if (delBtn) {
                await handleDelete({
                    tabela: 'categorias',
                    id: delBtn.dataset.id,
                    onSuccess: async () => {
                        await carregarTabelaCategorias();
                        await carregarDropdown({ tabela: 'categorias', seletor: '#produto-categoria, #edit-produto-categoria' });
                    }
                });
            }
        });
    }
    
    if (formEditarCategoria) {
        formEditarCategoria.addEventListener('submit', async e => {
            e.preventDefault();
            const id = document.getElementById('edit-categoria-id')?.value;
            const nome = document.getElementById('edit-categoria-nome')?.value?.trim();
            if (!nome) return mostrarErro('O nome não pode ser vazio.');
            const { error } = await supabase.from('categorias').update({ nome }).eq('id', id);
            if (!error) {
                mostrarSucesso('Categoria atualizada!');
                if (modalEditarCategoria) modalEditarCategoria.style.display = 'none';
                await carregarTabelaCategorias();
                await carregarDropdown({ tabela: 'categorias', seletor: '#produto-categoria, #edit-produto-categoria' });
            } else {
                mostrarErro('Erro ao atualizar categoria: ' + error.message);
            }
        });
    }

    // --- Inicialização ---
    carregarProdutos();
    carregarTabelaCategorias();
    carregarDropdown({ tabela: 'categorias', seletor: '#produto-categoria, #edit-produto-categoria' });
    carregarDropdown({ tabela: 'fornecedores', seletor: '#produto-fornecedor, #edit-produto-fornecedor' });
}