// js/backup.js (VERSÃO DEBUG)
// Substitua temporariamente este arquivo para coletar logs detalhados.
// Remova os console.logs quando problema estiver identificado.

import { supabase } from './supabase-config.js';
import { mostrarSucesso, mostrarErro } from './notificacoes.js';

let pendingBackupFile = null;

function createStatusArea() {
    let area = document.getElementById('backup-debug-status');
    if (!area) {
        area = document.createElement('div');
        area.id = 'backup-debug-status';
        area.style.position = 'fixed';
        area.style.right = '20px';
        area.style.bottom = '20px';
        area.style.width = '320px';
        area.style.maxHeight = '40vh';
        area.style.overflow = 'auto';
        area.style.zIndex = '20000';
        area.style.background = 'rgba(0,0,0,0.75)';
        area.style.color = 'white';
        area.style.fontSize = '12px';
        area.style.padding = '10px';
        area.style.borderRadius = '8px';
        area.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        area.innerHTML = '<strong>DEBUG: backup</strong><div id="backup-debug-log" style="margin-top:8px;"></div>';
        document.body.appendChild(area);
    }
    return document.getElementById('backup-debug-log');
}

function debugLog(msg, obj) {
    try {
        const logArea = createStatusArea();
        const time = new Date().toLocaleTimeString();
        const line = document.createElement('div');
        line.style.marginBottom = '6px';
        line.innerText = `[${time}] ${msg}`;
        logArea.insertBefore(line, logArea.firstChild);
        // Also console.log with object if provided
        if (obj !== undefined) {
            console.log('[backup-debug]', msg, obj);
        } else {
            console.log('[backup-debug]', msg);
        }
    } catch (e) {
        // fallback
        console.log('[backup-debug fallback]', msg, obj, e);
    }
}

// download JSON (same helper)
function downloadJson(data, filename) {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// EXPORT
async function exportarDados(e) {
    e.preventDefault();
    debugLog('exportarDados: iniciado', null);
    const form = e.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const checkboxes = form.querySelectorAll('.backup-tabela-checkbox:checked');

    if (checkboxes.length === 0) {
        mostrarErro('Selecione pelo menos uma tabela para fazer o backup.');
        debugLog('exportarDados: nenhuma tabela selecionada');
        return;
    }

    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner spin"></i> Gerando Backup...';

    const backupData = {};
    const tabelasSelecionadas = Array.from(checkboxes).map(cb => cb.value);
    debugLog('exportarDados: tabelas selecionadas', tabelasSelecionadas);

    try {
        for (const tabela of tabelasSelecionadas) {
            debugLog(`exportarDados: consultando tabela ${tabela}`);
            const { data, error } = await supabase.from(tabela).select('*');
            if (error) throw new Error(`Erro ao buscar dados da tabela "${tabela}": ${error.message}`);
            backupData[tabela] = data;
            debugLog(`exportarDados: ${tabela} -> ${Array.isArray(data) ? data.length : 'n/a'} registros`);
        }

        const today = new Date().toISOString().slice(0, 10);
        downloadJson(backupData, `backup_petshop_${today}.json`);
        mostrarSucesso('Backup gerado e baixado com sucesso!');
        debugLog('exportarDados: concluído com sucesso');
    } catch (error) {
        debugLog('exportarDados: erro', error.message || error);
        mostrarErro(error.message || 'Erro ao gerar backup.');
    } finally {
        submitButton.disabled = false;
        submitButton.innerHTML = '<i class="fas fa-file-export"></i> Gerar e Baixar Backup';
    }
}

// Setup do input de arquivo com logs detalhados
function setupArquivoInputBehavior() {
    debugLog('setupArquivoInputBehavior: iniciando');
    const fileInput = document.getElementById('arquivo-backup');
    const formImportar = document.getElementById('form-importar-backup');
    const submitButton = formImportar?.querySelector('button[type="submit"]');

    debugLog('setupArquivoInputBehavior: elementos', { fileInputExists: !!fileInput, formImportarExists: !!formImportar, submitBtnExists: !!submitButton });

    // cria info node se não existir
    let infoNode = document.getElementById('arquivo-backup-info');
    if (!infoNode && fileInput) {
        infoNode = document.createElement('div');
        infoNode.id = 'arquivo-backup-info';
        infoNode.style.marginTop = '0.5rem';
        fileInput.parentNode.insertBefore(infoNode, fileInput.nextSibling);
    }

    if (fileInput) {
        if (submitButton) submitButton.disabled = true;
        fileInput.addEventListener('change', async () => {
            try {
                debugLog('input change: evento disparado', fileInput.files ? fileInput.files.length : 0);
                const file = fileInput.files?.[0] || null;
                pendingBackupFile = null;
                if (!file) {
                    debugLog('input change: arquivo não selecionado');
                    if (submitButton) submitButton.disabled = true;
                    if (infoNode) infoNode.innerHTML = '';
                    return;
                }

                if (!file.name.toLowerCase().endsWith('.json')) {
                    mostrarErro('Apenas arquivos .json são aceitos para restauração.');
                    debugLog('input change: extensão inválida', file.name);
                    fileInput.value = '';
                    if (submitButton) submitButton.disabled = true;
                    if (infoNode) infoNode.innerHTML = '';
                    return;
                }

                debugLog('input change: lendo arquivo para pré-visualizar chaves');
                const text = await file.text();
                let parsed;
                try {
                    parsed = JSON.parse(text);
                } catch (parseErr) {
                    debugLog('input change: parse JSON falhou', parseErr.message);
                    mostrarErro('JSON inválido. Verifique o arquivo.');
                    fileInput.value = '';
                    if (submitButton) submitButton.disabled = true;
                    if (infoNode) infoNode.innerHTML = '';
                    return;
                }

                const tabelas = Object.keys(parsed || {});
                debugLog('input change: tabelas encontradas', tabelas);
                if (infoNode) {
                    if (tabelas.length === 0) {
                        infoNode.innerHTML = '<small style="color: #dc3545;">Arquivo JSON sem tabelas reconhecíveis.</small>';
                    } else {
                        infoNode.innerHTML = `<small>Arquivo contém ${tabelas.length} tabela(s): <strong>${tabelas.join(', ')}</strong></small>`;
                    }
                }

                pendingBackupFile = file;
                debugLog('input change: pendingBackupFile definido', { name: file.name, size: file.size });

                if (submitButton) submitButton.disabled = false;
            } catch (err) {
                debugLog('input change: exceção', err);
                console.error(err);
            }
        });
    } else {
        debugLog('setupArquivoInputBehavior: fileInput não encontrado no DOM');
    }
}

async function iniciarImportacao(e) {
    try {
        e.preventDefault();
    } catch (e) {
        // se evento não for um submit, ignore
    }
    debugLog('iniciarImportacao: acionado. Estado pendingBackupFile:', pendingBackupFile ? pendingBackupFile.name : null);

    const fileInput = document.getElementById('arquivo-backup');
    const file = pendingBackupFile || fileInput?.files?.[0];

    if (!file) {
        mostrarErro('Por favor, selecione um arquivo de backup (.json) antes de importar.');
        debugLog('iniciarImportacao: nenhum arquivo encontrado');
        return;
    }

    try {
        // ler rápido e extrair chaves
        debugLog('iniciarImportacao: lendo arquivo para extrair tabelas (preview)');
        const text = await file.text();
        let parsed = null;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            debugLog('iniciarImportacao: parse JSON falhou', err.message);
            mostrarErro('Arquivo inválido. JSON não pôde ser lido.');
            return;
        }
        const tabelas = Object.keys(parsed || {});
        debugLog('iniciarImportacao: tabelas no arquivo', tabelas);

        const modal = document.getElementById('modal-confirmar-importacao');
        if (!modal) {
            debugLog('iniciarImportacao: modal não encontrado');
            mostrarErro('Modal de confirmação não encontrado.');
            return;
        }

        // preenche lista de tabelas no modal (id: modal-backup-tables-list)
        let listContainer = modal.querySelector('#modal-backup-tables-list');
        if (!listContainer) {
            listContainer = document.createElement('div');
            listContainer.id = 'modal-backup-tables-list';
            listContainer.style.margin = '0.5rem 0 1rem 0';
            listContainer.style.padding = '0.6rem';
            listContainer.style.backgroundColor = '#fff7ed';
            listContainer.style.borderLeft = '4px solid #f59e0b';
            listContainer.style.borderRadius = '6px';
            const referenceNode = modal.querySelector('.modal-header') || modal.querySelector('h2') || modal.querySelector('p');
            if (referenceNode && referenceNode.parentNode) {
                referenceNode.parentNode.insertBefore(listContainer, referenceNode.nextSibling);
            } else {
                modal.querySelector('.modal-admin-content')?.appendChild(listContainer);
            }
        }

        if (!tabelas || tabelas.length === 0) {
            listContainer.innerHTML = `<small style="color:#a21caf;">Arquivo válido, mas não foram encontradas tabelas.</small>`;
        } else {
            listContainer.innerHTML = `<strong>O arquivo contém as seguintes tabelas (serão substituídas):</strong>
                <ul style="margin:0.5rem 0 0 1.1rem;">${tabelas.map(t => `<li>${t}</li>`).join('')}</ul>
                <p style="margin-top:0.5rem; color:#b91c1c;"><strong>ATENÇÃO:</strong> A importação apagará os dados EXISTENTES dessas tabelas antes de inserir os dados do backup.</p>`;
        }

        modal.style.display = 'block';
        const pw = modal.querySelector('#importar-senha-confirmacao');
        if (pw) { pw.value = ''; try { pw.focus(); } catch (ignore) {} }

        pendingBackupFile = file;
        debugLog('iniciarImportacao: arquivo guardado em pendingBackupFile', { name: file.name, size: file.size });
    } catch (err) {
        debugLog('iniciarImportacao: exceção', err);
        mostrarErro('Erro ao iniciar importação. Veja o console.');
    }
}

async function executarRestauracao(file) {
    debugLog('executarRestauracao: iniciando', file ? file.name : null);
    if (!file) throw new Error('Arquivo de backup não encontrado. Por favor, selecione novamente e tente importar.');

    const formImportar = document.getElementById('form-importar-backup');
    const submitButton = formImportar?.querySelector('button[type="submit"]');

    if (submitButton) {
        submitButton.disabled = true;
        submitButton.innerHTML = '<i class="fas fa-spinner spin"></i> Restaurando...';
    }

    // fecha modal
    const modal = document.getElementById('modal-confirmar-importacao');
    if (modal) modal.style.display = 'none';

    try {
        const text = await file.text();
        const backupData = JSON.parse(text);
        const tabelasNoBackup = Object.keys(backupData);
        debugLog('executarRestauracao: tabelas para restaurar', tabelasNoBackup);

        for (const tabela of tabelasNoBackup) {
            debugLog(`executarRestauracao: limpando tabela ${tabela}`);
            const { error: deleteError } = await supabase.from(tabela).delete().neq('id', -1);
            if (deleteError) throw new Error(`Erro ao limpar a tabela "${tabela}": ${deleteError.message}`);
            debugLog(`executarRestauracao: inserindo ${backupData[tabela]?.length || 0} registros em ${tabela}`);
            const dadosParaInserir = backupData[tabela];
            if (dadosParaInserir && dadosParaInserir.length > 0) {
                const { error: insertError } = await supabase.from(tabela).insert(dadosParaInserir);
                if (insertError) throw new Error(`Erro ao importar dados para a tabela "${tabela}": ${insertError.message}`);
            }
        }

        mostrarSucesso('Backup restaurado com sucesso! A página será recarregada.');
        debugLog('executarRestauracao: concluído com sucesso');
        pendingBackupFile = null;
        setTimeout(() => window.location.reload(), 1500);
    } catch (err) {
        debugLog('executarRestauracao: erro', err);
        mostrarErro(`Falha na restauração: ${err.message}`);
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.innerHTML = '<i class="fas fa-hdd"></i> Importar e Substituir Dados';
        }
        throw err;
    }
}

async function validarSenhaEContinuar(e) {
    try { e.preventDefault(); } catch (ignore) {}
    debugLog('validarSenhaEContinuar: acionado');
    const form = e.target;
    const passwordInput = form.querySelector('#importar-senha-confirmacao');
    const password = passwordInput?.value;
    const errorField = form.querySelector('#import-password-error');
    const modalSubmitButton = form.querySelector('button[type="submit"]');

    if (errorField) { errorField.style.display = 'none'; errorField.textContent = ''; }
    if (!password) {
        if (errorField) { errorField.textContent = 'Digite sua senha para confirmar.'; errorField.style.display = 'block'; }
        debugLog('validarSenhaEContinuar: senha vazia');
        return;
    }

    modalSubmitButton.disabled = true;
    debugLog('validarSenhaEContinuar: re-autenticando usuário');

    const { data: currentUserData } = await supabase.auth.getUser();
    const user = currentUserData?.user;
    if (!user) {
        mostrarErro('Sessão expirada. Faça o login novamente.');
        debugLog('validarSenhaEContinuar: usuário não encontrado (sessão)');
        window.location.href = 'acesso-restrito.html';
        return;
    }

    try {
        const { error } = await supabase.auth.signInWithPassword({ email: user.email, password: password });
        if (error) {
            debugLog('validarSenhaEContinuar: re-login falhou', error.message);
            if (errorField) { errorField.textContent = 'Senha incorreta. Tente novamente.'; errorField.style.display = 'block'; }
            modalSubmitButton.disabled = false;
            return;
        }

        debugLog('validarSenhaEContinuar: re-login OK, executando restauracao com pendingBackupFile', pendingBackupFile ? pendingBackupFile.name : null);
        try {
            await executarRestauracao(pendingBackupFile);
            form.reset();
        } catch (restoreErr) {
            debugLog('validarSenhaEContinuar: erro na restauracao', restoreErr);
            if (errorField) { errorField.textContent = restoreErr.message || 'Erro na restauração'; errorField.style.display = 'block'; }
        }
    } catch (err) {
        debugLog('validarSenhaEContinuar: exceção', err);
        if (errorField) { errorField.textContent = 'Erro ao validar a senha. Veja o console.'; errorField.style.display = 'block'; }
    } finally {
        modalSubmitButton.disabled = false;
    }
}

export function setupBackup() {
    debugLog('setupBackup: iniciando configuração');
    const formExportar = document.getElementById('form-exportar-backup');
    const formImportar = document.getElementById('form-importar-backup');
    const formConfirmarImportacao = document.getElementById('form-confirmar-importacao');
    const checkboxMaster = document.getElementById('backup-todos');

    debugLog('setupBackup: elementos encontrados', {
        formExportar: !!formExportar,
        formImportar: !!formImportar,
        formConfirmarImportacao: !!formConfirmarImportacao,
        checkboxMaster: !!checkboxMaster
    });

    if (formExportar) {
        formExportar.addEventListener('submit', exportarDados);
        debugLog('setupBackup: listener exportar ligado');
    }

    setupArquivoInputBehavior();

    if (formImportar) {
        formImportar.addEventListener('submit', iniciarImportacao);
        debugLog('setupBackup: listener iniciarImportacao (formImportar) ligado');

        // também ligamos ao botão explicitamente (redundância)
        const btn = formImportar.querySelector('button[type="submit"]');
        if (btn) {
            btn.addEventListener('click', (ev) => {
                debugLog('botao importar clicado (redundante), evento:', ev.type);
                // não chamar preventDefault aqui: queremos que o form dispare submit e o handler anterior trate
            });
            debugLog('setupBackup: listener click no botão de import ligado (redundante)');
        } else {
            debugLog('setupBackup: botão de importacao nao encontrado dentro do formImportar');
        }
    }

    if (formConfirmarImportacao) {
        formConfirmarImportacao.addEventListener('submit', validarSenhaEContinuar);
        debugLog('setupBackup: listener validarSenhaEContinuar ligado (modal)');
        const toggle = formConfirmarImportacao.querySelector('.password-toggle-icon');
        const passwordInput = formConfirmarImportacao.querySelector('input[type="password"]');
        if (toggle && passwordInput) {
            toggle.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                toggle.classList.toggle('fa-eye');
                toggle.classList.toggle('fa-eye-slash');
                debugLog('password toggle clicado, novo tipo:', type);
            });
        } else {
            debugLog('toggle de senha não encontrado no modal');
        }
    } else {
        debugLog('setupBackup: form-confirmar-importacao (modal) nao encontrado');
    }

    if (checkboxMaster) {
        checkboxMaster.addEventListener('change', (e) => {
            const isChecked = e.target.checked;
            debugLog('checkboxMaster change:', isChecked);
            document.querySelectorAll('.backup-tabela-checkbox').forEach(cb => { cb.checked = isChecked; });
        });
    }

    debugLog('setupBackup: finalizado');
}