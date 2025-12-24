export function formatDate(dateString: string): string {
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('ru-RU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    } catch (error) {
        return dateString;
    }
}

export class NotificationManager {
    private notification: HTMLElement | null;
    private messageElement: HTMLElement | null;

    constructor(notificationId: string = 'notification', messageId: string = 'notificationMessage') {
        this.notification = document.getElementById(notificationId);
        this.messageElement = document.getElementById(messageId);
    }

    show(message: string, type: 'success' | 'error' = 'success', duration: number = 3000): void {
        if (!this.messageElement || !this.notification) return;
        
        this.messageElement.textContent = message;
        this.notification.className = `notification show ${type}`;

        setTimeout(() => {
            this.hide();
        }, duration);
    }

    hide(): void {
        if (this.notification) {
            this.notification.classList.remove('show');
        }
    }
}

export class ModalManager {
    private modals: Map<string, HTMLElement> = new Map();

    constructor() {
        this.init();
    }

    private init(): void {
        document.querySelectorAll('.modal').forEach(modal => {
            const modalElement = modal as HTMLElement;
            const id = modalElement.id;
            this.modals.set(id, modalElement);

            const closeButton = modalElement.querySelector('.close-modal');
            if (closeButton) {
                closeButton.addEventListener('click', () => this.close(id));
            }
        });

        document.addEventListener('click', (event) => {
            const target = event.target as HTMLElement;
            if (target.classList.contains('modal')) {
                this.closeAll();
            }
        });
    }

    open(modalId: string): void {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }

    close(modalId: string): void {
        const modal = this.modals.get(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }

    closeAll(): void {
        this.modals.forEach(modal => {
            modal.style.display = 'none';
        });
    }
}

export class ResponsiveManager {
    private table: HTMLElement | null;
    private mobileView: HTMLElement | null;

    constructor(tableId: string = 'mainTable', mobileViewClass: string = '.mobile-view') {
        this.table = document.getElementById(tableId);
        this.mobileView = document.querySelector(mobileViewClass);
    }

    checkScreenSize(): void {
        if (window.innerWidth <= 768) {
            if (this.table) this.table.style.display = 'none';
            if (this.mobileView) this.mobileView.style.display = 'block';
        } else {
            if (this.table) this.table.style.display = 'block';
            if (this.mobileView) this.mobileView.style.display = 'none';
        }
    }

    init(): void {
        this.checkScreenSize();
        window.addEventListener('resize', () => this.checkScreenSize());
    }
}