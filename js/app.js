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
        
        // Initialize OrdersModule (important!)
        if (OrdersModule) {
            await OrdersModule.initialize();
        }
        if (TodosModule) {
            await TodosModule.initialize();
        }

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
        
        // Setup PIN keypad - ALWAYS call this to ensure keypad works
        console.log('Setting up PIN keypad from showLoginScreen');
        this.setupPinKeypad();
    },
    
    // Setup PIN keypad
    setupPinKeypad() {
        console.log('setupPinKeypad called');
        
        // Use event delegation on the keypad container instead of individual buttons
        const keypad = document.querySelector('#pinLogin .grid');
        console.log('Keypad element:', keypad);
        
        if (!keypad) {
            console.error('Keypad element niet gevonden!');
            return;
        }
        
        // Remove old listeners by cloning
        const newKeypad = keypad.cloneNode(true);
        keypad.parentNode.replaceChild(newKeypad, keypad);
        
        // Single click handler for the entire keypad
        newKeypad.addEventListener('click', (e) => {
            console.log('Keypad click detected:', e.target);
            
            const key = e.target.closest('.pin-key');
            if (key) {
                e.preventDefault();
                e.stopPropagation();
                const digit = key.dataset.key;
                console.log('PIN key clicked:', digit);
                if (digit) {
                    this.handlePinDigit(digit);
                }
            }
            
            const backspace = e.target.closest('#pinBackspace');
            if (backspace) {
                e.preventDefault();
                e.stopPropagation();
                console.log('Backspace clicked');
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
        
        console.log('setupPinKeypad complete');
    },
    
    // Handle PIN digit
    handlePinDigit(digit) {
        console.log('handlePinDigit called with:', digit);
        console.log('currentPin before:', this.currentPin);
        
        if (this.currentPin.length < 4) {
            this.currentPin += digit;
            console.log('currentPin after:', this.currentPin);
            this.updatePinDisplay();
            
            // Check if complete
            if (this.currentPin.length === 4) {
                console.log('PIN complete, verifying...');
                setTimeout(() => this.verifyPin(), 200);
            }
        } else {
            console.log('PIN already 4 digits');
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
            const promises = [OrdersModule.initialize(), TodosModule.initialize()];
            if (typeof TimeModule !== 'undefined') {
                promises.push(TimeModule.initialize());
            }
            await Promise.all(promises);
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

        // Search with debounce
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            const debouncedSearch = Utils.debounce((value) => {
                this.handleSearch(value);
            }, 300);
            searchInput.addEventListener('input', (e) => debouncedSearch(e.target.value));
        }
    },

    // Logout
    logout() {
        localStorage.removeItem('babycrafts_session');
        this.currentUser = null;
        this.showLoginScreen();
        UI.showToast('Uitgelogd', 'info');
    },

    // Handle new order form submission (from index.html bottom sheet)
    async handleNewOrder(form) {
        console.log('=== handleNewOrder START ===');
        console.log('currentUser voor submit:', this.currentUser);
        
        if (!this.currentUser) {
            console.error('Geen currentUser bij start handleNewOrder!');
            UI.showToast('Sessie verlopen. Log opnieuw in.', 'error');
            this.showLoginScreen();
            return;
        }
        
        const formData = Object.fromEntries(new FormData(form));
        
        // Calculate deadline (6 weeks from scan date)
        if (formData.scan_datum) {
            const scanDate = new Date(formData.scan_datum);
            const deadline = new Date(scanDate);
            deadline.setDate(deadline.getDate() + 42); // 6 weeks
            formData.deadline = deadline.toISOString().split('T')[0];
        }
        
        console.log('handleNewOrder - Form data:', formData);
        console.log('handleNewOrder - Current user:', this.currentUser);

        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent || 'Order Aanmaken';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Bezig...';
        }
        
        try {
            console.log('Roep OrdersModule.create aan...');
            const order = await OrdersModule.create(formData, this.currentUser?.id);
            console.log('OrdersModule.create resultaat:', order);
            
            if (order) {
                UI.showToast('Order aangemaakt', 'success');
                this.closeNewOrder();
                await OrdersModule.load();
                this.renderCurrentPage();
            } else {
                console.error('Order is null/undefined');
                UI.showToast('Order kon niet worden aangemaakt', 'error');
            }
        } catch (error) {
            console.error('handleNewOrder - ERROR:', error);
            console.error('Error details:', error?.message, error?.stack);
            const errorMsg = window.lastRepositoryError?.message || error?.message || 'Fout bij aanmaken order';
            UI.showToast(errorMsg, 'error', 5000);
            
            // BELANGRIJK: Niet naar login scherm gaan bij error!
            // Alleen als de sessie echt verlopen is
            if (error?.message?.includes('auth') || error?.message?.includes('unauthorized')) {
                console.log('Auth error detected, showing login screen');
                this.showLoginScreen();
            }
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
            console.log('=== handleNewOrder END ===');
        }
    },
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.textContent || 'Order Aanmaken';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Bezig...';
        }
        
        try {
            const order = await OrdersModule.create(formData, this.currentUser?.id);
            console.log('handleNewOrder - Created order:', order);
            
            if (order) {
                UI.showToast('Order aangemaakt', 'success');
                this.closeNewOrder();
                await OrdersModule.load();
                this.renderCurrentPage();
            } else {
                UI.showToast('Order kon niet worden aangemaakt', 'error');
            }
        } catch (error) {
            console.error('handleNewOrder - Error:', error);
            const errorMsg = window.lastRepositoryError?.message || error.message || 'Fout bij aanmaken order';
            console.error('handleNewOrder - Error details:', window.lastRepositoryError);
            UI.showToast(errorMsg, 'error', 5000);
        } finally {
            // Restore button state
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    },

    // Close new order sheet
    closeNewOrder() {
        const sheet = document.getElementById('newOrderSheet');
        if (sheet) {
            sheet.classList.remove('active');
        }
    },

    // Navigate to page
    navigate(page) {
        this.currentPage = page;
        
        // Update page title
        const titles = {
            'dashboard': 'Dashboard',
            'orders': 'Orders',
            'archief': 'Archief',
            'nazorg': 'Nazorg',
            'todos': 'Taken',
            'time': 'Tijdregistratie',
            'settings': 'Instellingen'
        };
        document.getElementById('pageTitle').textContent = titles[page] || 'Babycrafts';
        
        // Update nav active states
        document.querySelectorAll('.nav-btn').forEach(btn => {
            const isActive = btn.dataset.page === page;
            btn.classList.toggle('text-primary-600', isActive);
            btn.classList.toggle('text-gray-400', !isActive);
        });
        
        // Show/hide search bar
        document.getElementById('searchBar').classList.toggle('hidden', page !== 'orders');
        
        // Close side menu
        document.getElementById('sideMenu').classList.remove('open');
        document.getElementById('menuOverlay').classList.remove('visible');
        
        this.renderCurrentPage();
    },

    // Render current page
    renderCurrentPage() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        
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
            case 'schema':
                this.renderSchemaPage(content);
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
                <div class="stat-card stat-card-blue" onclick="App.navigate('orders')" style="cursor: pointer;">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.active')}</span>
                        <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <i data-lucide="package" class="w-5 h-5 text-blue-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.active}</div>
                </div>
                
                <div class="stat-card stat-card-green" onclick="App.navigate('archief')" style="cursor: pointer;">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.shipped')}</span>
                        <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                            <i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.completed}</div>
                </div>
                
                <div class="stat-card stat-card-red" onclick="App.showDelayedOrders()" style="cursor: pointer;">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.delayed')}</span>
                        <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                            <i data-lucide="alert-triangle" class="w-5 h-5 text-red-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.delayed}</div>
                </div>
                
                <div class="stat-card stat-card-orange" onclick="App.showBronsgieterijOrders()" style="cursor: pointer;">
                    <div class="flex items-center justify-between mb-2">
                        <span class="stat-label">${I18n.t('orders.atBronsgieterij')}</span>
                        <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center">
                            <i data-lucide="factory" class="w-5 h-5 text-orange-600"></i>
                        </div>
                    </div>
                    <div class="stat-value">${stats.atBronsgieterij}</div>
                </div>
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
                    <button class="btn-text" onclick="App.navigate('orders')">Alle orders →</button>
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
                    <button class="btn-text" onclick="App.navigate('todos')">Alle taken →</button>
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
            <div class="order-card">
                <div class="order-card-header" onclick="App.showOrderDetail('${order.order_id}')">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-lg ${faseConfig.color} bg-opacity-20 flex items-center justify-center">
                            <span class="text-sm font-bold ${faseConfig.text}">${order.huidige_fase}</span>
                        </div>
                        <div class="min-w-0">
                            <p class="font-semibold text-gray-900 truncate cursor-pointer hover:text-amber-600" 
                               onclick="event.stopPropagation(); App.showCustomerPassport('${order.order_id}')"
                               title="Klik voor klant paspoort">
                                ${Utils.escapeHtml(order.klant_naam)}
                            </p>
                            <p class="text-sm text-gray-500">${Utils.escapeHtml(order.order_id)} • ${Utils.escapeHtml(order.collectie)}</p>
                        </div>
                    </div>
                    <span class="fase-badge ${faseConfig.color.replace('bg-', 'bg-').replace('500', '100')} ${faseConfig.text}">
                        ${I18n.getFaseName(order.huidige_fase)}
                    </span>
                </div>
                ${deadlineStatus ? `
                    <div class="mt-3 flex items-center gap-2 text-xs ${deadlineStatus.class}" onclick="App.showOrderDetail('${order.order_id}')">
                        <i data-lucide="clock" class="w-4 h-4"></i>
                        <span>${deadlineStatus.text} • ${Utils.formatDate(order.deadline)}</span>
                    </div>
                ` : ''}
            </div>
        `;
    },

    // Render orders page
    renderOrdersPage(container) {
        // Sort by date descending (newest first)
        const sortedOrders = [...OrdersModule.filteredOrders].sort((a, b) => {
            return new Date(b.created_at) - new Date(a.created_at);
        });

        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Alle Orders</h1>
                <p class="page-subtitle">${sortedOrders.length} order(s) gevonden</p>
            </div>

            <!-- Filters - Vereenvoudigd -->
            <div class="filter-tabs mb-4">
                <button class="filter-tab active" data-fase="all" onclick="App.filterOrders('all')">Alle</button>
                <button class="filter-tab" data-fase="active" onclick="App.filterOrders('active')">Actief</button>
                <button class="filter-tab" data-fase="brons" onclick="App.filterOrders('brons')">Brons</button>
            </div>

            <!-- Orders List -->
            <div id="ordersList" class="space-y-3">
                ${sortedOrders.length > 0 
                    ? sortedOrders.map(order => this.createOrderCard(order)).join('')
                    : '<div class="text-center py-12 text-gray-500">Geen orders gevonden</div>'
                }
            </div>
        `;

        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
    },

    // Filter orders
    filterOrders(filter) {
        // Update active tab
        document.querySelectorAll('.filter-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.fase === filter);
        });

        switch(filter) {
            case 'all':
                OrdersModule.filteredOrders = OrdersModule.orders.filter(o => o.status !== 'deleted');
                break;
            case 'active':
                OrdersModule.filteredOrders = OrdersModule.orders.filter(o => 
                    o.huidige_fase < 12 && o.status !== 'deleted'
                );
                break;
            case 'brons':
                OrdersModule.filteredOrders = OrdersModule.orders.filter(o => 
                    (o.huidige_fase === 13 || o.huidige_fase === 14 || o.huidige_fase === 15 || o.huidige_fase === 16) && 
                    o.status !== 'deleted'
                );
                break;
        }
        this.renderCurrentPage();
    },

    // Handle search
    handleSearch(query) {
        const searchTerm = query.toLowerCase().trim();
        if (!searchTerm) {
            OrdersModule.filteredOrders = OrdersModule.orders.filter(o => o.status !== 'deleted');
        } else {
            OrdersModule.filteredOrders = OrdersModule.orders.filter(o => {
                if (o.status === 'deleted') return false;
                return (
                    o.klant_naam?.toLowerCase().includes(searchTerm) ||
                    o.order_id?.toLowerCase().includes(searchTerm) ||
                    o.klant_email?.toLowerCase().includes(searchTerm) ||
                    o.collectie?.toLowerCase().includes(searchTerm)
                );
            });
        }
        this.renderCurrentPage();
    },

    // Render archief page
    renderArchiefPage(container) {
        const completed = OrdersModule.orders.filter(o => 
            (o.huidige_fase === 12 || o.status === 'completed') && o.status !== 'deleted'
        ).sort((a, b) => new Date(b.afgerond_datum || b.updated_at) - new Date(a.afgerond_datum || a.updated_at));

        container.innerHTML = `
            <div class="page-header">
                <div class="flex items-center justify-between">
                    <div>
                        <h1 class="page-title">Archief</h1>
                        <p class="page-subtitle">${completed.length} afgeronde orders</p>
                    </div>
                    ${completed.length > 0 ? `
                        <button onclick="App.confirmDeleteAllArchived()" class="text-red-500 text-sm font-medium px-3 py-2">
                            Alles wissen
                        </button>
                    ` : ''}
                </div>
            </div>

            <div class="space-y-3">
                ${completed.length > 0 
                    ? completed.map(order => this.createOrderCard(order)).join('')
                    : '<div class="text-center py-12 text-gray-500">Geen afgeronde orders</div>'
                }
            </div>
        `;
    },

    // Confirm delete all archived
    confirmDeleteAllArchived() {
        const count = OrdersModule.orders.filter(o => 
            (o.huidige_fase === 12 || o.status === 'completed') && o.status !== 'deleted'
        ).length;

        UI.showConfirm({
            title: 'Alle gearchiveerde orders verwijderen?',
            message: `Dit verwijdert ${count} afgeronde order(s) uit de app. De data blijft in de database.`,
            confirmText: 'Alles verwijderen',
            cancelText: 'Annuleren',
            type: 'danger',
            onConfirm: async () => {
                try {
                    const archived = OrdersModule.orders.filter(o => 
                        (o.huidige_fase === 12 || o.status === 'completed') && o.status !== 'deleted'
                    );
                    
                    for (const order of archived) {
                        await OrdersModule.delete(order.order_id, this.currentUser?.id);
                    }
                    
                    UI.showToast(`${archived.length} orders verwijderd uit app`, 'success');
                    this.renderCurrentPage();
                } catch (error) {
                    UI.showToast('Fout bij verwijderen', 'error');
                }
            }
        });
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
                <form id="addTodoForm" class="flex flex-col sm:flex-row gap-2">
                    <input type="text" id="todoTitle" placeholder="Nieuwe taak..." 
                           class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-base">
                    <div class="flex gap-2">
                        <select id="todoCategory" class="flex-1 sm:flex-none px-4 py-3 border border-gray-200 rounded-xl bg-white text-base">
                            ${categories.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
                        </select>
                        <button type="submit" class="px-6 py-3 bg-amber-500 text-white rounded-xl font-medium whitespace-nowrap">
                            Toevoegen
                        </button>
                    </div>
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

    // Render schema page (production schema)
    renderSchemaPage(container) {
        const activeOrders = OrdersModule.getActive();
        
        // Group orders by workflow
        const standardOrders = activeOrders.filter(o => {
            const wf = getWorkflowForCollectie(o.collectie);
            return wf === 'standard';
        });
        
        const atelierBronzeOrders = activeOrders.filter(o => {
            const wf = getWorkflowForCollectie(o.collectie);
            return wf === 'atelier_bronze';
        });
        
        const gegotenBronsOrders = activeOrders.filter(o => {
            const wf = getWorkflowForCollectie(o.collectie);
            return wf === 'gegoten_brons';
        });
        
        // Build workflow sections
        const buildWorkflowSection = (title, orders, workflowKey) => {
            if (orders.length === 0) return '';
            
            const workflow = WORKFLOWS[workflowKey];
            
            return `
                <div class="content-card mb-6">
                    <div class="flex items-center justify-between mb-4">
                        <div>
                            <h3 class="font-semibold text-gray-800">${title}</h3>
                            <p class="text-sm text-gray-500">${orders.length} orders • ${workflow.duration}</p>
                        </div>
                        <span class="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded-full">${workflowKey}</span>
                    </div>
                    
                    <!-- Timeline Header -->
                    <div class="overflow-x-auto">
                        <div class="flex gap-2 mb-4 min-w-max">
                            ${workflow.fases.map(faseNum => {
                                const faseConfig = FASES_CONFIG[faseNum];
                                return `
                                    <div class="flex-shrink-0 w-24 text-center">
                                        <div class="w-8 h-8 mx-auto rounded-full ${faseConfig.color} flex items-center justify-center text-white text-xs font-bold mb-1">
                                            ${faseNum}
                                        </div>
                                        <p class="text-xs text-gray-600 truncate" title="${faseConfig.name}">${faseConfig.name}</p>
                                    </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <!-- Orders -->
                    <div class="space-y-2">
                        ${orders.map(order => {
                            const currentIndex = workflow.fases.indexOf(order.huidige_fase);
                            return `
                                <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                                     onclick="App.showOrderDetail('${order.order_id}')">
                                    <div class="w-32 flex-shrink-0">
                                        <p class="font-medium text-sm truncate">${Utils.escapeHtml(order.klant_naam)}</p>
                                        <p class="text-xs text-gray-500">${order.order_id}</p>
                                    </div>
                                    <div class="flex-1 flex gap-1">
                                        ${workflow.fases.map((faseNum, idx) => {
                                            const faseConfig = FASES_CONFIG[faseNum];
                                            const isCompleted = idx < currentIndex;
                                            const isCurrent = idx === currentIndex;
                                            
                                            let bgClass = 'bg-gray-200';
                                            if (isCompleted) bgClass = 'bg-green-500';
                                            else if (isCurrent) bgClass = faseConfig.color;
                                            
                                            return `
                                                <div class="flex-1 h-6 ${bgClass} rounded ${isCurrent ? 'ring-2 ring-offset-1 ring-blue-400' : ''}"
                                                     title="${faseConfig.name} ${isCurrent ? '(huidig)' : isCompleted ? '(voltooid)' : ''}">
                                                </div>
                                            `;
                                        }).join('')}
                                    </div>
                                    <div class="w-8 text-center">
                                        ${currentIndex === workflow.fases.length - 1 ? 
                                            '<span class="text-green-500">✓</span>' :
                                            `<span class="text-xs text-gray-500">${currentIndex + 1}/${workflow.fases.length}</span>`
                                        }
                                    </div>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            `;
        };
        
        container.innerHTML = `
            <div class="page-header">
                <h1 class="page-title">Productie Schema</h1>
                <p class="page-subtitle">Overzicht van alle workflows</p>
            </div>
            
            ${standardOrders.length > 0 ? buildWorkflowSection('Standaard Workflow', standardOrders, 'standard') : ''}
            ${atelierBronzeOrders.length > 0 ? buildWorkflowSection('Atelier Bronze Workflow', atelierBronzeOrders, 'atelier_bronze') : ''}
            ${gegotenBronsOrders.length > 0 ? buildWorkflowSection('Gegoten Brons Workflow', gegotenBronsOrders, 'gegoten_brons') : ''}
            
            ${activeOrders.length === 0 ? `
                <div class="text-center py-12 text-gray-500">
                    <i data-lucide="columns" class="w-12 h-12 mx-auto mb-4 opacity-50"></i>
                    <p>Geen actieve orders</p>
                </div>
            ` : ''}
        `;
        
        if (typeof lucide !== 'undefined') {
            lucide.createIcons({ nodes: [container] });
        }
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
                        <button onclick="App.showProductionSchema('${orderId}')" 
                                class="w-full py-3 bg-blue-500 text-white rounded-xl font-medium">
                            📋 Productieschema Bekijken
                        </button>
                        
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
                                    class="py-3 bg-amber-100 text-amber-700 rounded-xl font-medium">
                                ✏️ Bewerken
                            </button>
                            <button onclick="App.deleteOrder('${orderId}')" 
                                    class="py-3 bg-red-100 text-red-600 rounded-xl">
                                🗑️ Verwijderen
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
                        <input type="text" name="kleur_afwerking" placeholder="Bijv. Classic White, Soft Cream..." class="form-input">
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
                        <label class="block text-sm font-medium text-gray-700 mb-1">Scan Datum</label>
                        <input type="date" name="scan_datum" id="scanDatumInput" class="form-input">
                        <p class="text-xs text-gray-500 mt-1">Deadline wordt automatisch 6 weken na scandatum</p>
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
            // Add deadline calculation when scan date changes
            const scanDatumInput = document.getElementById('scanDatumInput');
            if (scanDatumInput) {
                scanDatumInput.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const scanDate = new Date(e.target.value);
                        const deadline = new Date(scanDate);
                        deadline.setDate(deadline.getDate() + 42); // 6 weeks = 42 days
                        // Store deadline in a data attribute for form submission
                        e.target.dataset.deadline = deadline.toISOString().split('T')[0];
                    }
                });
            }

            document.getElementById('newOrderForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // BELANGRIJK: Zorg dat sessie altijd beschikbaar is
                if (!this.currentUser) {
                    console.log('Sessie niet in memory, probeer uit localStorage te laden...');
                    const savedSession = localStorage.getItem('babycrafts_session');
                    if (savedSession) {
                        try {
                            this.currentUser = JSON.parse(savedSession);
                            console.log('Sessie hersteld uit localStorage:', this.currentUser);
                        } catch (e) {
                            console.error('Kon sessie niet parsen:', e);
                        }
                    }
                }
                
                console.log('=== SUBMIT HANDLER START ===');
                console.log('this.currentUser:', this.currentUser);
                console.log('this.currentUser?.id:', this.currentUser?.id);
                
                if (!this.currentUser?.id) {
                    console.error('❌ Geen gebruiker ingelogd bij submit!');
                    UI.showToast('❌ Je bent niet ingelogd. Log opnieuw in.', 'error', 5000);
                    this.showLoginScreen();
                    return;
                }
                
                const formData = Object.fromEntries(new FormData(e.target));
                
                // Add calculated deadline if scan date is set
                const scanDatumInput = document.getElementById('scanDatumInput');
                if (scanDatumInput?.dataset.deadline) {
                    formData.deadline = scanDatumInput.dataset.deadline;
                }
                
                // Debug logging
                console.log('Form data:', formData);
                console.log('User ID:', this.currentUser?.id);
                
                // Show loading state
                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalText = submitBtn?.textContent || 'Opslaan';
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = 'Bezig met opslaan...';
                }
                
                try {
                    console.log('Roep OrdersModule.create aan...');
                    const order = await OrdersModule.create(formData, this.currentUser?.id);
                    console.log('Order resultaat:', order);
                    
                    if (order) {
                        UI.showToast('✅ Order succesvol aangemaakt!', 'success');
                        UI.closeBottomSheet();
                        console.log('currentUser na create:', this.currentUser);
                        console.log('Herlaad orders...');
                        await OrdersModule.load();
                        console.log('currentUser na load:', this.currentUser);
                        console.log('Render pagina...');
                        this.renderCurrentPage();
                        console.log('=== KLAAR ===');
                    } else {
                        console.error('Order is null/undefined');
                        UI.showToast('❌ Order kon niet worden aangemaakt', 'error', 5000);
                    }
                } catch (error) {
                    console.error('=== FOUT ===');
                    console.error('Error:', error);
                    console.error('Error message:', error?.message);
                    console.error('currentUser bij error:', this.currentUser);
                    
                    const errorMsg = window.lastRepositoryError?.message || error?.message || 'Onbekende fout';
                    UI.showToast('❌ ' + errorMsg, 'error', 5000);
                } finally {
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
                    }
                } catch (error) {
                    console.error('=== FOUT BIJ AANMAKEN ORDER ===');
                    console.error('Error object:', error);
                    console.error('Error message:', error?.message);
                    console.error('Error stack:', error?.stack);
                    console.error('window.lastRepositoryError:', window.lastRepositoryError);
                    
                    const errorMsg = window.lastRepositoryError?.message || error?.message || 'Onbekende fout bij aanmaken order';
                    UI.showToast('❌ ' + errorMsg, 'error', 5000);
                } finally {
                    // Restore button state
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = originalText;
                    }
                }
            });
        }, 100);
    },

    // Advance order to next fase
    async advanceOrder(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const nextFase = getNextFase(order.huidige_fase, order.collectie);
        if (nextFase === null) {
            UI.showToast('Order is al afgerond', 'info');
            return;
        }

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
            console.error('Advance order error:', error);
            const errorMsg = window.lastRepositoryError?.message || error.message || 'Fout bij bijwerken';
            UI.showToast(errorMsg, 'error', 5000);
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
    },

    // Show delayed orders
    showDelayedOrders() {
        const today = new Date();
        const delayed = OrdersModule.orders.filter(o => {
            if (!o.deadline || o.huidige_fase >= 12 || o.status === 'deleted') return false;
            return new Date(o.deadline) < today;
        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));

        OrdersModule.filteredOrders = delayed;
        this.navigate('orders');
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.placeholder = `Vertraagd: ${delayed.length} orders`;
        }, 100);
    },

    // Show bronsgieterij orders
    showBronsgieterijOrders() {
        const bronsOrders = OrdersModule.orders.filter(o => 
            (o.huidige_fase === 13 || o.huidige_fase === 14 || o.huidige_fase === 15 || o.huidige_fase === 16) && 
            o.status !== 'deleted'
        );

        OrdersModule.filteredOrders = bronsOrders;
        this.navigate('orders');
        setTimeout(() => {
            const searchInput = document.getElementById('searchInput');
            if (searchInput) searchInput.placeholder = `Bronsgieterij: ${bronsOrders.length} orders`;
        }, 100);
    },

    // Show customer passport
    showCustomerPassport(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const faseConfig = FASES_CONFIG[order.huidige_fase] || FASES_CONFIG[0];
        const phone = order.klant_telefoon ? order.klant_telefoon.replace(/\D/g, '') : '';
        const whatsappLink = phone ? `https://wa.me/31${phone.replace(/^0/, '')}` : null;

        UI.showBottomSheet({
            title: 'Klant Paspoort',
            content: `
                <div class="space-y-4">
                    <!-- Klant Info Card -->
                    <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                        <div class="flex items-center gap-4 mb-4">
                            <div class="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl font-bold">
                                ${order.klant_naam.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h3 class="font-bold text-lg text-gray-900">${Utils.escapeHtml(order.klant_naam)}</h3>
                                <p class="text-sm text-gray-500">${Utils.escapeHtml(order.order_id)}</p>
                            </div>
                        </div>
                        
                        <div class="space-y-2 text-sm">
                            ${order.klant_email ? `
                                <div class="flex items-center gap-2">
                                    <i data-lucide="mail" class="w-4 h-4 text-gray-400"></i>
                                    <a href="mailto:${order.klant_email}" class="text-amber-600">${Utils.escapeHtml(order.klant_email)}</a>
                                </div>
                            ` : ''}
                            ${order.klant_telefoon ? `
                                <div class="flex items-center gap-2">
                                    <i data-lucide="phone" class="w-4 h-4 text-gray-400"></i>
                                    <span>${Utils.escapeHtml(order.klant_telefoon)}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- Adres -->
                    ${order.straat ? `
                        <div class="bg-gray-50 rounded-xl p-4">
                            <h4 class="font-semibold text-sm text-gray-700 mb-2">Adres</h4>
                            <p class="text-sm">${Utils.escapeHtml(order.straat)} ${Utils.escapeHtml(order.huisnummer || '')}</p>
                            <p class="text-sm">${Utils.escapeHtml(order.postcode || '')} ${Utils.escapeHtml(order.plaats || '')}</p>
                        </div>
                    ` : ''}

                    <!-- Order Details -->
                    <div class="bg-gray-50 rounded-xl p-4">
                        <h4 class="font-semibold text-sm text-gray-700 mb-3">Order Details</h4>
                        <div class="grid grid-cols-2 gap-3 text-sm">
                            <div>
                                <span class="text-gray-500">Collectie</span>
                                <p class="font-medium">${Utils.escapeHtml(order.collectie)}</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Hoogte</span>
                                <p class="font-medium">${order.hoogte_cm}cm</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Sokkel</span>
                                <p class="font-medium">${order.sokkel || 'Zonder'}</p>
                            </div>
                            <div>
                                <span class="text-gray-500">Kleur</span>
                                <p class="font-medium">${order.kleur_afwerking || 'Standaard'}</p>
                            </div>
                        </div>
                    </div>

                    <!-- Status -->
                    <div class="${faseConfig.color} bg-opacity-10 rounded-xl p-4 border-l-4 ${faseConfig.color.replace('bg-', 'border-')}">
                        <span class="text-xs text-gray-500 uppercase tracking-wide">Huidige Status</span>
                        <p class="font-semibold ${faseConfig.text} text-lg mt-1">${I18n.getFaseName(order.huidige_fase)}</p>
                        ${order.deadline ? `<p class="text-xs text-gray-500 mt-1">Deadline: ${Utils.formatDate(order.deadline)}</p>` : ''}
                    </div>

                    <!-- WhatsApp Button -->
                    ${whatsappLink ? `
                        <a href="${whatsappLink}" target="_blank" class="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                            WhatsApp Bericht Sturen
                        </a>
                    ` : '<p class="text-center text-gray-400 text-sm">Geen telefoonnummer beschikbaar voor WhatsApp</p>'}

                    <!-- Acties -->
                    <div class="grid grid-cols-2 gap-3">
                        <button onclick="App.showOrderDetail('${orderId}')" class="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">
                            Order Details
                        </button>
                        <button onclick="App.editOrder('${orderId}')" class="py-3 bg-amber-100 text-amber-700 rounded-xl font-medium">
                            Bewerken
                        </button>
                    </div>
                </div>
            `
        });
    },

    // Show AI Assistant
    showAIAssistant() {
        const messages = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
        
        UI.showBottomSheet({
            title: '🤖 AI Assistent',
            content: `
                <div class="flex flex-col h-[60vh]">
                    <!-- Chat Messages -->
                    <div id="aiChatMessages" class="flex-1 overflow-y-auto space-y-3 mb-4 p-2">
                        ${messages.length === 0 ? `
                            <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                                <p class="font-medium mb-2">Hallo! Ik ben je Babycrafts AI assistent.</p>
                                <p>Je kunt me vragen stellen zoals:</p>
                                <ul class="mt-2 space-y-1 text-gray-500">
                                    <li>• "Welke beeldjes moeten vandaag af?"</li>
                                    <li>• "Welke orders zijn vertraagd?"</li>
                                    <li>• "Wat is de status van [klantnaam]?"</li>
                                    <li>• "Wat moet ik vandaag doen?"</li>
                                </ul>
                            </div>
                        ` : messages.map(m => `
                            <div class="${m.role === 'user' ? 'ml-8' : 'mr-8'}">
                                <div class="${m.role === 'user' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-800'} rounded-2xl px-4 py-3 text-sm whitespace-pre-line">
                                    ${Utils.escapeHtml(m.content)}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    
                    <!-- Input -->
                    <div class="flex gap-2">
                        <input type="text" id="aiQuestion" placeholder="Stel een vraag..." 
                               class="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                               onkeypress="if(event.key==='Enter')App.askAI()">
                        <button onclick="App.askAI()" class="px-4 py-3 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors">
                            <i data-lucide="send" class="w-5 h-5"></i>
                        </button>
                    </div>
                </div>
            `
        });
        
        // Scroll to bottom
        setTimeout(() => {
            const container = document.getElementById('aiChatMessages');
            if (container) container.scrollTop = container.scrollHeight;
        }, 100);
    },

    // Ask AI
    askAI() {
        const input = document.getElementById('aiQuestion');
        const question = input?.value.trim();
        if (!question) return;
        
        // Update AI context
        AIAgent.updateContext(OrdersModule.orders, TodosModule.todos);
        
        // Get response
        const response = AIAgent.ask(question);
        
        // Save to history
        const messages = JSON.parse(localStorage.getItem('ai_chat_history') || '[]');
        messages.push({ role: 'user', content: question, time: Date.now() });
        messages.push({ role: 'assistant', content: response, time: Date.now() });
        if (messages.length > 20) messages.splice(0, messages.length - 20);
        localStorage.setItem('ai_chat_history', JSON.stringify(messages));
        
        // Clear input
        input.value = '';
        
        // Append new messages to chat instead of re-rendering
        const container = document.getElementById('aiChatMessages');
        if (container) {
            // Remove empty state if present
            const emptyState = container.querySelector('.bg-gray-50');
            if (emptyState) emptyState.remove();
            
            // Add user message
            const userDiv = document.createElement('div');
            userDiv.className = 'ml-8';
            userDiv.innerHTML = `<div class="bg-amber-500 text-white rounded-2xl px-4 py-3 text-sm whitespace-pre-line">${Utils.escapeHtml(question)}</div>`;
            container.appendChild(userDiv);
            
            // Add assistant message
            const assistantDiv = document.createElement('div');
            assistantDiv.className = 'mr-8';
            assistantDiv.innerHTML = `<div class="bg-gray-100 text-gray-800 rounded-2xl px-4 py-3 text-sm whitespace-pre-line">${Utils.escapeHtml(response)}</div>`;
            container.appendChild(assistantDiv);
            
            // Scroll to bottom
            container.scrollTop = container.scrollHeight;
        } else {
            // Fallback: re-render if container not found
            this.showAIAssistant();
        }
    },

    // Edit order
    editOrder(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const collecties = ['Figura', 'Arte-Lumina', 'Natura-Alba', 'Ouder \u0026 Kind', 'Babybeeld', 'Atelier-Bronze', 'Gegoten Brons', 'Aangepast'];
        
        UI.showBottomSheet({
            title: `Bewerk ${orderId}`,
            content: `
                <form id="editOrderForm" class="space-y-4 max-h-[60vh] overflow-y-auto p-1">
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Klantgegevens</h4>
                        <input type="text" name="klant_naam" value="${Utils.escapeHtml(order.klant_naam || '')}" placeholder="Naam klant" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <input type="email" name="klant_email" value="${Utils.escapeHtml(order.klant_email || '')}" placeholder="Email" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <input type="tel" name="klant_telefoon" value="${Utils.escapeHtml(order.klant_telefoon || '')}" placeholder="Telefoonnummer" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Adres</h4>
                        <div class="grid grid-cols-3 gap-2">
                            <input type="text" name="straat" value="${Utils.escapeHtml(order.straat || '')}" placeholder="Straat" class="col-span-2 w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <input type="text" name="huisnummer" value="${Utils.escapeHtml(order.huisnummer || '')}" placeholder="Nr" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <input type="text" name="postcode" value="${Utils.escapeHtml(order.postcode || '')}" placeholder="Postcode" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <input type="text" name="plaats" value="${Utils.escapeHtml(order.plaats || '')}" placeholder="Plaats" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Product Details</h4>
                        <select name="collectie" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            ${collecties.map(c => `<option value="${c}" ${order.collectie === c ? 'selected' : ''}>${c}</option>`).join('')}
                        </select>
                        <div class="grid grid-cols-2 gap-2">
                            <input type="number" name="hoogte_cm" value="${order.hoogte_cm || 20}" placeholder="Hoogte cm" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <input type="text" name="kleur_afwerking" value="${Utils.escapeHtml(order.kleur_afwerking || '')}" placeholder="Kleur afwerking" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        </div>
                        <select name="sokkel" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                            <option value="Met" ${order.sokkel === 'Met' ? 'selected' : ''}>Met sokkel</option>
                            <option value="Zonder" ${order.sokkel === 'Zonder' ? 'selected' : ''}>Zonder sokkel</option>
                        </select>
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Overige</h4>
                        <input type="date" name="deadline" value="${order.deadline || ''}" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">
                        <textarea name="extra_notities" placeholder="Extra notities" rows="3" class="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500">${Utils.escapeHtml(order.extra_notities || '')}</textarea>
                    </div>
                    
                    <button type="submit" class="w-full py-3 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors">
                        Wijzigingen Opslaan
                    </button>
                </form>
            `
        });
        
        // Add submit handler
        setTimeout(() => {
            document.getElementById('editOrderForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const formData = Object.fromEntries(new FormData(e.target));
                
                // Convert hoogte_cm to number
                formData.hoogte_cm = parseInt(formData.hoogte_cm) || 20;
                
                try {
                    await OrdersModule.update(orderId, formData, this.currentUser?.id);
                    UI.closeBottomSheet();
                    UI.showToast('Order bijgewerkt', 'success');
                    this.renderCurrentPage();
                } catch (error) {
                    console.error('Update error:', error);
                    const errorMsg = window.lastRepositoryError?.message || error.message || 'Fout bij bijwerken order';
                    UI.showToast(errorMsg, 'error', 5000);
                }
            });
        }, 100);
    },

    // Show production schema (timeline)
    showProductionSchema(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const workflow = getWorkflowForCollectie(order.collectie);
        const workflowConfig = WORKFLOWS[workflow];
        const fases = workflowConfig.fases;
        const currentIndex = fases.indexOf(order.huidige_fase);
        
        // Build timeline HTML
        let timelineHtml = '';
        fases.forEach((faseNum, index) => {
            const faseConfig = FASES_CONFIG[faseNum];
            const isCompleted = index < currentIndex;
            const isCurrent = index === currentIndex;
            const isFuture = index > currentIndex;
            
            let statusIcon = '';
            let statusClass = '';
            
            if (isCompleted) {
                statusIcon = '✓';
                statusClass = 'bg-green-500 text-white';
            } else if (isCurrent) {
                statusIcon = '●';
                statusClass = `${faseConfig.color} text-white ring-4 ring-opacity-30 ${faseConfig.color}`;
            } else {
                statusIcon = '○';
                statusClass = 'bg-gray-200 text-gray-400';
            }
            
            timelineHtml += `
                <div class="flex items-start gap-4 ${isFuture ? 'opacity-50' : ''}">
                    <div class="flex flex-col items-center">
                        <div class="w-10 h-10 rounded-full ${statusClass} flex items-center justify-center font-bold text-sm shadow-sm">
                            ${statusIcon}
                        </div>
                        ${index < fases.length - 1 ? `<div class="w-0.5 h-12 bg-gray-200 mt-1"></div>` : ''}
                    </div>
                    <div class="flex-1 pb-8">
                        <p class="font-medium ${isCurrent ? faseConfig.text : 'text-gray-700'}">${faseConfig.name}</p>
                        ${faseConfig.duration ? `<p class="text-xs text-gray-500">${faseConfig.duration}</p>` : ''}
                        ${isCurrent ? `<p class="text-xs font-medium ${faseConfig.text} mt-1">← Huidige fase</p>` : ''}
                    </div>
                </div>
            `;
        });

        UI.showBottomSheet({
            title: '📋 Productieschema',
            content: `
                <div class="space-y-4">
                    <div class="bg-primary-50 rounded-xl p-4">
                        <p class="font-medium text-primary-800">${Utils.escapeHtml(order.klant_naam)}</p>
                        <p class="text-sm text-primary-600">${order.order_id} • ${order.collectie}</p>
                        <p class="text-xs text-primary-500 mt-1">Workflow: ${workflowConfig.name}</p>
                    </div>
                    
                    <div class="pl-2">
                        ${timelineHtml}
                    </div>
                    
                    <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                        <p class="font-medium mb-1">Duur: ${workflowConfig.duration}</p>
                        <p>Fase ${currentIndex + 1} van ${fases.length}</p>
                    </div>
                </div>
            `
        });
    }
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    App.initialize();
});
