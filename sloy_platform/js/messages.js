// messages.js - Логика мессенджера

window.messagesController = {
    activeChatId: null,
    
    init() {
        this.loadDialogs();
        this.initChatInput();
        
        // Подписка на новые сообщения
        api.ws.subscribe((data) => {
            if (data.type === 'new_message') {
                this.handleNewMessage(data);
            }
        });
    },

    handleNewMessage(data) {
        // Обновляем список диалогов
        this.loadDialogs();
        
        // Если открыт чат с отправителем/получателем
        const currentUser = app.state.currentUser;
        if (!currentUser) return;
        
        const isFromMe = data.sender_id === currentUser.id;
        const chatPartnerId = isFromMe ? data.recipient_id : data.sender_id;
        
        if (this.activeChatId == chatPartnerId) {
            this.appendMessage({
                id: data.id,
                text: data.content_text,
                fromMe: isFromMe,
                time: new Date(data.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
                read: data.is_read
            });
            
            // Прокрутка вниз
            const container = document.getElementById('chatMessagesArea');
            if (container) {
                container.scrollTop = container.scrollHeight;
            }
        }
    },
    
    async loadDialogs() {
        const container = document.getElementById('dialogsList');
        if (!container) return;
        
        const result = await api.messages.getDialogs();
        
        if (!result.success) {
            container.innerHTML = '<div class="text-center p-4 text-red-500 text-sm">Ошибка загрузки</div>';
            return;
        }
        
        const dialogs = result.dialogs;
        
        if (dialogs.length === 0) {
            container.innerHTML = '<div class="text-center p-4 text-textMuted text-sm">Нет сообщений</div>';
            return;
        }
        
        container.innerHTML = '';
        
        dialogs.forEach(dialog => {
            const div = document.createElement('div');
            div.className = `p-3 rounded-xl cursor-pointer flex items-center space-x-3 transition-colors ${this.activeChatId === dialog.id ? 'bg-primary/10' : 'hover:bg-bg'}`;
            div.onclick = () => this.openChat(dialog);
            
            const avatarColor = dialog.isGroup ? 'from-purple-500 to-indigo-500' : 'from-blue-400 to-cyan-500';
            
            div.innerHTML = `
                <div class="relative shrink-0">
                    <div class="w-12 h-12 bg-gradient-to-tr ${avatarColor} rounded-full flex items-center justify-center text-white font-bold shadow-sm">
                        ${dialog.avatar}
                    </div>
                    ${dialog.online ? '<div class="online-dot absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-surface rounded-full"></div>' : ''}
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline mb-1">
                        <div class="font-semibold text-text truncate pr-2 text-sm">${dialog.name}</div>
                        <div class="text-[10px] text-textMuted shrink-0">${dialog.time}</div>
                    </div>
                    <div class="flex justify-between items-center">
                        <div class="text-sm text-textMuted truncate pr-2">${dialog.lastMessage}</div>
                        ${dialog.unread > 0 ? `<div class="bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0">${dialog.unread}</div>` : ''}
                    </div>
                </div>
            `;
            container.appendChild(div);
        });
    },
    
    openChat(dialog) {
        this.activeChatId = dialog.id;
        
        // UI updates
        document.getElementById('chatEmptyState').classList.add('hidden');
        document.getElementById('chatActiveState').classList.remove('hidden');
        document.getElementById('chatActiveState').classList.add('flex');
        
        // Mobile handling
        if (window.innerWidth < 768) {
            document.getElementById('dialogsListContainer').classList.add('hidden');
            document.getElementById('chatArea').classList.remove('hidden');
        }
        
        // Update header
        document.getElementById('activeChatName').textContent = dialog.name;
        document.getElementById('activeChatStatus').textContent = dialog.online ? 'онлайн' : 'был(а) недавно';
        document.getElementById('activeChatStatus').className = dialog.online ? 'text-xs text-primary' : 'text-xs text-textMuted';
        
        const avatarEl = document.getElementById('activeChatAvatar');
        // Simple avatar logic for demo
        avatarEl.src = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><rect width="40" height="40" fill="%234361ee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="white" font-family="sans-serif" font-size="20">${dialog.avatar}</text></svg>`;
        
        const onlineDot = document.getElementById('activeChatOnline');
        if (dialog.online) onlineDot.classList.remove('hidden');
        else onlineDot.classList.add('hidden');
        
        // Load messages
        this.loadChatMessages(dialog.id);
        
        // Update dialogs list styling
        this.loadDialogs(); // Re-render to update active state
    },
    
    async loadChatMessages(chatId) {
        const container = document.getElementById('chatMessagesArea');
        container.innerHTML = '<div class="text-center p-4 text-textMuted text-sm">Загрузка сообщений...</div>';
        
        const result = await api.messages.getMessages(chatId);
        container.innerHTML = '';
        
        if (result.success && result.messages.length > 0) {
            result.messages.forEach(msg => {
                this.appendMessage(msg, container);
            });
        } else {
            container.innerHTML = '<div class="text-center p-4 text-textMuted text-sm mt-10">Напишите первое сообщение!</div>';
        }
        
        // Scroll to bottom
        container.scrollTop = container.scrollHeight;
    },

    appendMessage(msg, container = null) {
        if (!container) container = document.getElementById('chatMessagesArea');
        
        // Remove empty state text if exists
        const emptyState = container.querySelector('.text-center');
        if (emptyState) emptyState.remove();

        const div = document.createElement('div');
        div.className = `flex ${msg.fromMe ? 'justify-end' : 'justify-start'} mb-4`;
        
        div.innerHTML = `
            <div class="max-w-[75%]">
                <div class="${msg.fromMe ? 'bg-primary text-white rounded-l-2xl rounded-tr-2xl' : 'bg-white dark:bg-gray-800 text-text border border-border rounded-r-2xl rounded-tl-2xl'} p-3 shadow-sm text-[15px] leading-relaxed relative group">
                    ${msg.text}
                    <div class="text-[10px] ${msg.fromMe ? 'text-blue-100' : 'text-textMuted'} text-right mt-1 flex justify-end items-center gap-1">
                        ${msg.time}
                        ${msg.fromMe ? (msg.read ? '<i class="fas fa-check-double text-[10px]"></i>' : '<i class="fas fa-check text-[10px]"></i>') : ''}
                    </div>
                </div>
            </div>
        `;
        container.appendChild(div);
    },
    
    initChatInput() {
        const input = document.getElementById('messageInput');
        const btn = document.getElementById('sendMessageBtn');
        
        if (!input || !btn) return;
        
        const sendMsg = () => {
            const text = input.value.trim();
            if (!text || !this.activeChatId) return;
            
            // Send via WebSocket
            const sent = api.ws.sendMessage(this.activeChatId, text);
            
            if (sent) {
                input.value = '';
                input.style.height = 'auto';
            }
        };
        
        btn.addEventListener('click', sendMsg);
        
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMsg();
            }
        });
        
        input.addEventListener('input', function() {
            this.style.height = 'auto';
            this.style.height = (this.scrollHeight) + 'px';
        });
    }
};

// UI helper to go back to dialogs on mobile
window.ui = window.ui || {};
window.ui.messages = {
    showDialogsList() {
        document.getElementById('chatArea').classList.add('hidden');
        document.getElementById('dialogsListContainer').classList.remove('hidden');
    }
};
