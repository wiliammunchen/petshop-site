// petshop-site/js/main.js (VERSÃO CORRIGIDA - chamar carregarAnunciosDashboard apenas após DOM ready)

import { setupAuth } from './auth.js';
import { setupUI } from './ui.js';
import { setupClientes } from './clientes.js';
import { setupProdutos } from './produtos.js';
import { setupCadastros } from './cadastros.js';
import { supabase } from './supabase-config.js';
import { setupAgendamentos } from './agendamentos.js';
import { setupDashboard } from './dashboard.js';
import { setupAdocao } from './adocao.js';
import { setupServicosPublicos } from './servicos.js';
import { setupRelatorios } from './relatorios.js';
import { setupBackup } from './backup.js';

// NOTE: removed the top-level import('./adocao.js') that previously executed too early.
// We'll import adocao.js dynamically later, after DOMContentLoaded and after dashboard init.

async function setupStories() {
    const storyRing = document.getElementById('story-profile-ring'); 
    const viewer = document.getElementById('story-viewer');
    
    if (!storyRing || !viewer) {
        const profileContainer = document.getElementById('story-profile-container');
        if (profileContainer) profileContainer.style.display = 'none';
        return;
    }

    const { data: stories, error } = await supabase
        .from('stories')
        .select('media_url, media_type')
        .order('created_at', { ascending: true });
    
    if (error || stories.length === 0) {
        const profileContainer = document.getElementById('story-profile-container');
        if (profileContainer) profileContainer.style.display = 'none';
        return;
    }

    const storyImage = document.getElementById('story-image');
    const storyVideo = document.getElementById('story-video');
    const soundBtn = document.getElementById('story-sound-btn');
    const soundBtnIcon = soundBtn.querySelector('i');
    const progressBarsContainer = document.getElementById('story-progress-bars');
    const closeBtn = document.getElementById('story-close-btn');
    const navPrev = document.getElementById('story-nav-prev');
    const navNext = document.getElementById('story-nav-next');
    
    let currentIndex = 0;
    let storyTimer;

    function resetProgressBars() {
        document.querySelectorAll('.progress-bar-inner').forEach((bar) => {
            bar.style.transition = 'none';
            bar.style.width = '0%';
        });
    }

    function fillProgressBars(upToIndex) {
         document.querySelectorAll('.progress-bar-inner').forEach((bar, barIndex) => {
            if (barIndex < upToIndex) {
                bar.style.width = '100%';
            }
        });
    }

    function showStory(index) {
        clearTimeout(storyTimer);
        if (storyVideo) {
            storyVideo.pause();
        }

        const story = stories[index];
        const currentProgressBar = document.querySelectorAll('.progress-bar-inner')[index];
        
        resetProgressBars();
        fillProgressBars(index);
        
        if (story.media_type === 'video') {
            soundBtn.classList.remove('story-sound-btn-hidden');
            storyImage.style.display = 'none';
            storyVideo.style.display = 'block';
            storyVideo.src = story.media_url;
            storyVideo.currentTime = 0;
            
            storyVideo.muted = false; 
            soundBtnIcon.className = 'fas fa-volume-up';
            
            storyVideo.play().catch(e => console.error("Erro ao tocar vídeo:", e));

            storyVideo.ontimeupdate = () => {
                const progress = (storyVideo.currentTime / storyVideo.duration) * 100;
                currentProgressBar.style.transition = 'none';
                currentProgressBar.style.width = `${progress}%`;
            };

            storyVideo.onended = () => {
                goToNextStory();
            };

        } else { // É uma imagem
            soundBtn.classList.add('story-sound-btn-hidden');
            storyVideo.style.display = 'none';
            storyImage.style.display = 'block';
            storyImage.src = story.media_url;

            setTimeout(() => {
                currentProgressBar.style.transition = `width 30s linear`;
                currentProgressBar.style.width = '100%';
            }, 50);

            storyTimer = setTimeout(goToNextStory, 30000);
        }
    }

    function toggleSound() {
        storyVideo.muted = !storyVideo.muted;
        if (storyVideo.muted) {
            soundBtnIcon.className = 'fas fa-volume-mute';
        } else {
            soundBtnIcon.className = 'fas fa-volume-up';
        }
    }

    function goToNextStory() {
        if (currentIndex < stories.length - 1) {
            currentIndex++;
            showStory(currentIndex);
        } else {
            closeViewer();
        }
    }

    function goToPrevStory() {
        if (currentIndex > 0) {
            currentIndex--;
            showStory(currentIndex);
        }
    }

    function openViewer() {
        currentIndex = 0;
        viewer.classList.remove('story-viewer-hidden');
        showStory(currentIndex);
    }

    function closeViewer() {
        clearTimeout(storyTimer);
        if (storyVideo) {
            storyVideo.pause();
        }
        viewer.classList.add('story-viewer-hidden');
    }

    progressBarsContainer.innerHTML = stories.map(() => `
        <div class="progress-bar"><div class="progress-bar-inner"></div></div>
    `).join('');

    storyRing.addEventListener('click', openViewer);
    closeBtn.addEventListener('click', closeViewer);
    navNext.addEventListener('click', goToNextStory);
    navPrev.addEventListener('click', goToPrevStory);
    soundBtn.addEventListener('click', toggleSound);
}

document.addEventListener('DOMContentLoaded', async function() {
    const isDashboardPage = document.querySelector('.dashboard-layout');

    setupUI();
    await setupAuth();

    if (isDashboardPage) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert("Acesso negado. Por favor, faça o login.");
            window.location.href = 'acesso-restrito.html';
        } else {
            // Roda os scripts específicos do dashboard
            setupDashboard();
            setupClientes();
            setupProdutos();
            setupCadastros();
            setupAgendamentos();
            setupRelatorios();
            setupAdocao(); 
            setupBackup();
            

            // IMPORTANTE: Garantir que a tabela do dashboard seja populada
            // Importa dinamicamente adocao.js e chama carregarAnunciosDashboard
            // somente após o DOM estar pronto e as inicializações acima terem rodado.
            try {
              const mod = await import('./adocao.js');
              if (mod && typeof mod.carregarAnunciosDashboard === 'function') {
                await mod.carregarAnunciosDashboard();
              }
            } catch (err) {
              console.error('Erro ao inicializar lista de anúncios no dashboard:', err);
            }

            // conecta botão de refresh do dashboard, caso exista
            const btnRefresh = document.getElementById('btn-refresh-adocao');
            if (btnRefresh) {
              btnRefresh.addEventListener('click', async () => {
                btnRefresh.disabled = true;
                try {
                  const mod = await import('./adocao.js');
                  if (mod && typeof mod.carregarAnunciosDashboard === 'function') {
                    await mod.carregarAnunciosDashboard();
                  }
                } catch (err) {
                  console.error('Erro ao atualizar anúncios:', err);
                } finally {
                  btnRefresh.disabled = false;
                }
              });
            }
        }
    } else {
        // Roda os scripts das páginas públicas
        setupAdocao(); // Chamada para a lógica de adoção na pág. pública
        setupServicosPublicos();
        setupStories(); 
    }
});