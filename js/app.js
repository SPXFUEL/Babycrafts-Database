/**
 * APP - Babycrafts Atelier Pro
 * Complete rewrite — clean, simple, working.
 */

const App = {
    currentUser: null,
    currentPage: 'dashboard',
    supabase: null,
    currentPin: '',
    keypadReady: false,

    PIN_CODES: {
        '2911': { name: 'Eigenaar',   role: 'admin' },
        '0805': { name: 'Medewerker', role: 'staff' },
    },

    // ─── BOOT ────────────────────────────────────────────────────────────────

    async initialize() {
        // Online status
        window.addEventListener('online',  () => this._setOnline(true));
        window.addEventListener('offline', () => this._setOnline(false));
        this._setOnline(navigator.onLine);

        // Supabase
        const { createClient } = supabase;
        this.supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
        Repository.initialize(this.supabase);

        // Audit
        if (typeof Audit !== 'undefined') Audit.initialize();

        // Check saved session first — show the right screen immediately
        const saved = localStorage.getItem('babycrafts_session');
        if (saved) {
            try {
                this.currentUser = JSON.parse(saved);
                this._showMain();
                await this._loadData();
                return;
            } catch (_) {
                localStorage.removeItem('babycrafts_session');
            }
        }
        this._showLogin();
    },

    _setOnline(online) {
        const el = document.getElementById('offlineIndicator');
        if (!el) return;
        el.classList.toggle('show', !online);
    },

    // ─── DATA ────────────────────────────────────────────────────────────────

    async _loadData() {
        const results = await Promise.allSettled([
            OrdersModule.initialize(),
            TodosModule.initialize(),
            typeof TimeModule !== 'undefined' ? TimeModule.initialize() : Promise.resolve(),
        ]);
        // Log any failures silently — don't crash the app
        results.forEach((r, i) => {
            if (r.status === 'rejected') {
                const names = ['Orders', 'Todos', 'Time'];
                console.warn(`${names[i]} module failed to load:`, r.reason?.message);
            }
        });
        this.renderCurrentPage();
    },

    // ─── AUTH ────────────────────────────────────────────────────────────────

    _showLogin() {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        this.currentPin = '';
        this._updatePinDots();
        this._hidePinError();
        this._setupKeypad();
    },

    _showMain() {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        // Update menu user info
        const name = this.currentUser?.user_metadata?.name || 'Gebruiker';
        const role = this.currentUser?.user_metadata?.role === 'admin' ? 'Eigenaar' : 'Medewerker';
        const el = document.getElementById('menuUserName');
        const re = document.getElementById('menuUserRole');
        if (el) el.textContent = name;
        if (re) re.textContent = role;
        this._setupGlobalListeners();
        this.renderCurrentPage();
    },

    _setupKeypad() {
        if (this.keypadReady) {
            // Reset dots and re-show
            this._updatePinDots();
            return;
        }

        // Bind digit keys
        document.querySelectorAll('.pin-key').forEach(key => {
            const fresh = key.cloneNode(true);
            key.parentNode.replaceChild(fresh, key);
            const handler = (e) => {
                e.preventDefault();
                if (fresh.dataset.key) this._pinDigit(fresh.dataset.key);
            };
            fresh.addEventListener('click', handler);
            fresh.addEventListener('touchstart', handler, { passive: false });
        });

        // Bind backspace
        const bs = document.getElementById('pinBackspace');
        if (bs) {
            const fresh = bs.cloneNode(true);
            bs.parentNode.replaceChild(fresh, bs);
            const handler = (e) => { e.preventDefault(); this._pinBackspace(); };
            fresh.addEventListener('click', handler);
            fresh.addEventListener('touchstart', handler, { passive: false });
        }

        // Keyboard support
        document.addEventListener('keydown', (e) => {
            if (document.getElementById('loginScreen').classList.contains('hidden')) return;
            if (e.key >= '0' && e.key <= '9') { e.preventDefault(); this._pinDigit(e.key); }
            else if (e.key === 'Backspace') { e.preventDefault(); this._pinBackspace(); }
        });

        if (typeof lucide !== 'undefined') lucide.createIcons();
        this.keypadReady = true;
    },

    _pinDigit(d) {
        if (this.currentPin.length >= 4) return;
        this.currentPin += d;
        this._updatePinDots();
        if (this.currentPin.length === 4) setTimeout(() => this._verifyPin(), 200);
    },

    _pinBackspace() {
        this.currentPin = this.currentPin.slice(0, -1);
        this._updatePinDots();
        this._hidePinError();
    },

    _updatePinDots() {
        document.querySelectorAll('.pin-dot').forEach((dot, i) => {
            const filled = i < this.currentPin.length;
            dot.textContent = filled ? '•' : '';
            dot.classList.toggle('filled', filled);
        });
    },

    _showPinError() {
        const el = document.getElementById('pinError');
        if (el) el.classList.remove('hidden');
        document.querySelectorAll('.pin-dot').forEach(d => {
            d.style.borderColor = '#ef4444';
            d.animate([
                { transform: 'translateX(0)' },
                { transform: 'translateX(-6px)' },
                { transform: 'translateX(6px)' },
                { transform: 'translateX(0)' },
            ], { duration: 300 });
        });
        setTimeout(() => document.querySelectorAll('.pin-dot').forEach(d => d.style.borderColor = ''), 1000);
    },

    _hidePinError() {
        document.getElementById('pinError')?.classList.add('hidden');
    },

    async _verifyPin() {
        const user = this.PIN_CODES[this.currentPin];
        if (user) {
            this.currentUser = {
                id: `local_${user.role}_${this.currentPin}`,
                email: `${user.role}@babycrafts.local`,
                user_metadata: { name: user.name, role: user.role },
            };
            localStorage.setItem('babycrafts_session', JSON.stringify(this.currentUser));

            // Green flash
            document.querySelectorAll('.pin-dot').forEach(d => {
                d.style.background = '#10b981';
                d.style.borderColor = '#10b981';
            });

            setTimeout(async () => {
                this._showMain();
                await this._loadData();
                UI.showToast(`Welkom ${user.name}`, 'success');
            }, 300);
        } else {
            this._showPinError();
            this.currentPin = '';
            setTimeout(() => this._updatePinDots(), 500);
        }
    },

    logout() {
        localStorage.removeItem('babycrafts_session');
        this.currentUser = null;
        this.keypadReady = false;
        this._showLogin();
        UI.showToast('Uitgelogd', 'info');
    },

    // ─── GLOBAL LISTENERS ────────────────────────────────────────────────────

    _listenersReady: false,
    _setupGlobalListeners() {
        if (this._listenersReady) return;
        this._listenersReady = true;

        // Hamburger menu
        document.getElementById('menuBtn')?.addEventListener('click', () => this.toggleMenu());

        // Menu overlay close
        document.getElementById('menuOverlay')?.addEventListener('click', () => this.toggleMenu());

        // Search
        const search = document.getElementById('searchInput');
        if (search) {
            let timer;
            search.addEventListener('input', (e) => {
                clearTimeout(timer);
                timer = setTimeout(() => this._handleSearch(e.target.value), 300);
            });
        }

        // New order form wiring (static sheet in HTML)
        const form = document.getElementById('newOrderForm');
        if (form) {
            // Scan date → deadline
            const scanInput = document.getElementById('scanDatumInputHtml');
            if (scanInput) {
                scanInput.addEventListener('change', (e) => {
                    if (e.target.value) {
                        const d = new Date(e.target.value);
                        d.setDate(d.getDate() + 42);
                        e.target.dataset.deadline = d.toISOString().split('T')[0];
                    }
                });
            }

            // Submit
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this._handleOrderSubmit(form);
            });
        }
    },

    // ─── NAVIGATION ──────────────────────────────────────────────────────────

    navigate(page) {
        this.currentPage = page;
        const titles = {
            dashboard: 'Dashboard', orders: 'Orders', archief: 'Archief',
            nazorg: 'Nazorg', todos: 'Taken', time: 'Tijdregistratie',
            settings: 'Instellingen', schema: 'Productie Schema', analytics: 'Analytics',
        };
        const el = document.getElementById('pageTitle');
        if (el) el.textContent = titles[page] || 'Babycrafts';

        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('text-primary-600', btn.dataset.page === page);
            btn.classList.toggle('text-gray-400', btn.dataset.page !== page);
        });

        document.getElementById('searchBar')?.classList.toggle('hidden', page !== 'orders');

        // Close side menu
        document.getElementById('sideMenu')?.classList.remove('open');
        document.getElementById('menuOverlay')?.classList.remove('visible');

        this.renderCurrentPage();
    },

    renderCurrentPage() {
        const content = document.getElementById('mainContent');
        if (!content) return;
        switch (this.currentPage) {
            case 'dashboard':  this._renderDashboard(content); break;
            case 'orders':     this._renderOrders(content); break;
            case 'archief':    this._renderArchief(content); break;
            case 'nazorg':     this._renderNazorg(content); break;
            case 'todos':      this._renderTodos(content); break;
            case 'time':       this._renderTime(content); break;
            case 'settings':   this._renderSettings(content); break;
            case 'schema':     this._renderSchema(content); break;
            case 'analytics':  this._renderAnalytics(content); break;
            default:           this._renderDashboard(content);
        }
        if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [content] });
    },

    toggleMenu() {
        document.getElementById('sideMenu')?.classList.toggle('open');
        document.getElementById('menuOverlay')?.classList.toggle('visible');
    },

    // ─── SEARCH / FILTER ─────────────────────────────────────────────────────

    _handleSearch(q) {
        const term = q.toLowerCase().trim();
        if (!term) {
            OrdersModule.filteredOrders = OrdersModule.getAll();
        } else {
            OrdersModule.filteredOrders = OrdersModule.getAll().filter(o =>
                o.klant_naam?.toLowerCase().includes(term) ||
                o.order_id?.toLowerCase().includes(term) ||
                o.klant_email?.toLowerCase().includes(term) ||
                o.collectie?.toLowerCase().includes(term)
            );
        }
        this.renderCurrentPage();
    },

    filterOrders(filter) {
        document.querySelectorAll('.filter-tab').forEach(t =>
            t.classList.toggle('active', t.dataset.fase === filter)
        );
        const all = OrdersModule.getAll();
        switch (filter) {
            case 'active': OrdersModule.filteredOrders = all.filter(o => o.huidige_fase < 12); break;
            case 'brons':  OrdersModule.filteredOrders = all.filter(o => [13,14,15,16].includes(o.huidige_fase)); break;
            default:       OrdersModule.filteredOrders = all;
        }
        this.renderCurrentPage();
    },

    // ─── NEW ORDER FORM ───────────────────────────────────────────────────────

    showNewOrderForm() {
        // Reset the static HTML form (index.html → #newOrderSheet → #newOrderForm)
        document.getElementById('newOrderForm')?.reset();
        // Hide sokkel details field on reset
        const sokkelWrap = document.getElementById('sokkelDetailsWrap');
        if (sokkelWrap) sokkelWrap.style.display = 'none';
        // Clear any previously stored deadline
        const scanInput = document.getElementById('scanDatumInputHtml');
        if (scanInput) delete scanInput.dataset.deadline;
        // Open the sheet
        document.getElementById('newOrderSheet')?.classList.add('active');
    },

    closeNewOrder() {
        document.getElementById('newOrderSheet')?.classList.remove('active');
    },

    async _handleOrderSubmit(form) {
        const submitBtn = form.querySelector('button[type="submit"]');
        const origText  = submitBtn?.textContent || 'Order Aanmaken';

        if (!this.currentUser) {
            UI.showToast('Niet ingelogd. Log opnieuw in.', 'error');
            this._showLogin();
            return;
        }

        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Bezig...'; }

        try {
            const fd = Object.fromEntries(new FormData(form));

            // Apply deadline from scan date if set
            const scanInput = document.getElementById('scanDatumInputHtml');
            if (scanInput?.dataset.deadline) fd.deadline = scanInput.dataset.deadline;
            else if (fd.scan_datum) {
                const d = new Date(fd.scan_datum);
                d.setDate(d.getDate() + 42);
                fd.deadline = d.toISOString().split('T')[0];
            }

            const order = await OrdersModule.create(fd, this.currentUser.id);
            if (order) {
                UI.showToast('Order aangemaakt!', 'success');
                this.closeNewOrder();
                this.renderCurrentPage();
            } else {
                UI.showToast('Order kon niet worden aangemaakt.', 'error');
            }
        } catch (err) {
            UI.showToast(err.message || 'Fout bij opslaan.', 'error', 5000);
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = origText; }
        }
    },

    // ─── ORDER ACTIONS ────────────────────────────────────────────────────────

    async advanceOrder(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;
        const next = getNextFase(order.huidige_fase, order.collectie);
        if (next === null) { UI.showToast('Order is al afgerond', 'info'); return; }

        try {
            await OrdersModule.updateFase(orderId, next);
            if (next === 1) CommunicationsModule.showChoiceModal(order, 'welcome');
            else if (next === 10) CommunicationsModule.showChoiceModal(order, 'shipping');
            else if (next === 11) CommunicationsModule.showChoiceModal(order, 'nazorg');
            UI.closeBottomSheet();
            UI.showToast('Fase bijgewerkt', 'success');
            this.renderCurrentPage();
        } catch (err) {
            UI.showToast(err.message || 'Fout bij bijwerken.', 'error');
        }
    },

    deleteOrder(orderId) {
        UI.showConfirm({
            title: 'Order verwijderen?',
            message: 'Deze actie kan niet ongedaan worden gemaakt.',
            confirmText: 'Verwijderen',
            cancelText: 'Annuleren',
            type: 'danger',
            onConfirm: async () => {
                try {
                    await OrdersModule.delete(orderId);
                    UI.closeBottomSheet();
                    UI.showToast('Order verwijderd', 'success');
                    this.renderCurrentPage();
                } catch (err) {
                    UI.showToast(err.message || 'Fout bij verwijderen.', 'error');
                }
            },
        });
    },

    editOrder(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;
        const collecties = ['Figura','Arte-Lumina','Natura-Alba','Ouder & Kind','Babybeeld','Atelier-Bronze','Gegoten Brons','Aangepast'];

        UI.showBottomSheet({
            title: `Bewerk ${orderId}`,
            content: `
                <form id="editForm" class="space-y-4 overflow-y-auto max-h-[65vh] p-1">
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Klantgegevens</h4>
                        <input name="klant_naam"     value="${Utils.escapeHtml(order.klant_naam||'')}"     placeholder="Naam"        class="form-input">
                        <input name="klant_email"    value="${Utils.escapeHtml(order.klant_email||'')}"    placeholder="Email"       class="form-input" type="email">
                        <input name="klant_telefoon" value="${Utils.escapeHtml(order.klant_telefoon||'')}" placeholder="Telefoon"    class="form-input" type="tel">
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Adres</h4>
                        <div class="grid grid-cols-3 gap-2">
                            <input name="straat"     value="${Utils.escapeHtml(order.straat||'')}"     placeholder="Straat"  class="form-input col-span-2">
                            <input name="huisnummer" value="${Utils.escapeHtml(order.huisnummer||'')}" placeholder="Nr"      class="form-input">
                        </div>
                        <div class="grid grid-cols-2 gap-2">
                            <input name="postcode" value="${Utils.escapeHtml(order.postcode||'')}" placeholder="Postcode" class="form-input">
                            <input name="plaats"   value="${Utils.escapeHtml(order.plaats||'')}"   placeholder="Plaats"   class="form-input">
                        </div>
                    </div>
                    <div class="bg-gray-50 rounded-xl p-4 space-y-3">
                        <h4 class="font-medium text-gray-700">Product</h4>
                        <select name="collectie" class="form-select">
                            ${collecties.map(c => `<option value="${c}" ${order.collectie===c?'selected':''}>${c}</option>`).join('')}
                        </select>
                        <div class="grid grid-cols-2 gap-2">
                            <input name="hoogte_cm"      value="${order.hoogte_cm||20}"              placeholder="Hoogte cm"  class="form-input" type="number">
                            <input name="kleur_afwerking" value="${Utils.escapeHtml(order.kleur_afwerking||'')}" placeholder="Kleur"     class="form-input">
                        </div>
                        <select name="sokkel" class="form-select" onchange="this.nextElementSibling.style.display=this.value&&this.value!=='Zonder'?'block':'none'">
                            <option value="Zonder"    ${order.sokkel==='Zonder'?'selected':''}>Zonder sokkel</option>
                            <option value="Met"       ${order.sokkel==='Met'?'selected':''}>Met sokkel</option>
                            <option value="Met én Vast" ${order.sokkel==='Met én Vast'?'selected':''}>Met én Vast</option>
                        </select>
                        <input name="sokkel_details" value="${Utils.escapeHtml(order.sokkel_details||'')}" placeholder="Omschrijving sokkel" class="form-input" style="display:${order.sokkel&&order.sokkel!=='Zonder'?'block':'none'}">
                        <input name="deadline" value="${order.deadline||''}" type="date" class="form-input">
                        <textarea name="extra_notities" placeholder="Notities" rows="3" class="form-input">${Utils.escapeHtml(order.extra_notities||'')}</textarea>
                    </div>
                    <button type="submit" class="w-full py-3 bg-green-500 text-white rounded-xl font-semibold">Opslaan</button>
                </form>`,
        });

        setTimeout(() => {
            document.getElementById('editForm')?.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = e.target.querySelector('button[type="submit"]');
                const orig = btn?.textContent;
                if (btn) { btn.disabled = true; btn.textContent = 'Bezig...'; }
                try {
                    const fd = Object.fromEntries(new FormData(e.target));
                    await OrdersModule.update(orderId, fd);
                    UI.closeBottomSheet();
                    UI.showToast('Order bijgewerkt', 'success');
                    this.renderCurrentPage();
                } catch (err) {
                    UI.showToast(err.message || 'Fout bij bijwerken.', 'error');
                } finally {
                    if (btn) { btn.disabled = false; btn.textContent = orig; }
                }
            });
        }, 100);
    },

    showPostNL(orderId) {
        const order = OrdersModule.getById(orderId);
        if (order) CommunicationsModule.showPostNLHelper(order);
    },

    // ─── TODO ACTIONS ─────────────────────────────────────────────────────────

    async toggleTodo(id) {
        try {
            await TodosModule.toggle(id);
            this.renderCurrentPage();
        } catch (err) {
            UI.showToast(err.message || 'Fout', 'error');
        }
    },

    async deleteTodo(id) {
        try {
            await TodosModule.delete(id);
            this.renderCurrentPage();
        } catch (err) {
            UI.showToast(err.message || 'Fout', 'error');
        }
    },

    // ─── NAZORG ───────────────────────────────────────────────────────────────

    sendNazorgMessage(orderId) {
        const order = OrdersModule.getById(orderId);
        if (order) CommunicationsModule.showChoiceModal(order, 'nazorg', () => this.completeNazorg(orderId));
    },

    async completeNazorg(orderId) {
        try {
            await OrdersModule.updateFase(orderId, 12);
            UI.showToast('Nazorg afgerond', 'success');
            this.renderCurrentPage();
        } catch (err) {
            UI.showToast(err.message || 'Fout', 'error');
        }
    },

    // ─── QUICK FILTERS ────────────────────────────────────────────────────────

    showDelayedOrders() {
        const today = new Date(); today.setHours(0,0,0,0);
        OrdersModule.filteredOrders = OrdersModule.getAll()
            .filter(o => o.deadline && o.huidige_fase < 12 && new Date(o.deadline) < today)
            .sort((a,b) => new Date(a.deadline) - new Date(b.deadline));
        this.navigate('orders');
    },

    showBronsgieterijOrders() {
        OrdersModule.filteredOrders = OrdersModule.getAll()
            .filter(o => [13,14,15,16].includes(o.huidige_fase));
        this.navigate('orders');
    },

    confirmDeleteAllArchived() {
        const archived = OrdersModule.getCompleted();
        UI.showConfirm({
            title: 'Alle gearchiveerde orders verwijderen?',
            message: `Dit verwijdert ${archived.length} afgeronde order(s).`,
            confirmText: 'Alles verwijderen',
            cancelText: 'Annuleren',
            type: 'danger',
            onConfirm: async () => {
                for (const o of archived) await OrdersModule.delete(o.order_id);
                UI.showToast(`${archived.length} orders verwijderd`, 'success');
                this.renderCurrentPage();
            },
        });
    },

    closeDetail() {
        document.getElementById('detailSheet')?.classList.remove('active');
    },

    closeConfirmModal() {
        const m = document.getElementById('confirmModal');
        if (m) { m.classList.add('hidden'); m.classList.remove('flex'); }
    },

    // ─── HELPERS ──────────────────────────────────────────────────────────────

    _orderCard(order) {
        const fc = FASES_CONFIG[order.huidige_fase] || FASES_CONFIG[0];
        const ds = Utils.getDeadlineStatus(order);
        const wf = WORKFLOWS[getWorkflowForCollectie(order.collectie)];
        const fases = wf?.fases || [0];
        const ci = fases.indexOf(order.huidige_fase);
        const pct = fases.length > 1 ? Math.round(ci / (fases.length - 1) * 100) : 0;
        let bar = 'bg-blue-500';
        if (pct >= 80) bar = 'bg-green-500';
        else if (ds?.class?.includes('red')) bar = 'bg-red-500';
        else if (ds?.class?.includes('orange')) bar = 'bg-orange-500';

        return `
        <div class="order-card" onclick="App.showOrderDetail('${order.order_id}')">
            <div class="order-card-header">
                <div class="flex items-center gap-3 min-w-0 flex-1">
                    <div class="w-10 h-10 rounded-xl ${fc.color} flex items-center justify-center flex-shrink-0">
                        <span class="text-sm font-bold text-white">${order.huidige_fase}</span>
                    </div>
                    <div class="min-w-0">
                        <p class="font-semibold text-gray-900 truncate">${Utils.escapeHtml(order.klant_naam)}</p>
                        <p class="text-xs text-gray-500">${Utils.escapeHtml(order.order_id)} · ${Utils.escapeHtml(order.collectie)}</p>
                    </div>
                </div>
                <span class="text-xs px-2 py-1 rounded-lg bg-gray-100 text-gray-600 whitespace-nowrap flex-shrink-0 ml-2">${I18n.getFaseName(order.huidige_fase)}</span>
            </div>
            <div class="mt-3">
                <div class="flex items-center justify-between mb-1">
                    <span class="text-xs text-gray-400">Voortgang</span>
                    <span class="text-xs font-medium text-gray-600">${ci + 1}/${fases.length}</span>
                </div>
                <div class="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div class="h-full ${bar} rounded-full" style="width:${pct}%"></div>
                </div>
            </div>
            ${ds ? `<div class="mt-2 flex items-center gap-1.5 text-xs ${ds.class}"><i data-lucide="clock" class="w-3.5 h-3.5"></i><span>${ds.text} · ${Utils.formatDate(order.deadline)}</span></div>`
                  : order.deadline ? `<div class="mt-2 flex items-center gap-1.5 text-xs text-gray-400"><i data-lucide="calendar" class="w-3.5 h-3.5"></i><span>Deadline: ${Utils.formatDate(order.deadline)}</span></div>` : ''}
        </div>`;
    },

    _priorityClass(p) {
        return { high: 'bg-red-100 text-red-600', medium: 'bg-yellow-100 text-yellow-600', low: 'bg-green-100 text-green-600' }[p] || 'bg-gray-100 text-gray-600';
    },

    // ─── PAGE: DASHBOARD ─────────────────────────────────────────────────────

    _renderDashboard(c) {
        const stats   = OrdersModule.getDashboardStats();
        const recent  = OrdersModule.getActive().slice(0, 5);
        const todos   = TodosModule.getByCategory();
        const openTodo = (todos.eenmalig || []).filter(t => t.status !== 'done').slice(0, 3);
        const activity = typeof Audit !== 'undefined' ? Audit.getRecentActivity(5) : [];

        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Dashboard</h1>
            <p class="page-subtitle">Welkom terug, ${Utils.escapeHtml(this.currentUser?.user_metadata?.name || 'Gebruiker')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card stat-card-blue" onclick="App.navigate('orders')" style="cursor:pointer">
                <div class="flex items-center justify-between mb-2">
                    <span class="stat-label">Actieve orders</span>
                    <div class="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center"><i data-lucide="package" class="w-5 h-5 text-blue-600"></i></div>
                </div>
                <div class="stat-value">${stats.active}</div>
            </div>
            <div class="stat-card stat-card-green" onclick="App.navigate('archief')" style="cursor:pointer">
                <div class="flex items-center justify-between mb-2">
                    <span class="stat-label">Verzonden</span>
                    <div class="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center"><i data-lucide="check-circle" class="w-5 h-5 text-green-600"></i></div>
                </div>
                <div class="stat-value">${stats.completed}</div>
            </div>
            <div class="stat-card stat-card-red" onclick="App.showDelayedOrders()" style="cursor:pointer">
                <div class="flex items-center justify-between mb-2">
                    <span class="stat-label">In vertraging</span>
                    <div class="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center"><i data-lucide="alert-triangle" class="w-5 h-5 text-red-600"></i></div>
                </div>
                <div class="stat-value">${stats.delayed}</div>
            </div>
            <div class="stat-card stat-card-orange" onclick="App.showBronsgieterijOrders()" style="cursor:pointer">
                <div class="flex items-center justify-between mb-2">
                    <span class="stat-label">Bij bronsgieterij</span>
                    <div class="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center"><i data-lucide="factory" class="w-5 h-5 text-orange-600"></i></div>
                </div>
                <div class="stat-value">${stats.atBronsgieterij}</div>
            </div>
        </div>

        <div class="content-card">
            <div class="flex items-center justify-between mb-4">
                <h2 class="card-title">Recente Orders</h2>
                <button class="btn-text" onclick="App.navigate('orders')">Alle orders →</button>
            </div>
            ${recent.length ? recent.map(o => this._orderCard(o)).join('') : '<p class="text-center py-8 text-gray-400">Geen actieve orders</p>'}
        </div>

        ${openTodo.length ? `
        <div class="content-card">
            <div class="flex items-center justify-between mb-4">
                <h2 class="card-title">Openstaande Taken</h2>
                <button class="btn-text" onclick="App.navigate('todos')">Alle taken →</button>
            </div>
            <div class="space-y-2">
                ${openTodo.map(t => `
                <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                    <button onclick="App.toggleTodo('${t.id}')" class="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="check" class="w-4 h-4 text-amber-500"></i>
                    </button>
                    <span class="flex-1 text-sm">${Utils.escapeHtml(t.titel)}</span>
                    <span class="text-xs px-2 py-0.5 rounded-lg ${this._priorityClass(t.prioriteit)}">${t.prioriteit}</span>
                </div>`).join('')}
            </div>
        </div>` : ''}

        ${activity.length ? `
        <div class="content-card">
            <h2 class="card-title mb-4">Recente Activiteit</h2>
            <div class="space-y-3">
                ${activity.map(a => `
                <div class="flex items-center gap-3 text-sm">
                    <div class="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <i data-lucide="activity" class="w-4 h-4 text-gray-500"></i>
                    </div>
                    <div class="flex-1"><span class="text-gray-700">${a.action}</span> <span class="text-gray-500">${a.entity}</span></div>
                    <span class="text-xs text-gray-400">${a.time}</span>
                </div>`).join('')}
            </div>
        </div>` : ''}`;
    },

    // ─── PAGE: ORDERS ─────────────────────────────────────────────────────────

    _renderOrders(c) {
        const orders = OrdersModule.filteredOrders;
        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Alle Orders</h1>
            <p class="page-subtitle">${orders.length} order(s)</p>
        </div>
        <div class="filter-tabs mb-4">
            <button class="filter-tab active" data-fase="all"    onclick="App.filterOrders('all')">Alle</button>
            <button class="filter-tab"         data-fase="active" onclick="App.filterOrders('active')">Actief</button>
            <button class="filter-tab"         data-fase="brons"  onclick="App.filterOrders('brons')">Brons</button>
        </div>
        <div class="space-y-3">
            ${orders.length ? orders.map(o => this._orderCard(o)).join('') : '<p class="text-center py-12 text-gray-400">Geen orders gevonden</p>'}
        </div>`;
    },

    // ─── PAGE: ARCHIEF ────────────────────────────────────────────────────────

    _renderArchief(c) {
        const completed = OrdersModule.getCompleted()
            .sort((a,b) => new Date(b.afgerond_datum||b.updated_at) - new Date(a.afgerond_datum||a.updated_at));
        c.innerHTML = `
        <div class="page-header">
            <div class="flex items-center justify-between">
                <div>
                    <h1 class="page-title">Archief</h1>
                    <p class="page-subtitle">${completed.length} afgeronde orders</p>
                </div>
                ${completed.length ? `<button onclick="App.confirmDeleteAllArchived()" class="text-red-500 text-sm font-medium px-3 py-2">Alles wissen</button>` : ''}
            </div>
        </div>
        <div class="space-y-3">
            ${completed.length ? completed.map(o => this._orderCard(o)).join('') : '<p class="text-center py-12 text-gray-400">Geen afgeronde orders</p>'}
        </div>`;
    },

    // ─── PAGE: NAZORG ─────────────────────────────────────────────────────────

    _renderNazorg(c) {
        const orders = OrdersModule.getNazorgOrders();
        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Nazorg</h1>
            <p class="page-subtitle">Orders in nazorg fase</p>
        </div>
        <div class="space-y-3">
            ${orders.length ? orders.map(o => {
                const pink = OrdersModule.getNazorgColor(o) === 'pink';
                return `
                <div class="order-card border-l-4 ${pink ? 'border-pink-500' : 'border-blue-500'}">
                    <div class="order-card-header">
                        <div>
                            <p class="font-semibold">${Utils.escapeHtml(o.klant_naam)}</p>
                            <p class="text-sm text-gray-500">${o.order_id}</p>
                        </div>
                        <span class="text-xs px-2 py-1 rounded-lg ${pink ? 'bg-pink-100 text-pink-600' : 'bg-blue-100 text-blue-600'}">${pink ? '4+ dagen' : 'Recent'}</span>
                    </div>
                    <div class="mt-3 grid grid-cols-2 gap-2">
                        <button onclick="App.sendNazorgMessage('${o.order_id}')" class="py-2 bg-green-500 text-white rounded-xl text-sm font-medium">WhatsApp</button>
                        <button onclick="App.completeNazorg('${o.order_id}')" class="py-2 bg-gray-100 text-gray-700 rounded-xl text-sm">Afronden</button>
                    </div>
                </div>`;
            }).join('') : '<p class="text-center py-12 text-gray-400">Geen orders in nazorg</p>'}
        </div>`;
    },

    // ─── PAGE: TODOS ──────────────────────────────────────────────────────────

    _renderTodos(c) {
        const groups = TodosModule.getByCategory();
        const cats = [
            { key: 'dagelijks', label: 'Dagelijks' },
            { key: 'wekelijks', label: 'Wekelijks' },
            { key: 'maandelijks', label: 'Maandelijks' },
            { key: 'eenmalig', label: 'Eenmalig' },
        ];

        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Taken</h1>
            <p class="page-subtitle">${TodosModule.getOpenCount()} openstaand</p>
        </div>
        <div class="content-card mb-4">
            <form id="addTodoForm" class="flex flex-col sm:flex-row gap-2">
                <input id="todoTitle" placeholder="Nieuwe taak..." class="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:border-amber-500 outline-none text-sm">
                <div class="flex gap-2">
                    <select id="todoCat" class="px-4 py-3 border border-gray-200 rounded-xl bg-white text-sm">
                        ${cats.map(c => `<option value="${c.key}">${c.label}</option>`).join('')}
                    </select>
                    <button type="submit" class="px-5 py-3 bg-amber-500 text-white rounded-xl font-medium whitespace-nowrap text-sm">+ Voeg toe</button>
                </div>
            </form>
        </div>
        ${cats.map(cat => {
            const items = groups[cat.key] || [];
            return `
            <div class="content-card mb-4">
                <h3 class="font-semibold text-gray-700 mb-3">${cat.label}</h3>
                <div class="space-y-2">
                    ${items.length ? items.map(t => `
                    <div class="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <button onclick="App.toggleTodo('${t.id}')" class="w-6 h-6 rounded-full border-2 border-amber-500 flex items-center justify-center flex-shrink-0 hover:bg-amber-50">
                            <i data-lucide="check" class="w-4 h-4 text-amber-500"></i>
                        </button>
                        <span class="flex-1 text-sm">${Utils.escapeHtml(t.titel)}</span>
                        <span class="text-xs px-2 py-0.5 rounded ${this._priorityClass(t.prioriteit)}">${t.prioriteit}</span>
                        <button onclick="App.deleteTodo('${t.id}')" class="text-gray-400 hover:text-red-500 ml-1">
                            <i data-lucide="trash-2" class="w-4 h-4"></i>
                        </button>
                    </div>`).join('') : '<p class="text-center py-4 text-gray-400 text-sm">Geen taken</p>'}
                </div>
            </div>`;
        }).join('')}`;

        document.getElementById('addTodoForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const title = document.getElementById('todoTitle').value.trim();
            const cat   = document.getElementById('todoCat').value;
            if (!title) return;
            try {
                await TodosModule.create(title, cat);
                UI.showToast('Taak toegevoegd', 'success');
                this._renderTodos(c);
            } catch (err) {
                UI.showToast(err.message || 'Fout', 'error');
            }
        });
    },

    // ─── PAGE: TIME ───────────────────────────────────────────────────────────

    _renderTime(c) {
        const stats = typeof TimeModule !== 'undefined' ? TimeModule.getStats(this.currentUser?.id) : { today: 0, week: 0, month: 0 };
        const perMed = typeof TimeModule !== 'undefined' ? TimeModule.getPerMedewerker() : {};

        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Tijdregistratie</h1>
        </div>
        <div class="stats-grid mb-4">
            <div class="stat-card"><span class="stat-label">Vandaag</span><div class="stat-value text-2xl">${Utils.formatTime(stats.today)}</div></div>
            <div class="stat-card"><span class="stat-label">Deze week</span><div class="stat-value text-2xl">${Utils.formatTime(stats.week)}</div></div>
            <div class="stat-card"><span class="stat-label">Deze maand</span><div class="stat-value text-2xl">${Utils.formatTime(stats.month)}</div></div>
        </div>
        <div class="content-card mb-4">
            <h3 class="card-title mb-4">Tijd registreren</h3>
            <form id="timeForm" class="space-y-3">
                <div class="grid grid-cols-2 gap-3">
                    <input type="date" id="tDate"  required class="form-input">
                    <input type="time" id="tStart" required class="form-input" placeholder="Start">
                    <input type="time" id="tEind"  required class="form-input" placeholder="Eind">
                    <input type="number" id="tPauze" placeholder="Pauze (min)" min="0" class="form-input">
                </div>
                <input type="text" id="tNote" placeholder="Opmerking (optioneel)" class="form-input w-full">
                <button type="submit" class="w-full py-3 bg-amber-500 text-white rounded-xl font-semibold">Registreren</button>
            </form>
        </div>
        ${Object.keys(perMed).length ? `
        <div class="content-card">
            <h3 class="card-title mb-4">Per medewerker</h3>
            <div class="space-y-3">
                ${Object.values(perMed).map(m => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                    <div><p class="font-medium">${Utils.escapeHtml(m.naam)}</p><p class="text-xs text-gray-500">${m.approved} registraties</p></div>
                    <div class="text-right"><p class="font-semibold">${Utils.formatTime(m.dezeMaandMinuten)}</p><p class="text-xs text-gray-500">deze maand</p></div>
                </div>`).join('')}
            </div>
        </div>` : ''}`;

        document.getElementById('tDate').valueAsDate = new Date();

        document.getElementById('timeForm')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const naam = this.currentUser?.user_metadata?.name || 'Onbekend';
            try {
                await TimeModule.create(
                    document.getElementById('tDate').value,
                    document.getElementById('tStart').value,
                    document.getElementById('tEind').value,
                    parseInt(document.getElementById('tPauze').value) || 0,
                    document.getElementById('tNote').value,
                    naam,
                );
                UI.showToast('Tijd geregistreerd', 'success');
                this._renderTime(c);
            } catch (err) {
                UI.showToast(err.message || 'Fout bij registreren', 'error');
            }
        });
    },

    // ─── PAGE: SCHEMA ─────────────────────────────────────────────────────────

    _renderSchema(c) {
        const active = OrdersModule.getActive();
        const sections = [
            { key: 'standard',      label: 'Standaard Workflow' },
            { key: 'atelier_bronze', label: 'Atelier Bronze (Lemarez)' },
            { key: 'gegoten_brons', label: 'Gegoten Brons' },
        ].map(({ key, label }) => {
            const orders = active.filter(o => getWorkflowForCollectie(o.collectie) === key);
            if (!orders.length) return '';
            const wf = WORKFLOWS[key];
            return `
            <div class="content-card mb-4">
                <div class="flex items-center justify-between mb-4">
                    <div>
                        <h3 class="font-semibold text-gray-800">${label}</h3>
                        <p class="text-sm text-gray-500">${orders.length} orders · ${wf.duration}</p>
                    </div>
                </div>
                <div class="space-y-2">
                    ${orders.map(o => {
                        const ci = wf.fases.indexOf(o.huidige_fase);
                        return `
                        <div class="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100"
                             onclick="App.showOrderDetail('${o.order_id}')">
                            <div class="w-28 flex-shrink-0">
                                <p class="font-medium text-sm truncate">${Utils.escapeHtml(o.klant_naam)}</p>
                                <p class="text-xs text-gray-500">${o.order_id}</p>
                            </div>
                            <div class="flex-1 flex gap-0.5">
                                ${wf.fases.map((f, idx) => {
                                    const done = idx < ci, cur = idx === ci;
                                    const fc = FASES_CONFIG[f];
                                    return `<div class="flex-1 h-5 rounded ${done ? 'bg-green-500' : cur ? fc.color + ' ring-1 ring-amber-400' : 'bg-gray-200'}" title="${fc.name}"></div>`;
                                }).join('')}
                            </div>
                            <span class="text-xs text-gray-500 w-8 text-center">${ci + 1}/${wf.fases.length}</span>
                        </div>`;
                    }).join('')}
                </div>
            </div>`;
        }).join('');

        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Productie Schema</h1>
            <p class="page-subtitle">Overzicht alle workflows</p>
        </div>
        ${sections || '<p class="text-center py-12 text-gray-400">Geen actieve orders</p>'}`;
    },

    // ─── PAGE: ANALYTICS ──────────────────────────────────────────────────────

    _renderAnalytics(c) {
        const all  = OrdersModule.getAll();
        const done = OrdersModule.getCompleted();
        const act  = OrdersModule.getActive();

        const perCol = {};
        all.forEach(o => { perCol[o.collectie] = (perCol[o.collectie]||0) + 1; });
        const colList = Object.entries(perCol).sort((a,b) => b[1]-a[1]);

        const now = new Date();
        const months = {};
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months[d.toLocaleString('nl',{month:'short',year:'2-digit'})] = 0;
        }
        done.forEach(o => {
            const d = new Date(o.updated_at||o.created_at);
            const k = d.toLocaleString('nl',{month:'short',year:'2-digit'});
            if (months[k] !== undefined) months[k]++;
        });
        const maxM = Math.max(...Object.values(months), 1);

        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Analytics</h1>
            <p class="page-subtitle">Productie statistieken</p>
        </div>
        <div class="stats-grid mb-4">
            <div class="stat-card stat-card-blue"><span class="stat-label">Totaal</span><div class="stat-value">${all.length}</div></div>
            <div class="stat-card stat-card-green"><span class="stat-label">Afgerond</span><div class="stat-value">${done.length}</div></div>
            <div class="stat-card stat-card-orange"><span class="stat-label">Actief</span><div class="stat-value">${act.length}</div></div>
            <div class="stat-card stat-card-red"><span class="stat-label">% Afgerond</span><div class="stat-value">${all.length ? Math.round(done.length/all.length*100) : 0}%</div></div>
        </div>
        <div class="content-card mb-4">
            <h3 class="card-title mb-4">Afgerond per maand</h3>
            <div class="flex items-end gap-2 h-32">
                ${Object.entries(months).map(([m, n]) => `
                <div class="flex-1 flex flex-col items-center gap-1">
                    <span class="text-xs font-medium text-gray-700">${n}</span>
                    <div class="w-full bg-amber-500 rounded-t-lg" style="height:${Math.max(4, Math.round(n/maxM*96))}px"></div>
                    <span class="text-xs text-gray-400 whitespace-nowrap">${m}</span>
                </div>`).join('')}
            </div>
        </div>
        <div class="content-card">
            <h3 class="card-title mb-4">Orders per collectie</h3>
            <div class="space-y-3">
                ${colList.map(([name, n]) => `
                <div>
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium text-gray-700">${Utils.escapeHtml(name)}</span>
                        <span class="text-sm font-bold">${n}</span>
                    </div>
                    <div class="h-2 bg-gray-100 rounded-full">
                        <div class="h-full bg-amber-500 rounded-full" style="width:${Math.round(n/all.length*100)}%"></div>
                    </div>
                </div>`).join('')}
            </div>
        </div>`;
    },

    // ─── PAGE: SETTINGS ───────────────────────────────────────────────────────

    _renderSettings(c) {
        c.innerHTML = `
        <div class="page-header">
            <h1 class="page-title">Instellingen</h1>
        </div>
        <div class="content-card mb-4">
            <div class="flex items-center justify-between py-3 border-b">
                <div>
                    <p class="font-medium">Ingelogd als</p>
                    <p class="text-sm text-gray-500">${Utils.escapeHtml(this.currentUser?.user_metadata?.name||'')} · ${Utils.escapeHtml(this.currentUser?.user_metadata?.role||'')}</p>
                </div>
            </div>
            <div class="flex items-center justify-between py-3 border-b">
                <div>
                    <p class="font-medium">Taal</p>
                    <p class="text-sm text-gray-500">Voorkeurstaal</p>
                </div>
                <select id="langSelect" class="px-4 py-2 border border-gray-200 rounded-lg text-sm">
                    <option value="nl" ${I18n.getLanguage()==='nl'?'selected':''}>Nederlands</option>
                    <option value="en" ${I18n.getLanguage()==='en'?'selected':''}>English</option>
                </select>
            </div>
            <div class="py-3">
                <p class="font-medium mb-1">App Info</p>
                <p class="text-sm text-gray-500">Versie ${CONFIG.VERSION}</p>
                <p class="text-sm text-gray-500">© Babycrafts Atelier</p>
            </div>
        </div>
        <button onclick="App.logout()" class="w-full py-3 bg-red-500 text-white rounded-xl font-semibold">Uitloggen</button>`;

        document.getElementById('langSelect')?.addEventListener('change', (e) => {
            I18n.setLanguage(e.target.value);
            UI.showToast('Taal gewijzigd', 'success');
        });
    },

    // ─── DETAIL SHEETS ────────────────────────────────────────────────────────

    showOrderDetail(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;

        const fc = FASES_CONFIG[order.huidige_fase] || FASES_CONFIG[0];
        const canAdv = OrdersModule.canAdvance(order);
        const advTxt = OrdersModule.getAdvanceButtonText(order);
        const ds = Utils.getDeadlineStatus(order);
        const wf = WORKFLOWS[getWorkflowForCollectie(order.collectie)];
        const fases = wf?.fases || [0];
        const ci = fases.indexOf(order.huidige_fase);

        UI.showBottomSheet({
            title: `Order ${orderId}`,
            content: `
            <div class="space-y-4">
                <div class="flex items-center gap-3 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-100">
                    <div class="w-12 h-12 rounded-full bg-amber-500 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                        ${order.klant_naam.charAt(0).toUpperCase()}
                    </div>
                    <div class="min-w-0 flex-1">
                        <p class="font-bold text-gray-900">${Utils.escapeHtml(order.klant_naam)}</p>
                        <p class="text-sm text-gray-500 truncate">${Utils.escapeHtml(order.klant_email||'')}</p>
                        ${order.klant_telefoon ? `<p class="text-sm text-gray-500">${Utils.escapeHtml(order.klant_telefoon)}</p>` : ''}
                    </div>
                    <button onclick="App.showCustomerPassport('${orderId}')" class="p-2 bg-white rounded-xl border border-gray-200 flex-shrink-0">
                        <i data-lucide="user" class="w-4 h-4 text-gray-500"></i>
                    </button>
                </div>

                <div class="grid grid-cols-2 gap-2">
                    <div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-0.5">Collectie</p><p class="font-semibold text-sm">${Utils.escapeHtml(order.collectie)}</p></div>
                    <div class="bg-gray-50 rounded-xl p-3"><p class="text-xs text-gray-400 mb-0.5">Hoogte</p><p class="font-semibold text-sm">${order.hoogte_cm} cm</p></div>
                    <div class="bg-gray-50 rounded-xl p-3">
                        <p class="text-xs text-gray-400 mb-0.5">Sokkel</p>
                        <p class="font-semibold text-sm">${order.sokkel||'Zonder'}</p>
                        ${order.sokkel_details ? `<p class="text-xs text-gray-500 mt-0.5">${Utils.escapeHtml(order.sokkel_details)}</p>` : ''}
                    </div>
                    <div class="bg-gray-50 rounded-xl p-3 ${ds?.class||''}">
                        <p class="text-xs text-gray-400 mb-0.5">Deadline</p>
                        <p class="font-semibold text-sm">${Utils.formatDate(order.deadline)}</p>
                        ${ds ? `<p class="text-xs">${ds.text}</p>` : ''}
                    </div>
                </div>

                <div class="p-3 rounded-xl border-l-4 ${fc.color.replace('bg-','border-')} bg-gray-50">
                    <p class="text-xs text-gray-500 mb-0.5">Fase ${ci+1} van ${fases.length}</p>
                    <p class="font-bold ${fc.text}">${I18n.getFaseName(order.huidige_fase)}</p>
                </div>

                <div class="overflow-x-auto pb-1">
                    <div class="flex items-center gap-1 min-w-max">
                        ${fases.map((f, idx) => {
                            const ffc = FASES_CONFIG[f];
                            const done = idx < ci, cur = idx === ci;
                            return `<div class="flex items-center">
                                <div class="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${done?'bg-green-500 text-white':cur?ffc.color+' text-white ring-2 ring-amber-400 ring-offset-1':'bg-gray-100 text-gray-400'}" title="${ffc.name}">${done?'✓':f}</div>
                                ${idx < fases.length-1 ? '<div class="w-3 h-0.5 bg-gray-200 mx-0.5"></div>' : ''}
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                ${order.extra_notities ? `<div class="p-3 bg-yellow-50 rounded-xl border border-yellow-100"><p class="text-xs font-medium text-yellow-700 mb-1">Notities</p><p class="text-sm text-gray-700">${Utils.escapeHtml(order.extra_notities)}</p></div>` : ''}

                <div class="space-y-2">
                    <button onclick="App.advanceOrder('${orderId}')"
                            class="w-full py-3.5 font-semibold rounded-xl text-white transition-colors ${canAdv.can?'bg-green-500 hover:bg-green-600':'bg-gray-300 cursor-not-allowed'}"
                            ${canAdv.can?'':'disabled'}>
                        ${advTxt}
                    </button>
                    ${order.huidige_fase === 9 ? `<button onclick="App.showPostNL('${orderId}')" class="w-full py-3 bg-[#003366] text-white rounded-xl font-medium">📦 PostNL Pakket</button>` : ''}
                    <div class="grid grid-cols-3 gap-2">
                        <button onclick="App.showProductionSchema('${orderId}')" class="py-2.5 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium">📋 Schema</button>
                        <button onclick="App.editOrder('${orderId}')" class="py-2.5 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium">✏️ Bewerken</button>
                        <button onclick="App.deleteOrder('${orderId}')" class="py-2.5 bg-red-50 text-red-600 rounded-xl text-sm font-medium">🗑️ Wissen</button>
                    </div>
                </div>
            </div>`,
        });
    },

    showCustomerPassport(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;
        const phone = (order.klant_telefoon || '').replace(/\D/g,'');
        const wa = phone ? `https://wa.me/31${phone.replace(/^0/,'')}` : null;

        UI.showBottomSheet({
            title: 'Klant Paspoort',
            content: `
            <div class="space-y-4">
                <div class="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-100">
                    <div class="flex items-center gap-4 mb-4">
                        <div class="w-16 h-16 rounded-full bg-amber-500 text-white flex items-center justify-center text-2xl font-bold">
                            ${order.klant_naam.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <h3 class="font-bold text-lg text-gray-900">${Utils.escapeHtml(order.klant_naam)}</h3>
                            <p class="text-sm text-gray-500">${order.order_id}</p>
                        </div>
                    </div>
                    <div class="space-y-2 text-sm">
                        ${order.klant_email ? `<div class="flex items-center gap-2"><i data-lucide="mail" class="w-4 h-4 text-gray-400"></i><a href="mailto:${order.klant_email}" class="text-amber-600">${Utils.escapeHtml(order.klant_email)}</a></div>` : ''}
                        ${order.klant_telefoon ? `<div class="flex items-center gap-2"><i data-lucide="phone" class="w-4 h-4 text-gray-400"></i><span>${Utils.escapeHtml(order.klant_telefoon)}</span></div>` : ''}
                        ${order.straat ? `<div class="flex items-center gap-2"><i data-lucide="map-pin" class="w-4 h-4 text-gray-400"></i><span>${Utils.escapeHtml(order.straat)} ${Utils.escapeHtml(order.huisnummer||'')}, ${Utils.escapeHtml(order.postcode||'')} ${Utils.escapeHtml(order.plaats||'')}</span></div>` : ''}
                    </div>
                </div>
                <div class="bg-gray-50 rounded-xl p-4 grid grid-cols-2 gap-3 text-sm">
                    <div><span class="text-gray-400">Collectie</span><p class="font-medium">${Utils.escapeHtml(order.collectie)}</p></div>
                    <div><span class="text-gray-400">Hoogte</span><p class="font-medium">${order.hoogte_cm} cm</p></div>
                    <div><span class="text-gray-400">Sokkel</span><p class="font-medium">${order.sokkel||'Zonder'}${order.sokkel_details?` — ${Utils.escapeHtml(order.sokkel_details)}`:''}</p></div>
                    <div><span class="text-gray-400">Kleur</span><p class="font-medium">${order.kleur_afwerking||'Standaard'}</p></div>
                </div>
                ${wa ? `<a href="${wa}" target="_blank" class="flex items-center justify-center gap-2 w-full py-3 bg-green-500 text-white rounded-xl font-medium"><i data-lucide="message-circle" class="w-5 h-5"></i>WhatsApp Sturen</a>` : ''}
                <div class="grid grid-cols-2 gap-3">
                    <button onclick="App.showOrderDetail('${orderId}')" class="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">Order Details</button>
                    <button onclick="App.editOrder('${orderId}')" class="py-3 bg-amber-100 text-amber-700 rounded-xl font-medium">Bewerken</button>
                </div>
            </div>`,
        });
    },

    showProductionSchema(orderId) {
        const order = OrdersModule.getById(orderId);
        if (!order) return;
        const workflow = getWorkflowForCollectie(order.collectie);
        const wfc = WORKFLOWS[workflow];
        const fases = wfc.fases;
        const ci = fases.indexOf(order.huidige_fase);

        const timeline = fases.map((f, idx) => {
            const fc = FASES_CONFIG[f];
            const done = idx < ci, cur = idx === ci, fut = idx > ci;
            let cls = done ? 'bg-green-500 text-white' : cur ? `${fc.color} text-white ring-4 ring-opacity-30` : 'bg-gray-200 text-gray-400';
            return `
            <div class="flex items-start gap-4 ${fut?'opacity-50':''}">
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full ${cls} flex items-center justify-center font-bold text-sm shadow-sm">
                        ${done?'✓':cur?'●':'○'}
                    </div>
                    ${idx < fases.length-1 ? '<div class="w-0.5 h-10 bg-gray-200 mt-1"></div>' : ''}
                </div>
                <div class="flex-1 pb-6">
                    <p class="font-medium ${cur?fc.text:'text-gray-700'}">${fc.name}</p>
                    ${fc.duration ? `<p class="text-xs text-gray-500">${fc.duration}</p>` : ''}
                    ${cur ? `<p class="text-xs font-medium ${fc.text} mt-1">← Huidige fase</p>` : ''}
                </div>
            </div>`;
        }).join('');

        UI.showBottomSheet({
            title: '📋 Productieschema',
            content: `
            <div class="space-y-4">
                <div class="bg-primary-50 rounded-xl p-4">
                    <p class="font-medium text-primary-800">${Utils.escapeHtml(order.klant_naam)}</p>
                    <p class="text-sm text-primary-600">${order.order_id} · ${order.collectie}</p>
                    <p class="text-xs text-primary-500 mt-1">Workflow: ${wfc.name} · ${wfc.duration}</p>
                </div>
                <div class="pl-2">${timeline}</div>
                <div class="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
                    <p>Fase ${ci+1} van ${fases.length}</p>
                </div>
            </div>`,
        });
    },

    showAIAssistant() {
        const stats = OrdersModule.getDashboardStats();
        const open  = TodosModule.getOpenCount();
        const today = new Date(); today.setHours(0,0,0,0);
        const delayed = OrdersModule.getAll().filter(o => o.deadline && o.huidige_fase < 12 && new Date(o.deadline) < today);

        UI.showBottomSheet({
            title: '🤖 Atelier Assistent',
            content: `
            <div class="space-y-4">
                <div class="p-4 bg-purple-50 rounded-2xl border border-purple-100">
                    <p class="font-semibold text-purple-800 mb-2">Overzicht vandaag</p>
                    <ul class="text-sm text-purple-700 space-y-1">
                        <li>• ${stats.active} actieve orders</li>
                        ${delayed.length ? `<li class="text-red-600 font-medium">• ⚠️ ${delayed.length} order(s) met overschreden deadline</li>` : '<li>• Geen vertraagde orders ✓</li>'}
                        <li>• ${open} openstaande taken</li>
                        <li>• ${stats.completed} orders totaal afgerond</li>
                    </ul>
                </div>
                ${delayed.length ? `
                <div class="p-4 bg-red-50 rounded-xl border border-red-100">
                    <p class="font-semibold text-red-700 mb-2">Vertraagde orders</p>
                    ${delayed.slice(0,4).map(o => `
                    <div class="flex items-center justify-between py-2 border-b border-red-100 last:border-0">
                        <div>
                            <p class="text-sm font-medium">${Utils.escapeHtml(o.klant_naam)}</p>
                            <p class="text-xs text-gray-500">${o.order_id}</p>
                        </div>
                        <span class="text-xs text-red-600">${Utils.formatDate(o.deadline)}</span>
                    </div>`).join('')}
                </div>` : ''}
                <div class="grid grid-cols-2 gap-2">
                    <button onclick="UI.closeBottomSheet();App.navigate('orders')" class="py-2.5 bg-blue-500 text-white rounded-xl text-sm font-medium">Alle Orders</button>
                    <button onclick="UI.closeBottomSheet();App.navigate('todos')" class="py-2.5 bg-amber-500 text-white rounded-xl text-sm font-medium">Taken</button>
                    <button onclick="UI.closeBottomSheet();App.showDelayedOrders()" class="py-2.5 bg-red-500 text-white rounded-xl text-sm font-medium">Vertraagd</button>
                    <button onclick="UI.closeBottomSheet();App.navigate('schema')" class="py-2.5 bg-green-500 text-white rounded-xl text-sm font-medium">Schema</button>
                </div>
            </div>`,
        });
    },
};

// Boot
document.addEventListener('DOMContentLoaded', () => {
    if (typeof lucide !== 'undefined') lucide.createIcons();
    App.initialize();
});
