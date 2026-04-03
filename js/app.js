/**
 * MAIN APP - Babycrafts Atelier Pro V2
 * Complete application initialization and routing
 */

const App = {
    currentUser: null,
    currentPage: 'dashboard',
    supabase: null,
    isOnline: true,
    pinKeypadSetup: false,
    keyboardListenerAdded: false,
    currentPin: '',

    // Initialize application
    async initialize() {
        // Check online status
        this.updateOnlineStatus();
        window.addEventListener('online', () => this.updateOnlineStatus(true));
        window.addEventListener('offline', () => this.updateOnlineStatus(false));

        // Initialize Supabase
        await this.initializeSupabase();

        // Initialize modules
        Repository.initialize(this.supabase);
        Audit.initialize();

        // Check authentication
        await this.checkAuth();

        // Setup event listeners
        this.setupEventListeners();

        // Setup PostNL event
        window.addEventListener('postnl-manual-complete', async (e) => {
            const { orderId, trackTrace } = e.detail;
            try {
                await Repository.orders.update(orderId, {
                    track_trace_code: trackTrace,
                    verzenddatum: new Date().toISOString().split('T')[0]
                }, this.currentUser?.id);
                UI.showToast('Track & Trace opgeslagen', 'success');
                this.renderOrdersPage();
            } catch (error) {
                UI.showToast('Fout bij opslaan', 'error');
            }
        });
    },

    // Initialize Supabase
    async initializeSupabase() {
        try {
            const { createClient } = supabase;
            this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
            
            // Test connection
            const { error } = await this.supabase.from('orders').select('count', { count: 'exact', head: true });
            if (error) throw error;
            
        } catch (error) {
            console.error('Supabase init error:', error);
            UI.showToast('Database verbinding mislukt', 'error');
        }
    },

    // Update online status
    updateOnlineStatus(online) {
        this.isOnline = online !== undefined ? online : navigator.onLine;
        if (this.isOnline) {
            UI.hideOfflineIndicator();
        } else {
            UI.showOfflineIndicator();
        }
    },

    // PIN codes configuratie
    PIN_CODES: {
        '2911': { name: 'Eigenaar', role: 'admin', email: 'admin@babycrafts.local' },
        '0805': { name: 'Medewerker', role: 'staff', email: 'staff@babycrafts.local' }
    },
    
    currentPin: '',

    // Check authentication
    async checkAuth() {
        // Check for stored session
        const savedSession = localStorage.getItem('babycrafts_session');
        if (savedSession) {
            try {
                this.currentUser = JSON.parse(savedSession);
                this.showMainApp();
                await this.loadInitialData();
                return;
            } catch (e) {
                localStorage.removeItem('babycrafts_session');
            }
        }
        
        this.showLoginScreen();
    },

    // Show login screen
    showLoginScreen() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        
        // Reset PIN
        this.currentPin = '';
        this.updatePinDisplay();
        this.hidePinError();
        
        // Setup PIN keypad (only once)
        if (!this.pinKeypadSetup) {
            this.setupPinKeypad();
            this.pinKeypadSetup = true;
        }
    },
    
    // Setup PIN keypad
    setupPinKeypad() {
        // Use event delegation on the keypad container instead of individual buttons
        const keypad = document.querySelector('#pinLogin .grid');
        if (!keypad) return;
        
        // Remove old listeners by cloning
        const newKeypad = keypad.cloneNode(true);
        keypad.parentNode.replaceChild(newKeypad, keypad);
        
        // Single click handler for the entire keypad
        newKeypad.addEventListener('click', (e) => {
            const key = e.target.closest('.pin-key');
            if (key) {
                e.preventDefault();
                e.stopPropagation();
                const digit = key.dataset.key;
                if (digit) {
                    this.handlePinDigit(digit);
                }
            }
            
            const backspace = e.target.closest('#pinBackspace');
            if (backspace) {
                e.preventDefault();
                e.stopPropagation();
                this.handlePinBackspace();
            }
        });
        
        // Keyboard support (only once)
        if (!this.keyboardListenerAdded) {
            document.addEventListener('keydown', (e) => {
                if (!document.getElementById('loginScreen').classList.contains('hidden')) {
                    if (e.key >= '0' && e.key <= '9') {
                        e.preventDefault();
                        this.handlePinDigit(e.key);
                    } else if (e.key === 'Backspace') {
                        e.preventDefault();
                        this.handlePinBackspace();
                    }
                }
            });
            this.keyboardListenerAdded = true;
        }
        
        // Re-initialize icons
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    },
    
    // Handle PIN digit
    handlePinDigit(digit) {
        if (this.currentPin.length < 4) {
            this.currentPin += digit;
            this.updatePinDisplay();
            
            // Check if complete
            if (this.currentPin.length === 4) {
                setTimeout(() => this.verifyPin(), 200);
            }
        }
    },
    
    // Handle PIN backspace
    handlePinBackspace() {
        this.currentPin = this.currentPin.slice(0, -1);
        this.updatePinDisplay();
        this.hidePinError();
    },
    
    // Update PIN display
    updatePinDisplay() {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((dot, index) => {
            if (index < this.currentPin.length) {
                dot.textContent = '•';
                dot.classList.add('filled');
            } else {
                dot.textContent = '';
                dot.classList.remove('filled');
            }
        });
    },
    
    // Show PIN error
    showPinError() {
        const error = document.getElementById('pinError');
        if (error) {
            error.classList.remove('hidden');
        }
        
        // Shake animation
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach(dot => {
            dot.style.borderColor = '#ef4444';
            dot.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0)' }
            ], { duration: 300 });
        });
        
        setTimeout(() => {
            dots.forEach(dot => {
                dot.style.borderColor = '';
            });
        }, 1000);
    },
    
    // Hide PIN error
    hidePinError() {
        const error = document.getElementById('pinError');
        if (error) {
            error.classList.add('hidden');
        }
    },
    
    // Verify PIN
    async verifyPin() {
        const userData = this.PIN_CODES[this.currentPin];
        
        if (userData) {
            // Success
            this.currentUser = {
                id: `local_${userData.role}_${this.currentPin}`,
                email: userData.email,
                user_metadata: {
                    name: userData.name,
                    role: userData.role
                }
            };
            
            // Save session
            localStorage.setItem('babycrafts_session', JSON.stringify(this.currentUser));
            
            // Show success
            const dots = document.querySelectorAll('.pin-dot');
            dots.forEach(dot => {
                dot.style.borderColor = '#10b981';
                dot.style.background = '#10b981';
                dot.style.color = 'white';
            });
            
            setTimeout(() => {
                this.showMainApp();
                this.loadInitialData();
                UI.showToast(`Welkom ${userData.name}`, 'success');
            }, 300);
            
        } else {
            // Wrong PIN
            this.showPinError();
            this.currentPin = '';
            setTimeout(() => this.updatePinDisplay(), 500);
        }
    },

    // Show main app
    showMainApp() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        this.renderCurrentPage();
    },

    // Load initial data
    async loadInitialData() {
        try {
            await Promise.all([
                OrdersModule.initialize(),
                TodosModule.initialize(),
                TimeModule.initialize()
            ]);
            this.renderCurrentPage();
        } catch (error) {
            console.error('Load data error:', error);
        }
    },

    // Setup event listeners
    setupEventListeners() {
        // Logout - look for element with onclick="App.logout()"
        // Navigation is handled via onclick in HTML
        
        // Menu button
        document.getElementById('menuBtn')?.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.add('open');
            document.getElementById('menuOverlay').classList.add('visible');
        });

        // Menu overlay
        document.getElementById('menuOverlay')?.addEventListener('click', () => {
            document.getElementById('sideMenu').classList.remove('open');
            document.getElementById('menuOverlay').classList.remove('visible');
        });

        // New order form
        document.getElementById('newOrderForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleNewOrder(e.target);
        });
    },

    // Logout
    logout() {
        localStorage.removeItem('babycrafts_session');
        this.currentUser = null;
        this.showLoginScreen();
        UI.showToast('Uitgelogd', 'info');
    },

    // Navigate to page
    navigateTo(page) {
        this.currentPage = page;
        
        // Update nav active states
        document.querySelectorAll('[data-page]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.page === page);
        });
        
        // Close mobile menu
        document.getElementById('sideMenu')?.classList.add('-translate-x-full');
        
        this.renderCurrentPage();
    },

    // Render current page
    renderCurrentPage() {
        const content = document.getElementById('pageContent');
        
        switch (this.currentPage) {
            case 'dashboard':
                this.renderDashboard(content);
                break;
            case 'orders':
                this.renderOrdersPage(content);
                break;
            case 'archief':
                this.renderArchiefPage(content);
                break;
            case 'nazorg':
                this.renderNazorgPage(content);
                break;
            case 'todos':
                this.renderTodosPage(content);
                break;
            case 'time':
                this.renderTimePage(content);
                break;
            case 'settings':
                this.renderSettingsPage(content);
                break;
            default:
                this.renderDashboard(content);
        }
    },

    // Render dashboard
    renderDashboard(container) {
        const stats = OrdersModule.getDashboardStats();
        const recentOrders = OrdersModule.getActive().slice(0, 5);
        const todos = TodosModule.getByCategory();
        const activity = Audit.getRecentActivity(5);

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.dashboard')}</h1>
                <p class="page-subtitle">Welkom terug, ${this.currentUser?.email?.split('@')[0] || 'Gebruiker'}</p>
            </div>

            <!-- Stats Grid -->
            <div class="stats-grid">
                <div class="stat-card stat-card-blue">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.active')}</span>
                        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <i data-lucide="package" class="w-5 h-5 text-blue-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.active}</div>
                </div>
                
                <div class="stat-card stat-card-green">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.shipped')}</span>
                        <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.completed}</div>
                </div>
                
                <div class="stat-card stat-card-red">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.delayed')}</span>
                        <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-red-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.delayed}</div>
                </div>
                
                <div class="stat-card stat-card-orange">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.atBronsgieterij')}</span>
                        <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <i data-lucide="factory" class="w-5 h-5 text-orange-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.atBronsgieterij}</div>
                </div>
            </div>

            <!-- Recent Orders -->
            <div class="content-card">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="card-title">Recente Orders</h2>
                    <button class="btn-text" onclick="App.navigateTo('orders')">Alle orders →</button>
                </div>
                <div id="recentOrdersList" class="space-y-3">
                    ${recentOrders.length > 0 
                        ? recentOrders.map(order => this.createOrderCard(order)).join('')
                        : '<div class="text-center py-8 text-gray-500">Geen actieve orders</div>'
                    }
                </div>
            </div>

            <!-- To-Do Preview -->
            <div class="content-card">
                <div class="flex items-center justify-between mb-4">
                    <h2 class="card-title">Openstaande Taken</h2>
                    <button class="btn-text" onclick="App.navigateTo('todos')">Alle taken →</button>
                </div>
                <div class="space-y-2">
                    ${todos.eenmalig?.slice(0, 3).map(todo => `
                        <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <button onclick="App.toggleTodo('${todo.id}')" class="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center hover:bg-amber-50">
                                <i data-lucide="check" class="w-4 h-4 text-amber-500"></i>
                            </button>
                            <span class="flex-1">${Utils.escapeHtml(todo.titel)}</span>
                            <span class="text-xs px-2 py-1 rounded-lg ${this.getPriorityClass(todo.prioriteit)}">${todo.prioriteit}</span>
                        </div>
                    `).join('') || '<div class="text-center py-4 text-gray-500">Geen openstaande taken</div>'}
                </div>
            </div>

            <!-- Recent Activity -->
            <div class="content-card">
                <h2 class="card-title mb-4">Recente Activiteit</h2>
                <div class="space-y-3">
                    ${activity.map(act => `
                        <div class="flex items-center gap-3 text-sm">
                            <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <i data-lucide="activity" class="w-4 h-4 text-gray-500"></i>
                            </div>
                            <div class="flex-1">
                                <span class="text-gray-700">${act.action}</span>
                                <span class="text-gray-500">${act.entity}</span>
                            </div>
                            <span class="text-xs text-gray-400">${act.time}</span>
                        </div>
                    `).join('') || '<div class="text-center py-4 text-gray-500">Geen recente activiteit</div>'}
                </div>
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    // Create order card HTML
    createOrderCard(order) {
        const faseConfig = FASES_CONFIG[order.huidige_fase] || FASES_CONFIG[0];
        const deadlineStatus = Utils.getDeadlineStatus(order);
        
        return `
            <div class="order-card" onclick="App.showOrderDetail('${order.order_id}')">
                <div class="order-card-header">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg ${faseConfig.color} bg-opacity-20 flex items-center justify-center">
                            <span class="text-sm font-bold ${faseConfig.text}">${order.huidige_fase}</span>
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-gray-900 truncate">${Utils.escapeHtml(order.klant_naam)}</p>
                            <p class="text-sm text-gray-500">${Utils.escapeHtml(order.order_id)} • ${Utils.escapeHtml(order.collectie)}</p>
                        </div>
                    </div>
                    <span class="fase-badge ${faseConfig.color.replace('bg-', 'bg-').replace('500', '100')} ${faseConfig.text}">
                        ${I18n.getFaseName(order.huidige_fase)}
                    </span>
                </div>
                ${deadlineStatus ? `
                    <div class="mt-3 flex items-center gap-2 text-xs ${deadlineStatus.class}">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        <span>${deadlineStatus.text} • ${Utils.formatDate(order.deadline)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Render orders page
    renderOrdersPage(container = document.getElementById('pageContent')) {
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.orders')}</h1>
                <p class="page-subtitle">Beheer alle orders en hun status</p>
            </div>

            <!-- Filters -->
            <div class="flex flex-wrap gap-2 mb-4 overflow-x-auto pb-2">
                <button class="filter-tab active" data-fase="all">Alle</button>
                ${FASES_CONFIG.slice(0, 12).map(f => `
                    <button class="filter-tab" data-fase="${f.id}">${f.id}</button>
                `).join('')}
            </div>

            <!-- Orders List -->
            <div id="ordersList" class="space-y-3">
                ${OrdersModule.filteredOrders.length > 0 
                    ? OrdersModule.filteredOrders.map(order => this.createOrderCard(order)).join('')
                    : '<div class="text-center py-12 text-gray-500">Geen orders gevonden</div>'
                }
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    // Render archief page
    renderArchiefPage(container) {
        const completed = OrdersModule.orders.filter(o => o.huidige_fase === 12 || o.status === 'completed');
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.archief')}</h1>
                <p class="page-subtitle">Afgeronde orders</p>
            </div>

            <div class="space-y-3">
                ${completed.length > 0 
                    ? completed.map(order => this.createOrderCard(order)).join('')
                    : '<div class="text-center py-12 text-gray-500">Geen afgeronde orders</div>'
                }
            </div>
        `;
    },

    // Render nazorg page
    renderNazorgPage(container) {
        const nazorgOrders = OrdersModule.getNazorgOrders();
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.nazorg')}</h1>
                <p class="page-subtitle">Orders in nazorg fase</p>
            </div>

            <div class="space-y-3">
                ${nazorgOrders.length > 0 
                    ? nazorgOrders.map(order => {
                        const color = OrdersModule.getNazorgColor(order);
                        return `
                            <div class="order-card border-l-4 ${color === 'pink' ? 'border-pink-500' : 'border-blue-500'}">
                                <div class="order-card-header">
                                    <div>
                                        <p class="font-semibold">${Utils.escapeHtml(order.klant_naam)}</p>
                                        <p class="text-sm text-gray-500">${Utils.escapeHtml(order.order_id)}</p>
                                    </div>
                                    <span class="text-xs px-2 py-1 rounded-lg ${color === 'pink' ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}">
                                        ${color === 'pink' ? '4+ dagen' : 'Recent'}
                                    </span>
                                </div>
                                <div class="mt-3 flex gap-2">
                                    <button onclick="App.sendNazorgMessage('${order.order_id}')" 
                                            class="flex-1 py-2 bg-green-500 text-white rounded-lg text-sm">
                                        WhatsApp
                                    </button>
                                    <button onclick="App.completeNazorg('${order.order_id}')" 
                                            class="flex-1 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm">
                                        Afronden
                                    </button>
                                </div>
                            </div>
                        `;
                    }).join('')
                    : '<div class="text-center py-12 text-gray-500">Geen orders in nazorg</div>'
                }
            </div>
        `;
    },

    // Render todos page
    renderTodosPage(container) {
        const todos = TodosModule.getByCategory();
        const categories = [
            { key: 'dagelijks', label: 'Dagelijks' },
            { key: 'wekelijks', label: 'Wekelijks' },
            { key: 'maandelijks', label: 'Maandelijks' },
            { key: 'eenmalig', label: 'Eenmalig' }
        ];

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.todos')}</h1>
                <p class="page-subtitle">Beheer je taken</p>
            </div>

            <!-- Add Todo Form -->
            <div class="content-card mb-4">
                <form id="addTodoForm" class="flex gap-2">
                    <input type="text" id="todoTitle" placeholder="Nieuwe taak..." 
                           class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 outline-none">
                    <select id="todoCategory" class="px-4 py-3 border border-gray-200 rounded-xl bg-white">
                        ${categories.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
                    </select>
                    <button type="submit" class="px-4 py-3 bg-amber-500 text-white rounded-xl">
                        <i data-lucide="plus" class="w-5 h-5"></i>
                    </button>
                </form>
            </div>

            <!-- Todo Lists -->
            ${categories.map(cat => `
                <div class="content-card mb-4">
                    <h3 class="font-semibold text-gray-700 mb-3">${cat.label}</h3>
                    <div class="space-y-2">
                        ${todos[cat.key]?.length > 0 
                            ? todos[cat.key].map(todo => `
                                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                                    <button onclick="App.toggleTodo('${todo.id}')" 
                                            class="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center hover:bg-amber-50">
                                        <i data-lucide="check" class="w-4 h-4 text-amber-500"></i>
                                    </button>
                                    <span class="flex-1">${Utils.escapeHtml(todo.titel)}</span>
                                    <button onclick="App.deleteTodo('${todo.id}')" class="text-gray-400 hover:text-red-500">
                                        <i data-lucide="trash-2" class="w-4 h-4"></i>
                                    </button>
                                </div>
                            `).join('')
                            : '<div class="text-center py-4 text-gray-400 text-sm">Geen taken</div>'
                        }
                    </div>
                </div>
            `).join('')}
        `;

        // Setup form handler
        document.getElementById('addTodoForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('todoTitle').value;
            const category = document.getElementById('todoCategory').value;
            if (title.trim()) {
                await TodosModule.create(title, category, 'medium', this.currentUser?.id);
                UI.showToast('Taak toegevoegd', 'success');
                this.renderTodosPage(container);
            }
        });

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    // Render time page
    renderTimePage(container) {
        const stats = TimeModule.getStats(this.currentUser?.id);
        const pending = TimeModule.getPending();
        const perMedewerker = TimeModule.getPerMedewerker();

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.time')}</h1>
                <p class="page-subtitle">Tijdregistratie</p>
            </div>

            <!-- Time Stats -->
            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-label">Vandaag</span>
                    <div class="stat-value">${Utils.formatTime(stats.today)}</div>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Deze week</span>
                    <div class="stat-value">${Utils.formatTime(stats.week)}</div>
                </div>
                <div class="stat-card">
                    <span class="stat-label">Deze maand</span>
                    <div class="stat-value">${Utils.formatTime(stats.month)}</div>
                </div>
            </div>

            <!-- Add Time Entry -->
            <div class="content-card">
                <h3 class="card-title mb-4">Tijd registreren</h3>
                <form id="timeForm" class="space-y-3">
                    <div class="grid grid-cols-2 gap-3">
                        <input type="date" id="timeDate" required
                               class="px-4 py-3 border border-gray-200 rounded-xl">
                        <input type="time" id="timeStart" required
                               class="px-4 py-3 border border-gray-200 rounded-xl">
                        <input type="time" id="timeEnd" required
                               class="px-4 py-3 border border-gray-200 rounded-xl">
                        <input type="number" id="timeBreak" placeholder="Pauze (min)" min="0"
                               class="px-4 py-3 border border-gray-200 rounded-xl">
                    </div>
                    <input type="text" id="timeNote" placeholder="Opmerking (optioneel)"
                           class="w-full px-4 py-3 border border-gray-200 rounded-xl">
                    <button type="submit" class="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">
                        Registreren
                    </button>
                </form>
            </div>

            <!-- Pending Approvals -->
            ${Object.keys(perMedewerker).length > 0 ? `
                <div class="content-card">
                    <h3 class="card-title mb-4">Overzicht per medewerker</h3>
                    <div class="space-y-3">
                        ${Object.values(perMedewerker).map(m => `
                            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                <div>
                                    <p class="font-medium">${Utils.escapeHtml(m.naam)}</p>
                                    <p class="text-sm text-gray-500">${m.approved} registraties</p>
                                </div>
                                <div class="text-right">
                                    <p class="font-semibold">${Utils.formatTime(m.dezeMaandMinuten)}</p>
                                    <p class="text-xs text-gray-500">deze maand</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;

        // Set default date
        document.getElementById('timeDate').valueAsDate = new Date();

        // Setup form handler
        document.getElementById('timeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const datum = document.getElementById('timeDate').value;
            const start = document.getElementById('timeStart').value;
            const eind = document.getElementById('timeEnd').value;
            const pauze = parseInt(document.getElementById('timeBreak').value) || 0;
            const opmerking = document.getElementById('timeNote').value;

            try {
                await TimeModule.create(datum, start, eind, pauze, opmerking, this.currentUser?.id, this.currentUser?.email);
                UI.showToast('Tijd geregistreerd', 'success');
                this.renderTimePage(container);
            } catch (error) {
                UI.showToast('Fout bij registreren', 'error');
            }
        });
    },

    // Render settings page
    renderSettingsPage(container) {
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">${I18n.t('nav.settings')}</h1>
                <p class="page-subtitle">App instellingen</p>
            </div>

            <div class="content-card space-y-4">
                <div class="flex items-center justify-between py-3 border-b">
                    <div>
                        <p class="font-medium">Taal</p>
                        <p class="text-sm text-gray-500">Kies je voorkeurstaal</p>
                    </div>
                    <select id="languageSelect" class="px-4 py-2 border border-gray-200 rounded-lg">
                        <option value="nl" ${I18n.getLanguage() === 'nl' ? 'selected' : ''}>Nederlands</option>
                        <option value="en" ${I18n.getLanguage() === 'en' ? 'selected' : ''}>English</option>
                    </select>
                </div>

                <div class="flex items-center justify-between py-3 border-b">
                    <div>
                        <p class="font-medium">Dark Mode</p>
                        <p class="text-sm text-gray-500">Donker thema</p>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="darkModeToggle" class="sr-only peer">
                        <div class="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                    </label>
                </div>

                <div class="py-3">
                    <p class="font-medium mb-2">App Info</p>
                    <p class="text-sm text-gray-500">Versie ${CONFIG.VERSION}</p>
                    <p class="text-sm text-gray-500">© 2024 Babycrafts</p>
                </div>
            </div>

            <button onclick="App.logout()" class="w-full py-3 bg-red-500 text-white rounded-xl font-medium mt-4">
                Uitloggen
            </button>
        `;

        // Language change
        document.getElementById('languageSelect')?.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            this.renderCurrentPage();
            UI.showToast('Taal gewijzigd', 'success');
        });

        // Dark mode toggle
        document.getElementById('darkModeToggle')?.addEventListener('change', (e) => {
            document.documentElement.classList.toggle('dark', e.target.checked);
        });
    },

    // Show order detail
    async showOrderDetail(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const faseConfig = FASES_CONFIG[order.huidige_fase] || FASES_CONFIG[0];
        const canAdvance = OrdersModule.canAdvance(order);
        const advanceText = OrdersModule.getAdvanceButtonText(order);

        UI.showBottomSheet({
            title: orderId,
            content: `
                <div class="space-y-4">
                    <!-- Klant Info -->
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="font-semibold mb-2">Klant</h4>
                        <p class="text-lg">${Utils.escapeHtml(order.klant_naam)}</p>
                        <p class="text-gray-500">${Utils.escapeHtml(order.klant_email)}</p>
                        ${order.klant_telefoon ? `<p class="text-gray-500">${Utils.escapeHtml(order.klant_telefoon)}</p>` : ''}
                    </div>

                    <!-- Order Details -->
                    <div class="grid grid-cols-2 gap-3">
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-xs text-gray-500">Collectie</p>
                            <p class="font-medium">${Utils.escapeHtml(order.collectie)}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-xs text-gray-500">Hoogte</p>
                            <p class="font-medium">${order.hoogte_cm}cm</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-xs text-gray-500">Sokkel</p>
                            <p class="font-medium">${order.sokkel || 'Zonder'}</p>
                        </div>
                        <div class="bg-gray-50 rounded-xl p-3">
                            <p class="text-xs text-gray-500">Deadline</p>
                            <p class="font-medium">${Utils.formatDate(order.deadline)}</p>
                        </div>
                    </div>

                    <!-- Huidige Fase -->
                    <div class="bg-${faseConfig.color.replace('bg-', '')} bg-opacity-10 rounded-xl p-4">
                        <p class="text-sm text-gray-500">Huidige fase</p>
                        <p class="font-semibold ${faseConfig.text}">${I18n.getFaseName(order.huidige_fase)}</p>
                    </div>

                    <!-- Action Buttons -->
                    <div class="space-y-2">
                        <button onclick="App.advanceOrder('${orderId}')" 
                                class="w-full py-3 ${canAdvance.can ? 'bg-green-500' : 'bg-gray-300'} text-white rounded-xl font-medium"
                                ${!canAdvance.can ? 'disabled' : ''}>
                            ${advanceText}
                        </button>
                        
                        ${order.huidige_fase === 9 ? `
                            <button onclick="App.showPostNL('${orderId}')" 
                                    class="w-full py-3 bg-[#003366] text-white rounded-xl font-medium">
                                📦 PostNL
                            </button>
                        ` : ''}

                        <div class="grid grid-cols-2 gap-2">
                            <button onclick="App.editOrder('${orderId}')" 
                                    class="py-3 bg-gray-100 text-gray-700 rounded-xl">
                                Bewerken
                            </button>
                            <button onclick="App.deleteOrder('${orderId}')" 
                                    class="py-3 bg-red-100 text-red-600 rounded-xl">
                                Verwijderen
                            </button>
                        </div>
                    </div>
                </div>
            `
        });
    },

    // Show new order form
    showNewOrderForm() {
        const collecties = ['Figura', 'Arte-Lumina', 'Natura-Alba', 'Ouder & Kind', 'Babybeeld', 'Atelier-Bronze', 'Gegoten Brons', 'Aangepast'];
        const kleuren = ['Classic White', 'Soft Cream', 'Warm Sand', 'Modern Grey', 'Midnight Black', 'Custom'];

        UI.showBottomSheet({
            title: 'Nieuwe Order',
            content: `
                <form id="newOrderForm" class="space-y-4">
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Klantnaam *</label>
                        <input type="text" name="klant_naam" required class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">E-mail *</label>
                        <input type="email" name="klant_email" required class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Telefoon</label>
                        <input type="tel" name="klant_telefoon" class="form-input">
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Straat</label>
                            <input type="text" name="straat" class="form-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Huisnummer</label>
                            <input type="text" name="huisnummer" class="form-input">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Postcode</label>
                            <input type="text" name="postcode" class="form-input">
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Plaats</label>
                            <input type="text" name="plaats" class="form-input">
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-3">
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Collectie *</label>
                            <select name="collectie" required class="form-select">
                                ${collecties.map(c => `<option value="${c}">${c}</option>`).join('')}
                            </select>
                        </div>
                        <div>
                            <label class="block text-sm font-medium text-gray-700 mb-1">Hoogte (cm)</label>
                            <input type="number" name="hoogte_cm" value="20" min="10" max="50" class="form-input">
                        </div>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Kleurafwerking</label>
                        <select name="kleur_afwerking" class="form-select">
                            <option value="">Standaard</option>
                            ${kleuren.map(k => `<option value="${k}">${k}</option>`).join('')}
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Sokkel</label>
                        <select name="sokkel" class="form-select">
                            <option value="Zonder">Zonder</option>
                            <option value="Met">Met</option>
                            <option value="Met en Vast">Met en Vast</option>
                        </select>
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Deadline</label>
                        <input type="date" name="deadline" class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Scan Datum</label>
                        <input type="date" name="scan_datum" class="form-input">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-700 mb-1">Extra notities</label>
                        <textarea name="extra_notities" rows="3" class="form-input"></textarea>
                    </div>
                    <label class="flex items-center gap-2">
                        <input type="checkbox" name="toestemming_delen" class="w-4 h-4 text-amber-500 rounded">
                        <span class="text-sm text-gray-700">Toestemming delen op social media</span>
                    </label>
                    <button type="submit" class="w-full py-3 bg-amber-500 text-white rounded-xl font-medium">
                        Order Aanmaken
                    </button>
                </form>
            `
        });

        setTimeout(() => {
            document.getElementById('newOrderForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                
                try {
                    await OrdersModule.create(formData, this.currentUser?.id);
                    UI.closeBottomSheet();
                    UI.showToast('Order aangemaakt', 'success');
                    this.renderOrdersPage();
                } catch (error) {
                    UI.showToast('Fout bij aanmaken', 'error');
                }
            });
        }, 100);
    },

    // Advance order to next fase
    async advanceOrder(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const nextFase = getNextFase(order.huidige_fase, order.collectie);
        if (nextFase === null) return;

        try {
            await OrdersModule.updateFase(orderId, nextFase, this.currentUser?.id);
            
            // Show communication modal for certain fases
            if (nextFase === 0) {
                CommunicationsModule.showChoiceModal(order, 'welcome');
            } else if (nextFase === 10) {
                CommunicationsModule.showChoiceModal(order, 'shipping');
            } else if (nextFase === 11) {
                CommunicationsModule.showChoiceModal(order, 'nazorg');
            }
            
            UI.closeBottomSheet();
            UI.showToast('Fase bijgewerkt', 'success');
            this.renderCurrentPage();
        } catch (error) {
            UI.showToast('Fout bij bijwerken', 'error');
        }
    },

    // Show PostNL helper
    showPostNL(orderId) {
        const order = OrdersModule.getById(orderId);
        if (order) {
            CommunicationsModule.showPostNLHelper(order);
        }
    },

    // Delete order
    deleteOrder(orderId) {
        UI.showConfirm({
            title: 'Order verwijderen?',
            message: 'Deze actie kan niet ongedaan worden gemaakt.',
            confirmText: 'Verwijderen',
            cancelText: 'Annuleren',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await OrdersModule.delete(orderId, this.currentUser?.id);
                    UI.closeBottomSheet();
                    UI.showToast('Order verwijderd', 'success');
                    this.renderCurrentPage();
                } catch (error) {
                    UI.showToast('Fout bij verwijderen', 'error');
                }
            }
        });
    },

    // Toggle todo
    async toggleTodo(id) {
        try {
            await TodosModule.toggle(id, this.currentUser?.id);
            this.renderCurrentPage();
        } catch (error) {
            UI.showToast('Fout', 'error');
        }
    },

    // Delete todo
    async deleteTodo(id) {
        try {
            await TodosModule.delete(id);
            this.renderCurrentPage();
        } catch (error) {
            UI.showToast('Fout', 'error');
        }
    },

    // Send nazorg message
    sendNazorgMessage(orderId) {
        const order = OrdersModule.getById(orderId);
        if (order) {
            CommunicationsModule.showChoiceModal(order, 'nazorg', () => {
                this.completeNazorg(orderId);
            });
        }
    },

    // Complete nazorg
    async completeNazorg(orderId) {
        try {
            await OrdersModule.updateFase(orderId, 12, this.currentUser?.id);
            UI.showToast('Nazorg afgerond', 'success');
            this.renderCurrentPage();
        } catch (error) {
            UI.showToast('Fout', 'error');
        }
    },

    // Get priority class
    getPriorityClass(priority) {
        const classes = {
            high: 'bg-red-100 text-red-600',
            medium: 'bg-yellow-100 text-yellow-600',
            low: 'bg-green-100 text-green-600'
        };
        return classes[priority] || classes.medium;
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});
