/**
 * BABYCRAFTS ATELIER PRO V3
 * Complete rewrite - clean, working, beautiful
 */

// Test if JS is loading
alert('DEBUG: app.js loaded!');

// ============================================
// CONFIGURATION
// ============================================
const CONFIG = {
    VERSION: '3.0.0',
    SUPABASE_URL: 'https://ydnygntfkrleielkdnat.supabase.co',
    SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlkbnlnbnRma3JsZWllbGtkbmF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM2MzYyNDUsImV4cCI6MjA0OTIxMjI0NX0.yGGkyLo7e2FL7cwoK4pZQhlMqgDfMFr8kF3DufzLDQU',
    PIN_CODES: {
        '2911': { name: 'Eigenaar', role: 'admin' },
        '0805': { name: 'Medewerker', role: 'staff' }
    },
    FASES: {
        0: { name: 'Order Ontvangen', color: 'bg-gray-500', text: 'text-gray-700', icon: 'inbox' },
        1: { name: 'Afspraak Scanning', color: 'bg-blue-500', text: 'text-blue-700', icon: 'calendar' },
        2: { name: 'Gescand', color: 'bg-blue-500', text: 'text-blue-700', icon: 'scan' },
        3: { name: '3D Model', color: 'bg-indigo-500', text: 'text-indigo-700', icon: 'box' },
        4: { name: '3D Print', color: 'bg-indigo-500', text: 'text-indigo-700', icon: 'printer' },
        5: { name: 'Afgewerkt', color: 'bg-purple-500', text: 'text-purple-700', icon: 'check-circle' },
        6: { name: 'Verstuurd Bronsgieterij', color: 'bg-orange-500', text: 'text-orange-700', icon: 'truck' },
        7: { name: 'Bronsgieterij', color: 'bg-orange-500', text: 'text-orange-700', icon: 'factory' },
        8: { name: 'Retour Bronsgieterij', color: 'bg-orange-500', text: 'text-orange-700', icon: 'package' },
        9: { name: 'Verzendklaar', color: 'bg-green-500', text: 'text-green-700', icon: 'package-check' },
        10: { name: 'Verzonden', color: 'bg-green-500', text: 'text-green-700', icon: 'send' },
        11: { name: 'Nazorg', color: 'bg-pink-500', text: 'text-pink-700', icon: 'heart' },
        12: { name: 'Afgerond', color: 'bg-gray-500', text: 'text-gray-700', icon: 'archive' }
    },
    WORKFLOWS: {
        'standard': [0, 1, 2, 3, 4, 5, 9, 10, 11, 12],
        'atelier_bronze': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        'gegoten_brons': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    },
    COLLECTIES: ['Figura', 'Arte-Lumina', 'Natura-Alba', 'Ouder & Kind', 'Babybeeld', 'Atelier-Bronze', 'Gegoten Brons', 'Aangepast']
};

// ============================================
// GLOBAL PIN FUNCTIONS (for inline onclick)
// ============================================
let _pinInput = '';

function _updatePinDots() {
    document.querySelectorAll('.pin-dot').forEach((dot, i) => {
        dot.classList.toggle('filled', i < _pinInput.length);
    });
    const errorEl = document.getElementById('pinError');
    if (errorEl) errorEl.classList.add('hidden');
}

function pinDigit(digit) {
    alert('DEBUG: pinDigit called with ' + digit);
    if (_pinInput.length < 4) {
        _pinInput += digit;
        _updatePinDots();

        if (_pinInput.length === 4) {
            setTimeout(() => _verifyPin(), 200);
        }
    }
}

function pinBackspace() {
    alert('DEBUG: pinBackspace called');
    _pinInput = _pinInput.slice(0, -1);
    _updatePinDots();
}

async function _verifyPin() {
    const userData = CONFIG.PIN_CODES[_pinInput];

    if (userData) {
        Store.saveUser({
            id: `local_${userData.role}_${_pinInput}`,
            name: userData.name,
            role: userData.role
        });

        _pinInput = '';
        _updatePinDots();
        App.showMainApp();
        await App.loadData();
        UI.toast(`Welkom ${userData.name}`, 'success');
    } else {
        const errorEl = document.getElementById('pinError');
        if (errorEl) errorEl.classList.remove('hidden');
        _pinInput = '';
        setTimeout(() => _updatePinDots(), 500);
    }
}

// ============================================
// STATE MANAGEMENT
// ============================================
const Store = {
    user: null,
    orders: [],
    todos: [],
    currentPage: 'dashboard',
    supabase: null,

    init() {
        const saved = localStorage.getItem('babycrafts_session');
        if (saved) {
            try {
                this.user = JSON.parse(saved);
            } catch (e) {
                localStorage.removeItem('babycrafts_session');
            }
        }
    },

    saveUser(user) {
        this.user = user;
        localStorage.setItem('babycrafts_session', JSON.stringify(user));
    },

    clearUser() {
        this.user = null;
        localStorage.removeItem('babycrafts_session');
    },

    async initSupabase() {
        const { createClient } = supabase;
        this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
    }
};

// ============================================
// UTILITIES
// ============================================
const Utils = {
    escapeHtml(text) {
        if (!text) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    generateOrderId() {
        const year = new Date().getFullYear();
        const count = Store.orders.filter(o => o.order_id?.startsWith(`BC-${year}`)).length + 1;
        return `BC-${year}-${String(count).padStart(4, '0')}`;
    },

    generateToken() {
        return Array.from({length: 32}, () =>
            'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 62)]
        ).join('');
    },

    formatDate(date) {
        if (!date) return '-';
        return new Date(date).toLocaleDateString('nl-NL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    },

    getDeadlineStatus(order) {
        if (!order.deadline || order.huidige_fase >= 12) return null;
        const days = Math.ceil((new Date(order.deadline) - new Date()) / (1000 * 60 * 60 * 24));
        if (days < 0) return { text: `${Math.abs(days)} dagen vertraagd`, class: 'text-red-600 bg-red-50' };
        if (days === 0) return { text: 'Deadline vandaag', class: 'text-orange-600 bg-orange-50' };
        if (days <= 2) return { text: `${days} dagen resterend`, class: 'text-orange-600 bg-orange-50' };
        return { text: `${days} dagen resterend`, class: 'text-green-600 bg-green-50' };
    },

    getWorkflow(collectie) {
        if (collectie?.includes('Atelier-Bronze')) return 'atelier_bronze';
        if (collectie?.includes('Gegoten Brons')) return 'gegoten_brons';
        return 'standard';
    }
};

// ============================================
// DATABASE OPERATIONS
// ============================================
const DB = {
    async getOrders() {
        const { data, error } = await Store.supabase
            .from('orders')
            .select('*')
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data || [];
    },

    async createOrder(orderData) {
        const { data, error } = await Store.supabase
            .from('orders')
            .insert([orderData])
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateOrder(orderId, updates) {
        const { data, error } = await Store.supabase
            .from('orders')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('order_id', orderId)
            .select()
            .single();
        if (error) throw error;
        return data;
    },

    async updateFase(orderId, newFase) {
        const updates = { huidige_fase: newFase };
        if (newFase === 10) {
            updates.verzenddatum = new Date().toISOString().split('T')[0];
            updates.track_trace_code = '3STNDG' + Math.floor(1000000 + Math.random() * 9000000);
        }
        if (newFase === 12) {
            updates.status = 'completed';
            updates.afgerond_datum = new Date().toISOString();
        }
        return this.updateOrder(orderId, updates);
    }
};

// ============================================
// UI COMPONENTS
// ============================================
const UI = {
    el(id) {
        return document.getElementById(id);
    },

    show(id) {
        const el = this.el(id);
        if (el) el.classList.remove('hidden');
    },

    hide(id) {
        const el = this.el(id);
        if (el) el.classList.add('hidden');
    },

    setText(id, text) {
        const el = this.el(id);
        if (el) el.textContent = text;
    },

    toast(message, type = 'info') {
        const container = this.el('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        const colors = {
            success: 'border-green-500 bg-green-50',
            error: 'border-red-500 bg-red-50',
            info: 'border-blue-500 bg-blue-50'
        };

        toast.className = `p-4 rounded-xl shadow-lg border-l-4 ${colors[type]} transform transition-all duration-300 translate-y-10 opacity-0`;
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <span class="font-medium">${Utils.escapeHtml(message)}</span>
            </div>
        `;

        container.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.remove('translate-y-10', 'opacity-0');
        });

        setTimeout(() => {
            toast.classList.add('translate-y-10', 'opacity-0');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    showBottomSheet(content) {
        const sheet = this.el('bottomSheet');
        const contentEl = this.el('bottomSheetContent');
        if (!sheet || !contentEl) return;

        contentEl.innerHTML = content;
        sheet.classList.add('active');
        lucide.createIcons();
    },

    hideBottomSheet() {
        const sheet = this.el('bottomSheet');
        if (sheet) sheet.classList.remove('active');
    },

    openMenu() {
        this.el('sideMenu')?.classList.add('open');
        this.el('menuOverlay')?.classList.add('visible');
    },

    closeMenu() {
        this.el('sideMenu')?.classList.remove('open');
        this.el('menuOverlay')?.classList.remove('visible');
    }
};

// ============================================
// PAGES
// ============================================
const Pages = {
    dashboard() {
        const activeOrders = Store.orders.filter(o => o.huidige_fase < 12);
        const delayed = activeOrders.filter(o => {
            if (!o.deadline) return false;
            return new Date(o.deadline) < new Date();
        });

        let html = `
            <div class="px-4 py-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-2">Dashboard</h1>
                <p class="text-gray-500 mb-6">Welkom terug, ${Utils.escapeHtml(Store.user?.name || 'Gebruiker')}</p>

                <!-- Stats -->
                <div class="grid grid-cols-2 gap-3 mb-6">
                    <div class="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-4 text-white">
                        <div class="text-3xl font-bold">${activeOrders.length}</div>
                        <div class="text-blue-100 text-sm">Actieve orders</div>
                    </div>
                    <div class="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-4 text-white">
                        <div class="text-3xl font-bold">${delayed.length}</div>
                        <div class="text-red-100 text-sm">Vertraagd</div>
                    </div>
                </div>

                <!-- Recent Orders -->
                <h2 class="text-lg font-semibold mb-3">Recente Orders</h2>
                <div class="space-y-3">
                    ${activeOrders.slice(0, 5).map(order => this.orderCard(order)).join('')}
                    ${activeOrders.length === 0 ? '<p class="text-gray-400 text-center py-8">Geen actieve orders</p>' : ''}
                </div>
            </div>
        `;

        UI.el('mainContent').innerHTML = html;
        lucide.createIcons();
    },

    orders() {
        let html = `
            <div class="px-4 py-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-4">Alle Orders</h1>

                <!-- Search -->
                <div class="relative mb-4">
                    <i data-lucide="search" class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"></i>
                    <input type="text" id="orderSearch" placeholder="Zoek orders..."
                           class="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                           oninput="App.searchOrders(this.value)">
                </div>

                <!-- List -->
                <div id="ordersList" class="space-y-3">
                    ${Store.orders.map(order => this.orderCard(order)).join('')}
                    ${Store.orders.length === 0 ? '<p class="text-gray-400 text-center py-8">Geen orders gevonden</p>' : ''}
                </div>
            </div>
        `;

        UI.el('mainContent').innerHTML = html;
        lucide.createIcons();
    },

    orderCard(order) {
        const fase = CONFIG.FASES[order.huidige_fase] || CONFIG.FASES[0];
        const deadline = Utils.getDeadlineStatus(order);

        return `
            <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 active:scale-[0.98] transition-transform cursor-pointer"
                 onclick="App.showOrderDetail('${order.order_id}')">
                <div class="flex items-start justify-between mb-2">
                    <div>
                        <h3 class="font-semibold text-gray-900">${Utils.escapeHtml(order.klant_naam)}</h3>
                        <p class="text-sm text-gray-500">${order.order_id} • ${order.collectie}</p>
                    </div>
                    <span class="px-3 py-1 rounded-full text-xs font-medium ${fase.color} bg-opacity-20 ${fase.text}">
                        ${fase.name}
                    </span>
                </div>
                ${deadline ? `
                    <div class="mt-2 text-xs px-2 py-1 rounded-lg inline-block ${deadline.class}">
                        ${deadline.text}
                    </div>
                ` : ''}
            </div>
        `;
    },

    archief() {
        const completed = Store.orders.filter(o => o.huidige_fase >= 12);

        let html = `
            <div class="px-4 py-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-4">Archief</h1>
                <div class="space-y-3">
                    ${completed.map(order => this.orderCard(order)).join('')}
                    ${completed.length === 0 ? '<p class="text-gray-400 text-center py-8">Geen afgeronde orders</p>' : ''}
                </div>
            </div>
        `;

        UI.el('mainContent').innerHTML = html;
        lucide.createIcons();
    },

    nazorg() {
        const nazorgOrders = Store.orders.filter(o => o.huidige_fase === 11);

        let html = `
            <div class="px-4 py-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-4">Nazorg</h1>
                <div class="space-y-3">
                    ${nazorgOrders.map(order => `
                        <div class="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                            <h3 class="font-semibold text-gray-900">${Utils.escapeHtml(order.klant_naam)}</h3>
                            <p class="text-sm text-gray-500 mb-3">${order.order_id}</p>
                            <div class="flex gap-2">
                                <a href="https://wa.me/${order.klant_telefoon?.replace(/\D/g, '')}"
                                   class="flex-1 py-2 bg-green-500 text-white rounded-xl text-center text-sm font-medium">
                                    WhatsApp
                                </a>
                                <button onclick="App.completeNazorg('${order.order_id}')"
                                        class="flex-1 py-2 bg-gray-100 text-gray-700 rounded-xl text-sm font-medium">
                                    Afronden
                                </button>
                            </div>
                        </div>
                    `).join('')}
                    ${nazorgOrders.length === 0 ? '<p class="text-gray-400 text-center py-8">Geen orders in nazorg</p>' : ''}
                </div>
            </div>
        `;

        UI.el('mainContent').innerHTML = html;
    },

    settings() {
        let html = `
            <div class="px-4 py-6">
                <h1 class="text-2xl font-bold text-gray-900 mb-6">Instellingen</h1>

                <div class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">
                    <div class="p-4 border-b border-gray-100">
                        <p class="font-medium text-gray-900">Gebruiker</p>
                        <p class="text-sm text-gray-500">${Utils.escapeHtml(Store.user?.name || 'Onbekend')}</p>
                    </div>
                    <div class="p-4 border-b border-gray-100">
                        <p class="font-medium text-gray-900">Rol</p>
                        <p class="text-sm text-gray-500">${Store.user?.role === 'admin' ? 'Administrator' : 'Medewerker'}</p>
                    </div>
                    <div class="p-4">
                        <p class="font-medium text-gray-900">Versie</p>
                        <p class="text-sm text-gray-500">${CONFIG.VERSION}</p>
                    </div>
                </div>

                <button onclick="App.logout()"
                        class="w-full py-4 bg-red-500 text-white rounded-2xl font-medium active:scale-[0.98] transition-transform">
                    Uitloggen
                </button>
            </div>
        `;

        UI.el('mainContent').innerHTML = html;
    }
};

// ============================================
// MAIN APP
// ============================================
const App = {
    async init() {
        Store.init();
        await Store.initSupabase();

        if (Store.user) {
            this.showMainApp();
            await this.loadData();
        } else {
            this.showLogin();
        }

        this.setupEventListeners();
    },

    setupEventListeners() {
        // Close bottom sheet on backdrop click
        document.getElementById('bottomSheetBackdrop')?.addEventListener('click', () => {
            UI.hideBottomSheet();
        });
        
        // Close menu on overlay click
        document.getElementById('menuOverlay')?.addEventListener('click', () => {
            UI.closeMenu();
        });
    },
    
    // Note: PIN handling uses global functions (pinDigit, pinBackspace)
    
    showLogin() {
        _pinInput = '';
        _updatePinDots();
        UI.show('loginScreen');
        UI.hide('mainApp');
        // Initialize icons for login screen (delete button)
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },

    showMainApp() {
        UI.hide('loginScreen');
        UI.show('mainApp');
        this.navigate('dashboard');
    },

    async loadData() {
        try {
            Store.orders = await DB.getOrders();
            Pages[Store.currentPage]?.();
        } catch (error) {
            console.error('Load data error:', error);
            UI.toast('Fout bij laden data', 'error');
        }
    },

    // Navigation
    navigate(page) {
        Store.currentPage = page;
        UI.closeMenu();

        // Update nav
        document.querySelectorAll('.nav-item').forEach(el => {
            el.classList.toggle('text-amber-600', el.dataset.page === page);
            el.classList.toggle('text-gray-400', el.dataset.page !== page);
        });

        // Update title
        const titles = {
            dashboard: 'Dashboard',
            orders: 'Alle Orders',
            archief: 'Archief',
            nazorg: 'Nazorg',
            settings: 'Instellingen'
        };
        UI.setText('pageTitle', titles[page] || 'Babycrafts');

        // Render page
        Pages[page]?.();
    },

    // Order CRUD
    showNewOrderForm() {
        const collecties = CONFIG.COLLECTIES;

        UI.showBottomSheet(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <h2 class="text-xl font-bold">Nieuwe Order</h2>
                    <button onclick="UI.hideBottomSheet()" class="p-2 hover:bg-gray-100 rounded-full">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <form id="newOrderForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Klantnaam *</label>
                        <input type="text" name="klant_naam" required
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                        <input type="email" name="klant_email" required
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                        <input type="tel" name="klant_telefoon"
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>

                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Collectie *</label>
                            <select name="collectie" required
                                    class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                                ${collecties.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hoogte (cm)</label>
                            <input type="number" name="hoogte_cm" value="20" min="10" max="50"
                                   class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                        </div>
                    </div>

                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Scan Datum</label>
                        <input type="date" name="scan_datum" id="scanDate"
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
                               onchange="App.calculateDeadline(this)">
                        <p class="text-xs text-gray-500 mt-1">Deadline wordt automatisch 6 weken na scan datum</p>
                    </div>

                    <input type="hidden" name="deadline" id="deadlineField">

                    <button type="button" onclick="App.submitNewOrder()"
                            class="w-full py-4 bg-amber-500 text-white rounded-2xl font-medium mt-6 active:scale-[0.98] transition-transform">
                        Order Aanmaken
                    </button>
                </form>
            </div>
        `);

        lucide.createIcons();
    },

    calculateDeadline(input) {
        if (!input.value) return;
        const scanDate = new Date(input.value);
        const deadline = new Date(scanDate);
        deadline.setDate(deadline.getDate() + 42);
        document.getElementById('deadlineField').value = deadline.toISOString().split('T')[0];
    },

    async submitNewOrder() {
        const form = document.getElementById('newOrderForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = Object.fromEntries(formData);

        // Validation
        if (!data.klant_naam || !data.klant_email) {
            UI.toast('Vul alle verplichte velden in', 'error');
            return;
        }

        const orderData = {
            order_id: Utils.generateOrderId(),
            klant_naam: data.klant_naam.trim(),
            klant_email: data.klant_email.trim(),
            klant_telefoon: data.klant_telefoon?.trim() || null,
            collectie: data.collectie,
            hoogte_cm: parseInt(data.hoogte_cm) || 20,
            scan_datum: data.scan_datum || null,
            deadline: data.deadline || null,
            huidige_fase: 0,
            status: 'active',
            workflow: Utils.getWorkflow(data.collectie),
            public_token: Utils.generateToken()
        };

        try {
            UI.el('bottomSheetContent').querySelector('button').textContent = 'Bezig...';
            UI.el('bottomSheetContent').querySelector('button').disabled = true;

            const order = await DB.createOrder(orderData);
            Store.orders.unshift(order);

            UI.hideBottomSheet();
            UI.toast('Order aangemaakt!', 'success');
            Pages[Store.currentPage]?.();
        } catch (error) {
            console.error('Create order error:', error);
            UI.toast('Fout: ' + (error.message || 'Order kon niet worden aangemaakt'), 'error');
            UI.el('bottomSheetContent').querySelector('button').textContent = 'Order Aanmaken';
            UI.el('bottomSheetContent').querySelector('button').disabled = false;
        }
    },

    showOrderDetail(orderId) {
        const order = Store.orders.find(o => o.order_id === orderId);
        if (!order) return;

        const fase = CONFIG.FASES[order.huidige_fase];
        const workflow = CONFIG.WORKFLOWS[order.workflow];
        const currentIdx = workflow.indexOf(order.huidige_fase);
        const canAdvance = currentIdx < workflow.length - 1;

        UI.showBottomSheet(`
            <div class="p-6">
                <div class="flex items-center justify-between mb-6">
                    <div>
                        <h2 class="text-xl font-bold">${Utils.escapeHtml(order.klant_naam)}</h2>
                        <p class="text-sm text-gray-500">${order.order_id}</p>
                    </div>
                    <button onclick="UI.hideBottomSheet()" class="p-2 hover:bg-gray-100 rounded-full">
                        <i data-lucide="x" class="w-5 h-5"></i>
                    </button>
                </div>

                <div class="bg-gray-50 rounded-2xl p-4 mb-4">
                    <div class="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <p class="text-gray-500">Collectie</p>
                            <p class="font-medium">${order.collectie}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Hoogte</p>
                            <p class="font-medium">${order.hoogte_cm}cm</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Email</p>
                            <p class="font-medium">${Utils.escapeHtml(order.klant_email)}</p>
                        </div>
                        <div>
                            <p class="text-gray-500">Status</p>
                            <p class="font-medium ${fase.text}">${fase.name}</p>
                        </div>
                    </div>
                </div>

                ${order.huidige_fase < 12 ? `
                    <button onclick="App.advanceOrder('${order.order_id}')"
                            class="w-full py-4 bg-green-500 text-white rounded-2xl font-medium mb-3 active:scale-[0.98] transition-transform">
                        ${canAdvance ? 'Naar volgende fase →' : 'Order afronden'}
                    </button>
                ` : ''}

                <div class="grid grid-cols-2 gap-3">
                    <button onclick="App.editOrder('${order.order_id}')"
                            class="py-3 bg-amber-100 text-amber-700 rounded-xl font-medium">
                        Bewerken
                    </button>
                    <button onclick="App.deleteOrder('${order.order_id}')"
                            class="py-3 bg-red-100 text-red-700 rounded-xl font-medium">
                        Verwijderen
                    </button>
                </div>
            </div>
        `);

        lucide.createIcons();
    },

    async advanceOrder(orderId) {
        const order = Store.orders.find(o => o.order_id === orderId);
        if (!order) return;

        const workflow = CONFIG.WORKFLOWS[order.workflow];
        const currentIdx = workflow.indexOf(order.huidige_fase);
        const nextFase = workflow[currentIdx + 1];

        try {
            const updated = await DB.updateFase(orderId, nextFase);
            const idx = Store.orders.findIndex(o => o.order_id === orderId);
            if (idx !== -1) Store.orders[idx] = updated;

            UI.hideBottomSheet();
            UI.toast('Fase bijgewerkt', 'success');
            Pages[Store.currentPage]?.();
        } catch (error) {
            UI.toast('Fout bij bijwerken', 'error');
        }
    },

    async completeNazorg(orderId) {
        try {
            const updated = await DB.updateFase(orderId, 12);
            const idx = Store.orders.findIndex(o => o.order_id === orderId);
            if (idx !== -1) Store.orders[idx] = updated;

            UI.toast('Nazorg afgerond', 'success');
            Pages.nazorg();
        } catch (error) {
            UI.toast('Fout', 'error');
        }
    },

    editOrder(orderId) {
        const order = Store.orders.find(o => o.order_id === orderId);
        if (!order) return;

        UI.showBottomSheet(`
            <div class="p-6">
                <h2 class="text-xl font-bold mb-4">Order Bewerken</h2>
                <form id="editOrderForm" class="space-y-4">
                    <input type="hidden" name="order_id" value="${order.order_id}">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Klantnaam</label>
                        <input type="text" name="klant_naam" value="${Utils.escapeHtml(order.klant_naam)}" required
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" name="klant_email" value="${Utils.escapeHtml(order.klant_email)}" required
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                        <input type="tel" name="klant_telefoon" value="${Utils.escapeHtml(order.klant_telefoon || '')}"
                               class="w-full px-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500">
                    </div>
                    <button type="button" onclick="App.submitEditOrder()"
                            class="w-full py-4 bg-green-500 text-white rounded-2xl font-medium mt-4">
                        Wijzigingen Opslaan
                    </button>
                </form>
            </div>
        `);
    },

    async submitEditOrder() {
        const form = document.getElementById('editOrderForm');
        if (!form) return;

        const formData = new FormData(form);
        const orderId = formData.get('order_id');
        const updates = {
            klant_naam: formData.get('klant_naam')?.trim(),
            klant_email: formData.get('klant_email')?.trim(),
            klant_telefoon: formData.get('klant_telefoon')?.trim() || null
        };

        try {
            const updated = await DB.updateOrder(orderId, updates);
            const idx = Store.orders.findIndex(o => o.order_id === orderId);
            if (idx !== -1) Store.orders[idx] = updated;

            UI.hideBottomSheet();
            UI.toast('Order bijgewerkt', 'success');
            Pages[Store.currentPage]?.();
        } catch (error) {
            UI.toast('Fout bij opslaan', 'error');
        }
    },

    deleteOrder(orderId) {
        if (!confirm('Order verwijderen?')) return;

        DB.updateOrder(orderId, { status: 'deleted' })
            .then(() => {
                Store.orders = Store.orders.filter(o => o.order_id !== orderId);
                UI.hideBottomSheet();
                UI.toast('Order verwijderd', 'success');
                Pages[Store.currentPage]?.();
            })
            .catch(() => UI.toast('Fout bij verwijderen', 'error'));
    },

    searchOrders(query) {
        const term = query.toLowerCase();
        const filtered = Store.orders.filter(o =>
            o.klant_naam?.toLowerCase().includes(term) ||
            o.order_id?.toLowerCase().includes(term) ||
            o.klant_email?.toLowerCase().includes(term)
        );

        const container = document.getElementById('ordersList');
        if (container) {
            container.innerHTML = filtered.map(order => Pages.orderCard(order)).join('');
            if (filtered.length === 0) {
                container.innerHTML = '<p class="text-gray-400 text-center py-8">Geen orders gevonden</p>';
            }
        }
    },

    logout() {
        Store.clearUser();
        this.showLogin();
        UI.toast('Uitgelogd', 'info');
    }
};

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
