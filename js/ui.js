export function setupUI() {
    const hamburger = document.querySelector(".hamburger");
    if (hamburger) {
        const navMenu = document.querySelector(".nav-links");
        hamburger.addEventListener("click", () => {
            hamburger.classList.toggle("active");
            navMenu.classList.toggle("active");
        });
        document.querySelectorAll(".nav-links a").forEach(n => n.addEventListener("click", () => {
            hamburger.classList.remove("active");
            navMenu.classList.remove("active");
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
            // Sobe na árvore DOM a partir do link ativo
            while (currentElement && currentElement.parentElement) {
                const parentSubmenu = currentElement.closest('.submenu');
                // Se encontrar um submenu pai
                if (parentSubmenu) {
                    // Adiciona a classe 'open' para garantir que esteja visível
                    if (!parentSubmenu.classList.contains('open')) {
                        parentSubmenu.classList.add('open');
                    }
                    // **PONTO DA CORREÇÃO**: Move o ponto de partida da próxima busca para FORA do submenu já encontrado
                    currentElement = parentSubmenu.parentElement;
                } else {
                    // Se não houver mais submenus pais, para o loop
                    break;
                }
            }
        }
    };

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const parentLi = this.parentElement;

            // Se o link clicado é um item que abre um submenu
            if (this.classList.contains("has-submenu")) {
                // Busca o próximo irmão que seja .submenu, ignorando comentários e espaços
                let submenu = this.nextElementSibling;
                while (submenu && !(submenu.nodeType === 1 && submenu.classList.contains("submenu"))) {
                    submenu = submenu.nextElementSibling;
                }
                if (submenu) {
                    // Fecha outros submenus abertos no mesmo nível
                    const parentUl = parentLi.parentElement;
                    parentUl.querySelectorAll(".submenu.open").forEach(openSubmenu => {
                    if (openSubmenu !== submenu) openSubmenu.classList.remove("open");
                    });
                    // Abre/fecha o submenu do menu clicado
                    submenu.classList.toggle("open");
                }
            }

            // Se o link clicado é um item final que mostra uma view
            else if (this.dataset.view) {
                switchView(`view-${this.dataset.view}`);
                // Em telas móveis, fecha a sidebar após a seleção
                if (window.innerWidth <= 992) {
                    sidebar.classList.remove('open');
                }
            }
        });
    });
    // ==========================================================

    if (menuToggle) {
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
        if (event.target.classList.contains('modal') || event.target.classList.contains('modal-admin')) {
            event.target.style.display = 'none';
        }
    });

    // ====== Máscara telefone ======
    const setupPhoneMask = (inputId) => {
        const input = document.getElementById(inputId);
        if (input) {
            input.addEventListener('input', (e) => {
                e.target.value = e.target.value
                    .replace(/\D/g, '')
                    .replace(/(\d{2})(\d)/, "($1) $2")
                    .replace(/(\d)(\d{4})$/, "$1-$2");
            });
        }
    };
    setupPhoneMask('cliente-telefone');
    setupPhoneMask('edit-cliente-telefone');

    // ===== Inicialização padrão =====
    switchView('view-inicio');
}