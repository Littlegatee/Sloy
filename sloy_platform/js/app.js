// app.js - Основная логика и роутинг

const app = {
    state: {
        currentUser: null,
        theme: localStorage.getItem('theme') || 'system',
        currentPage: null,
    },
    
    // Инициализация приложения
    async init() {
        this.applyTheme(this.state.theme);
        
        // Показываем лоадер
        const loadingScreen = document.getElementById('loadingScreen');
        
        try {
            // Инициализация компонентов
            await this.renderLayout();
            
            // Проверка авторизации
            this.state.currentUser = api.auth.getCurrentUser();
            
            // Подключаем WebSocket если авторизован
            if (this.state.currentUser) {
                api.ws.connect();
            }
            
            // Инициализация роутера
            this.router.init();
            
            // Скрываем лоадер
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    document.getElementById('mainInterface').classList.remove('hidden');
                }, 300);
            }, 500);
            
        } catch (error) {
            console.error('Ошибка инициализации:', error);
            loadingScreen.innerHTML = '<div class="text-red-500 text-center p-4">Ошибка загрузки приложения. Пожалуйста, обновите страницу.</div>';
        }
    },
    
    // Рендер общих частей (шапка, сайдбары)
    async renderLayout() {
        const headerHtml = `
            <!-- Шапка для десктопа -->
            <header class="sticky top-0 z-50 bg-surface border-b border-border shadow-sm hidden md:block">
                <div class="max-w-7xl mx-auto flex justify-between items-center h-16 px-4 sm:px-6">
                    <div class="flex items-center space-x-8">
                        <a href="#" class="text-2xl font-bold text-primary flex items-center gap-2" onclick="app.router.navigate('feed'); return false;">
                            <div class="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm">С</div>
                            СЛОЙ
                        </a>
                        
                        <nav class="hidden lg:flex space-x-1 relative">
                            <a href="#" class="header-tab px-4 h-16 flex items-center font-semibold text-textMuted hover:text-primary transition-colors" data-route="feed" onclick="app.router.navigate('feed'); return false;">
                                <i class="fas fa-home mr-2"></i>Лента
                            </a>
                            <a href="#" class="header-tab px-4 h-16 flex items-center font-semibold text-textMuted hover:text-primary transition-colors" data-route="messages" onclick="app.router.navigate('messages'); return false;">
                                <i class="fas fa-comment mr-2"></i>Сообщения
                            </a>
                            <a href="#" class="header-tab px-4 h-16 flex items-center font-semibold text-textMuted hover:text-primary transition-colors" data-route="profile" onclick="app.router.navigate('profile'); return false;">
                                <i class="fas fa-user mr-2"></i>Профиль
                            </a>
                        </nav>
                    </div>

                    <div class="flex items-center space-x-4">
                        <div class="relative hidden xl:block">
                            <input type="text" placeholder="Поиск..." class="bg-bg border border-border py-2 pl-10 pr-4 rounded-full text-sm w-48 outline-none focus:border-primary focus:w-64 transition-all text-text">
                            <i class="fas fa-search absolute left-3.5 top-2.5 text-textMuted text-sm"></i>
                        </div>
                        
                        <div class="flex items-center space-x-3" id="headerUserActions">
                            <!-- Будет заполнено после проверки авторизации -->
                        </div>
                    </div>
                </div>
            </header>

            <!-- Шапка для мобильных -->
            <header class="sticky top-0 z-50 bg-surface border-b border-border shadow-sm md:hidden">
                <div class="flex justify-between items-center h-14 px-4">
                    <button class="w-10 h-10 flex items-center justify-center text-xl text-text" onclick="app.ui.toggleBurgerMenu()">
                        <i class="fas fa-bars"></i>
                    </button>
                    
                    <a href="#" class="text-xl font-bold text-primary" onclick="app.router.navigate('feed'); return false;">
                        СЛОЙ
                    </a>
                    
                    <div class="flex items-center space-x-2">
                        <button class="w-10 h-10 flex items-center justify-center text-text">
                            <i class="fas fa-search"></i>
                        </button>
                    </div>
                </div>
            </header>
        `;
        
        const sidebarHtml = `
            <div class="pipe-block p-4 bg-surface">
                <div class="space-y-1">
                    <a href="#" class="sidebar-link flex items-center justify-between p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="feed" onclick="app.router.navigate('feed'); return false;">
                        <div class="flex items-center space-x-3">
                            <i class="fas fa-home text-textMuted w-5 text-center"></i>
                            <span>Лента</span>
                        </div>
                    </a>
                    <a href="#" class="sidebar-link flex items-center space-x-3 p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="messages" onclick="app.router.navigate('messages'); return false;">
                        <i class="fas fa-comment text-textMuted w-5 text-center"></i>
                        <span>Сообщения</span>
                        <span class="ml-auto bg-primary text-white text-xs px-2 py-0.5 rounded-full">3</span>
                    </a>
                    <a href="#" class="sidebar-link flex items-center space-x-3 p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="friends" onclick="app.router.navigate('friends'); return false;">
                        <i class="fas fa-user-friends text-textMuted w-5 text-center"></i>
                        <span>Друзья</span>
                    </a>
                    <a href="#" class="sidebar-link flex items-center space-x-3 p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="communities" onclick="app.router.navigate('communities'); return false;">
                        <i class="fas fa-users text-textMuted w-5 text-center"></i>
                        <span>Сообщества</span>
                    </a>
                    <a href="#" class="sidebar-link flex items-center space-x-3 p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="profile" onclick="app.router.navigate('profile'); return false;">
                        <i class="fas fa-user text-textMuted w-5 text-center"></i>
                        <span>Профиль</span>
                    </a>
                    <a href="#" class="sidebar-link flex items-center space-x-3 p-3 rounded-xl hover:bg-bg w-full text-left text-text font-medium transition-colors" data-route="settings" onclick="app.router.navigate('settings'); return false;">
                        <i class="fas fa-cog text-textMuted w-5 text-center"></i>
                        <span>Настройки</span>
                    </a>
                </div>
            </div>
        `;
        
        const rightSidebarHtml = `
            <div class="pipe-block p-4 bg-surface">
                <h3 class="font-bold text-sm mb-3 text-text">Актуальное</h3>
                <div class="space-y-3 text-sm">
                    <div class="p-3 bg-bg rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div class="text-textMuted text-xs mb-1">Технологии • В тренде</div>
                        <div class="font-semibold text-text">#SloyPlatform</div>
                        <div class="text-textMuted text-xs mt-1">1,234 постов</div>
                    </div>
                    <div class="p-3 bg-bg rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer transition-colors">
                        <div class="text-textMuted text-xs mb-1">Разработка • В тренде</div>
                        <div class="font-semibold text-text">#MVP</div>
                        <div class="text-textMuted text-xs mt-1">842 поста</div>
                    </div>
                </div>
            </div>
            <div class="text-xs text-textMuted flex flex-wrap gap-2 px-2">
                <a href="#" class="hover:underline">Условия</a>
                <a href="#" class="hover:underline">Политика</a>
                <a href="#" class="hover:underline">О нас</a>
                <span>© 2026 СЛОЙ</span>
            </div>
        `;

        const mobileMenuHtml = `
            <a href="#" class="mobile-menu-item" data-route="feed" onclick="app.router.navigate('feed'); return false;">
                <i class="fas fa-home"></i>
                <span>Лента</span>
            </a>
            <a href="#" class="mobile-menu-item" data-route="friends" onclick="app.router.navigate('friends'); return false;">
                <i class="fas fa-users"></i>
                <span>Друзья</span>
            </a>
            <a href="#" class="mobile-menu-item relative" data-route="messages" onclick="app.router.navigate('messages'); return false;">
                <i class="fas fa-comment"></i>
                <span>Чаты</span>
                <span class="absolute top-1 right-3 w-2 h-2 bg-red-500 rounded-full"></span>
            </a>
            <a href="#" class="mobile-menu-item" data-route="profile" onclick="app.router.navigate('profile'); return false;">
                <i class="fas fa-user"></i>
                <span>Профиль</span>
            </a>
        `;

        document.getElementById('headerContainer').innerHTML = headerHtml;
        document.getElementById('sidebarContainer').innerHTML = sidebarHtml;
        document.getElementById('rightSidebarContainer').innerHTML = rightSidebarHtml;
        document.getElementById('mobileMenuContainer').innerHTML = mobileMenuHtml;
        
        this.updateHeaderAuth();
    },
    
    updateHeaderAuth() {
        const container = document.getElementById('headerUserActions');
        if (!container) return;
        
        if (this.state.currentUser) {
            container.innerHTML = `
                <button class="relative w-10 h-10 bg-bg text-text rounded-full flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-700 transition" onclick="app.router.navigate('notifications')">
                    <i class="fas fa-bell"></i>
                    <span class="notification-dot"></span>
                </button>
                <div class="relative cursor-pointer ml-2" onclick="app.router.navigate('profile')">
                    <div class="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        ${this.state.currentUser.avatar || 'U'}
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <button class="px-4 py-2 text-primary font-semibold hover:bg-bg rounded-xl transition" onclick="app.router.navigate('auth')">Войти</button>
                <button class="px-4 py-2 bg-primary text-white font-semibold rounded-xl shadow-sm shadow-primary/30 hover:bg-blue-600 transition" onclick="app.router.navigate('auth')">Регистрация</button>
            `;
        }
    },
    
    // Роутер
    router: {
        routes: ['feed', 'profile', 'friends', 'communities', 'messages', 'settings', 'auth', 'register'],
        
        init() {
            // Обработка кнопок "назад"
            window.addEventListener('popstate', (e) => {
                if (e.state && e.state.page) {
                    this.loadPage(e.state.page, false);
                } else {
                    this.navigate('feed', false);
                }
            });
            
            // Загружаем начальную страницу
            const path = window.location.hash.replace('#', '') || 'feed';
            this.navigate(this.routes.includes(path) ? path : 'feed', false);
        },
        
        async navigate(page, pushState = true) {
            if (!this.routes.includes(page)) page = 'feed';
            
            // Проверка авторизации
            if (page !== 'auth' && page !== 'register' && !app.state.currentUser) {
                page = 'auth';
            }
            
            if ((page === 'auth' || page === 'register') && app.state.currentUser) {
                page = 'feed';
            }
            
            if (app.state.currentPage === page) return;
            
            if (pushState) {
                window.history.pushState({ page }, '', `#${page}`);
            }
            
            await this.loadPage(page);
        },
        
        async loadPage(page) {
            const routerView = document.getElementById('routerView');
            const topProgress = document.getElementById('topProgress');
            
            // Анимация загрузки
            topProgress.style.width = '30%';
            routerView.style.opacity = '0.5';
            
            try {
                // В реальном приложении здесь fetch('pages/' + page + '.html')
                const response = await fetch(`pages/${page}.html`);
                if (!response.ok) throw new Error('Page not found');
                const html = await response.text();
                
                topProgress.style.width = '70%';
                
                routerView.innerHTML = `<div class="page-enter">${html}</div>`;
                app.state.currentPage = page;
                
                // Обновляем активные ссылки
                app.ui.updateActiveLinks(page);
                
                // Вызываем скрипт инициализации страницы
                this.initPageScripts(page);
                
                // Скрываем/показываем сайдбары
                const sidebar = document.getElementById('sidebarContainer');
                const rightSidebar = document.getElementById('rightSidebarContainer');
                const mobileMenu = document.getElementById('mobileMenuContainer');
                
                if (page === 'auth' || page === 'register' || page === 'messages') {
                    if(page === 'auth' || page === 'register') {
                        sidebar.classList.add('hidden', 'lg:hidden');
                        sidebar.classList.remove('lg:block');
                        rightSidebar.classList.add('hidden', 'xl:hidden');
                        rightSidebar.classList.remove('xl:block');
                        mobileMenu.style.display = 'none';
                    } else { // messages
                        rightSidebar.classList.add('hidden', 'xl:hidden');
                        rightSidebar.classList.remove('xl:block');
                        // Make routerView take full width if needed
                        routerView.classList.replace('max-w-4xl', 'max-w-6xl');
                    }
                } else {
                    sidebar.classList.remove('hidden', 'lg:hidden');
                    sidebar.classList.add('hidden', 'lg:block');
                    rightSidebar.classList.remove('hidden', 'xl:hidden');
                    rightSidebar.classList.add('hidden', 'xl:block');
                    mobileMenu.style.display = '';
                    routerView.classList.replace('max-w-6xl', 'max-w-4xl');
                }
                
                window.scrollTo(0, 0);
                
            } catch (error) {
                console.error('Ошибка загрузки страницы:', error);
                routerView.innerHTML = '<div class="pipe-block p-8 text-center text-red-500 bg-surface">Ошибка загрузки страницы</div>';
            } finally {
                topProgress.style.width = '100%';
                routerView.style.opacity = '1';
                setTimeout(() => {
                    topProgress.style.width = '0';
                    topProgress.style.transition = 'none';
                    setTimeout(() => topProgress.style.transition = 'all 0.3s ease', 50);
                }, 300);
            }
        },
        
        initPageScripts(page) {
            // Инициализация специфичных для страницы скриптов
            if (page === 'feed' && window.feedController) feedController.init();
            if (page === 'profile' && window.profileController) profileController.init();
            if (page === 'messages' && window.messagesController) messagesController.init();
            if (page === 'friends' && window.friendsController) friendsController.init();
            if (page === 'communities' && window.communitiesController) communitiesController.init();
            if (page === 'settings') app.ui.initSettings();
            if ((page === 'auth' || page === 'register') && window.authController) authController.init();
        }
    },
    
    // UI Helpers
    ui: {
        updateActiveLinks(page) {
            // Desktop Header
            document.querySelectorAll('.header-tab').forEach(el => {
                if (el.dataset.route === page) {
                    el.classList.add('text-primary', 'border-b-2', 'border-primary');
                    el.classList.remove('text-textMuted');
                } else {
                    el.classList.remove('text-primary', 'border-b-2', 'border-primary');
                    el.classList.add('text-textMuted');
                }
            });
            
            // Sidebar
            document.querySelectorAll('.sidebar-link').forEach(el => {
                if (el.dataset.route === page) {
                    el.classList.add('bg-bg', 'text-primary');
                    el.querySelector('i').classList.add('text-primary');
                    el.querySelector('i').classList.remove('text-textMuted');
                } else {
                    el.classList.remove('bg-bg', 'text-primary');
                    el.querySelector('i').classList.remove('text-primary');
                    el.querySelector('i').classList.add('text-textMuted');
                }
            });
            
            // Mobile Menu
            document.querySelectorAll('.mobile-menu-item').forEach(el => {
                if (el.dataset.route === page) {
                    el.classList.add('active');
                } else {
                    el.classList.remove('active');
                }
            });
        },
        
        toggleBurgerMenu() {
            // TODO: implement burger menu
            console.log("Toggle burger menu");
        },
        
        initSettings() {
            const tabs = document.querySelectorAll('.settings-tab');
            const sections = document.querySelectorAll('.settings-section');
            
            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Update active tab
                    tabs.forEach(t => {
                        t.classList.remove('active', 'bg-bg', 'text-primary');
                        t.classList.add('text-textMuted');
                    });
                    tab.classList.add('active', 'bg-bg', 'text-primary');
                    tab.classList.remove('text-textMuted');
                    
                    // Show section
                    const targetId = `settings-${tab.dataset.tab}`;
                    sections.forEach(s => {
                        if (s.id === targetId) {
                            s.classList.remove('hidden');
                        } else if (s.id !== 'settings-placeholder') {
                            s.classList.add('hidden');
                        }
                    });
                    
                    // Show placeholder if section not found
                    if (!document.getElementById(targetId)) {
                        document.getElementById('settings-placeholder').classList.remove('hidden');
                    } else {
                        document.getElementById('settings-placeholder').classList.add('hidden');
                    }
                });
            });
            
            // Theme buttons
            document.querySelectorAll('.theme-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const theme = btn.dataset.theme;
                    app.applyTheme(theme);
                    
                    // Update buttons UI
                    document.querySelectorAll('.theme-btn').forEach(b => {
                        b.classList.remove('border-primary');
                        b.classList.add('border-transparent', 'opacity-70');
                    });
                    btn.classList.add('border-primary');
                    btn.classList.remove('border-transparent', 'opacity-70');
                });
                
                // Set initial active state
                if (btn.dataset.theme === app.state.theme) {
                    btn.classList.add('border-primary');
                    btn.classList.remove('border-transparent', 'opacity-70');
                }
            });

            // Profile Settings Logic
            const profileForm = document.getElementById('profileSettingsForm');
            if (profileForm && app.state.currentUser) {
                // Populate current data
                const user = app.state.currentUser;
                const nameParts = user.name.split(' ');
                document.getElementById('settingsFirstName').value = nameParts[0] || '';
                document.getElementById('settingsLastName').value = nameParts.slice(1).join(' ') || '';
                document.getElementById('settingsStatus').value = user.status || '';
                document.getElementById('settingsCity').value = user.location || '';
                // mock birthday logic skipped for brevity
                
                profileForm.addEventListener('submit', async (e) => {
                    e.preventDefault();
                    const btn = document.getElementById('btnSaveProfile');
                    const orig = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    btn.disabled = true;

                    const data = {
                        first_name: document.getElementById('settingsFirstName').value,
                        last_name: document.getElementById('settingsLastName').value,
                        status: document.getElementById('settingsStatus').value,
                        city: document.getElementById('settingsCity').value
                    };

                    const res = await api.auth.updateProfile(data);
                    
                    btn.innerHTML = res.success ? '<i class="fas fa-check"></i> Сохранено' : 'Ошибка';
                    setTimeout(() => {
                        btn.innerHTML = orig;
                        btn.disabled = false;
                    }, 2000);
                });
            }
        }
    },
    
    applyTheme(theme) {
        this.state.theme = theme;
        localStorage.setItem('theme', theme);
        
        if (theme === 'system') {
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
            
            // Listen for system changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
                if (this.state.theme === 'system') {
                    if (e.matches) document.documentElement.classList.add('dark');
                    else document.documentElement.classList.remove('dark');
                }
            });
        } else if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }
};

// Start app
document.addEventListener('DOMContentLoaded', () => {
    app.init();
});
