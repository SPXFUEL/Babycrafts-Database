/**
 * UI COMPONENTS - Babycrafts Atelier Pro V2
 * Reusable UI components and notifications
 */

const UI = {
    // Toast notification system
    toastQueue: [],
    toastContainer: null,
    
    /**
     * Initialize toast container
     */
    initToastContainer() {
        if (this.toastContainer) return;
        
        this.toastContainer = document.createElement('div');
        this.toastContainer.id = 'toastContainer';
        this.toastContainer.className = 'fixed bottom-4 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none';
        document.body.appendChild(this.toastContainer);
    },

    /**
     * Show toast notification
     * @param {string} message - Message to display
     * @param {string} type - 'success' | 'error' | 'info' | 'warning'
     * @param {number} duration - Duration in milliseconds
     */
    showToast(message, type = 'info', duration = 3000) {
        this.initToastContainer();
        
        const colors = {
            success: 'bg-green-500 text-white',
            error: 'bg-red-500 text-white',
            info: 'bg-blue-500 text-white',
            warning: 'bg-yellow-500 text-white'
        };
        
        const icons = {
            success: 'check-circle',
            error: 'alert-circle',
            info: 'info',
            warning: 'alert-triangle'
        };
        
        const toast = document.createElement('div');
        toast.className = `${colors[type]} px-4 py-3 rounded-xl shadow-lg flex items-center gap-3 transform translate-y-full opacity-0 transition-all duration-300 pointer-events-auto`;
        toast.innerHTML = `
            <i data-lucide="${icons[type]}" class="w-5 h-5 flex-shrink-0"></i>
            <span class="flex-1 text-sm font-medium">${Utils.escapeHtml(message)}</span>
        `;
        
        this.toastContainer.appendChild(toast);
        
        // Animate in
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-full', 'opacity-0');
        });
        
        // Initialize lucide icon if available
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [toast] });
        }
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.add('translate-y-full', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    /**
     * Show loading spinner
     */
    showLoading(container, message = 'Laden...') {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12">
                <div class="w-12 h-12 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500 text-sm">${Utils.escapeHtml(message)}</p>
            </div>
        `;
    },

    /**
     * Show empty state
     */
    showEmpty(container, title, message, icon = 'inbox') {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="${icon}" class="w-8 h-8 text-gray-400"></i>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1">${Utils.escapeHtml(title)}</h3>
                <p class="text-sm text-gray-500">${Utils.escapeHtml(message)}</p>
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    /**
     * Show error state
     */
    showError(container, title, message, onRetry = null) {
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <i data-lucide="alert-circle" class="w-8 h-8 text-red-500"></i>
                </div>
                <h3 class="font-semibold text-gray-900 mb-1">${Utils.escapeHtml(title)}</h3>
                <p class="text-sm text-gray-500 mb-4">${Utils.escapeHtml(message)}</p>
                ${onRetry ? `
                    <button onclick="${onRetry}()" class="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600">
                        Opnieuw proberen
                    </button>
                ` : ''}
            </div>
        `;
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    /**
     * Show skeleton loader
     */
    showSkeleton(container, rows = 3) {
        container.innerHTML = Array(rows).fill(0).map(() => `
            <div class="bg-white rounded-xl p-4 mb-3 animate-pulse">
                <div class="flex items-center gap-3">
                    <div class="w-10 h-10 bg-gray-200 rounded-lg"></div>
                    <div class="flex-1">
                        <div class="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                        <div class="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                </div>
            </div>
        `).join('');
    },

    /**
     * Show confirmation dialog
     */
    showConfirm({ title, message, confirmText = 'Bevestigen', cancelText = 'Annuleren', onConfirm, onCancel, type = 'warning' }) {
        const colors = {
            warning: 'bg-yellow-500 hover:bg-yellow-600',
            danger: 'bg-red-500 hover:bg-red-600',
            info: 'bg-blue-500 hover:bg-blue-600'
        };
        
        const modal = document.createElement('div');
        modal.id = 'confirmModal';
        modal.className = 'fixed inset-0 bg-black/50 z-[200] flex items-center justify-center p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-2xl w-full max-w-sm p-6 transform scale-95 opacity-0 transition-all duration-200">
                <h3 class="text-lg font-bold text-gray-900 mb-2">${Utils.escapeHtml(title)}</h3>
                <p class="text-gray-600 mb-6">${Utils.escapeHtml(message)}</p>
                <div class="flex gap-3">
                    <button id="cancelBtn" class="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors">
                        ${Utils.escapeHtml(cancelText)}
                    </button>
                    <button id="confirmBtn" class="flex-1 py-3 ${colors[type]} text-white rounded-xl font-medium transition-colors">
                        ${Utils.escapeHtml(confirmText)}
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Animate in
        requestAnimationFrame(() => {
            modal.querySelector('.bg-white').classList.remove('scale-95', 'opacity-0');
        });
        
        // Event listeners
        modal.querySelector('#cancelBtn').onclick = () => {
            this.closeModal('confirmModal');
            if (onCancel) onCancel();
        };
        
        modal.querySelector('#confirmBtn').onclick = () => {
            this.closeModal('confirmModal');
            if (onConfirm) onConfirm();
        };
        
        modal.onclick = (e) => {
            if (e.target === modal) {
                this.closeModal('confirmModal');
                if (onCancel) onCancel();
            }
        };
    },

    /**
     * Close modal by ID
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) return;
        
        const content = modal.querySelector('.bg-white');
        if (content) {
            content.classList.add('scale-95', 'opacity-0');
        }
        
        setTimeout(() => modal.remove(), 200);
    },

    /**
     * Show bottom sheet
     */
    showBottomSheet({ title, content, onClose }) {
        const sheet = document.createElement('div');
        sheet.id = 'bottomSheet';
        sheet.className = 'fixed inset-0 z-[150] flex items-end';
        sheet.innerHTML = `
            <div class="overlay absolute inset-0 bg-black/50 opacity-0 transition-opacity duration-300" id="sheetOverlay"></div>
            <div class="relative w-full bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto transform translate-y-full transition-transform duration-300" id="sheetContent">
                <div class="sticky top-0 bg-white z-10 px-4 py-3 border-b flex items-center justify-between">
                    <h3 class="text-lg font-bold text-gray-900">${Utils.escapeHtml(title)}</h3>
                    <button onclick="UI.closeBottomSheet()" class="w-10 h-10 flex items-center justify-center text-gray-400 hover:text-gray-600">
                        <i data-lucide="x" class="w-6 h-6"></i>
                    </button>
                </div>
                <div class="p-4">
                    ${content}
                </div>
            </div>
        `;
        
        document.body.appendChild(sheet);
        document.body.style.overflow = 'hidden';
        
        // Animate in
        requestAnimationFrame(() => {
            sheet.querySelector('#sheetOverlay').classList.add('opacity-100');
            sheet.querySelector('#sheetContent').classList.remove('translate-y-full');
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [sheet] });
        }
        
        sheet.querySelector('#sheetOverlay').onclick = () => this.closeBottomSheet();
    },

    /**
     * Close bottom sheet
     */
    closeBottomSheet() {
        const sheet = document.getElementById('bottomSheet');
        if (!sheet) return;
        
        sheet.querySelector('#sheetOverlay').classList.remove('opacity-100');
        sheet.querySelector('#sheetContent').classList.add('translate-y-full');
        
        setTimeout(() => {
            sheet.remove();
            document.body.style.overflow = '';
        }, 300);
    },

    /**
     * Show offline indicator
     */
    showOfflineIndicator() {
        if (document.getElementById('offlineIndicator')) return;
        
        const indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.className = 'fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 px-4 z-[300] transform -translate-y-full transition-transform duration-300';
        indicator.innerHTML = `
            <div class="flex items-center justify-center gap-2">
                <i data-lucide="wifi-off" class="w-4 h-4"></i>
                <span class="text-sm font-medium">Geen internetverbinding</span>
            </div>
        `;
        
        document.body.appendChild(indicator);
        
        requestAnimationFrame(() => {
            indicator.classList.remove('-translate-y-full');
        });
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [indicator] });
        }
    },

    /**
     * Hide offline indicator
     */
    hideOfflineIndicator() {
        const indicator = document.getElementById('offlineIndicator');
        if (!indicator) return;
        
        indicator.classList.add('-translate-y-full');
        setTimeout(() => indicator.remove(), 300);
    },

    /**
     * Create form field HTML
     */
    createField({ type, name, label, value = '', placeholder = '', required = false, options = [], accept = '' }) {
        const requiredAttr = required ? 'required' : '';
        const requiredLabel = required ? ' <span class="text-red-500">*</span>' : '';
        
        let input = '';
        
        if (type === 'select') {
            input = `
                <select name="${name}" ${requiredAttr} class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all appearance-none bg-white"
                    style="background-image: url('data:image/svg+xml,%3Csvg xmlns=\"http://www.w3.org/2000/svg\" width=\"24\" height=\"24\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"%23737373\" stroke-width=\"2\"%3E%3Cpolyline points=\"6 9 12 15 18 9\"%3E%3C/polyline%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 12px center; background-size: 16px; padding-right: 40px;">
                    <option value="">${placeholder || 'Kiezen...'}</option>
                    ${options.map(opt => `<option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>${Utils.escapeHtml(opt.label)}</option>
                    `).join('')}
                </select>
            `;
        } else if (type === 'textarea') {
            input = `
                <textarea name="${name}" ${requiredAttr} placeholder="${Utils.escapeHtml(placeholder)}" rows="3"
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all resize-none"
                >${Utils.escapeHtml(value)}</textarea>
            `;
        } else if (type === 'file') {
            input = `
                <input type="file" name="${name}" accept="${accept}" ${requiredAttr}
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 outline-none file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                >
            `;
        } else if (type === 'checkbox') {
            return `
                <label class="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" name="${name}" ${value ? 'checked' : ''} ${requiredAttr}
                        class="w-5 h-5 text-amber-500 border-gray-300 rounded focus:ring-amber-500"
                    >
                    <span class="text-gray-700">${Utils.escapeHtml(label)}${requiredLabel}</span>
                </label>
            `;
        } else {
            input = `
                <input type="${type}" name="${name}" value="${Utils.escapeHtml(value)}" placeholder="${Utils.escapeHtml(placeholder)}" ${requiredAttr}
                    class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
                >
            `;
        }
        
        return `
            <div class="mb-4">
                <label class="block text-sm font-medium text-gray-700 mb-1">${Utils.escapeHtml(label)}${requiredLabel}</label>
                ${input}
            </div>
        `;
    },

    /**
     * Create card component
     */
    createCard({ title, subtitle, badge, badgeColor = 'bg-gray-100', icon, onClick, children = '', data = {} }) {
        const dataAttrs = Object.entries(data).map(([k, v]) => `data-${k}="${v}"`).join(' ');
        
        return `
            <div ${onClick ? `onclick="${onClick}"` : ''} ${dataAttrs}
                class="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:shadow-md transition-shadow ${onClick ? 'active:scale-[0.98]' : ''}"
            >
                <div class="flex items-start justify-between">
                    <div class="flex items-center gap-3">
                        ${icon ? `<div class="w-10 h-10 rounded-lg ${icon.bg || 'bg-gray-100'} flex items-center justify-center flex-shrink-0">
                            <i data-lucide="${icon.name}" class="w-5 h-5 ${icon.color || 'text-gray-500'}"></i>
                        </div>` : ''}
                        <div class="min-w-0">
                            <p class="font-semibold text-gray-900 truncate">${Utils.escapeHtml(title)}</p>
                            ${subtitle ? `<p class="text-sm text-gray-500 truncate">${Utils.escapeHtml(subtitle)}</p>` : ''}
                        </div>
                    </div>
                    ${badge ? `<span class="text-xs px-2 py-1 rounded-lg ${badgeColor} flex-shrink-0">${Utils.escapeHtml(badge)}</span>` : ''}
                </div>
                ${children}
            </div>
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UI;
}
