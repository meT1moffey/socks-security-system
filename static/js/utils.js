export function formatDate(dateString) {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    }
    catch (error) {
        return dateString;
    }
}
export class NotificationManager {
    constructor(notificationId = 'notification', messageId = 'notificationMessage') {
        this.notification = document.getElementById(notificationId);
        this.messageElement = document.getElementById(messageId);
    }
    show(message, type = 'success', duration = 3000) {
        if (!this.messageElement || !this.notification)
            return;
        this.messageElement.textContent = message;
        this.notification.className = `notification show ${type}`;
        setTimeout(() => {
            this.hide();
        }, duration);
    }
    hide() {
        if (this.notification) {
            this.notification.classList.remove('show');
        }
    }
}
export class ModalManager {
    constructor() {
        this.modals = new Map();
        this.init();
    }
    init() {
        document.querySelectorAll('.modal').forEach(modal => {
            const modalElement = modal;
            const id = modalElement.id;
            this.modals.set(id, modalElement);
            const closeButton = modalElement.querySelector('.close-modal');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.close(id));
            }
        });
        document.addEventListener('click', (event) => {
            const target = event.target;
            if (target.classList.contains('modal')) {
                this.closeAll();
            }
        });
    }
    open(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }
    close(modalId) {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    closeAll() {
        this.modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
}
export class ResponsiveManager {
    constructor(tableId = 'mainTable', mobileViewClass = '.mobile-view') {
        this.table = document.getElementById(tableId);
        this.mobileView = document.querySelector(mobileViewClass);
    }
    checkScreenSize() {
        if (window.innerWidth <= 768) {
            if (this.table)
                this.table.style.display = 'none';
            if (this.mobileView)
                this.mobileView.style.display = 'block';
        }
        else {
            if (this.table)
                this.table.style.display = 'block';
            if (this.mobileView)
                this.mobileView.style.display = 'none';
        }
    }
    init() {
        this.checkScreenSize();
        window.addEventListener('resize', () => this.checkScreenSize());
    }
}
