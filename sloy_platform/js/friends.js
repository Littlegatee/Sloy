// friends.js - Логика страницы друзей

window.friendsController = {
    currentTab: 'all',
    friendsData: [],

    init() {
        this.initTabs();
        this.initSearch();
        this.loadFriends();
    },
    
    initTabs() {
        const tabs = document.querySelectorAll('.friends-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active', 'border-primary', 'text-primary');
                    t.classList.add('border-transparent', 'text-textMuted');
                });
                tab.classList.add('active', 'border-primary', 'text-primary');
                tab.classList.remove('border-transparent', 'text-textMuted');
                
                this.currentTab = tab.dataset.tab;
                this.renderFriends();
            });
        });
    },

    initSearch() {
        const searchInput = document.getElementById('friendSearch');
        const searchBtn = document.querySelector('button.shrink-0'); // Найти кнопка

        if (searchInput && searchBtn) {
            let timeout = null;
            
            const doSearch = async () => {
                const q = searchInput.value.trim();
                if (q.length < 2) {
                    this.renderFriends(); // Возвращаем обычный список
                    return;
                }
                
                const container = document.getElementById('friendsListContainer');
                container.innerHTML = '<div class="col-span-full py-8 text-center text-textMuted"><i class="fas fa-spinner fa-spin"></i> Поиск...</div>';
                
                const result = await api.friends.searchUsers(q);
                if (result.success && result.users.length > 0) {
                    container.innerHTML = '';
                    result.users.forEach(user => {
                        // Проверяем, есть ли уже этот юзер в друзьях
                        const existing = this.friendsData.find(f => f.friend.id === user.id);
                        this.renderUserCard(user, existing, container);
                    });
                } else {
                    container.innerHTML = '<div class="col-span-full py-8 text-center text-textMuted">Пользователи не найдены</div>';
                }
            };

            searchInput.addEventListener('input', () => {
                clearTimeout(timeout);
                timeout = setTimeout(doSearch, 500);
            });
            
            searchBtn.addEventListener('click', doSearch);
        }
    },

    async loadFriends() {
        const container = document.getElementById('friendsListContainer');
        if (!container) return;
        
        const result = await api.friends.getFriends();
        
        if (result.success) {
            this.friendsData = result.friends;
            this.renderFriends();
        } else {
            container.innerHTML = '<div class="col-span-full text-center p-4 text-red-500">Ошибка загрузки</div>';
        }
    },

    renderFriends() {
        const container = document.getElementById('friendsListContainer');
        if (!container) return;

        let filtered = [];
        const accepted = this.friendsData.filter(f => f.status === 'accepted');
        const requests = this.friendsData.filter(f => f.status === 'pending_received');

        // Update counts
        document.getElementById('friendsCountTitle').textContent = `Всего: ${accepted.length}`;
        const reqCountEl = document.getElementById('requestsCount');
        if (reqCountEl) {
            reqCountEl.textContent = requests.length;
            reqCountEl.style.display = requests.length > 0 ? 'inline-block' : 'none';
        }

        if (this.currentTab === 'all') {
            filtered = accepted;
        } else if (this.currentTab === 'online') {
            // Mock online filtering
            filtered = accepted.filter(f => Math.random() > 0.5); 
            document.getElementById('onlineFriendsCount').textContent = filtered.length;
        } else if (this.currentTab === 'requests') {
            filtered = requests;
        }

        container.innerHTML = '';

        if (filtered.length === 0) {
            container.innerHTML = `<div class="col-span-full py-12 text-center text-textMuted">Нет пользователей в этой категории</div>`;
            return;
        }

        filtered.forEach(friendship => {
            this.renderUserCard(friendship.friend, friendship, container);
        });
    },

    renderUserCard(user, friendship, container) {
        const div = document.createElement('div');
        div.className = 'pipe-block bg-surface overflow-hidden flex flex-col hover:shadow-md transition-shadow';
        
        const avatar = user.avatar || user.first_name.charAt(0).toUpperCase();
        const name = `${user.first_name} ${user.last_name || ''}`.trim();
        const isOnline = Math.random() > 0.5; // Mock online status
        
        let buttonsHtml = '';
        
        if (!friendship) {
            // Не в друзьях
            buttonsHtml = `
                <button class="col-span-2 py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-sm" onclick="friendsController.sendRequest(${user.id}, this)">
                    Добавить в друзья
                </button>
            `;
        } else if (friendship.status === 'accepted') {
            buttonsHtml = `
                <button class="py-2 bg-primary text-white text-sm font-semibold rounded-lg hover:bg-blue-600 transition-colors shadow-sm" onclick="app.router.navigate('messages')">
                    Написать
                </button>
                <button class="py-2 bg-bg text-textMuted hover:text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors" onclick="friendsController.removeFriend(${friendship.id})">
                    Удалить
                </button>
            `;
        } else if (friendship.status === 'pending_received') {
            buttonsHtml = `
                <button class="py-2 bg-green-500 text-white text-sm font-semibold rounded-lg hover:bg-green-600 transition-colors shadow-sm" onclick="friendsController.acceptRequest(${friendship.id})">
                    Принять
                </button>
                <button class="py-2 bg-bg text-textMuted hover:text-red-500 text-sm font-semibold rounded-lg hover:bg-red-50 transition-colors" onclick="friendsController.removeFriend(${friendship.id})">
                    Отклонить
                </button>
            `;
        } else if (friendship.status === 'pending') {
             buttonsHtml = `
                <button class="col-span-2 py-2 bg-bg text-textMuted text-sm font-semibold rounded-lg cursor-not-allowed">
                    Заявка отправлена
                </button>
            `;
        }
        
        div.innerHTML = `
            <div class="p-4 flex flex-col items-center text-center flex-1">
                <div class="relative mb-3 cursor-pointer group">
                    <div class="w-20 h-20 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-sm group-hover:shadow-md transition-shadow">
                        ${avatar}
                    </div>
                    ${isOnline ? '<div class="online-dot absolute bottom-1 right-1 w-4 h-4 border-2 border-surface rounded-full"></div>' : ''}
                </div>
                <a href="#" class="font-bold text-text hover:text-primary transition-colors line-clamp-1 w-full">${name}</a>
                <div class="text-xs text-textMuted mb-2">@${user.username}</div>
            </div>
            <div class="p-3 border-t border-border bg-bg/50 grid grid-cols-2 gap-2 mt-auto">
                ${buttonsHtml}
            </div>
        `;
        container.appendChild(div);
    },

    async sendRequest(userId, btn) {
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        btn.disabled = true;
        
        const res = await api.friends.sendRequest(userId);
        if (res.success) {
            btn.innerHTML = 'Заявка отправлена';
            btn.classList.replace('bg-primary', 'bg-bg');
            btn.classList.replace('text-white', 'text-textMuted');
            btn.classList.remove('hover:bg-blue-600');
            this.loadFriends(); // reload data in background
        } else {
            btn.innerHTML = orig;
            btn.disabled = false;
        }
    },

    async acceptRequest(friendshipId) {
        const res = await api.friends.acceptRequest(friendshipId);
        if (res.success) {
            this.loadFriends();
        }
    },

    async removeFriend(friendshipId) {
        if(confirm('Вы уверены?')) {
            const res = await api.friends.removeFriend(friendshipId);
            if (res.success) {
                this.loadFriends();
            }
        }
    }
};
