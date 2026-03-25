// auth.js - Логика страницы авторизации

window.authController = {
    init() {
        const form = document.getElementById('authForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const loginInput = document.getElementById('authLogin');
                const passwordInput = document.getElementById('authPassword');
                const btn = form.querySelector('button[type="submit"]');
                
                if (!loginInput.value || !passwordInput.value) {
                    // Простая валидация
                    loginInput.classList.add('border-red-500');
                    passwordInput.classList.add('border-red-500');
                    setTimeout(() => {
                        loginInput.classList.remove('border-red-500');
                        passwordInput.classList.remove('border-red-500');
                    }, 2000);
                    return;
                }
                
                // Анимация загрузки
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                try {
                    const result = await api.auth.login(loginInput.value, passwordInput.value);
                    if (result.success) {
                        app.router.navigate('feed');
                    }
                } catch (error) {
                    console.error('Ошибка входа:', error);
                    btn.innerHTML = 'Ошибка. Попробуйте снова';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                } finally {
                    btn.disabled = false;
                }
            });
        }

        const regForm = document.getElementById('registerForm');
        if (regForm) {
            regForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const firstName = document.getElementById('regFirstName').value;
                const username = document.getElementById('regUsername').value;
                const email = document.getElementById('regEmail').value;
                const password = document.getElementById('regPassword').value;
                const btn = regForm.querySelector('button[type="submit"]');
                
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                btn.disabled = true;
                
                try {
                    const result = await api.auth.register(username, email, password, firstName);
                    if (result.success) {
                        // После успешной регистрации сразу логиним
                        const loginRes = await api.auth.login(username, password);
                        if (loginRes.success) {
                            app.router.navigate('feed');
                        }
                    } else {
                        alert(result.error || 'Ошибка регистрации');
                        btn.innerHTML = originalText;
                    }
                } catch (error) {
                    console.error('Ошибка регистрации:', error);
                    btn.innerHTML = 'Ошибка. Попробуйте снова';
                    setTimeout(() => btn.innerHTML = originalText, 2000);
                } finally {
                    btn.disabled = false;
                }
            });
        }
        
        const tgBtn = document.getElementById('telegramLoginWidget');
        if (tgBtn) {
            tgBtn.addEventListener('click', async () => {
                const btn = tgBtn.querySelector('button');
                const originalText = btn.innerHTML;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                
                try {
                    // Имитация входа через Telegram
                    const result = await api.auth.login('telegram_user', 'secret');
                    if (result.success) {
                        app.router.navigate('feed');
                    }
                } catch (error) {
                    btn.innerHTML = originalText;
                }
            });
        }
    }
};
