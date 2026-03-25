// api.js - Работа с бэкендом FastAPI

const API_URL = 'http://localhost:8000';
const WS_URL = 'ws://localhost:8000/ws';

const api = {
    // Вспомогательная функция для запросов
    async request(endpoint, options = {}) {
        const token = localStorage.getItem('sl_token');
        
        const headers = {
            'Content-Type': 'application/json',
            ...options.headers
        };
        
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        const config = {
            ...options,
            headers
        };
        
        try {
            const response = await fetch(`${API_URL}${endpoint}`, config);
            const data = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    this.auth.logout(); // Токен истек
                }
                throw new Error(data.detail || 'API Error');
            }
            
            return { success: true, data };
        } catch (error) {
            console.error('API Error:', error);
            return { success: false, error: error.message };
        }
    },
    
    auth: {
        getCurrentUser() {
            const userStr = localStorage.getItem('sl_user');
            return userStr ? JSON.parse(userStr) : null;
        },
        
        async login(username, password) {
            const formData = new URLSearchParams();
            formData.append('username', username);
            formData.append('password', password);
            
            try {
                const response = await fetch(`${API_URL}/token`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                    body: formData
                });
                
                const data = await response.json();
                
                if (!response.ok) {
                    throw new Error(data.detail || 'Login failed');
                }
                
                localStorage.setItem('sl_token', data.access_token);
                
                // Получаем данные пользователя
                const userRes = await api.request('/users/me/');
                if (userRes.success) {
                    // Адаптируем данные для фронтенда
                    const user = {
                        id: userRes.data.id,
                        name: `${userRes.data.first_name} ${userRes.data.last_name || ''}`.trim(),
                        username: userRes.data.username,
                        email: userRes.data.email,
                        avatar: userRes.data.avatar || userRes.data.first_name.charAt(0).toUpperCase(),
                        verified: userRes.data.is_verified,
                        status: userRes.data.status || "Новый пользователь",
                        location: userRes.data.city || "Не указан",
                        friends: 0,
                        followers: 0,
                        posts: 0
                    };
                    
                    localStorage.setItem('sl_user', JSON.stringify(user));
                    app.state.currentUser = user;
                    app.updateHeaderAuth();
                    return { success: true, user };
                }
                return { success: false, error: 'Failed to fetch user data' };
            } catch (error) {
                console.error('Login Error:', error);
                
                // FALLBACK FOR MVP (if backend is not running)
                console.log("Fallback to local auth for MVP");
                const user = {
                    id: 1,
                    name: "Администратор",
                    username: username,
                    email: username.includes('@') ? username : `${username}@example.com`,
                    avatar: username.charAt(0).toUpperCase(),
                    verified: true,
                    status: "Тестовый аккаунт",
                    location: "Local",
                    friends: 127,
                    followers: 1200,
                    posts: 45
                };
                localStorage.setItem('sl_token', 'dummy_token');
                localStorage.setItem('sl_user', JSON.stringify(user));
                app.state.currentUser = user;
                app.updateHeaderAuth();
                return { success: true, user };
            }
        },
        
        async register(username, email, password, firstName) {
            const result = await api.request('/users/', {
                method: 'POST',
                body: JSON.stringify({
                    username,
                    email,
                    password,
                    first_name: firstName
                })
            });
            return result;
        },
        
        async logout() {
            localStorage.removeItem('sl_token');
            localStorage.removeItem('sl_user');
            app.state.currentUser = null;
            app.updateHeaderAuth();
            app.router.navigate('auth');
            return { success: true };
        },

        async updateProfile(data) {
            const result = await api.request('/users/me/', {
                method: 'PUT',
                body: JSON.stringify(data)
            });
            if (result.success) {
                const updatedUser = {
                    ...app.state.currentUser,
                    name: `${result.data.first_name} ${result.data.last_name || ''}`.trim(),
                    status: result.data.status,
                    location: result.data.city,
                    birthday: result.data.birth_date
                };
                localStorage.setItem('sl_user', JSON.stringify(updatedUser));
                app.state.currentUser = updatedUser;
                return { success: true, user: updatedUser };
            }
            return result;
        },

        async uploadAvatar(file) {
            const formData = new FormData();
            formData.append('file', file);

            const token = localStorage.getItem('sl_token');
            const headers = {};
            if (token) headers['Authorization'] = `Bearer ${token}`;

            try {
                const response = await fetch(`${API_URL}/users/me/avatar`, {
                    method: 'POST',
                    headers,
                    body: formData
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Upload failed');
                
                const updatedUser = {
                    ...app.state.currentUser,
                    avatar: `${API_URL}${data.avatar}`
                };
                localStorage.setItem('sl_user', JSON.stringify(updatedUser));
                app.state.currentUser = updatedUser;
                app.updateHeaderAuth();
                
                return { success: true, avatar: updatedUser.avatar };
            } catch (error) {
                return { success: false, error: error.message };
            }
        }
    },
    
    ws: {
        socket: null,
        callbacks: [],

        connect() {
            const token = localStorage.getItem('sl_token');
            if (!token || token === 'dummy_token') return;

            this.socket = new WebSocket(`${WS_URL}/${token}`);

            this.socket.onopen = () => {
                console.log('WebSocket connected');
            };

            this.socket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                this.callbacks.forEach(cb => cb(data));
            };

            this.socket.onclose = () => {
                console.log('WebSocket disconnected');
                // Auto reconnect
                setTimeout(() => this.connect(), 3000);
            };
        },

        subscribe(callback) {
            this.callbacks.push(callback);
        },

        sendMessage(recipientId, text) {
            if (this.socket && this.socket.readyState === WebSocket.OPEN) {
                this.socket.send(JSON.stringify({
                    recipient_id: recipientId,
                    content_text: text
                }));
                return true;
            }
            return false;
        }
    },

    messages: {
        async getDialogs() {
            const result = await api.request('/messages/dialogs');
            if (result.success) {
                const dialogs = result.data.map(d => ({
                    id: d.user.id,
                    name: `${d.user.first_name} ${d.user.last_name || ''}`.trim(),
                    avatar: d.user.avatar || d.user.first_name.charAt(0).toUpperCase(),
                    lastMessage: d.last_message.content_text,
                    time: new Date(d.last_message.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    unread: d.unread_count,
                    online: true // Mock online status
                }));
                return { success: true, dialogs };
            }
            return { success: false };
        },

        async getMessages(userId) {
            const result = await api.request(`/messages/${userId}`);
            if (result.success) {
                const currentUser = api.auth.getCurrentUser();
                const messages = result.data.map(m => ({
                    id: m.id,
                    text: m.content_text,
                    fromMe: m.sender_id === currentUser.id,
                    time: new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                    read: m.is_read
                }));
                return { success: true, messages };
            }
            return { success: false };
        }
    },

    friends: {
        async getFriends() {
            const result = await api.request('/friends/');
            if (result.success) {
                return { success: true, friends: result.data };
            }
            // Mock
            return { success: true, friends: [] };
        },

        async searchUsers(query) {
            const result = await api.request(`/users/search?q=${encodeURIComponent(query)}`);
            if (result.success) {
                return { success: true, users: result.data };
            }
            return { success: true, users: [] };
        },

        async sendRequest(userId) {
            return await api.request('/friends/request', {
                method: 'POST',
                body: JSON.stringify({ friend_id: userId })
            });
        },

        async acceptRequest(friendshipId) {
            return await api.request(`/friends/${friendshipId}/accept`, {
                method: 'POST'
            });
        },

        async removeFriend(friendshipId) {
            return await api.request(`/friends/${friendshipId}`, {
                method: 'DELETE'
            });
        }
    },

    posts: {
        async getFeed(page = 1) {
            const result = await api.request(`/posts/?skip=${(page-1)*20}&limit=20`);
            
            if (result.success) {
                // Адаптируем данные под формат фронтенда
                const posts = result.data.map(p => ({
                    id: p.id,
                    userId: p.author.id,
                    userName: `${p.author.first_name} ${p.author.last_name || ''}`.trim(),
                    userAvatar: p.author.avatar || p.author.first_name.charAt(0).toUpperCase(),
                    verified: p.author.is_verified,
                    time: new Date(p.created_at).toLocaleString(),
                    text: p.content_text,
                    image: p.media_url,
                    likes: p.likes_count,
                    comments: p.comments_count,
                    reposts: p.shares_count,
                    views: p.views_count,
                    isLiked: false,
                    isReposted: false
                }));
                return { success: true, posts };
            }
            
            // FALLBACK FOR MVP
            const postsStr = localStorage.getItem('sl_posts');
            let posts = postsStr ? JSON.parse(postsStr) : [];
            if (posts.length === 0) {
                posts = [
                    {
                        id: 1,
                        userId: 1,
                        userName: "Администратор",
                        userAvatar: "А",
                        verified: true,
                        time: "5 мин назад",
                        text: "Добро пожаловать в СЛОЙ! Это новая социальная сеть.",
                        image: null,
                        likes: 42,
                        comments: 12,
                        reposts: 8,
                        views: 1200,
                        isLiked: false,
                        isReposted: false
                    }
                ];
                localStorage.setItem('sl_posts', JSON.stringify(posts));
            }
            return { success: true, posts };
        },
        
        async createPost(text, file = null) {
            const formData = new FormData();
            formData.append('content_text', text);
            if (file) {
                formData.append('file', file);
            }

            const token = localStorage.getItem('sl_token');
            const headers = {};
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            try {
                const response = await fetch(`${API_URL}/posts/`, {
                    method: 'POST',
                    headers,
                    body: formData
                });
                
                const data = await response.json();
                if (!response.ok) throw new Error(data.detail || 'Error creating post');
                
                const p = data;
                const post = {
                    id: p.id,
                    userId: p.author.id,
                    userName: `${p.author.first_name} ${p.author.last_name || ''}`.trim(),
                    userAvatar: p.author.avatar || p.author.first_name.charAt(0).toUpperCase(),
                    verified: p.author.is_verified,
                    time: "Только что",
                    text: p.content_text,
                    image: p.media_url ? `${API_URL}${p.media_url}` : null,
                    likes: p.likes_count,
                    comments: p.comments_count,
                    reposts: p.shares_count,
                    views: p.views_count,
                    isLiked: false,
                    isReposted: false
                };
                return { success: true, post };
            } catch (error) {
                console.error('Create Post Error:', error);
                
                // FALLBACK FOR MVP
                const user = api.auth.getCurrentUser();
                const postsStr = localStorage.getItem('sl_posts');
                const posts = postsStr ? JSON.parse(postsStr) : [];
                
                const newPost = {
                    id: Date.now(),
                    userId: user.id,
                    userName: user.name,
                    userAvatar: user.avatar,
                    verified: user.verified,
                    time: "Только что",
                    text: text,
                    image: file ? URL.createObjectURL(file) : null,
                    likes: 0,
                    comments: 0,
                    reposts: 0,
                    views: 0,
                    isLiked: false,
                    isReposted: false
                };
                
                posts.unshift(newPost);
                localStorage.setItem('sl_posts', JSON.stringify(posts));
                
                return { success: true, post: newPost };
            }
        },

        async toggleLike(postId) {
            const result = await api.request(`/posts/${postId}/like`, {
                method: 'POST'
            });
            
            if (result.success) {
                return { success: true, status: result.data.status, likes: result.data.likes_count };
            }
            
            // FALLBACK FOR MVP
            const postsStr = localStorage.getItem('sl_posts');
            if (postsStr) {
                const posts = JSON.parse(postsStr);
                const postIndex = posts.findIndex(p => p.id == postId);
                if (postIndex !== -1) {
                    const isLiked = !posts[postIndex].isLiked;
                    posts[postIndex].isLiked = isLiked;
                    posts[postIndex].likes += isLiked ? 1 : -1;
                    localStorage.setItem('sl_posts', JSON.stringify(posts));
                    return { success: true, status: isLiked ? 'liked' : 'unliked', likes: posts[postIndex].likes };
                }
            }
            return { success: false };
        },

        async getComments(postId) {
            const result = await api.request(`/posts/${postId}/comments`);
            if (result.success) {
                const comments = result.data.map(c => ({
                    id: c.id,
                    userId: c.author.id,
                    userName: `${c.author.first_name} ${c.author.last_name || ''}`.trim(),
                    userAvatar: c.author.avatar || c.author.first_name.charAt(0).toUpperCase(),
                    time: new Date(c.created_at).toLocaleString(),
                    text: c.content_text
                }));
                return { success: true, comments };
            }
            
            // FALLBACK
            return { success: true, comments: [] };
        },

        async createComment(postId, text) {
            const result = await api.request(`/posts/${postId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content_text: text })
            });
            
            if (result.success) {
                const c = result.data;
                const comment = {
                    id: c.id,
                    userId: c.author.id,
                    userName: `${c.author.first_name} ${c.author.last_name || ''}`.trim(),
                    userAvatar: c.author.avatar || c.author.first_name.charAt(0).toUpperCase(),
                    time: "Только что",
                    text: c.content_text
                };
                return { success: true, comment };
            }
            return { success: false };
        }
    }
};
