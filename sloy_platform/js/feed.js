// feed.js - Логика ленты новостей

window.feedController = {
    async init() {
        this.page = 1;
        this.isLoading = false;
        this.hasMore = true;
        
        this.renderUserAvatar();
        this.initPostForm();
        await this.loadPosts();
        this.initInfiniteScroll();
    },
    
    initInfiniteScroll() {
        window.addEventListener('scroll', () => {
            if (app.state.currentPage !== 'feed') return;
            
            if ((window.innerHeight + window.scrollY) >= document.body.offsetHeight - 500) {
                if (!this.isLoading && this.hasMore) {
                    this.loadMorePosts();
                }
            }
        });
    },

    async loadMorePosts() {
        this.isLoading = true;
        this.page += 1;
        
        const loader = document.getElementById('feedLoader');
        if (loader) loader.classList.remove('hidden');
        
        try {
            const result = await api.posts.getFeed(this.page);
            if (result.success) {
                if (result.posts.length === 0) {
                    this.hasMore = false;
                } else {
                    const container = document.getElementById('feedPosts');
                    result.posts.forEach(post => {
                        container.appendChild(this.createPostElement(post));
                    });
                }
            }
        } finally {
            this.isLoading = false;
            if (loader) loader.classList.add('hidden');
        }
    },
    
    renderUserAvatar() {
        const avatarEl = document.getElementById('feedCurrentUserAvatar');
        if (avatarEl && app.state.currentUser) {
            avatarEl.textContent = app.state.currentUser.avatar;
        }
    },
    
    initPostForm() {
        const input = document.getElementById('postText');
        const btn = document.getElementById('btnPublish');
        const mediaInput = document.getElementById('mediaInput');
        const mediaPreview = document.getElementById('postMediaPreview');
        
        if (!input || !btn) return;
        
        let selectedFile = null;

        // Автоматическое изменение высоты textarea
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
            
            btn.disabled = this.value.trim().length === 0 && !selectedFile;
        });

        // Обработка выбора медиа
        if (mediaInput) {
            mediaInput.addEventListener('change', function(e) {
                if (this.files && this.files[0]) {
                    selectedFile = this.files[0];
                    btn.disabled = false;
                    
                    mediaPreview.classList.remove('hidden');
                    
                    const fileReader = new FileReader();
                    fileReader.onload = function(e) {
                        let html = '';
                        if (selectedFile.type.startsWith('image/')) {
                            html = `
                                <div class="relative rounded-xl overflow-hidden group">
                                    <img src="${e.target.result}" class="w-full h-48 object-cover">
                                    <button class="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" onclick="feedController.removeMedia()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `;
                        } else if (selectedFile.type.startsWith('video/')) {
                            html = `
                                <div class="relative rounded-xl overflow-hidden group">
                                    <video src="${e.target.result}" class="w-full h-48 object-cover"></video>
                                    <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div class="w-12 h-12 bg-black/50 rounded-full flex items-center justify-center text-white">
                                            <i class="fas fa-play"></i>
                                        </div>
                                    </div>
                                    <button class="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto" onclick="feedController.removeMedia()">
                                        <i class="fas fa-times"></i>
                                    </button>
                                </div>
                            `;
                        }
                        mediaPreview.innerHTML = html;
                    };
                    fileReader.readAsDataURL(selectedFile);
                }
            });
        }

        // Сохраняем ссылки для доступа из других методов
        this.postInput = input;
        this.publishBtn = btn;
        this.mediaInput = mediaInput;
        this.mediaPreview = mediaPreview;
        
        // Обработка публикации
        btn.addEventListener('click', async () => {
            const text = input.value.trim();
            if (!text && !selectedFile) return;
            
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
            
            try {
                const result = await api.posts.createPost(text, selectedFile);
                if (result.success) {
                    this.resetForm();
                    
                    // Добавляем пост в начало списка
                    const container = document.getElementById('feedPosts');
                    if (container) {
                        // Если была заглушка "нет постов", удаляем её
                        if (container.querySelector('.text-center')) {
                            container.innerHTML = '';
                        }
                        const postEl = this.createPostElement(result.post);
                        container.insertBefore(postEl, container.firstChild);
                        
                        // Анимация появления
                        postEl.style.opacity = '0';
                        postEl.style.transform = 'translateY(-20px)';
                        setTimeout(() => {
                            postEl.style.transition = 'all 0.3s ease';
                            postEl.style.opacity = '1';
                            postEl.style.transform = 'translateY(0)';
                        }, 50);
                    }
                }
            } catch (error) {
                console.error('Ошибка публикации:', error);
            } finally {
                btn.innerHTML = originalText;
            }
        });
    },

    removeMedia() {
        if (this.mediaInput) this.mediaInput.value = '';
        if (this.mediaPreview) {
            this.mediaPreview.innerHTML = '';
            this.mediaPreview.classList.add('hidden');
        }
        if (this.postInput && this.publishBtn) {
            this.publishBtn.disabled = this.postInput.value.trim().length === 0;
        }
    },

    resetForm() {
        if (this.postInput) {
            this.postInput.value = '';
            this.postInput.style.height = 'auto';
        }
        this.removeMedia();
        if (this.publishBtn) this.publishBtn.disabled = true;
    },
    
    async loadPosts() {
        const loader = document.getElementById('feedLoader');
        const container = document.getElementById('feedPosts');
        
        if (!container) return;
        
        if (loader) loader.classList.remove('hidden');
        
        try {
            const result = await api.posts.getFeed();
            
            if (result.success) {
                container.innerHTML = '';
                
                if (result.posts.length === 0) {
                    container.innerHTML = `
                        <div class="pipe-block p-8 text-center bg-surface">
                            <i class="fas fa-newspaper text-4xl text-textMuted mb-3"></i>
                            <div class="font-semibold text-text">Лента пуста</div>
                            <div class="text-textMuted text-sm mt-1">Будьте первым, кто опубликует пост!</div>
                        </div>
                    `;
                } else {
                    result.posts.forEach(post => {
                        container.appendChild(this.createPostElement(post));
                    });
                }
            }
        } catch (error) {
            container.innerHTML = '<div class="text-red-500 text-center p-4">Ошибка загрузки ленты</div>';
        } finally {
            if (loader) loader.classList.add('hidden');
        }
    },
    
    createPostElement(post) {
        const div = document.createElement('div');
        div.className = 'pipe-block bg-surface overflow-hidden hover:shadow-md transition-shadow';
        div.dataset.postId = post.id;
        
        const verifiedBadge = post.verified ? 
            '<div class="verified-badge ml-1"><i class="fas fa-check text-[10px]"></i></div>' : '';
            
        const isOwner = app.state.currentUser && post.userId === app.state.currentUser.id;
        
        const imageHtml = post.image ? `
            <div class="mt-3 rounded-xl overflow-hidden bg-bg/50">
                ${post.image.includes('video') ? 
                    `<video src="${post.image}" controls class="max-h-96 w-full object-cover"></video>` : 
                    `<img src="${post.image}" class="max-h-96 w-full object-cover" alt="Post media">`
                }
            </div>
        ` : '';

        div.innerHTML = `
            <div class="p-4 sm:p-5">
                <div class="flex justify-between mb-3">
                    <div class="flex space-x-3 cursor-pointer group" onclick="app.router.navigate('profile')">
                        <div class="w-10 h-10 ${isOwner ? 'bg-gradient-to-tr from-blue-500 to-purple-600 text-white' : 'bg-bg text-text'} rounded-full flex items-center justify-center font-bold shrink-0">
                            ${post.userAvatar}
                        </div>
                        <div>
                            <div class="font-semibold text-sm flex items-center text-text group-hover:text-primary transition-colors">
                                <span>${post.userName}</span>
                                ${verifiedBadge}
                            </div>
                            <div class="text-xs text-textMuted">
                                ${post.time}
                            </div>
                        </div>
                    </div>
                    <button class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-textMuted transition-colors">
                        <i class="fas fa-ellipsis-h"></i>
                    </button>
                </div>
                
                <div class="text-text text-[15px] whitespace-pre-wrap leading-relaxed">
                    ${this.formatText(post.text)}
                </div>
                
                ${imageHtml}
                
                <div class="flex items-center justify-between mt-4 pt-3 border-t border-border">
                    <div class="flex space-x-6 sm:space-x-8">
                        <button class="flex items-center space-x-2 text-textMuted hover:text-red-500 transition-colors group btn-like ${post.isLiked ? 'text-red-500' : ''}" onclick="feedController.toggleLike(this)">
                            <div class="w-8 h-8 rounded-full group-hover:bg-red-50 dark:group-hover:bg-red-500/10 flex items-center justify-center transition-colors">
                                <i class="${post.isLiked ? 'fas' : 'far'} fa-heart"></i>
                            </div>
                            <span class="text-sm font-medium">${post.likes}</span>
                        </button>
                        <button class="flex items-center space-x-2 text-textMuted hover:text-blue-500 transition-colors group" onclick="feedController.toggleComments(this)">
                            <div class="w-8 h-8 rounded-full group-hover:bg-blue-50 dark:group-hover:bg-blue-500/10 flex items-center justify-center transition-colors">
                                <i class="far fa-comment"></i>
                            </div>
                            <span class="text-sm font-medium">${post.comments}</span>
                        </button>
                        <button class="flex items-center space-x-2 text-textMuted hover:text-green-500 transition-colors group ${post.isReposted ? 'text-green-500' : ''}">
                            <div class="w-8 h-8 rounded-full group-hover:bg-green-50 dark:group-hover:bg-green-500/10 flex items-center justify-center transition-colors">
                                <i class="fas fa-retweet"></i>
                            </div>
                            <span class="text-sm font-medium">${post.reposts}</span>
                        </button>
                    </div>
                    <div class="flex items-center space-x-4">
                        <span class="text-textMuted text-xs flex items-center space-x-1" title="Просмотры">
                            <i class="far fa-eye"></i>
                            <span>${post.views}</span>
                        </span>
                        <button class="w-8 h-8 rounded-full hover:bg-bg flex items-center justify-center text-textMuted hover:text-primary transition-colors">
                            <i class="far fa-share-square"></i>
                        </button>
                    </div>
                </div>
                
                <!-- Секция комментариев (скрыта по умолчанию) -->
                <div class="comments-section hidden mt-4 pt-4 border-t border-border">
                    <div class="comments-list space-y-3 mb-4">
                        <!-- Комментарии загружаются сюда -->
                    </div>
                    
                    <div class="flex items-start space-x-3">
                        <div class="w-8 h-8 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold shrink-0 text-xs">
                            ${app.state.currentUser ? app.state.currentUser.avatar : 'U'}
                        </div>
                        <div class="flex-1 flex items-end bg-bg rounded-xl border border-border focus-within:border-primary p-1">
                            <textarea rows="1" class="comment-input flex-1 bg-transparent border-none outline-none text-sm p-2 resize-none custom-scrollbar" placeholder="Написать комментарий..."></textarea>
                            <button class="btn-send-comment w-8 h-8 shrink-0 text-primary hover:bg-surface rounded-lg flex items-center justify-center m-1 transition-colors" disabled>
                                <i class="fas fa-paper-plane"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        return div;
    },
    
    formatText(text) {
        // Простая подсветка хештегов и ссылок
        let formatted = text.replace(/#(\w+)/g, '<a href="#" class="text-primary hover:underline">#$1</a>');
        return formatted;
    },
    
    async toggleLike(btn) {
        if (btn.disabled) return;
        btn.disabled = true;

        const postEl = btn.closest('.pipe-block');
        const postId = postEl.dataset.postId;
        const icon = btn.querySelector('i');
        const countSpan = btn.querySelector('span');
        
        try {
            const result = await api.posts.toggleLike(postId);
            
            if (result.success) {
                if (result.status === 'liked') {
                    btn.classList.add('text-red-500');
                    icon.classList.replace('far', 'fas');
                    
                    // Анимация лайка
                    icon.style.transform = 'scale(1.3)';
                    setTimeout(() => {
                        icon.style.transform = 'scale(1)';
                        icon.style.transition = 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
                    }, 100);
                } else {
                    btn.classList.remove('text-red-500');
                    icon.classList.replace('fas', 'far');
                }
                countSpan.textContent = result.likes;
            }
        } catch (error) {
            console.error('Like error:', error);
        } finally {
            btn.disabled = false;
        }
    },

    async toggleComments(btn) {
        const postEl = btn.closest('.pipe-block');
        const postId = postEl.dataset.postId;
        const commentsSection = postEl.querySelector('.comments-section');
        const commentsList = postEl.querySelector('.comments-list');
        
        if (commentsSection.classList.contains('hidden')) {
            commentsSection.classList.remove('hidden');
            
            // Load comments
            commentsList.innerHTML = '<div class="text-center text-sm text-textMuted py-2"><i class="fas fa-spinner fa-spin"></i> Загрузка...</div>';
            
            const result = await api.posts.getComments(postId);
            if (result.success) {
                commentsList.innerHTML = '';
                if (result.comments.length === 0) {
                    commentsList.innerHTML = '<div class="text-center text-sm text-textMuted py-2">Пока нет комментариев. Будьте первым!</div>';
                } else {
                    result.comments.forEach(c => {
                        commentsList.appendChild(this.createCommentElement(c));
                    });
                }
            } else {
                commentsList.innerHTML = '<div class="text-center text-sm text-red-500 py-2">Ошибка загрузки комментариев</div>';
            }

            // Init input
            const input = postEl.querySelector('.comment-input');
            const sendBtn = postEl.querySelector('.btn-send-comment');
            
            if (input && sendBtn && !input.dataset.initialized) {
                input.dataset.initialized = 'true';
                
                input.addEventListener('input', function() {
                    this.style.height = 'auto';
                    this.style.height = (this.scrollHeight) + 'px';
                    sendBtn.disabled = this.value.trim().length === 0;
                });
                
                const sendComment = async () => {
                    const text = input.value.trim();
                    if (!text) return;
                    
                    input.disabled = true;
                    sendBtn.disabled = true;
                    sendBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
                    
                    const res = await api.posts.createComment(postId, text);
                    if (res.success) {
                        input.value = '';
                        input.style.height = 'auto';
                        
                        // Remove "no comments" message if exists
                        if (commentsList.querySelector('.text-center')) {
                            commentsList.innerHTML = '';
                        }
                        
                        commentsList.appendChild(this.createCommentElement(res.comment));
                        
                        // Update comment count
                        const countSpan = btn.querySelector('span');
                        countSpan.textContent = parseInt(countSpan.textContent) + 1;
                    }
                    
                    input.disabled = false;
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                    input.focus();
                };
                
                sendBtn.addEventListener('click', sendComment);
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendComment();
                    }
                });
            }
        } else {
            commentsSection.classList.add('hidden');
        }
    },

    createCommentElement(comment) {
        const div = document.createElement('div');
        div.className = 'flex space-x-3 group';
        div.innerHTML = `
            <div class="w-8 h-8 bg-bg text-text rounded-full flex items-center justify-center font-bold shrink-0 text-xs cursor-pointer hover:bg-primary hover:text-white transition-colors">
                ${comment.userAvatar}
            </div>
            <div class="flex-1 bg-bg rounded-xl p-3">
                <div class="flex justify-between items-baseline mb-1">
                    <span class="font-semibold text-sm text-text cursor-pointer hover:underline">${comment.userName}</span>
                    <span class="text-[10px] text-textMuted">${comment.time}</span>
                </div>
                <div class="text-sm text-text whitespace-pre-wrap">${comment.text}</div>
            </div>
        `;
        return div;
    }
};
