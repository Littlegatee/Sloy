// communities.js - Логика страницы сообществ

window.communitiesController = {
    init() {
        this.loadCommunities();
    },
    
    async loadCommunities() {
        const container = document.getElementById('communitiesListContainer');
        if (!container) return;
        
        await api.delay(500);
        
        const communities = [
            { id: 1, name: 'Web Development', desc: 'Всё о веб-разработке: HTML, CSS, JS, фреймворки и инструменты.', icon: '💻', color: 'from-blue-500 to-cyan-500', members: '12.5K', role: 'admin' },
            { id: 2, name: 'Дизайн интерфейсов', desc: 'UI/UX дизайн, типографика, сетки и вдохновение.', icon: '🎨', color: 'from-pink-500 to-rose-500', members: '8.2K', role: 'member' },
            { id: 3, name: 'Книжный клуб', desc: 'Обсуждаем прочитанное, делимся отзывами и рекомендациями.', icon: '📚', color: 'from-amber-500 to-orange-500', members: '3.1K', role: 'member' },
        ];
        
        container.innerHTML = '';
        
        communities.forEach(community => {
            const div = document.createElement('div');
            div.className = 'pipe-block bg-surface p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-shadow cursor-pointer group';
            
            const roleBadge = community.role === 'admin' 
                ? '<span class="text-[10px] uppercase font-bold bg-primary/10 text-primary px-2 py-0.5 rounded ml-2">Админ</span>' 
                : '';
                
            div.innerHTML = `
                <div class="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-tr ${community.color} rounded-2xl flex items-center justify-center text-white text-3xl shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    ${community.icon}
                </div>
                <div class="flex-1 min-w-0 flex flex-col">
                    <div class="flex items-start justify-between mb-1">
                        <h3 class="font-bold text-text truncate pr-2 group-hover:text-primary transition-colors flex items-center">
                            ${community.name}
                            ${roleBadge}
                        </h3>
                    </div>
                    <div class="text-xs text-textMuted mb-2">${community.members} участников</div>
                    <p class="text-sm text-textMuted line-clamp-2 mb-3 sm:mb-0 flex-1">${community.desc}</p>
                </div>
            `;
            container.appendChild(div);
        });
    }
};
