// js/main.js (CORRECTED AND COMPLETE)

const DataService = {
    init: function() {
        if (!localStorage.getItem('employees')) {
            console.log('DataService: Initializing data in localStorage from mock-data.js...');
            localStorage.setItem('employees', JSON.stringify(employees || []));
            localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords || []));
            localStorage.setItem('tasks', JSON.stringify(tasks || []));
            localStorage.setItem('permissionRequests', JSON.stringify(permissionRequests || []));
            localStorage.setItem('hrSettings', JSON.stringify(hrSettings || {}));
            localStorage.setItem('approvedLeaves', JSON.stringify(approvedLeaves || []));
            console.log('DataService: Initialization complete.');
        }
    },
    // ... (All your get and save functions remain the same)
    getEmployees: () => JSON.parse(localStorage.getItem('employees')),
    getAttendance: () => JSON.parse(localStorage.getItem('attendanceRecords')),
    getTasks: () => JSON.parse(localStorage.getItem('tasks')),
    getRequests: () => JSON.parse(localStorage.getItem('permissionRequests')),
    getSettings: () => JSON.parse(localStorage.getItem('hrSettings')),
    getApprovedLeaves: () => JSON.parse(localStorage.getItem('approvedLeaves')),
    saveAttendance: (data) => localStorage.setItem('attendanceRecords', JSON.stringify(data)),
    saveTasks: (data) => localStorage.setItem('tasks', JSON.stringify(data)),
    saveRequests: (data) => localStorage.setItem('permissionRequests', JSON.stringify(data)),
    saveSettings: (data) => localStorage.setItem('hrSettings', JSON.stringify(data)),
    saveApprovedLeaves: (data) => localStorage.setItem('approvedLeaves', JSON.stringify(data))
};

DataService.init();

// =================================================================
// --- THIS BLOCK WAS MISSING - IT'S THE APPLICATION STARTER ---
// =================================================================
document.addEventListener('DOMContentLoaded', () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';

    if (!currentUser && !isLoginPage) {
        window.location.href = 'index.html';
        return;
    }

    if (currentUser) {
        renderNavbar(currentUser);
    }
});
// =================================================================

function renderNavbar(user) {
    const navbarContainer = document.getElementById('navbarContainer');
    if (!navbarContainer) return;

    // This is the complete renderNavbar function from our previous discussions
    const navs = {
        Employee: `<li class="nav-item"><a class="nav-link" href="employee.html">My Dashboard</a></li>`,
        Manager: `<li class="nav-item"><a class="nav-link" href="manager.html">Approvals & Tasks</a></li>`,
        Security: `<li class="nav-item"><a class="nav-link" href="security.html">Attendance Board</a></li>`,
        HR: `<li class="nav-item"><a class="nav-link" href="hr.html">Reports & KPIs</a></li><li class="nav-item"><a class="nav-link" href="hr.html#settings">Settings</a></li>`
    };
    const navbarHTML = `
        <div class="container-fluid">
            <a class="navbar-brand" href="#">HR System</a>
            <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#mainNavbar"><span class="navbar-toggler-icon"></span></button>
            <div class="collapse navbar-collapse" id="mainNavbar">
                <ul class="navbar-nav me-auto mb-2 mb-lg-0">${navs[user.role] || ''}</ul>
                <div class="dropdown">
                    <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle" data-bs-toggle="dropdown"><strong>${user.name} (${user.role})</strong></a>
                    <ul class="dropdown-menu dropdown-menu-dark dropdown-menu-end text-small shadow">
                        <li><a class="dropdown-item d-flex align-items-center" href="#" id="theme-toggle"><i class="bi bi-sun-fill me-2" id="theme-icon-sun"></i><i class="bi bi-moon-fill me-2 d-none" id="theme-icon-moon"></i>Toggle Theme</a></li>
                        <li><hr class="dropdown-divider"></li>
                        <li><a class="dropdown-item" href="#" id="logoutBtn">Sign out</a></li>
                    </ul>
                </div>
            </div>
        </div>
    `;
    navbarContainer.innerHTML = navbarHTML;

    // --- Activate Event Listeners for Navbar ---
    document.getElementById('logoutBtn').addEventListener('click', (e) => { e.preventDefault(); localStorage.removeItem('currentUser'); window.location.href = 'index.html'; });

    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');
    const htmlElement = document.documentElement;
    const getStoredTheme = () => localStorage.getItem('theme') || 'dark';
    const setStoredTheme = theme => localStorage.setItem('theme', theme);
    const updateIcons = (theme) => {
        if (theme === 'dark') { sunIcon.classList.remove('d-none'); moonIcon.classList.add('d-none'); } 
        else { sunIcon.classList.add('d-none'); moonIcon.classList.remove('d-none'); }
    };
    updateIcons(getStoredTheme());
    themeToggleBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const newTheme = getStoredTheme() === 'dark' ? 'light' : 'dark';
        setStoredTheme(newTheme);
        htmlElement.setAttribute('data-bs-theme', newTheme);
        updateIcons(newTheme);
    });
}