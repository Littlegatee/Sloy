// profile.js - Логика профиля пользователя

window.profileController = {
    init() {
        this.renderProfileData();
        this.initTabs();
        this.loadProfilePosts();
        this.initAvatarUpload();
    },
    
    initAvatarUpload() {
        const input = document.getElementById('avatarInput');
        if (!input) return;

        input.addEventListener('change', async function() {
            if (this.files && this.files[0]) {
                const file = this.files[0];
                
                // Optimistic UI update
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('profileAvatar').innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover">`;
                };
                reader.readAsDataURL(file);

                // Upload
                const res = await api.auth.uploadAvatar(file);
                if (!res.success) {
                    alert('Ошибка загрузки аватара');
                    profileController.renderProfileData(); // revert
                }
            }
        });
    },

    renderProfileData() {
        const user = app.state.currentUser;
        if (!user) return;
        
        document.getElementById('profileName').textContent = user.name;
        document.getElementById('profileUsername').textContent = '@' + user.username;
        document.getElementById('profileStatus').textContent = user.status;
        
        const avatarEl = document.getElementById('profileAvatar');
        if (user.avatar && user.avatar.startsWith('http')) {
            avatarEl.innerHTML = `<img src="${user.avatar}" class="w-full h-full object-cover">`;
        } else {
            avatarEl.textContent = user.avatar || user.name.charAt(0);
        }
        
        document.getElementById('statFriends').textContent = user.friends;
        document.getElementById('statFollowers').textContent = user.followers;
        document.getElementById('statPosts').textContent = user.posts;
        
        // Показываем форму поста только в своем профиле
        const postFormContainer = document.getElementById('profilePostFormContainer');
        if (postFormContainer) {
            postFormContainer.innerHTML = `
                <div class="pipe-block p-4 bg-surface mb-4">
                    <div class="flex items-start space-x-3">
                        <div class="w-10 h-10 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shrink-0 shadow-md">
                            ${user.avatar}
                        </div>
                        <div class="flex-1">
                            <textarea
                                id="profilePostText"
                                rows="2"
                                class="w-full text-text border-none focus:ring-0 outline-none resize-none placeholder-textMuted bg-transparent text-sm custom-scrollbar"
                                placeholder="Что у вас нового?"
                            ></textarea>
                            
                            <div class="flex items-center justify-between mt-3 pt-3 border-t border-border">
                                <div class="flex space-x-2">
                                    <button class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-primary transition-colors tooltip" data-tooltip="Добавить фото/видео">
                                        <i class="fas fa-image"></i>
                                    </button>
                                </div>
                                <button id="btnPublishProfile" class="px-5 py-2 bg-primary text-white text-sm font-semibold rounded-full hover:bg-blue-600 transition shadow-md shadow-primary/20">
                                    Опубликовать
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            // Логика публикации (упрощенная)
            const btn = document.getElementById('btnPublishProfile');
            const input = document.getElementById('profilePostText');
            
            if (btn && input) {
                btn.addEventListener('click', async () => {
                    const text = input.value.trim();
                    if (!text) return;
                    
                    const orig = btn.innerHTML;
                    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    btn.disabled = true;
                    
                    try {
                        await api.posts.createPost(text);
                        input.value = '';
                        this.loadProfilePosts(); // Reload posts
                    } finally {
                        btn.innerHTML = orig;
                        btn.disabled = false;
                    }
                });
            }
        }
    },
    
    initTabs() {
        const tabs = document.querySelectorAll('.profile-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => {
                    t.classList.remove('active', 'border-primary', 'text-text');
                    t.classList.add('border-transparent', 'text-textMuted');
                });
                tab.classList.add('active', 'border-primary', 'text-text');
                tab.classList.remove('border-transparent', 'text-textMuted');
                
                // В MVP просто имитируем переключение контента
                const container = document.getElementById('profilePosts');
                container.innerHTML = '<div class="pipe-block p-8 text-center text-textMuted"><i class="fas fa-spinner fa-spin text-2xl mb-2"></i><p>Загрузка...</p></div>';
                
                setTimeout(() => {
                    if (tab.dataset.tab === 'posts') {
                        this.loadProfilePosts();
                    } else {
                        container.innerHTML = `<div class="pipe-block p-8 text-center text-textMuted"><p>Нет данных в разделе "${tab.textContent.trim()}"</p></div>`;
                    }
                }, 500);
            });
        });
    },
    
    async loadProfilePosts() {
        const container = document.getElementById('profilePosts');
        if (!container) return;
        
        try {
            const result = await api.posts.getFeed();
            if (result.success) {
                const userPosts = result.posts.filter(p => p.userId === app.state.currentUser.id);
                
                container.innerHTML = '';
                
                if (userPosts.length === 0) {
                    container.innerHTML = `
                        <div class="pipe-block p-8 text-center bg-surface text-textMuted">
                            <i class="fas fa-pen mb-3 text-3xl opacity-50"></i>
                            <p>На стене пока нет записей</p>
                        </div>
                    `;
                } else {
                    userPosts.forEach(post => {
                        // Используем метод из feedController для создания элемента
                        if (window.feedController) {
                            container.appendChild(feedController.createPostElement(post));
                        }
                    });
                }
            }
        } catch (error) {
            container.innerHTML = '<div class="text-red-500 text-center p-4">Ошибка загрузки записей</div>';
        }
    }
};
