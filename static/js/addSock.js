import { addSock, isValidImageFile } from './api';
import { NotificationManager } from './utils';
class AddSockApp {
    constructor() {
        this.notificationManager = new NotificationManager();
    }
    init() {
        this.setupColorSelection();
        this.setupFilePreview();
        this.setupFormSubmission();
    }
    setupColorSelection() {
        const colorOptions = document.querySelectorAll('.color-option');
        const colorInput = document.getElementById('color');
        const colorHexInput = document.getElementById('color_hex');
        const selectedColorName = document.getElementById('selectedColorName');
        const selectedColorPreview = document.getElementById('selectedColorPreview');
        if (!colorInput || !colorHexInput || !selectedColorName || !selectedColorPreview)
            return;
        colorOptions.forEach(option => {
            option.addEventListener('click', (e) => {
                const target = e.currentTarget;
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                target.classList.add('selected');
                const colorName = target.dataset.name;
                const colorHex = target.dataset.hex;
                if (colorName && colorHex) {
                    colorInput.value = colorName;
                    colorHexInput.value = colorHex;
                    selectedColorName.textContent = colorName;
                    selectedColorPreview.style.backgroundColor = colorHex;
                    selectedColorPreview.style.display = 'block';
                }
            });
        });
    }
    setupFilePreview() {
        const fileInput = document.getElementById('photo');
        const filePreview = document.getElementById('filePreview');
        if (!fileInput || !filePreview)
            return;
        fileInput.addEventListener('change', (e) => {
            const target = e.target;
            const file = target.files?.[0];
            if (file) {
                this.handleFileSelection(file, fileInput, filePreview);
            }
            else {
                this.resetFilePreview(filePreview);
            }
        });
    }
    handleFileSelection(file, fileInput, filePreview) {
        if (!isValidImageFile(file)) {
            this.notificationManager.show('Пожалуйста, выберите файл изображения (PNG, JPG, GIF, до 16MB)', 'error');
            fileInput.value = '';
            this.resetFilePreview(filePreview);
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const result = e.target?.result;
            filePreview.innerHTML = `
                <div class="preview-image">
                    <img src="${result}" alt="Предпросмотр">
                    <div class="preview-overlay">
                        <button type="button" class="btn-remove-preview" id="removePreviewBtn">
                            <i class="fas fa-times"></i> Удалить
                        </button>
                    </div>
                </div>
            `;
            const removeBtn = document.getElementById('removePreviewBtn');
            if (removeBtn) {
                removeBtn.addEventListener('click', () => {
                    fileInput.value = '';
                    this.resetFilePreview(filePreview);
                });
            }
        };
        reader.readAsDataURL(file);
    }
    resetFilePreview(filePreview) {
        filePreview.innerHTML = `
            <div class="preview-placeholder">
                <i class="fas fa-cloud-upload-alt"></i>
                <p>Выберите файл для предпросмотра</p>
            </div>
        `;
    }
    setupFormSubmission() {
        const form = document.getElementById('addSockForm');
        if (!form)
            return;
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.handleFormSubmit(form);
        });
    }
    async handleFormSubmit(form) {
        const colorInput = document.getElementById('color');
        if (!colorInput || !colorInput.value) {
            this.notificationManager.show('Пожалуйста, выберите цвет', 'error');
            return;
        }
        if (!form.checkValidity()) {
            this.notificationManager.show('Пожалуйста, заполните все обязательные поля', 'error');
            return;
        }
        const formData = new FormData(form);
        try {
            const data = await addSock(formData);
            if (data.success) {
                this.notificationManager.show('Носок успешно добавлен!');
                setTimeout(() => {
                    this.resetForm(form);
                    this.updateRecentSocks();
                }, 2000);
            }
            else {
                this.notificationManager.show(data.message || 'Ошибка при добавлении', 'error');
            }
        }
        catch (error) {
            console.error('Error:', error);
            this.notificationManager.show('Ошибка соединения с сервером', 'error');
        }
    }
    resetForm(form) {
        form.reset();
        const colorOptions = document.querySelectorAll('.color-option');
        const selectedColorName = document.getElementById('selectedColorName');
        const selectedColorPreview = document.getElementById('selectedColorPreview');
        const filePreview = document.getElementById('filePreview');
        colorOptions.forEach(opt => opt.classList.remove('selected'));
        if (selectedColorName)
            selectedColorName.textContent = 'Выберите цвет';
        if (selectedColorPreview) {
            selectedColorPreview.style.display = 'none';
            selectedColorPreview.style.backgroundColor = '';
        }
        if (filePreview)
            this.resetFilePreview(filePreview);
    }
    updateRecentSocks() {
        const recentSocks = document.querySelector('.recent-socks');
        if (!recentSocks)
            return;
        const noRecent = document.querySelector('.no-recent');
        const colorInput = document.getElementById('color');
        const colorHexInput = document.getElementById('color_hex');
        const styleSelect = document.getElementById('style');
        if (!colorInput || !colorHexInput || !styleSelect)
            return;
        if (noRecent) {
            recentSocks.removeChild(noRecent);
        }
        const color = colorInput.value;
        const colorHex = colorHexInput.value;
        const style = styleSelect.value;
        const sockElement = document.createElement('div');
        sockElement.className = 'recent-sock';
        sockElement.innerHTML = `
            <div class="recent-color" style="background-color: ${colorHex}"></div>
            <div class="recent-info">
                <strong>${color}</strong>
                <span>${style}</span>
            </div>
        `;
        recentSocks.insertBefore(sockElement, recentSocks.firstChild);
        const allSocks = recentSocks.querySelectorAll('.recent-sock');
        if (allSocks.length > 3) {
            recentSocks.removeChild(allSocks[allSocks.length - 1]);
        }
    }
}
document.addEventListener('DOMContentLoaded', () => {
    const app = new AddSockApp();
    app.init();
});
