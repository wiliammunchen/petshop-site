// petshop-site/js/ui.js
// Adaptado/robustecido para a UI administrativa.
// Não depende diretamente do banco de dados, mas garante comportamento consistente
// em diferentes estruturas de DOM e corrige navegação/submenus.

export function setupUI() {
    const hamburger = document.querySelector(".hamburger");
    if (hamburger) {
        const navMenu = document.querySelector(".nav-links");
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            if (navMenu) navMenu.classList.toggle("active");
        });
        document.querySelectorAll(".nav-links a").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            if (navMenu) navMenu.classList.remove("active");
        }));
    }

    const navLinks = document.querySelectorAll('.sidebar-nav .nav-link');
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.querySelector('.sidebar');

    // ====== Navegação / views (LÓGICA CORRIGIDA E FINAL) ======
    const views = document.querySelectorAll('.main-content .view');

    const switchView = (viewId) => {
        // Esconde todas as views
        views.forEach(v => v.classList.remove('active'));
        // Mostra a view correta
        const activeView = document.getElementById(viewId);
        if (activeView) activeView.classList.add('active');

        let activeLink = null;
        // Remove a classe 'active-link' de todos os links
        navLinks.forEach(l => l.classList.remove('active-link'));
        // Encontra o link que corresponde à view atual e o marca como ativo
        for (const l of navLinks) {
            if (l.dataset.view === viewId.replace('view-', '')) {
                l.classList.add('active-link');
                activeLink = l;
                break; // Para o loop assim que encontrar o link
            }
        }

        // Se um link foi ativado, garante que todos os seus menus pais fiquem abertos
        if (activeLink) {
            let currentElement = activeLink;
            // Sobe na árvore DOM a partir do link ativo e abre submenus pais
            while (currentElement && currentElement.parentElement) {
                const parentSubmenu = currentElement.closest('.submenu');
                if (parentSubmenu) {
                    if (!parentSubmenu.classList.contains('open')) {
                        parentSubmenu.classList.add('open');
                    }
                    // Move o ponto de partida para o elemento pai do submenu encontrado
                    currentElement = parentSubmenu.parentElement;
                } else {
                    break;
                }
            }
        }
    };

    // Inicial marca a view inicial (se existir)
    // switchView('view-inicio'); // permanecemos com chamada no final para garantir inicialização

    // Tratamento de cliques nos links da sidebar
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const parentLi = this.parentElement;

            // Se o link clicado é um item que abre um submenu
            if (this.classList.contains("has-submenu")) {
                // Busca o próximo irmão que seja .submenu, ignorando nós de texto
                let submenu = this.nextElementSibling;
                while (submenu && !(submenu.nodeType === 1 && submenu.classList.contains("submenu"))) {
                    submenu = submenu.nextElementSibling;
                }
                if (submenu) {
                    // Fecha outros submenus abertos no mesmo nível
                    const parentUl = parentLi && parentLi.parentElement;
                    if (parentUl) {
                        parentUl.querySelectorAll(":scope > .has-submenu + .submenu.open, :scope > li > .submenu.open").forEach(openSubmenu => {
                            if (openSubmenu !== submenu) openSubmenu.classList.remove("open");
                        });
                    }
                    // Abre/fecha o submenu do menu clicado
                    submenu.classList.toggle("open");
                }
            }

            // Se o link clicado é um item final que mostra uma view
            else if (this.dataset.view) {
                switchView(`view-${this.dataset.view}`);
                // Em telas móveis, fecha a sidebar após a seleção
                if (window.innerWidth <= 992 && sidebar) {
                    sidebar.classList.remove('open');
                }
            }
        });
    });
    // ==========================================================

    if (menuToggle && sidebar) {
        menuToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
    }

    // ====== Fechar modais ======
    document.querySelectorAll('.close-modal-admin').forEach(btn => {
        btn.addEventListener('click', function() {
            const modal = this.closest('.modal-admin, .modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    window.addEventListener('click', (event) => {
        if (event.target && (event.target.classList.contains('modal') || event.target.classList.contains('modal-admin'))) {
            event.target.style.display = 'none';
        }
    });

    // ====== Máscara telefone ======
    const setupPhoneMask = (inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', (e) => {
                // Mantém apenas dígitos e aplica máscara (xx) xxxxx-xxxx ou (xx) xxxx-xxxx conforme comprimento
                let v = e.target.value.replace(/\D/g, '');
                if (v.length > 11) v = v.slice(0, 11);
                if (v.length > 10) {
                    v = v.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
                } else {
                    v = v.replace(/(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3").replace(/-$/, '');
                }
                e.target.value = v;
            });
        }
    };
    setupPhoneMask('cliente-telefone');
    setupPhoneMask('edit-cliente-telefone');
    setupPhoneMask('fornecedor-telefone');
    setupPhoneMask('novo-usuario-telefone');
    setupPhoneMask('editar-usuario-telefone');

    // ===== Inicialização padrão =====
    // Se houver a view-inicio no DOM, ativamos; caso contrário, ativa a primeira view encontrada
    if (document.getElementById('view-inicio')) {
        switchView('view-inicio');
    } else if (views && views.length > 0) {
        const firstView = views[0].id;
        if (firstView) switchView(firstView);
    }
}