// ============================================
// SURVEI 25 - Authentication Logic
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    loadActiveSurveys();

    const form = document.getElementById('authForm');
    form.addEventListener('submit', handleLogin);
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

// Load active surveys into dropdown
async function loadActiveSurveys() {
    const select = document.getElementById('survey_id');
    try {
        const res = await fetch('/api/surveys/active');
        const surveys = await res.json();

        select.innerHTML = '';

        if (surveys.length === 0) {
            select.innerHTML = '<option value="" disabled selected>Tidak ada survei aktif saat ini</option>';
            document.getElementById('submitBtn').disabled = true;
            return;
        }

        select.innerHTML = '<option value="" disabled selected>Pilih survei</option>';
        surveys.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.survey_id;
            opt.textContent = s.title;
            select.appendChild(opt);
        });
    } catch (err) {
        select.innerHTML = '<option value="" disabled selected>Gagal memuat survei</option>';
        showToast('Gagal memuat daftar survei. Coba refresh halaman.');
    }
}

// Handle login form submission
async function handleLogin(e) {
    e.preventDefault();

    const nama = document.getElementById('nama').value.trim();
    const no_id = document.getElementById('no_id').value.trim();
    const kelas = document.getElementById('kelas').value;
    const survey_id = document.getElementById('survey_id').value;

    if (!nama || !no_id || !kelas || !survey_id) {
        showToast('Semua field harus diisi.');
        return;
    }

    const btn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnSpinner = document.getElementById('btnSpinner');

    btn.disabled = true;
    btnText.textContent = 'Memproses...';
    btnSpinner.classList.remove('hidden');

    try {
        const res = await fetch('/api/auth/student-login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nama, no_id, kelas, survey_id })
        });

        const data = await res.json();

        if (res.ok) {
            showToast('Login berhasil! Mengarahkan...', 'success');
            setTimeout(() => {
                window.location.href = `/vote?sid=${encodeURIComponent(survey_id)}`;
            }, 800);
        } else {
            showToast(data.error || 'Gagal login.');
            btn.disabled = false;
            btnText.textContent = 'Mulai Survei';
            btnSpinner.classList.add('hidden');
        }
    } catch (err) {
        showToast('Terjadi kesalahan jaringan. Coba lagi.');
        btn.disabled = false;
        btnText.textContent = 'Mulai Survei';
        btnSpinner.classList.add('hidden');
    }
}
