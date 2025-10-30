import { supabase } from './supabase-config.js';

// Função para validar CPF
function validarCPF(cpf) {
    cpf = cpf.replace(/[^\d]+/g, '');
    if (cpf === '' || cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
    let add = 0;
    for (let i = 0; i < 9; i++) add += parseInt(cpf.charAt(i)) * (10 - i);
    let rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(9))) return false;
    add = 0;
    for (let i = 0; i < 10; i++) add += parseInt(cpf.charAt(i)) * (11 - i);
    rev = 11 - (add % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(cpf.charAt(10))) return false;
    return true;
}

async function carregarTabelaUsuarios() {
    const tabelaUsuariosBody = document.querySelector('#tabela-usuarios tbody');
    if (!tabelaUsuariosBody) return;

    const { data: usuarios, error } = await supabase
        .from('usuarios')
        .select('*')
        .order('id');

    if (error) {
        console.error('Erro ao carregar usuários:', error);
        return;
    }

    tabelaUsuariosBody.innerHTML = '';

    if (usuarios && Array.isArray(usuarios)) {
        usuarios.forEach(user => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${user.id}</td>
                <td>${user.nome_completo}</td>
                <td>${user.email}</td>
                <td>${user.data_nascimento}</td>
                <td>${user.cpf}</td>
                <td>${user.telefone}</td>
                <td class="actions-cell">
                    <button class="btn-edit-usuario btn-edit" data-id="${user.id}" title="Editar"><i class="fas fa-edit"></i></button>
                    <button class="btn-delete-usuario btn-delete" data-id="${user.id}" title="Excluir"><i class="fas fa-trash-alt"></i></button>
                </td>
            `;
            tabelaUsuariosBody.appendChild(tr);
        });
    }
}

export async function setupAuth() {
    const formLogin = document.getElementById('form-login');
    const btnLogout = document.getElementById('btn-logout');
    const formCriarUsuario = document.getElementById('form-criar-usuario');
    const formEditarUsuario = document.getElementById('form-editar-usuario');
    const modalCriarUsuario = document.getElementById('modal-criar-usuario');
    const closeModalCriarUsuario = document.getElementById('close-modal-criar-usuario');
    const btnCriarUsuarioInicio = document.getElementById('btn-criar-usuario-inicio');
    const btnCriarUsuarioLista = document.getElementById('btn-criar-usuario-lista');
    const tabelaUsuariosBody = document.querySelector('#tabela-usuarios tbody');
    const modalEditarUsuario = document.getElementById('modal-editar-usuario');
    const closeModalEditarUsuario = document.getElementById('close-modal-editar-usuario');
    const btnRefreshUsuarios = document.getElementById('btn-refresh-usuarios');
    
    if (btnRefreshUsuarios) {
        btnRefreshUsuarios.addEventListener('click', async () => {
            const icon = btnRefreshUsuarios.querySelector('i');
            icon.classList.add('spin');
            btnRefreshUsuarios.disabled = true;
            await carregarTabelaUsuarios();
            setTimeout(() => {
                icon.classList.remove('spin');
                btnRefreshUsuarios.disabled = false;
            }, 500);
        });
    }
    // ===== LOGIN =====
    if (formLogin) {
        const togglePassword = document.getElementById('toggle-password');
        const passwordInput = document.getElementById('login-password');

        if (togglePassword && passwordInput) {
            togglePassword.addEventListener('click', function () {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');
            });
        }
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            window.location.href = 'dashboard.html';
        }
        formLogin.addEventListener('submit', async (event) => {
            event.preventDefault();
            const loginInput = formLogin.usuario.value.trim();
            const password = formLogin.senha.value;
            let email = loginInput;
            if (!loginInput.includes('@')) {
                const { data: userData, error } = await supabase
                    .from('usuarios')
                    .select('email')
                    .eq('nome_usuario', loginInput)
                    .single();
                if (error || !userData) {
                    alert('Nome de usuário não encontrado!');
                    return;
                }
                email = userData.email;
            }
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert('Erro no login: ' + error.message);
            else if (data.user) window.location.href = 'dashboard.html';
        });
    }

    // ===== LOGOUT =====
    if (btnLogout) {
        btnLogout.addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'acesso-restrito.html';
        });
    }
    
    if (document.querySelector('.dashboard-layout')) {
        let inactivityTimer;
        const timeoutDuration = 60 * 60 * 1000;

        const logoutUser = async () => {
            alert("Sua sessão expirou por inatividade. Por favor, faça o login novamente.");
            await supabase.auth.signOut();
            window.location.href = 'acesso-restrito.html';
        };

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            inactivityTimer = setTimeout(logoutUser, timeoutDuration);
        };

        const userActivityEvents = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
        userActivityEvents.forEach(event => {
            window.addEventListener(event, resetTimer, true);
        });

        resetTimer();

        window.addEventListener('pagehide', () => {
            supabase.auth.signOut();
        });
    }

    // ===== CRIAR USUÁRIO =====
    const openCreateUserModal = () => {
        if (modalCriarUsuario) modalCriarUsuario.style.display = 'block';
    };
    if (btnCriarUsuarioInicio) btnCriarUsuarioInicio.addEventListener('click', openCreateUserModal);
    if (btnCriarUsuarioLista) btnCriarUsuarioLista.addEventListener('click', openCreateUserModal);

    window.addEventListener('click', function(event) {
        if (event.target === modalCriarUsuario) {
            modalCriarUsuario.style.display = 'none';
        }
    });

    if (formCriarUsuario) {
        formCriarUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const nome = document.getElementById('novo-usuario-nome').value.trim();
            const nomeUsuario = document.getElementById('novo-usuario-nome-usuario').value.trim();
            const email = document.getElementById('novo-usuario-email').value.trim();
            const senha = document.getElementById('novo-usuario-senha').value;
            const data_nascimento = document.getElementById('novo-usuario-nascimento').value;
            const cpf = document.getElementById('novo-usuario-cpf').value.trim();
            const telefone = document.getElementById('novo-usuario-telefone').value.trim();

            const { data: validationResult, error: validationError } = await supabase.functions.invoke('validate-cpf', {
                body: { cpf: cpf },
            });

            if (validationError) {
                alert('Erro ao validar CPF: ' + validationError.message);
                return;
            }

            if (!validationResult.isValid) {
                alert('CPF inválido! Por favor, verifique o número digitado.');
                return;
            }

            if (!nome || !nomeUsuario || !email || !senha || !data_nascimento || !cpf || !telefone) {
                alert('Preencha todos os campos obrigatórios!');
                return;
            }

            const { data, error } = await supabase.auth.signUp({ email, password: senha });
            if (error) {
                alert('Erro ao criar usuário: ' + error.message);
                return;
            }

            const userId = data.user?.id;
            if (!userId) {
                alert('Erro ao obter id do usuário criado.');
                return;
            }
            const { error: errorPerfil } = await supabase.from('usuarios').insert({
                id: userId,
                nome_completo: nome,
                nome_usuario: nomeUsuario,
                email,
                data_nascimento,
                cpf,
                telefone
            });

            if (errorPerfil) {
                alert('Usuário Auth criado, mas erro ao salvar dados extras: ' + errorPerfil.message);
            } else {
                alert('Usuário criado! O usuário deve confirmar o e-mail para ativar o acesso.');
                formCriarUsuario.reset();
                if (modalCriarUsuario) modalCriarUsuario.style.display = 'none';
                await carregarTabelaUsuarios();
            }
        });
    }

    // ===== EDITAR E EXCLUIR USUÁRIO =====
    if (tabelaUsuariosBody) {
        tabelaUsuariosBody.addEventListener('click', async (e) => {
            const editBtn = e.target.closest('.btn-edit-usuario');
            const deleteBtn = e.target.closest('.btn-delete-usuario');

            if (editBtn) {
                const usuarioId = editBtn.dataset.id;
                const { data: usuario, error } = await supabase.from('usuarios').select('*').eq('id', usuarioId).single();
                if (error || !usuario) {
                    alert('Erro ao carregar dados do usuário.');
                    return;
                }
                document.getElementById('editar-usuario-id').value = usuario.id;
                document.getElementById('editar-usuario-nome').value = usuario.nome_completo;
                document.getElementById('editar-usuario-nome-usuario').value = usuario.nome_usuario || '';
                document.getElementById('editar-usuario-email').value = usuario.email;
                document.getElementById('editar-usuario-nascimento').value = usuario.data_nascimento || '';
                document.getElementById('editar-usuario-cpf').value = usuario.cpf || '';
                document.getElementById('editar-usuario-telefone').value = usuario.telefone || '';
                if (modalEditarUsuario) modalEditarUsuario.style.display = 'block';
            }

            if (deleteBtn) {
                const usuarioId = deleteBtn.dataset.id;
                const { data: usuario, error: fetchError } = await supabase.from('usuarios').select('nome_completo').eq('id', usuarioId).single();

                if (fetchError || !usuario) {
                    alert('Não foi possível encontrar o usuário para excluir.');
                    return;
                }

                const confirmDelete = confirm(`Tem certeza que deseja excluir o usuário "${usuario.nome_completo}"?\n\nATENÇÃO: Esta ação não pode ser desfeita e removerá o acesso do usuário ao sistema PERMANENTEMENTE.`);

                if (confirmDelete) {
                    const { data, error } = await supabase.functions.invoke('delete-user', {
                        body: { userId: usuarioId },
                    });

                    if (error) {
                        alert('Erro ao excluir usuário: ' + (error.message || 'Verifique o console para mais detalhes.'));
                        console.error(error);
                    } else {
                        alert('Usuário excluído com sucesso!');
                        await carregarTabelaUsuarios();
                    }
                }
            }
        });
    }

    window.addEventListener('click', function(event) {
        if (event.target == modalEditarUsuario) {
            modalEditarUsuario.style.display = 'none';
        }
    });

    if (formEditarUsuario) {
        formEditarUsuario.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('editar-usuario-id').value;
            const nome = document.getElementById('editar-usuario-nome').value.trim();
            const email = document.getElementById('editar-usuario-email').value.trim();
            const data_nascimento = document.getElementById('editar-usuario-nascimento').value;
            const cpf = document.getElementById('editar-usuario-cpf').value.trim();
            const telefone = document.getElementById('editar-usuario-telefone').value.trim();

            if (!nome || !email || !data_nascimento || !cpf || !telefone) {
                alert('Preencha todos os campos obrigatórios!');
                return;
            }

            const { error } = await supabase.from('usuarios').update({
                nome_completo: nome,
                email,
                data_nascimento,
                cpf,
                telefone
            }).eq('id', id);

            if (error) {
                alert('Erro ao atualizar usuário: ' + error.message);
            } else {
                alert('Usuário atualizado com sucesso!');
                if (modalEditarUsuario) modalEditarUsuario.style.display = 'none';
                await carregarTabelaUsuarios();
            }
        });
    }

    await carregarTabelaUsuarios();
}