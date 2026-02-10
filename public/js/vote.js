// ============================================
// SURVEI 25 - Voting Page Logic
// ============================================

let surveyData = null;
let selectedOptions = new Set();

document.addEventListener('DOMContentLoaded', () => {
    checkSession();
});

// Toast notification
function showToast(message, type = 'error') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100px)';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Get survey ID from URL query parameter
function getSurveyIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('sid');
}

// Check if user has a valid session (with retry)
async function checkSession(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch('/api/auth/session');
            const data = await res.json();

            if (data.role === 'student' && data.surveyId) {
                loadSurvey(data.surveyId);
                return;
            }

            // If session not ready yet, wait and retry
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
        } catch (err) {
            if (i < retries - 1) {
                await new Promise(resolve => setTimeout(resolve, 500));
                continue;
            }
        }
    }

    // Fallback: try URL param
    const sidFromUrl = getSurveyIdFromUrl();
    if (sidFromUrl) {
        loadSurvey(sidFromUrl);
        return;
    }

    // No valid session and no fallback — redirect to home
    window.location.href = '/';
}

// Load survey data
async function loadSurvey(surveyId) {
    try {
        const res = await fetch(`/api/surveys/${surveyId}`);
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error || 'Survei tidak ditemukan.');
            setTimeout(() => window.location.href = '/', 2000);
            return;
        }

        surveyData = data;
        renderSurvey();
    } catch (err) {
        showToast('Gagal memuat survei.');
    }
}

// Extract YouTube video ID from various URL formats
function extractYouTubeId(url) {
    if (!url) return null;
    const patterns = [
        /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
        /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
        /(?:youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

// Render the survey
function renderSurvey() {
    document.getElementById('surveyTitle').textContent = surveyData.title;
    document.getElementById('surveyDescription').textContent = surveyData.description || '';
    document.getElementById('maxOptions').textContent = surveyData.max_options;
    document.getElementById('maxCount').textContent = surveyData.max_options;

    const grid = document.getElementById('optionsGrid');
    grid.innerHTML = '';

    surveyData.options.forEach((opt, index) => {
        const card = document.createElement('div');
        card.className = 'option-card';
        card.dataset.optionId = opt.option_id;

        const youtubeId = extractYouTubeId(opt.youtube_link);
        const thumbnailUrl = youtubeId
            ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
            : (opt.image_url || '');

        let thumbnailHtml = '';
        if (thumbnailUrl || youtubeId) {
            thumbnailHtml = `
                <div class="option-thumbnail">
                    <img src="${thumbnailUrl}" alt="${opt.label}" onerror="this.parentElement.style.display='none'">
                    ${youtubeId ? `<button class="option-play-btn" data-youtube="${youtubeId}" data-title="${opt.label}" onclick="openVideo(event, this)">▶</button>` : ''}
                </div>
            `;
        }

        card.innerHTML = `
            ${thumbnailHtml}
            <div class="option-body">
                <h3>${opt.label}</h3>
                ${opt.description ? `<p>${opt.description}</p>` : ''}
            </div>
        `;

        card.addEventListener('click', (e) => {
            // Don't toggle if clicking play button
            if (e.target.closest('.option-play-btn')) return;
            toggleOption(card, opt.option_id);
        });

        grid.appendChild(card);
    });

    // Setup submit bar
    document.getElementById('submitVoteBtn').addEventListener('click', () => {
        showConfirmDialog();
    });

    // Setup confirm dialog
    document.getElementById('confirmCancel').addEventListener('click', hideConfirmDialog);
    document.getElementById('confirmOk').addEventListener('click', submitVote);

    // Setup modal close
    document.getElementById('modalClose').addEventListener('click', closeVideo);
    document.getElementById('videoModal').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeVideo();
    });
}

// Toggle option selection
function toggleOption(card, optionId) {
    if (card.classList.contains('disabled')) return;

    if (selectedOptions.has(optionId)) {
        selectedOptions.delete(optionId);
        card.classList.remove('selected');
    } else {
        if (selectedOptions.size >= surveyData.max_options) {
            showToast(`Maksimal ${surveyData.max_options} pilihan!`);
            return;
        }
        selectedOptions.add(optionId);
        card.classList.add('selected');
    }

    updateUI();
}

// Update selection count and submit bar
function updateUI() {
    const count = selectedOptions.size;
    document.getElementById('selectedCount').textContent = count;

    const submitBar = document.getElementById('submitBar');
    const submitBtn = document.getElementById('submitVoteBtn');

    if (count > 0) {
        submitBar.classList.add('visible');
        submitBtn.disabled = false;
    } else {
        submitBar.classList.remove('visible');
        submitBtn.disabled = true;
    }

    // Update disabled state on cards
    const cards = document.querySelectorAll('.option-card');
    cards.forEach(card => {
        const optId = card.dataset.optionId;
        if (count >= surveyData.max_options && !selectedOptions.has(optId)) {
            card.classList.add('disabled');
        } else {
            card.classList.remove('disabled');
        }
    });
}

// Open YouTube video modal
function openVideo(event, btn) {
    event.stopPropagation();
    const youtubeId = btn.dataset.youtube;
    const title = btn.dataset.title;

    document.getElementById('modalTitle').textContent = title;
    document.getElementById('videoIframe').src = `https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0`;
    document.getElementById('videoModal').classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Close video modal
function closeVideo() {
    document.getElementById('videoIframe').src = '';
    document.getElementById('videoModal').classList.remove('active');
    document.body.style.overflow = '';
}

// Show confirm dialog
function showConfirmDialog() {
    const names = Array.from(selectedOptions).map(id => {
        const opt = surveyData.options.find(o => o.option_id === id);
        return opt ? opt.label : '';
    });

    document.getElementById('confirmText').innerHTML =
        `Anda memilih: <strong>${names.join(', ')}</strong><br>Pilihan tidak dapat diubah setelah disubmit.`;
    document.getElementById('confirmDialog').classList.add('active');
}

function hideConfirmDialog() {
    document.getElementById('confirmDialog').classList.remove('active');
}

// Submit vote
async function submitVote() {
    hideConfirmDialog();

    const btn = document.getElementById('submitVoteBtn');
    const btnText = document.getElementById('voteBtnText');
    const spinner = document.getElementById('voteBtnSpinner');

    btn.disabled = true;
    btnText.textContent = 'Mengirim...';
    spinner.classList.remove('hidden');

    try {
        const res = await fetch('/api/votes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                selected_option_ids: Array.from(selectedOptions)
            })
        });

        const data = await res.json();

        if (res.ok) {
            window.location.href = '/success';
        } else {
            showToast(data.error || 'Gagal mengirim vote.');
            btn.disabled = false;
            btnText.textContent = 'Submit Pilihan';
            spinner.classList.add('hidden');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan.');
        btn.disabled = false;
        btnText.textContent = 'Submit Pilihan';
        spinner.classList.add('hidden');
    }
}

// Keyboard: Escape to close modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeVideo();
        hideConfirmDialog();
    }
});
