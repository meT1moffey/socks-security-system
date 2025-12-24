import { getStats, searchSocks, getWashHistory, toggleCleanStatus, deleteSock } from './api';
import { NotificationManager, ModalManager } from './utils';

class MainApp {
    private notificationManager: NotificationManager;
    private modalManager: ModalManager;

    constructor() {
        this.notificationManager = new NotificationManager();
        this.modalManager = new ModalManager();
    }

    public init(): void {
        this.setupEventListeners();
        this.setupFilters();
        this.setupResponsive();
    }

    private setupEventListeners(): void {
        const searchInput = document.getElementById('searchInput') as HTMLInputElement | null;
        const searchBtn = document.getElementById('searchBtn') as HTMLButtonElement | null;
        const clearSearchBtn = document.getElementById('clearSearch') as HTMLButtonElement | null;
        const searchResults = document.getElementById('searchResults') as HTMLElement | null;
        const mainTable = document.getElementById('mainTable') as HTMLElement | null;

        if (searchBtn && searchInput && searchResults && mainTable) {
            searchBtn.addEventListener('click', () => this.performSearch(searchInput, searchResults, mainTable));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput, searchResults, mainTable);
                }
            });
        }

        if (clearSearchBtn && searchResults && mainTable) {
            clearSearchBtn.addEventListener('click', () => {
                if (searchInput) searchInput.value = '';
                searchResults.style.display = 'none';
                mainTable.style.display = 'block';
            });
        }

        const showStatsBtn = document.getElementById('showStatsBtn');
        if (showStatsBtn) {
            showStatsBtn.addEventListener('click', () => this.showStats());
        }

        const cancelDeleteBtn = document.getElementById('cancelDelete');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (cancelDeleteBtn && confirmDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.modalManager.close('confirmModal'));
            confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }

        document.addEventListener('click', (e) => this.handleDynamicEvents(e));
    }

    private setupFilters(): void {
        const filterButtons = document.querySelectorAll('.filter-btn');
        
        filterButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target as HTMLElement;
                const filter = target.dataset.filter;
                if (filter) {
                    this.applyFilter(filter, target);
                }
            });
        });
    }

    private setupResponsive(): void {
        function checkScreenSize() {
            const table = document.querySelector('.table-responsive');
            const mobileView = document.querySelector('.mobile-view');
            
            if (window.innerWidth <= 768) {
                if (table) (table as HTMLElement).style.display = 'none';
                if (mobileView) (mobileView as HTMLElement).style.display = 'block';
            } else {
                if (table) (table as HTMLElement).style.display = 'block';
                if (mobileView) (mobileView as HTMLElement).style.display = 'none';
            }
        }
        
        checkScreenSize();
        window.addEventListener('resize', checkScreenSize);
    }

    private async performSearch(
        searchInput: HTMLInputElement, 
        searchResults: HTMLElement, 
        mainTable: HTMLElement
    ): Promise<void> {
        const query = searchInput.value.trim();
        if (!query) return;

        try {
            const data = await searchSocks(query);
            
            if (data.success) {
                this.displaySearchResults(data.results, searchResults);
                searchResults.style.display = 'block';
                mainTable.style.display = 'none';
            }
        } catch (error) {
            console.error('Search error:', error);
            this.notificationManager.show('Ошибка при поиске', 'error');
        }
    }

    private displaySearchResults(results: any[], container: HTMLElement): void {
        const resultsContainer = container.querySelector('#searchResultsContainer');
        if (!resultsContainer) return;

        if (results.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <p>Ничего не найдено по вашему запросу</p>
                </div>
            `;
            return;
        }

        let html = '<div class="search-results-grid">';
        
        results.forEach((sock: any) => {
            const photoHtml = sock.photo_url 
                ? `<img src="${sock.photo_url}" alt="${sock.color} носок" loading="lazy">`
                : `<div class="photo-placeholder" style="background-color: ${sock.color_hex || '#6c757d'}">
                        <i class="fas fa-socks"></i>
                    </div>`;

            html += `
                <div class="search-result-card" data-id="${sock.id}">
                    <div class="result-photo">
                        ${photoHtml}
                    </div>
                    <div class="result-info">
                        <h4>${sock.color} носки</h4>
                        <p>${sock.style} • ${sock.size}</p>
                        <div class="clean-status ${sock.clean ? 'clean' : 'dirty'}">
                            <i class="fas ${sock.clean ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${sock.clean ? 'Чистые' : 'Грязные'}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += '</div>';
        resultsContainer.innerHTML = html;
    }

    private applyFilter(filter: string, button: HTMLElement): void {
        const filterButtons = document.querySelectorAll('.filter-btn');
        const sockRows = document.querySelectorAll('.sock-row, .sock-card');

        filterButtons.forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');

        sockRows.forEach(row => {
            const isClean = row.getAttribute('data-clean') === 'true';
            const wearCount = parseInt(row.getAttribute('data-wear') || '0');
            
            let shouldShow = true;
            
            switch(filter) {
                case 'clean':
                    shouldShow = isClean;
                    break;
                case 'dirty':
                    shouldShow = !isClean;
                    break;
                case 'frequent':
                    shouldShow = wearCount > 5;
                    break;
            }
            
            (row as HTMLElement).style.display = shouldShow ? '' : 'none';
        });
    }

    private async showStats(): Promise<void> {
        try {
            const data = await getStats();
            
            if (data.success) {
                this.displayStats(data);
                this.modalManager.open('statsModal');
            }
        } catch (error) {
            console.error('Stats error:', error);
            this.notificationManager.show('Ошибка при загрузке статистики', 'error');
        }
    }

    private displayStats(data: any): void {
        const statsContent = document.getElementById('statsContent');
        if (!statsContent) return;
        
        const { stats, color_stats = [], style_stats = [] } = data;
        
        let html = `
            <div class="stats-grid">
                <div class="stat-big">
                    <h3>${stats.total || 0}</h3>
                    <p>Всего носков</p>
                </div>
                <div class="stat-big">
                    <h3>${stats.clean || 0}</h3>
                    <p>Чистые</p>
                </div>
                <div class="stat-big">
                    <h3>${stats.dirty || 0}</h3>
                    <p>Грязные</p>
                </div>
                <div class="stat-big">
                    <h3>${stats.colors_count || 0}</h3>
                    <p>Разных цветов</p>
                </div>
                <div class="stat-big">
                    <h3>${stats.styles_count || 0}</h3>
                    <p>Стилей</p>
                </div>
                <div class="stat-big">
                    <h3>${stats.total_wears || 0}</h3>
                    <p>Всего носили</p>
                </div>
            </div>
        `;
        
        if (color_stats.length > 0) {
            html += `
                <div class="stats-section">
                    <h3><i class="fas fa-palette"></i> Распределение по цветам</h3>
                    <div class="colors-stats">
            `;
            
            color_stats.forEach((color: any) => {
                const percentage = stats.total ? ((color.count / stats.total) * 100).toFixed(1) : '0';
                html += `
                    <div class="color-stat">
                        <div class="color-stat-header">
                            <div class="color-dot-large" style="background-color: ${color.color_hex || '#6c757d'}"></div>
                            <span>${color.color}</span>
                            <span class="color-count">${color.count} (${percentage}%)</span>
                        </div>
                        <div class="color-stat-bar">
                            <div class="color-stat-fill" style="width: ${percentage}%; background-color: ${color.color_hex || '#6c757d'}"></div>
                        </div>
                        <div class="color-stat-details">
                            <small>Чистые: ${color.clean_count || 0} | Грязные: ${color.count - (color.clean_count || 0)}</small>
                        </div>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        if (style_stats.length > 0) {
            html += `
                <div class="stats-section">
                    <h3><i class="fas fa-tshirt"></i> Популярные стили</h3>
                    <div class="styles-stats">
            `;
            
            style_stats.forEach((style: any) => {
                const percentage = stats.total ? ((style.count / stats.total) * 100).toFixed(1) : '0';
                html += `
                    <div class="style-stat">
                        <span class="style-name">${style.style}</span>
                        <div class="style-stat-bar">
                            <div class="style-stat-fill" style="width: ${percentage}%"></div>
                        </div>
                        <span class="style-count">${style.count} (${percentage}%)</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        }
        
        statsContent.innerHTML = html;
    }

    private handleDynamicEvents(e: Event): void {
        const target = e.target as HTMLElement;

        const deleteBtn = target.closest('.btn-delete') || target.closest('.btn-delete-mobile');
        if (deleteBtn) {
            const sockId = deleteBtn.getAttribute('data-id');
            if (sockId) {
                (window as any).sockToDelete = sockId;
                this.modalManager.open('confirmModal');
            }
        }
        const toggleBtn = target.closest('.toggle-clean');
        if (toggleBtn) {
            const sockId = toggleBtn.getAttribute('data-id');
            if (sockId) {
                this.handleToggleClean(sockId);
            }
        }
        const historyBtn = target.closest('.btn-history');
        if (historyBtn) {
            const sockId = historyBtn.getAttribute('data-id');
            if (sockId) {
                this.showWashHistory(sockId);
            }
        }
    }

    private async handleToggleClean(sockId: string): Promise<void> {
        try {
            const data = await toggleCleanStatus(sockId);
            
            if (data.success) {
                window.location.reload();
            }
        } catch (error) {
            console.error('Toggle clean error:', error);
            this.notificationManager.show('Ошибка при изменении статуса', 'error');
        }
    }

    private async showWashHistory(sockId: string): Promise<void> {
        try {
            const data = await getWashHistory(sockId);
            
            if (data.success) {
                this.displayWashHistory(sockId, data.history);
                this.modalManager.open('historyModal');
            }
        } catch (error) {
            console.error('History error:', error);
            this.notificationManager.show('Ошибка при загрузке истории', 'error');
        }
    }

    private displayWashHistory(sockId: string, history: any[]): void {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent) return;
        
        const sockRow = document.querySelector(`[data-id="${sockId}"]`);
        let sockColor = '';
        if (sockRow) {
            const colorElement = sockRow.querySelector('.sock-info h4');
            if (colorElement) {
                sockColor = colorElement.textContent || '';
            }
        }
        
        let html = `
            <div class="history-header">
                <h3>${sockColor}</h3>
                <p>История стирок</p>
            </div>
        `;
        
        if (!history || history.length === 0) {
            html += `
                <div class="no-history">
                    <i class="fas fa-info-circle"></i>
                    <p>История стирок отсутствует</p>
                </div>
            `;
        } else {
            html += '<div class="history-list">';
            
            history.forEach((record: any, index: number) => {
                const date = new Date(record.wash_date);
                const formattedDate = date.toLocaleDateString('ru-RU', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                html += `
                    <div class="history-item">
                        <div class="history-number">${history.length - index}</div>
                        <div class="history-date">
                            <i class="fas fa-washing-machine"></i>
                            ${formattedDate}
                        </div>
                    </div>
                `;
            });
            
            html += '</div>';
        }
        
        historyContent.innerHTML = html;
    }

    private async confirmDelete(): Promise<void> {
        const sockId = (window as any).sockToDelete;
        if (!sockId) return;

        try {
            const data = await deleteSock(sockId);
            
            if (data.success) {
                const row = document.querySelector(`[data-id="${sockId}"]`);
                if (row) row.remove();

                const card = document.querySelector(`.sock-card[data-id="${sockId}"]`);
                if (card) card.remove();

                this.notificationManager.show('Носок успешно удален');
                
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            } else {
                this.notificationManager.show(data.message || 'Ошибка при удалении', 'error');
            }
        } catch (error) {
            console.error('Delete error:', error);
            this.notificationManager.show('Ошибка при удалении носка', 'error');
        } finally {
            this.modalManager.close('confirmModal');
            (window as any).sockToDelete = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const app = new MainApp();
    app.init();
});