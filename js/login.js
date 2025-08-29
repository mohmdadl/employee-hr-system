// ----- login.js ----- //

const users = [
    { id: 1, name: 'Ahmed', email: 'ahmed@example.com', password: '1234', role: 'employee' },
    { id: 2, name: 'Sara', email: 'sara@example.com', password: '1234', role: 'manager' },
    { id: 3, name: 'Omar', email: 'omar@example.com', password: '1234', role: 'security' },
    { id: 4, name: 'Laila', email: 'laila@example.com', password: '1234', role: 'hr' },
    { id: 5, name: 'adel', email: 'adel@example.com', password: '1234', role: 'employee' },
    { id: 6, name: 'ola', email: 'ola@example.com', password: '1234', role: 'manager' },
    { id: 7, name: 'magdy', email: 'magdy@example.com', password: '1234', role: 'security' },
    { id: 8, name: 'kamal', email: 'kamal@example.com', password: '1234', role: 'hr' }
];

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value.trim();

        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            localStorage.setItem('currentUser', JSON.stringify(user));

            // redirect حسب role
            switch (user.role) {
                case 'employee':
                    window.location.href = 'employee.html';
                    break;
                case 'manager':
                    window.location.href = 'manager.html';
                    break;
                case 'security':
                    window.location.href = 'security.html';
                    break;
                case 'hr':
                case 'admin':
                    window.location.href = 'hr.html';
                    break;
                default:
                    window.location.href = 'index.html';
            }
        } else {
            errorMsg.style.display = 'block';
            errorMsg.textContent = 'Invalid email or password';
        }
    });
});