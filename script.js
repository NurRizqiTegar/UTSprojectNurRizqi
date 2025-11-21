// Data dan state aplikasi
let workouts = JSON.parse(localStorage.getItem('workouts')) || [];
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || null;
let isGuestMode = JSON.parse(localStorage.getItem('isGuestMode')) || false;
let workoutToDelete = null;
let currentFilters = {
    type: ['cardio', 'strength', 'flexibility', 'sports', 'other'],
    intensity: ['light', 'moderate', 'vigorous']
};

// Konstanta untuk perhitungan kalori (MET values berdasarkan intensitas)
const MET_VALUES = {
    cardio: { light: 4.0, moderate: 6.0, vigorous: 8.0 },
    strength: { light: 3.5, moderate: 5.0, vigorous: 6.0 },
    flexibility: { light: 2.5, moderate: 3.0, vigorous: 3.5 },
    sports: { light: 5.0, moderate: 7.0, vigorous: 9.0 },
    other: { light: 3.0, moderate: 4.0, vigorous: 5.0 }
};

// Default values untuk guest mode
const GUEST_DEFAULTS = {
    weight: 70, // kg - berat rata-rata
    age: 30    // usia default
};

// DOM Elements
const loginModal = document.getElementById('login-modal');
const appContainer = document.getElementById('app-container');
const loginForm = document.getElementById('login-form');
const guestModeBtn = document.getElementById('guest-mode-btn');
const closeLoginBtn = document.getElementById('close-login');
const logoutBtn = document.getElementById('logout-btn');
const createProfileBtn = document.getElementById('create-profile-btn');
const upgradeProfileLink = document.getElementById('upgrade-profile-link');
const userNameEl = document.getElementById('user-name');
const userModeEl = document.getElementById('user-mode');
const userAvatar = document.getElementById('user-avatar');
const guestWarning = document.getElementById('guest-warning');
const workoutForm = document.getElementById('workout-form');
const workoutList = document.getElementById('workout-list');
const totalDurationEl = document.getElementById('total-duration');
const totalCaloriesEl = document.getElementById('total-calories');
const totalWorkoutsEl = document.getElementById('total-workouts');
const progressFill = document.getElementById('progress-fill');
const progressPercent = document.getElementById('progress-percent');
const targetMinutesEl = document.getElementById('target-minutes');
const achievementBadge = document.getElementById('achievement-badge');
const clearAllBtn = document.getElementById('clear-all');
const filterBtn = document.getElementById('filter-btn');
const filterModal = document.getElementById('filter-modal');
const closeFilterBtn = document.getElementById('close-filter');
const applyFilterBtn = document.getElementById('apply-filter');
const resetFilterBtn = document.getElementById('reset-filter');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete');
const confirmDeleteBtn = document.getElementById('confirm-delete');
const closeModalBtn = document.querySelector('.close-modal');

// Event Listeners
document.addEventListener('DOMContentLoaded', initApp);
loginForm.addEventListener('submit', handleLogin);
guestModeBtn.addEventListener('click', handleGuestMode);
closeLoginBtn.addEventListener('click', handleCloseLogin);
logoutBtn.addEventListener('click', handleLogout);
createProfileBtn.addEventListener('click', handleCreateProfile);
upgradeProfileLink.addEventListener('click', handleCreateProfile);
workoutForm.addEventListener('submit', handleFormSubmit);
clearAllBtn.addEventListener('click', handleClearAll);
filterBtn.addEventListener('click', openFilterModal);
closeFilterBtn.addEventListener('click', closeFilterModal);
applyFilterBtn.addEventListener('click', applyFilters);
resetFilterBtn.addEventListener('click', resetFilters);
cancelDeleteBtn.addEventListener('click', closeDeleteModal);
confirmDeleteBtn.addEventListener('click', confirmDelete);
closeModalBtn.addEventListener('click', closeDeleteModal);

// Inisialisasi aplikasi
function initApp() {
    // Cek apakah user sudah login atau dalam mode guest
    if (userProfile || isGuestMode) {
        showApp();
    } else {
        showLoginModal();
    }
    
    // Tutup modal jika klik di luar konten modal
    window.addEventListener('click', (e) => {
        if (e.target === loginModal) {
            handleCloseLogin();
        }
        if (e.target === filterModal) {
            closeFilterModal();
        }
        if (e.target === deleteModal) {
            closeDeleteModal();
        }
    });
}

// Tampilkan modal login
function showLoginModal() {
    loginModal.style.display = 'flex';
    appContainer.classList.add('hidden');
}

// Tutup modal login (pindah ke mode guest)
function handleCloseLogin() {
    if (!userProfile && !isGuestMode) {
        if (confirm('Ingin menggunakan aplikasi sebagai tamu? Anda dapat membuat profil nanti untuk perhitungan kalori yang lebih akurat.')) {
            handleGuestMode();
        } else {
            loginModal.style.display = 'none';
        }
    } else {
        loginModal.style.display = 'none';
    }
}

// Handle mode guest
function handleGuestMode() {
    isGuestMode = true;
    localStorage.setItem('isGuestMode', JSON.stringify(isGuestMode));
    
    // Buat profil guest sementara
    userProfile = {
        username: 'Tamu',
        age: GUEST_DEFAULTS.age,
        weight: GUEST_DEFAULTS.weight,
        height: 170, // tinggi default
        gender: 'male', // default
        isGuest: true
    };
    
    showApp();
    showSuccessMessage('Selamat datang di mode tamu!');
}

// Tampilkan aplikasi utama
function showApp() {
    loginModal.style.display = 'none';
    appContainer.classList.remove('hidden');
    
    // Update UI berdasarkan mode
    if (isGuestMode && !userProfile?.username) {
        userNameEl.textContent = 'Tamu';
        userModeEl.textContent = 'Mode Tamu';
        userModeEl.className = 'user-mode guest';
        userAvatar.className = 'user-avatar guest';
        guestWarning.style.display = 'flex';
        createProfileBtn.style.display = 'flex';
    } else if (userProfile) {
        userNameEl.textContent = userProfile.username;
        userModeEl.textContent = 'Profil Terdaftar';
        userModeEl.className = 'user-mode registered';
        userAvatar.className = 'user-avatar registered';
        guestWarning.style.display = 'none';
        createProfileBtn.style.display = 'none';
    }
    
    // Set target menit berdasarkan usia
    setTargetMinutes();
    
    renderWorkouts();
    updateSummary();
}

// Handle login
function handleLogin(e) {
    e.preventDefault();
    
    // Validasi form
    if (!validateLoginForm()) return;
    
    // Ambil nilai dari form
    const username = document.getElementById('username').value.trim();
    const age = parseInt(document.getElementById('age').value);
    const weight = parseFloat(document.getElementById('weight').value);
    const height = parseInt(document.getElementById('height').value);
    const gender = document.getElementById('gender').value;
    
    // Buat objek user profile
    userProfile = {
        username,
        age,
        weight,
        height,
        gender,
        bmi: calculateBMI(weight, height),
        loginDate: new Date().toISOString(),
        isGuest: false
    };
    
    // Nonaktifkan mode guest
    isGuestMode = false;
    localStorage.setItem('isGuestMode', JSON.stringify(isGuestMode));
    
    // Simpan ke localStorage
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    
    // Tampilkan aplikasi utama
    showApp();
    
    // Tampilkan feedback sukses
    showSuccessMessage(`Selamat datang, ${username}!`);
}

// Handle buat profil dari mode guest
function handleCreateProfile(e) {
    e.preventDefault();
    
    // Tampilkan modal login untuk membuat profil
    showLoginModal();
    
    // Scroll ke form login
    document.querySelector('.login-card').scrollIntoView({ 
        behavior: 'smooth',
        block: 'start'
    });
}

// Validasi form login
function validateLoginForm() {
    const username = document.getElementById('username').value.trim();
    const age = document.getElementById('age').value;
    const weight = document.getElementById('weight').value;
    const height = document.getElementById('height').value;
    const gender = document.getElementById('gender').value;
    
    let isValid = true;
    
    // Validasi username
    if (username === '') {
        showError('username-error', 'Nama pengguna harus diisi');
        isValid = false;
    } else {
        clearError('username-error');
    }
    
    // Validasi usia
    if (age === '' || parseInt(age) < 10 || parseInt(age) > 100) {
        showError('age-error', 'Usia harus antara 10 dan 100 tahun');
        isValid = false;
    } else {
        clearError('age-error');
    }
    
    // Validasi berat badan
    if (weight === '' || parseFloat(weight) < 30 || parseFloat(weight) > 200) {
        showError('weight-error', 'Berat badan harus antara 30 dan 200 kg');
        isValid = false;
    } else {
        clearError('weight-error');
    }
    
    // Validasi tinggi badan
    if (height === '' || parseInt(height) < 100 || parseInt(height) > 250) {
        showError('height-error', 'Tinggi badan harus antara 100 dan 250 cm');
        isValid = false;
    } else {
        clearError('height-error');
    }
    
    // Validasi jenis kelamin
    if (gender === '') {
        showError('gender-error', 'Jenis kelamin harus dipilih');
        isValid = false;
    } else {
        clearError('gender-error');
    }
    
    return isValid;
}

// Handle logout
function handleLogout() {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
        userProfile = null;
        isGuestMode = false;
        localStorage.removeItem('userProfile');
        localStorage.removeItem('isGuestMode');
        workouts = [];
        localStorage.removeItem('workouts');
        showLoginModal();
        document.getElementById('login-form').reset();
        showSuccessMessage('Anda telah berhasil keluar.');
    }
}

// Hitung BMI
function calculateBMI(weight, height) {
    const heightInMeters = height / 100;
    return (weight / (heightInMeters * heightInMeters)).toFixed(1);
}

// Set target menit berdasarkan usia
function setTargetMinutes() {
    let targetMinutes = 60; // Default
    
    if (userProfile && userProfile.age) {
        if (userProfile.age < 18) {
            targetMinutes = 75; // Remaja butuh lebih banyak aktivitas
        } else if (userProfile.age > 65) {
            targetMinutes = 45; // Lansia butuh lebih sedikit
        }
    }
    
    targetMinutesEl.textContent = targetMinutes;
    return targetMinutes;
}

// Handle form submission
function handleFormSubmit(e) {
    e.preventDefault();
    
    // Validasi form
    if (!validateForm()) return;
    
    // Ambil nilai dari form
    const name = document.getElementById('exercise-name').value.trim();
    const duration = parseInt(document.getElementById('exercise-duration').value);
    const type = document.getElementById('exercise-type').value;
    const intensity = document.getElementById('intensity').value;
    
    // Buat objek workout baru
    const newWorkout = {
        id: Date.now(),
        name,
        duration,
        type,
        intensity,
        date: new Date().toISOString(),
        calories: calculateCalories(type, intensity, duration)
    };
    
    // Tambahkan ke array workouts
    workouts.push(newWorkout);
    
    // Simpan ke localStorage
    saveWorkouts();
    
    // Render ulang daftar workout
    renderWorkouts();
    
    // Update ringkasan
    updateSummary();
    
    // Reset form
    workoutForm.reset();
    
    // Tampilkan feedback sukses
    showSuccessMessage('Latihan berhasil ditambahkan!');
}

// Validasi form workout
function validateForm() {
    const name = document.getElementById('exercise-name').value.trim();
    const duration = document.getElementById('exercise-duration').value;
    const type = document.getElementById('exercise-type').value;
    const intensity = document.getElementById('intensity').value;
    
    let isValid = true;
    
    // Validasi nama
    if (name === '') {
        showError('name-error', 'Nama latihan harus diisi');
        isValid = false;
    } else {
        clearError('name-error');
    }
    
    // Validasi durasi
    if (duration === '' || parseInt(duration) <= 0) {
        showError('duration-error', 'Durasi harus lebih dari 0 menit');
        isValid = false;
    } else {
        clearError('duration-error');
    }
    
    // Validasi jenis
    if (type === '') {
        showError('type-error', 'Jenis olahraga harus dipilih');
        isValid = false;
    } else {
        clearError('type-error');
    }
    
    // Validasi intensitas
    if (intensity === '') {
        showError('intensity-error', 'Intensitas harus dipilih');
        isValid = false;
    } else {
        clearError('intensity-error');
    }
    
    return isValid;
}

// Tampilkan pesan error
function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = message;
    
    // Tambahkan kelas error ke input
    const inputElement = errorElement.previousElementSibling;
    inputElement.style.borderColor = '#f72585';
}

// Hapus pesan error
function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    errorElement.textContent = '';
    
    // Kembalikan border ke normal
    const inputElement = errorElement.previousElementSibling;
    inputElement.style.borderColor = '#e9ecef';
}

// Render daftar workout
function renderWorkouts() {
    const filteredWorkouts = workouts.filter(workout => 
        currentFilters.type.includes(workout.type) && 
        currentFilters.intensity.includes(workout.intensity)
    );
    
    if (filteredWorkouts.length === 0) {
        workoutList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-running"></i>
                <p>Belum ada latihan yang dicatat</p>
                <p class="empty-hint">Tambahkan latihan pertama Anda!</p>
            </div>
        `;
        return;
    }
    
    workoutList.innerHTML = '';
    
    filteredWorkouts.forEach(workout => {
        const workoutItem = document.createElement('div');
        workoutItem.className = 'workout-item';
        workoutItem.innerHTML = `
            <div class="workout-info">
                <div class="workout-name">${workout.name}</div>
                <div class="workout-details">
                    <span><i class="far fa-clock"></i> ${workout.duration} menit</span>
                    <span><i class="fas fa-fire"></i> ${workout.calories} kalori</span>
                </div>
                <div class="workout-meta">
                    <span class="workout-type ${workout.type}">${getWorkoutTypeLabel(workout.type)}</span>
                    <span class="workout-intensity ${workout.intensity}">${getIntensityLabel(workout.intensity)}</span>
                </div>
            </div>
            <div class="workout-actions">
                <button class="delete-btn" data-id="${workout.id}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
        
        workoutList.appendChild(workoutItem);
    });
    
    // Tambahkan event listener untuk tombol hapus
    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            openDeleteModal(id);
        });
    });
}

// Dapatkan label untuk jenis workout
function getWorkoutTypeLabel(type) {
    const typeLabels = {
        cardio: 'Cardio',
        strength: 'Strength Training',
        flexibility: 'Fleksibilitas',
        sports: 'Sports',
        other: 'Lainnya'
    };
    
    return typeLabels[type] || 'Lainnya';
}

// Dapatkan label untuk intensitas
function getIntensityLabel(intensity) {
    const intensityLabels = {
        light: 'Ringan',
        moderate: 'Sedang',
        vigorous: 'Berat'
    };
    
    return intensityLabels[intensity] || 'Sedang';
}

// Hitung kalori yang terbakar
function calculateCalories(type, intensity, duration) {
    // Gunakan MET values berdasarkan jenis dan intensitas olahraga
    const metValue = MET_VALUES[type] ? MET_VALUES[type][intensity] : MET_VALUES.other[intensity];
    
    // Tentukan berat badan yang digunakan
    let weight = GUEST_DEFAULTS.weight; // Default untuk guest
    
    if (userProfile && userProfile.weight) {
        weight = userProfile.weight;
    }
    
    // Rumus: Kalori = MET * berat badan (kg) * durasi (jam)
    const calories = metValue * weight * (duration / 60);
    
    return Math.round(calories);
}

// Update ringkasan
function updateSummary() {
    const filteredWorkouts = workouts.filter(workout => 
        currentFilters.type.includes(workout.type) && 
        currentFilters.intensity.includes(workout.intensity)
    );
    
    const totalDuration = filteredWorkouts.reduce((sum, workout) => sum + workout.duration, 0);
    const totalCalories = filteredWorkouts.reduce((sum, workout) => sum + workout.calories, 0);
    const totalWorkouts = filteredWorkouts.length;
    
    totalDurationEl.textContent = `${totalDuration} menit`;
    totalCaloriesEl.textContent = `${totalCalories} kalori`;
    totalWorkoutsEl.textContent = `${totalWorkouts} latihan`;
    
    // Update progress bar
    const targetMinutes = parseInt(targetMinutesEl.textContent);
    const progress = Math.min((totalDuration / targetMinutes) * 100, 100);
    progressFill.style.width = `${progress}%`;
    progressPercent.textContent = `${Math.round(progress)}%`;
    
    // Update warna progress bar berdasarkan progress
    if (progress < 30) {
        progressFill.style.background = 'linear-gradient(135deg, #f72585 0%, #b5179e 100%)';
    } else if (progress < 70) {
        progressFill.style.background = 'linear-gradient(135deg, #f8961e 0%, #f3722c 100%)';
    } else {
        progressFill.style.background = 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)';
    }
    
    // Tampilkan badge pencapaian jika target tercapai
    if (totalDuration >= targetMinutes) {
        achievementBadge.style.display = 'flex';
    } else {
        achievementBadge.style.display = 'none';
    }
}

// Simpan workouts ke localStorage
function saveWorkouts() {
    localStorage.setItem('workouts', JSON.stringify(workouts));
}

// Handle hapus semua
function handleClearAll() {
    if (workouts.length === 0) return;
    
    if (confirm('Apakah Anda yakin ingin menghapus semua latihan?')) {
        workouts = [];
        saveWorkouts();
        renderWorkouts();
        updateSummary();
        showSuccessMessage('Semua latihan telah dihapus');
    }
}

// Buka modal filter
function openFilterModal() {
    // Set checkbox sesuai dengan filter saat ini
    document.querySelectorAll('input[name="type"]').forEach(checkbox => {
        checkbox.checked = currentFilters.type.includes(checkbox.value);
    });
    
    document.querySelectorAll('input[name="intensity"]').forEach(checkbox => {
        checkbox.checked = currentFilters.intensity.includes(checkbox.value);
    });
    
    filterModal.style.display = 'flex';
}

// Tutup modal filter
function closeFilterModal() {
    filterModal.style.display = 'none';
}

// Terapkan filter
function applyFilters() {
    // Ambil nilai dari checkbox
    const selectedTypes = Array.from(document.querySelectorAll('input[name="type"]:checked'))
        .map(checkbox => checkbox.value);
    
    const selectedIntensities = Array.from(document.querySelectorAll('input[name="intensity"]:checked'))
        .map(checkbox => checkbox.value);
    
    // Update filter saat ini
    currentFilters.type = selectedTypes;
    currentFilters.intensity = selectedIntensities;
    
    // Render ulang daftar workout
    renderWorkouts();
    
    // Update ringkasan
    updateSummary();
    
    // Tutup modal
    closeFilterModal();
    
    // Tampilkan feedback
    showSuccessMessage('Filter diterapkan');
}

// Reset filter
function resetFilters() {
    // Set semua checkbox ke checked
    document.querySelectorAll('input[name="type"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    document.querySelectorAll('input[name="intensity"]').forEach(checkbox => {
        checkbox.checked = true;
    });
    
    // Update filter saat ini
    currentFilters.type = ['cardio', 'strength', 'flexibility', 'sports', 'other'];
    currentFilters.intensity = ['light', 'moderate', 'vigorous'];
    
    // Render ulang daftar workout
    renderWorkouts();
    
    // Update ringkasan
    updateSummary();
    
    // Tampilkan feedback
    showSuccessMessage('Filter direset');
}

// Buka modal konfirmasi hapus
function openDeleteModal(id) {
    workoutToDelete = id;
    deleteModal.style.display = 'flex';
}

// Tutup modal konfirmasi hapus
function closeDeleteModal() {
    deleteModal.style.display = 'none';
    workoutToDelete = null;
}

// Konfirmasi hapus workout
function confirmDelete() {
    if (workoutToDelete) {
        workouts = workouts.filter(workout => workout.id !== workoutToDelete);
        saveWorkouts();
        renderWorkouts();
        updateSummary();
        closeDeleteModal();
        showSuccessMessage('Latihan berhasil dihapus');
    }
}

// Tampilkan pesan sukses
function showSuccessMessage(message) {
    // Buat elemen toast
    const toast = document.createElement('div');
    toast.className = 'toast-message';
    toast.textContent = message;
    toast.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #43aa8b 0%, #3a86ff 100%);
        color: white;
        padding: 12px 20px;
        border-radius: 10px;
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
        z-index: 1001;
        animation: slideInRight 0.3s ease, fadeOut 0.3s ease 2.7s forwards;
        font-weight: 500;
        max-width: 300px;
    `;
    
    document.body.appendChild(toast);
    
    // Hapus toast setelah 3 detik
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 3000);
}

// Tambahkan animasi fadeOut untuk toast
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeOut {
        from { opacity: 1; transform: translateX(0); }
        to { opacity: 0; transform: translateX(100px); }
    }
`;
document.head.appendChild(style);