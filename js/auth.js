document.addEventListener('DOMContentLoaded', () => {
    const authBtn = document.getElementById('nav-auth-btn');
    const authModal = document.getElementById('auth-modal');
    const authClose = document.getElementById('auth-close');
    const authOverlay = document.querySelector('.auth-modal-overlay');
    
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    const switchToRegister = document.getElementById('switch-to-register');
    const switchToLogin = document.getElementById('switch-to-login');

    // Guard — exit early if elements missing
    if (!authModal || !loginForm || !registerForm) return;

    // Toggle Modal
    const openModal = (e) => {
        if(e) e.preventDefault();
        // Close mobile nav if open
        const navLinks = document.getElementById('nav-links');
        const navToggle = document.getElementById('nav-toggle');
        if (navLinks) navLinks.classList.remove('open');
        if (navToggle) { navToggle.classList.remove('active'); navToggle.setAttribute('aria-expanded', 'false'); }
        
        authModal.classList.add('open');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        authModal.classList.remove('open');
        document.body.style.overflow = '';
    };

    // Check if logged in FIRST before binding openModal
    const token = localStorage.getItem('token');
    const userName = localStorage.getItem('userName');

    if (token && userName && authBtn) {
        // User is logged in — show name, click goes to account
        authBtn.innerText = `Hi, ${userName}`;
        authBtn.href = 'account.html';
        authBtn.addEventListener('click', (e) => {
            // On mobile, close nav first
            const navLinks = document.getElementById('nav-links');
            const navToggle = document.getElementById('nav-toggle');
            if (navLinks) navLinks.classList.remove('open');
            if (navToggle) { navToggle.classList.remove('active'); }
        });
    } else if (authBtn) {
        // Not logged in — bind sign in modal
        authBtn.addEventListener('click', openModal);
    }

    if(authClose) authClose.addEventListener('click', closeModal);
    if(authOverlay) authOverlay.addEventListener('click', closeModal);

    // Switch Forms
    if(switchToRegister) {
        switchToRegister.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.remove('active');
            registerForm.classList.add('active');
        });
    }

    if(switchToLogin) {
        switchToLogin.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.remove('active');
            loginForm.classList.add('active');
        });
    }

    // Handle Login
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = loginForm.querySelector('.auth-submit');
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing In...';

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            const data = await res.json();
            
            if(res.ok) {
                localStorage.setItem('token', data.token);
                localStorage.setItem('userName', data.user.name);
                localStorage.setItem('userEmail', data.user.email || '');
                closeModal();
                window.location.reload();
            } else {
                showAuthError(loginForm, data.error || 'Login failed');
            }
        } catch (err) {
            console.error(err);
            showAuthError(loginForm, 'Connection failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    });

    // Handle Register
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = registerForm.querySelector('.auth-submit');
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const mobile = document.getElementById('reg-mobile').value;
        const password = document.getElementById('reg-password').value;
        const confirmPassword = document.getElementById('reg-confirm').value;

        // Validations
        if (!name || name.length < 2) {
            showAuthError(registerForm, 'Please enter your full name.');
            return;
        }
        if (password.length < 6) {
            showAuthError(registerForm, 'Password must be at least 6 characters.');
            return;
        }
        if (password !== confirmPassword) {
            showAuthError(registerForm, 'Passwords do not match!');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating Account...';

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, mobile, password, confirmPassword })
            });
            const data = await res.json();
            
            if(res.ok) {
                showAuthSuccess(registerForm, 'Account created! Signing you in...');
                // Auto sign in after register
                setTimeout(() => {
                    registerForm.classList.remove('active');
                    loginForm.classList.add('active');
                    document.getElementById('login-email').value = email;
                    clearAuthMessages(loginForm);
                }, 1500);
            } else {
                showAuthError(registerForm, data.error || 'Registration failed');
            }
        } catch (err) {
            console.error(err);
            showAuthError(registerForm, 'Connection failed. Please try again.');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign Up';
        }
    });

    // Auth error/success message helpers
    function showAuthError(form, message) {
        clearAuthMessages(form);
        const msg = document.createElement('p');
        msg.className = 'auth-message auth-error';
        msg.textContent = message;
        msg.style.cssText = 'color:#ff6b6b;font-size:0.82rem;text-align:center;padding:0.6rem;background:rgba(255,107,107,0.08);border:1px solid rgba(255,107,107,0.2);border-radius:4px;margin-top:0.5rem;animation:fadeIn 0.3s ease;';
        form.appendChild(msg);
        setTimeout(() => msg.remove(), 5000);
    }

    function showAuthSuccess(form, message) {
        clearAuthMessages(form);
        const msg = document.createElement('p');
        msg.className = 'auth-message auth-success';
        msg.textContent = message;
        msg.style.cssText = 'color:#4caf50;font-size:0.82rem;text-align:center;padding:0.6rem;background:rgba(76,175,80,0.08);border:1px solid rgba(76,175,80,0.2);border-radius:4px;margin-top:0.5rem;animation:fadeIn 0.3s ease;';
        form.appendChild(msg);
    }

    function clearAuthMessages(form) {
        form.querySelectorAll('.auth-message').forEach(m => m.remove());
    }

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal.classList.contains('open')) {
            closeModal();
        }
    });
});
