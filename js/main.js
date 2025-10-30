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
    
    if (error || !stories || stories.length === 0) {
        const profileContainer = document.getElementById('story-profile-container');
        if (profileContainer) profileContainer.style.display = 'none';
        return;
    }

    const storyImage = document.getElementById('story-image');
    const storyVideo = document.getElementById('story-video');
    const soundBtn = document.getElementById('story-sound-btn');
    const soundBtnIcon = soundBtn?.querySelector('i');
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
        
        if (story.media_type === 'video' && storyVideo) {
            if (soundBtn) soundBtn.classList.remove('story-sound-btn-hidden');
            if (storyImage) storyImage.style.display = 'none';
            storyVideo.style.display = 'block';
            storyVideo.src = story.media_url;
            try { storyVideo.currentTime = 0; } catch {}
            
            // default muted: false (user can toggle)
            storyVideo.muted = false; 
            if (soundBtnIcon) soundBtnIcon.className = 'fas fa-volume-up';
            
            storyVideo.play().catch(e => console.error('Erro ao tocar vídeo:', e));

            storyVideo.ontimeupdate = () => {
                if (!storyVideo.duration || isNaN(storyVideo.duration)) return;
                const progress = (storyVideo.currentTime / storyVideo.duration) * 100;
                if (currentProgressBar) {
                    currentProgressBar.style.transition = 'none';
                    currentProgressBar.style.width = `${progress}%`;
                }
            };

            storyVideo.onended = () => {
                goToNextStory();
            };

        } else { // É uma imagem
            if (soundBtn) soundBtn.classList.add('story-sound-btn-hidden');
            if (storyVideo) storyVideo.style.display = 'none';
            if (storyImage) {
                storyImage.style.display = 'block';
                storyImage.src = story.media_url;
            }

            setTimeout(() => {
                if (currentProgressBar) {
                    currentProgressBar.style.transition = `width 30s linear`;
                    currentProgressBar.style.width = '100%';
                }
            }, 50);

            storyTimer = setTimeout(goToNextStory, 30000);
        }
    }

    function toggleSound() {
        if (!storyVideo) return;
        storyVideo.muted = !storyVideo.muted;
        if (!soundBtnIcon) return;
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

    // cria progress bars
    progressBarsContainer.innerHTML = stories.map(() => `
        <div class="progress-bar"><div class="progress-bar-inner"></div></div>
    `).join('');

    // adiciona listeners com checagem de existência
    if (storyRing) storyRing.addEventListener('click', openViewer);
    if (closeBtn) closeBtn.addEventListener('click', closeViewer);
    if (navNext) navNext.addEventListener('click', goToNextStory);
    if (navPrev) navPrev.addEventListener('click', goToPrevStory);
    if (soundBtn) soundBtn.addEventListener('click', toggleSound);
}

document.addEventListener('DOMContentLoaded', async function() {
    const isDashboardPage = document.querySelector('.dashboard-layout');

    setupUI();
    await setupAuth();

    if (isDashboardPage) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                alert('Acesso negado. Por favor, faça o login.');
                window.location.href = 'acesso-restrito.html';
                return;
            }
        } catch (err) {
            console.warn('Erro ao verificar usuário:', err);
            alert('Acesso negado. Por favor, faça o login.');
            window.location.href = 'acesso-restrito.html';
            return;
        }

        // Roda os scripts específicos do dashboard
        setupDashboard();
        setupClientes();
        setupProdutos();
        setupCadastros();
        setupAgendamentos();
        setupRelatorios();
        setupAdocao(); // lógica de adoção no dashboard
    } else {
        // Roda os scripts das páginas públicas
        setupAdocao(); // lógica de adoção na página pública
        setupServicosPublicos();
        setupStories(); 
    }
});