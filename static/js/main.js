import { getStats, loadSocks, getWashHistory, toggleCleanStatus, deleteSock } from './api';
import { NotificationManager, ModalManager } from './utils';
class MainApp {
    constructor() {
        this.socksLoaded = 0;
        this.priority = 'clean';
        this.query = '';
        this.notificationManager = new NotificationManager();
        this.modalManager = new ModalManager();
    }
    init() {
        this.loadMoreSocks();
        this.setupEventListeners();
        this.setupPriorities();
    }
    setupEventListeners() {
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        const clearSearchBtn = document.getElementById('clearSearch');
        if (searchBtn && searchInput) {
            searchBtn.addEventListener('click', () => this.performSearch(searchInput));
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch(searchInput);
                }
            });
        }
        if (clearSearchBtn) {
            clearSearchBtn.addEventListener('click', async () => {
                if (searchInput)
                    searchInput.value = '';
                clearSearchBtn.style.display = 'none';
                this.query = '';
                this.clearSocks();
                await this.loadMoreSocks();
            });
        }
        document.getElementById('showStatsBtn').addEventListener('click', () => this.showStats());
        const cancelDeleteBtn = document.getElementById('cancelDelete');
        const confirmDeleteBtn = document.getElementById('confirmDelete');
        if (cancelDeleteBtn && confirmDeleteBtn) {
            cancelDeleteBtn.addEventListener('click', () => this.modalManager.close('confirmModal'));
            confirmDeleteBtn.addEventListener('click', () => this.confirmDelete());
        }
        const loadMoreBtn = document.getElementById("loadMoreBtn");
        loadMoreBtn.addEventListener('click', () => {
            this.loadMoreSocks();
        });
    }
    setupPriorities() {
        const priorityButtons = document.querySelectorAll('.priority-btn');
        priorityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const target = e.target;
                const priority = target.dataset.priority;
                if (priority)
                    this.changePriority(priority, target);
            });
        });
    }
    async performSearch(searchInput) {
        const query = searchInput.value.trim();
        if (query == this.query)
            return;
        this.query = query;
        document.getElementById('clearSearch').style.display = '';
        this.clearSocks();
        this.loadMoreSocks();
    }
    displaySocks(socks) {
        const isWide = window.innerWidth > 835;
        const table = document.getElementById(isWide ? 'wideSocksData' : 'thinSocksTable');
        socks.forEach(sock => {
            const html = isWide ? `
                <tr class="sock-row" id="row-${this.socksLoaded}">
                    <td class="photo-cell">
                        <div class="photo-container">
                            ${sock.photo_url ?
                `<img src="${sock.photo_url}" alt="${sock.color} носки" class="sock-photo" loading="lazy">` :
                `<div class="photo-placeholder" style="background-color: ${sock.color_hex}">
                                    <i class="fas fa-socks"></i>
                                </div>`}
                        </div>
                    </td>
                    <td class="info-cell">
                        <div class="sock-info">
                            <h4>${sock.color} носки</h4>
                            <div class="sock-details">
                                <span class="detail-item">
                                    <i class="fas fa-tshirt"></i> ${sock.style}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-shapes"></i> ${sock.pattern}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-spa"></i> ${sock.material}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-tag"></i> ${sock.brand}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-ruler"></i> ${sock.size}
                                </span>
                            </div>
                            <div class="sock-meta">
                                <small>Добавлено: ${sock.created_at_formatted}</small>
                                ${sock.last_washed_formatted ? `<small>Стирка: ${sock.last_washed_formatted}</small>` : ``}
                            </div>
                        </div>
                    </td>
                    <td class="status-cell">
                        <div class="clean-status ${sock.clean ? 'clean' : 'dirty'}">
                            <i class="fas ${sock.clean ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                            <span>${sock.clean ? 'Чистые' : 'Грязные'}</span>
                        </div>
                    </td>
                    <td class="wear-cell">
                        <div class="wear-count">
                            <div class="wear-progress">
                                <div class="wear-bar" style="width: ${Math.min(sock.wear_count * 10, 100)}%"></div>
                            </div>
                            <span class="wear-number">${sock.wear_count}</span>
                            <small>раз</small>
                        </div>
                        <button class="btn-history">
                            <i class="fas fa-history"></i> История
                        </button>
                    </td>
                    <td class="actions-cell">
                        <div class="action-buttons">
                            <button class="action-btn toggle-clean">
                                <i class="fas ${sock.clean ? 'fa-shoe-prints' : 'fa-sink'}"></i>
                                ${sock.clean ? 'Испачкать' : 'Постирать'}
                            </button>
                            <button class="action-btn btn-delete">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </td>
                </tr>` : `
                <div class="sock-row" id="row-${this.socksLoaded}">
                    <div class="photo-cell">
                        <div class="photo-container">
                            ${sock.photo_url ?
                `<img src="${sock.photo_url}" alt="${sock.color} носки" class="sock-photo" loading="lazy">` :
                `<div class="photo-placeholder" style="background-color: ${sock.color_hex}">
                                    <i class="fas fa-socks"></i>
                                </div>`}
                        </div>
                    </div>
                    <div class="info-cell">
                        <div class="sock-info">
                            <div class="main-sock-info">
                                <h4>${sock.color} носки</h4>
                                <div class="status-cell">
                                    <div class="clean-status ${sock.clean ? 'clean' : 'dirty'}">
                                        <i class="fas ${sock.clean ? 'fa-check-circle' : 'fa-times-circle'}"></i>
                                        <span>${sock.clean ? 'Чистые' : 'Грязные'}</span>
                                    </div>
                                </div>
                            </div>
                            <div class="sock-details">
                                <span class="detail-item">
                                    <i class="fas fa-tshirt"></i> ${sock.style}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-shapes"></i> ${sock.pattern}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-spa"></i> ${sock.material}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-tag"></i> ${sock.brand}
                                </span>
                                <span class="detail-item">
                                    <i class="fas fa-ruler"></i> ${sock.size}
                                </span>
                            </div>
                            <div class="sock-meta">
                                <small>Добавлено: ${sock.created_at_formatted}</small>
                                ${sock.last_washed_formatted ? `<small>Стирка: ${sock.last_washed_formatted}</small>` : ``}
                            </div>
                        </div>
                    </div>
                    <div class="wear-cell">
                        <div class="wear-count">
                            <div class="wear-progress">
                                <div class="wear-bar" style="width: ${Math.min(sock.wear_count * 10, 100)}%"></div>
                            </div>
                            <span class="wear-number">${sock.wear_count}</span>
                            <small>раз</small>
                            <button class="btn-history">
                                <i class="fas fa-history"></i> История
                            </button>
                        </div>
                    </div>
                    <div class="actions-cell">
                        <div class="action-buttons">
                            <button class="action-btn toggle-clean">
                                <i class="fas ${sock.clean ? 'fa-shoe-prints' : 'fa-sink'}"></i>
                                ${sock.clean ? 'Испачкать' : 'Постирать'}
                            </button>
                            <button class="action-btn btn-delete">
                                <i class="fas fa-trash"></i> Удалить
                            </button>
                        </div>
                    </div>
                </div>`;
            table.insertAdjacentHTML('beforeend', html);
            const newRow = document.getElementById(`row-${this.socksLoaded}`);
            newRow.getElementsByClassName('btn-history')[0].addEventListener('click', _ => this.showWashHistory(sock.id));
            newRow.getElementsByClassName('toggle-clean')[0].addEventListener('click', _ => this.handleToggleClean(sock.id));
            newRow.getElementsByClassName('btn-delete')[0].addEventListener('click', _ => {
                window.sockToDelete = sock.id;
                this.modalManager.open('confirmModal');
            });
            this.socksLoaded++;
        });
    }
    clearSocks() {
        const isWide = window.innerWidth > 835;
        const table = document.getElementById(isWide ? 'wideSocksData' : 'thinSocksTable');
        table.innerHTML = "";
        this.socksLoaded = 0;
    }
    async loadMoreSocks(load = 10) {
        const data = await loadSocks(this.query, this.socksLoaded, load, this.priority);
        if (!data)
            return;
        this.displaySocks(data);
    }
    async changePriority(priority, button) {
        document.querySelectorAll('.priority-btn').forEach(btn => btn.classList.remove('active'));
        button.classList.add('active');
        this.priority = priority;
        this.clearSocks();
        await this.loadMoreSocks();
    }
    async showStats() {
        const data = await getStats();
        if (data.success) {
            this.displayStats(data);
            this.modalManager.open('statsModal');
        }
    }
    displayStats(data) {
        const statsContent = document.getElementById('statsContent');
        if (!statsContent)
            return;
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
            color_stats.forEach((color) => {
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
            style_stats.forEach((style) => {
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
    async handleToggleClean(sockId) {
        await toggleCleanStatus(sockId);
        let socksLoaded = this.socksLoaded;
        this.clearSocks();
        await this.loadMoreSocks(socksLoaded);
    }
    async showWashHistory(sockId) {
        const data = await getWashHistory(sockId);
        this.displayWashHistory(data.history);
        this.modalManager.open('historyModal');
    }
    displayWashHistory(history) {
        const historyContent = document.getElementById('historyContent');
        if (!historyContent)
            return;
        let html = ``;
        if (!history || history.length === 0) {
            html += `
                <div class="no-history">
                    <i class="fas fa-info-circle"></i>
                    <p>История стирок отсутствует</p>
                </div>
            `;
        }
        else {
            html += '<div class="history-list">';
            history.forEach((record, index) => {
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
    async confirmDelete() {
        const sockId = window.sockToDelete;
        if (!sockId)
            return;
        try {
            const data = await deleteSock(sockId);
            if (data.success) {
                const row = document.querySelector(`[data-id="${sockId}"]`);
                if (row)
                    row.remove();
                const card = document.querySelector(`.sock-card[data-id="${sockId}"]`);
                if (card)
                    card.remove();
                this.notificationManager.show('Носок успешно удален');
                let socksLoaded = this.socksLoaded;
                this.clearSocks();
                await this.loadMoreSocks(socksLoaded - 1);
            }
            else {
                this.notificationManager.show(data.message || 'Ошибка при удалении', 'error');
            }
        }
        catch (error) {
            console.error('Delete error:', error);
            this.notificationManager.show('Ошибка при удалении носка', 'error');
        }
        finally {
            this.modalManager.close('confirmModal');
            window.sockToDelete = null;
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const app = new MainApp();
    app.init();
});
