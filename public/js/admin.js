// ============================================
// SURVEI 25 - Admin Panel Logic
// ============================================

let currentView = 'dashboard';
let allSurveys = [];
let currentChart = null;
let confirmCallback = null;

document.addEventListener('DOMContentLoaded', () => {
    checkAdminSession();
});

// ── Utility Functions ──

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

function showLoading() {
    document.getElementById('loadingOverlay').classList.add('active');
}

function hideLoading() {
    document.getElementById('loadingOverlay').classList.remove('active');
}

function showConfirm(title, text, callback) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmText').textContent = text;
    confirmCallback = callback;
    document.getElementById('confirmDialog').classList.add('active');
}

function hideConfirm() {
    document.getElementById('confirmDialog').classList.remove('active');
    confirmCallback = null;
}

// ── Session Management ──

async function checkAdminSession() {
    try {
        const res = await fetch('/api/auth/session');
        const data = await res.json();
        if (data.role === 'admin') {
            showDashboard();
        }
    } catch (err) {
        // Stay on login
    }

    // Bind events
    document.getElementById('adminLoginForm').addEventListener('submit', handleAdminLogin);
    document.getElementById('confirmCancel').addEventListener('click', hideConfirm);
    document.getElementById('confirmOk').addEventListener('click', () => {
        if (confirmCallback) confirmCallback();
        hideConfirm();
    });
}

async function handleAdminLogin(e) {
    e.preventDefault();
    const username = document.getElementById('adminUser').value.trim();
    const password = document.getElementById('adminPass').value;

    try {
        const res = await fetch('/api/auth/admin-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();

        if (res.ok) {
            showToast('Login berhasil!', 'success');
            showDashboard();
        } else {
            showToast(data.error || 'Login gagal.');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan.');
    }
}

function showDashboard() {
    document.getElementById('adminLogin').classList.add('hidden');
    document.getElementById('adminDashboard').classList.remove('hidden');

    // Bind navigation
    document.querySelectorAll('#adminNav button[data-view]').forEach(btn => {
        btn.addEventListener('click', () => switchView(btn.dataset.view));
    });

    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    document.getElementById('addOptionBtn').addEventListener('click', addOptionField);
    document.getElementById('surveyForm').addEventListener('submit', handleSaveSurvey);
    document.getElementById('cancelFormBtn').addEventListener('click', () => switchView('dashboard'));
    document.getElementById('resultsSurveySelect').addEventListener('change', (e) => {
        if (e.target.value) loadResults(e.target.value);
    });

    switchView('dashboard');
}

async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
}

// ── View Switching ──

function switchView(view) {
    currentView = view;

    document.querySelectorAll('.admin-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(`view-${view}`).classList.remove('hidden');

    document.querySelectorAll('#adminNav button[data-view]').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });

    if (view === 'dashboard') loadDashboard();
    if (view === 'create') resetForm();
    if (view === 'results') loadResultsSurveyList();
}

// ── Dashboard ──

async function loadDashboard() {
    showLoading();
    try {
        const res = await fetch('/api/surveys/all');
        allSurveys = await res.json();

        renderStats();
        renderSurveyList();
    } catch (err) {
        showToast('Gagal memuat data.');
    }
    hideLoading();
}

function renderStats() {
    const grid = document.getElementById('statsGrid');
    const active = allSurveys.filter(s => s.is_active).length;
    const totalVoters = allSurveys.reduce((sum, s) => sum + (s.total_voters || 0), 0);

    grid.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Total Survei</div>
            <div class="stat-value">${allSurveys.length}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Survei Aktif</div>
            <div class="stat-value">${active}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Total Voter</div>
            <div class="stat-value">${totalVoters}</div>
        </div>
    `;
}

function renderSurveyList() {
    const list = document.getElementById('surveyList');

    if (allSurveys.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <h3>Belum ada survei</h3>
                <p>Klik "Buat Survei" untuk memulai</p>
            </div>
        `;
        return;
    }

    list.innerHTML = allSurveys.map(s => `
        <div class="survey-item">
            <div class="survey-item-info">
                <h3>${escapeHtml(s.title)}</h3>
                <p>${escapeHtml(s.description || '')}</p>
                <div class="survey-item-meta">
                    <span class="badge ${s.is_active ? 'badge-active' : 'badge-inactive'}">
                        ${s.is_active ? '● Aktif' : '○ Arsip'}
                    </span>
                    <span class="badge badge-info">${s.total_options || 0} opsi</span>
                    <span class="badge badge-info">${s.total_voters || 0} voter</span>
                    <span class="badge badge-info">${s.type === 'single_choice' ? 'Pilihan Tunggal' : s.type === 'multiple_choice' ? 'Pilihan Jamak' : 'Skala Likert'}</span>
                </div>
            </div>
            <div class="survey-item-actions">
                <button class="btn btn-sm btn-secondary" onclick="editSurvey('${s.survey_id}')">✏️ Edit</button>
                <button class="btn btn-sm ${s.is_active ? 'btn-warning' : 'btn-success'}" onclick="toggleSurvey('${s.survey_id}')">
                    ${s.is_active ? '⏸ Arsipkan' : '▶ Publish'}
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteSurvey('${s.survey_id}', '${escapeHtml(s.title)}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ── Survey CRUD ──

function resetForm() {
    document.getElementById('formTitle').textContent = 'Buat Survei Baru';
    document.getElementById('editSurveyId').value = '';
    document.getElementById('sTitle').value = '';
    document.getElementById('sDescription').value = '';
    document.getElementById('sType').value = 'multiple_choice';
    document.getElementById('sMaxOptions').value = '2';

    const builder = document.getElementById('optionsBuilder');
    builder.innerHTML = '';

    // Add 2 default option fields
    addOptionField();
    addOptionField();
}

function addOptionField(data = {}) {
    const builder = document.getElementById('optionsBuilder');
    const index = builder.children.length;

    const item = document.createElement('div');
    item.className = 'option-builder-item';
    item.innerHTML = `
        <button type="button" class="remove-option" onclick="this.parentElement.remove()">✕</button>
        <div class="form-group">
            <label class="form-label">Judul Opsi ${index + 1}</label>
            <input type="text" class="form-input opt-label" placeholder="Contoh: Film A" value="${escapeHtml(data.label || '')}" required>
        </div>
        <div class="form-group">
            <label class="form-label">Deskripsi (opsional)</label>
            <input type="text" class="form-input opt-desc" placeholder="Deskripsi singkat" value="${escapeHtml(data.description || '')}">
        </div>
        <div class="form-group">
            <label class="form-label">Link YouTube (opsional)</label>
            <input type="text" class="form-input opt-youtube" placeholder="https://youtube.com/watch?v=..." value="${escapeHtml(data.youtube_link || '')}">
        </div>
        <div class="form-group">
            <label class="form-label">URL Gambar (opsional)</label>
            <input type="text" class="form-input opt-image" placeholder="https://..." value="${escapeHtml(data.image_url || '')}">
        </div>
    `;

    builder.appendChild(item);
}

async function handleSaveSurvey(e) {
    e.preventDefault();

    const surveyId = document.getElementById('editSurveyId').value;
    const title = document.getElementById('sTitle').value.trim();
    const description = document.getElementById('sDescription').value.trim();
    const type = document.getElementById('sType').value;
    const max_options = parseInt(document.getElementById('sMaxOptions').value) || 1;

    // Collect options
    const optionItems = document.querySelectorAll('.option-builder-item');
    const options = [];
    for (const item of optionItems) {
        const label = item.querySelector('.opt-label').value.trim();
        if (!label) {
            showToast('Semua opsi harus memiliki judul.');
            return;
        }
        options.push({
            label,
            description: item.querySelector('.opt-desc').value.trim(),
            youtube_link: item.querySelector('.opt-youtube').value.trim(),
            image_url: item.querySelector('.opt-image').value.trim()
        });
    }

    if (options.length < 2) {
        showToast('Minimal 2 opsi diperlukan.');
        return;
    }

    showLoading();
    try {
        const url = surveyId ? `/api/surveys/${surveyId}` : '/api/surveys';
        const method = surveyId ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, type, max_options, options })
        });

        const data = await res.json();

        if (res.ok) {
            showToast(data.message || 'Berhasil!', 'success');
            switchView('dashboard');
        } else {
            showToast(data.error || 'Gagal menyimpan.');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan.');
    }
    hideLoading();
}

async function editSurvey(surveyId) {
    showLoading();
    try {
        const res = await fetch(`/api/surveys/${surveyId}`);
        const data = await res.json();

        if (!res.ok) {
            showToast('Survei tidak ditemukan.');
            hideLoading();
            return;
        }

        // Switch to create view with filled data
        switchView('create');
        document.getElementById('formTitle').textContent = 'Edit Survei';
        document.getElementById('editSurveyId').value = surveyId;
        document.getElementById('sTitle').value = data.title;
        document.getElementById('sDescription').value = data.description || '';
        document.getElementById('sType').value = data.type;
        document.getElementById('sMaxOptions').value = data.max_options;

        // Clear and add options
        document.getElementById('optionsBuilder').innerHTML = '';
        data.options.forEach(opt => addOptionField(opt));

    } catch (err) {
        showToast('Gagal memuat survei.');
    }
    hideLoading();
}

async function toggleSurvey(surveyId) {
    try {
        const res = await fetch(`/api/surveys/${surveyId}/toggle`, { method: 'PATCH' });
        const data = await res.json();

        if (res.ok) {
            showToast(data.message, 'success');
            loadDashboard();
        } else {
            showToast(data.error);
        }
    } catch (err) {
        showToast('Gagal mengubah status.');
    }
}

function deleteSurvey(surveyId, title) {
    showConfirm('Hapus Survei', `Hapus "${title}"? Semua data voting akan ikut terhapus.`, async () => {
        try {
            const res = await fetch(`/api/surveys/${surveyId}`, { method: 'DELETE' });
            const data = await res.json();

            if (res.ok) {
                showToast('Survei dihapus.', 'success');
                loadDashboard();
            } else {
                showToast(data.error);
            }
        } catch (err) {
            showToast('Gagal menghapus.');
        }
    });
}

// ── Results ──

async function loadResultsSurveyList() {
    try {
        const res = await fetch('/api/surveys/all');
        const surveys = await res.json();

        const select = document.getElementById('resultsSurveySelect');
        select.innerHTML = '<option value="">Pilih survei...</option>';
        surveys.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.survey_id;
            opt.textContent = `${s.title} (${s.total_voters || 0} voter)`;
            select.appendChild(opt);
        });
    } catch (err) {
        showToast('Gagal memuat daftar survei.');
    }
}

async function loadResults(surveyId) {
    showLoading();
    try {
        const res = await fetch(`/api/results/${surveyId}`);
        const data = await res.json();

        if (!res.ok) {
            showToast(data.error);
            hideLoading();
            return;
        }

        renderResults(data, surveyId);
    } catch (err) {
        showToast('Gagal memuat hasil.');
    }
    hideLoading();
}

function renderResults(data, surveyId) {
    const container = document.getElementById('resultsContent');

    // Chart section
    const chartColors = [
        '#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd',
        '#10b981', '#34d399', '#f59e0b', '#fbbf24',
        '#ef4444', '#f87171', '#ec4899', '#f472b6',
        '#06b6d4', '#22d3ee', '#14b8a6', '#2dd4bf'
    ];

    const labels = data.chartData.map(d => d.label);
    const values = data.chartData.map(d => d.vote_count);

    container.innerHTML = `
        <div class="stats-grid mb-3">
            <div class="stat-card">
                <div class="stat-label">Total Voter</div>
                <div class="stat-value">${data.totalVoters}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Total Pilihan</div>
                <div class="stat-value">${data.chartData.length}</div>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
            <div class="chart-container">
                <h3>Distribusi Vote (Bar Chart)</h3>
                <div class="chart-wrapper"><canvas id="barChart"></canvas></div>
            </div>
            <div class="chart-container">
                <h3>Distribusi Vote (Pie Chart)</h3>
                <div class="chart-wrapper"><canvas id="pieChart"></canvas></div>
            </div>
        </div>

        <div class="section-header">
            <h2>Data Detail</h2>
            <div class="flex gap-1">
                <button class="btn btn-sm btn-success" onclick="exportData('${surveyId}', 'xlsx')">📥 Export XLSX</button>
                <button class="btn btn-sm btn-secondary" onclick="exportData('${surveyId}', 'csv')">📥 Export CSV</button>
            </div>
        </div>

        <div class="results-table-wrapper">
            <table class="results-table">
                <thead>
                    <tr>
                        <th>No</th>
                        <th>Nama</th>
                        <th>No ID</th>
                        <th>Kelas</th>
                        <th>Pilihan</th>
                        <th>Waktu</th>
                    </tr>
                </thead>
                <tbody>
                    ${data.results.length === 0 ? '<tr><td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">Belum ada data voting</td></tr>' : ''}
                    ${data.results.map((r, i) => `
                        <tr>
                            <td>${i + 1}</td>
                            <td>${escapeHtml(r.nama)}</td>
                            <td>${escapeHtml(r.no_id)}</td>
                            <td>${r.kelas}</td>
                            <td>${escapeHtml(r.pilihan)}</td>
                            <td>${new Date(r.timestamp).toLocaleString('id-ID')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;

    // Destroy existing charts
    if (currentChart) {
        currentChart.destroy();
        currentChart = null;
    }

    // Bar Chart
    const barCtx = document.getElementById('barChart').getContext('2d');
    new Chart(barCtx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Jumlah Vote',
                data: values,
                backgroundColor: chartColors.slice(0, labels.length),
                borderRadius: 8,
                borderSkipped: false
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, color: '#9ca3af' },
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    ticks: { color: '#9ca3af' },
                    grid: { display: false }
                }
            }
        }
    });

    // Pie Chart
    const pieCtx = document.getElementById('pieChart').getContext('2d');
    currentChart = new Chart(pieCtx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: chartColors.slice(0, labels.length),
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#9ca3af', padding: 12, usePointStyle: true }
                }
            }
        }
    });
}

function exportData(surveyId, format) {
    window.open(`/api/results/${surveyId}/export?format=${format}`, '_blank');
}

// ── Keyboard Shortcuts ──
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        hideConfirm();
    }
});
