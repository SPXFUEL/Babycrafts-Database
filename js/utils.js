/**
 * UTILITIES - Babycrafts Atelier Pro V2
 * XSS-safe helpers, validators, and formatters
 */

const Utils = {
    /**
     * ESCAPE HTML - XSS Protection
     * All dynamic content must pass through this
     */
    escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    /**
     * Generate unique ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },

    /**
     * Generate order ID (BC-2024-0001)
     */
    generateOrderId(existingOrders) {
        const year = new Date().getFullYear();
        const yearOrders = existingOrders.filter(o => o.order_id?.startsWith(`BC-${year}`));
        const count = yearOrders.length + 1;
        return `BC-${year}-${String(count).padStart(4, '0')}`;
    },

    /**
     * Generate track & trace code
     */
    generateTrackTrace() {
        return '3STNDG' + Math.floor(1000000 + Math.random() * 9000000);
    },

    /**
     * Generate public token
     */
    generatePublicToken() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = '';
        for (let i = 0; i < 16; i++) {
            token += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return token;
    },

    /**
     * Format time from minutes to hours:minutes
     */
    formatTime(minutes) {
        if (!minutes || minutes < 0) return '0u 0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return `${hours}u ${mins}m`;
    },

    /**
     * Format date
     */
    formatDate(dateString, lang = 'nl') {
        if (!dateString) return '-';
        const date = new Date(dateString);
        const options = { year: 'numeric', month: 'short', day: 'numeric' };
        const locale = lang === 'nl' ? 'nl-NL' : lang === 'pl' ? 'pl-PL' : 'en-US';
        return date.toLocaleDateString(locale, options);
    },

    /**
     * Format time (HH:MM)
     */
    formatTimeString(timeString) {
        return timeString ? timeString.substring(0, 5) : '';
    },

    /**
     * Calculate deadline color/status
     */
    getDeadlineColor(order) {
        if (!order.deadline || order.huidige_fase >= 10) return 'deadline-neutral';
        
        const deadline = new Date(order.deadline);
        const now = new Date();
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'deadline-red';
        if (diffDays < 3) return 'deadline-red';
        if (diffDays < 7) return 'deadline-orange';
        if (diffDays < 14) return 'deadline-yellow';
        return 'deadline-green';
    },

    /**
     * Get deadline status text
     */
    getDeadlineStatus(order) {
        if (!order.deadline || order.huidige_fase >= 10) return null;
        
        const deadline = new Date(order.deadline);
        const now = new Date();
        
        if (now > deadline) {
            return { text: 'DEADLINE VERSTREKEN', class: 'text-red-600 font-bold' };
        }
        
        const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
        if (diffDays < 3) return { text: 'Spoed', class: 'text-red-600' };
        if (diffDays < 7) return { text: 'Let op', class: 'text-orange-600' };
        if (diffDays < 14) return { text: 'Op schema', class: 'text-yellow-600' };
        return { text: 'Op schema', class: 'text-green-600' };
    },

    /**
     * Debounce function
     */
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    /**
     * Throttle function
     */
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Deep clone object
     */
    deepClone(obj) {
        return JSON.parse(JSON.stringify(obj));
    },

    /**
     * Safe JSON parse
     */
    safeJsonParse(str, defaultValue = null) {
        try {
            return JSON.parse(str);
        } catch {
            return defaultValue;
        }
    },

    /**
     * Validate email format
     */
    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    /**
     * Validate phone number
     */
    validatePhone(phone) {
        const re = /^[\d\s\-+()]{6,20}$/;
        return re.test(phone);
    },

    /**
     * Validate Dutch postcode
     */
    validatePostcode(postcode) {
        const re = /^[1-9][0-9]{3}\s?[A-Za-z]{2}$/;
        return re.test(postcode);
    },

    /**
     * Validate file
     */
    validateFile(file, maxSizeMB = 50, allowedTypes = ['.stl', '.obj', '.ply', '.3mf', '.zip', '.pdf']) {
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        
        if (!allowedTypes.includes(ext)) {
            return { valid: false, error: `Alleen ${allowedTypes.join(', ')} bestanden toegestaan` };
        }
        
        if (file.size > maxSizeMB * 1024 * 1024) {
            return { valid: false, error: `Bestand te groot (max ${maxSizeMB}MB)` };
        }
        
        return { valid: true };
    },

    /**
     * Validate image file
     */
    validateImage(file, maxSizeMB = 10) {
        if (!file.type.startsWith('image/')) {
            return { valid: false, error: 'Alleen afbeeldingen toegestaan' };
        }
        if (file.size > maxSizeMB * 1024 * 1024) {
            return { valid: false, error: `Foto te groot (max ${maxSizeMB}MB)` };
        }
        return { valid: true };
    },

    /**
     * Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    },

    /**
     * LocalStorage helpers with error handling
     */
    storage: {
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                return item ? Utils.safeJsonParse(item, item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        }
    },

    /**
     * SessionStorage helpers
     */
    session: {
        get(key, defaultValue = null) {
            try {
                const item = sessionStorage.getItem(key);
                return item ? Utils.safeJsonParse(item, item) : defaultValue;
            } catch {
                return defaultValue;
            }
        },
        set(key, value) {
            try {
                sessionStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
                return true;
            } catch {
                return false;
            }
        },
        remove(key) {
            try {
                sessionStorage.removeItem(key);
                return true;
            } catch {
                return false;
            }
        }
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // Fallback
            const input = document.createElement('input');
            input.value = text;
            input.style.position = 'fixed';
            input.style.opacity = '0';
            document.body.appendChild(input);
            input.select();
            const result = document.execCommand('copy');
            input.remove();
            return result;
        }
    },

    /**
     * Download file
     */
    downloadFile(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'download';
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => a.remove(), 100);
    },

    /**
     * Check if online
     */
    isOnline() {
        return navigator.onLine;
    },

    /**
     * Parse URL query parameters
     */
    getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    },

    /**
     * Safe string truncation
     */
    truncate(str, length = 50, suffix = '...') {
        if (!str) return '';
        if (str.length <= length) return str;
        return str.substring(0, length).trim() + suffix;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Utils;
}
