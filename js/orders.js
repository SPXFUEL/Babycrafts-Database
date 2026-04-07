/**
 * ORDERS MODULE - Babycrafts
 */

const OrdersModule = {
    orders: [],
    filteredOrders: [],

    async initialize() {
        await this.load();
    },

    async load() {
        this.orders = await Repository.orders.getAll();
        this.filteredOrders = this.orders.filter(o => o.status !== 'deleted');
    },

    getAll() {
        return this.orders.filter(o => o.status !== 'deleted');
    },

    getActive() {
        return this.orders.filter(o => o.status !== 'deleted' && o.huidige_fase < 12);
    },

    getCompleted() {
        return this.orders.filter(o => o.huidige_fase === 12 && o.status !== 'deleted');
    },

    getNazorgOrders() {
        return this.orders.filter(o => o.huidige_fase === 11 && o.status !== 'deleted')
            .sort((a, b) => new Date(a.nazorg_start_datum) - new Date(b.nazorg_start_datum));
    },

    getById(orderId) {
        return this.orders.find(o => o.order_id === orderId) || null;
    },

    getDashboardStats() {
        const all = this.orders.filter(o => o.status !== 'deleted');
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
            active: all.filter(o => o.huidige_fase < 12).length,
            completed: all.filter(o => o.huidige_fase === 12).length,
            delayed: all.filter(o => o.deadline && o.huidige_fase < 12 && new Date(o.deadline) < today).length,
            atBronsgieterij: all.filter(o => [13, 14, 15, 16].includes(o.huidige_fase)).length,
        };
    },

    getNazorgColor(order) {
        if (!order.nazorg_start_datum) return 'blue';
        const days = (Date.now() - new Date(order.nazorg_start_datum)) / 86400000;
        return days >= 4 ? 'pink' : 'blue';
    },

    canAdvance(order) {
        const next = getNextFase(order.huidige_fase, order.collectie);
        if (next === null) return { can: false, reason: 'Afgerond' };
        return { can: true };
    },

    getAdvanceButtonText(order) {
        const next = getNextFase(order.huidige_fase, order.collectie);
        if (next === null) return 'Afgerond';
        const fc = FASES_CONFIG[next];
        return `→ ${fc ? fc.name : `Fase ${next}`}`;
    },

    async create(formData, userId) {
        const collectie = formData.collectie || 'Figura';
        const workflow = getWorkflowForCollectie(collectie);
        const orderId = this._generateId();

        const orderData = {
            order_id: orderId,
            klant_naam: (formData.klant_naam || '').trim(),
            klant_email: (formData.klant_email || '').trim(),
            klant_telefoon: (formData.klant_telefoon || '').trim() || null,
            straat: (formData.straat || '').trim() || null,
            huisnummer: (formData.huisnummer || '').trim() || null,
            postcode: (formData.postcode || '').trim() || null,
            plaats: (formData.plaats || '').trim() || null,
            scan_datum: formData.scan_datum || null,
            hoogte_cm: parseInt(formData.hoogte_cm) || 20,
            collectie,
            kleur_afwerking: (formData.kleur_afwerking || '').trim() || null,
            sokkel: formData.sokkel || 'Zonder',
            sokkel_details: (formData.sokkel_details || '').trim() || null,
            extra_notities: (formData.extra_notities || '').trim() || null,
            toestemming_delen: formData.toestemming_delen === 'on' || formData.toestemming_delen === true,
            huidige_fase: 0,
            workflow,
            deadline: formData.deadline || null,
            status: 'active',
            public_token: Math.random().toString(36).substring(2, 14),
            // UUID columns — PIN auth IDs are not UUIDs, must be null
            verantwoordelijke_user: Repository.toUUID(userId),
            created_by: Repository.toUUID(userId),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };

        const order = await Repository.orders.create(orderData);
        if (order) {
            this.orders.unshift(order);
            this.filteredOrders = this.orders.filter(o => o.status !== 'deleted');
        }
        return order;
    },

    async update(orderId, formData) {
        const updates = {
            klant_naam: (formData.klant_naam || '').trim(),
            klant_email: (formData.klant_email || '').trim(),
            klant_telefoon: (formData.klant_telefoon || '').trim() || null,
            straat: (formData.straat || '').trim() || null,
            huisnummer: (formData.huisnummer || '').trim() || null,
            postcode: (formData.postcode || '').trim() || null,
            plaats: (formData.plaats || '').trim() || null,
            scan_datum: formData.scan_datum || null,
            hoogte_cm: parseInt(formData.hoogte_cm) || 20,
            collectie: formData.collectie,
            kleur_afwerking: (formData.kleur_afwerking || '').trim() || null,
            sokkel: formData.sokkel || 'Zonder',
            sokkel_details: (formData.sokkel_details || '').trim() || null,
            extra_notities: (formData.extra_notities || '').trim() || null,
            deadline: formData.deadline || null,
        };

        const order = await Repository.orders.update(orderId, updates);
        if (order) {
            const idx = this.orders.findIndex(o => o.order_id === orderId);
            if (idx !== -1) this.orders[idx] = order;
            this.filteredOrders = this.orders.filter(o => o.status !== 'deleted');
        }
        return order;
    },

    async updateFase(orderId, newFase) {
        const updates = { huidige_fase: newFase };
        if (newFase === 10) updates.verzenddatum = new Date().toISOString().split('T')[0];
        if (newFase === 11) updates.nazorg_start_datum = new Date().toISOString();
        if (newFase === 12) { updates.status = 'completed'; updates.afgerond_datum = new Date().toISOString(); }
        if (newFase === 15) updates.bronsgieterij_datum = new Date().toISOString();
        if (newFase === 16) updates.terug_gieterij_datum = new Date().toISOString();

        const order = await Repository.orders.update(orderId, updates);
        if (order) {
            const idx = this.orders.findIndex(o => o.order_id === orderId);
            if (idx !== -1) this.orders[idx] = order;
            this.filteredOrders = this.orders.filter(o => o.status !== 'deleted');
        }
        return order;
    },

    async delete(orderId) {
        await Repository.orders.delete(orderId);
        const idx = this.orders.findIndex(o => o.order_id === orderId);
        if (idx !== -1) this.orders[idx].status = 'deleted';
        this.filteredOrders = this.orders.filter(o => o.status !== 'deleted');
    },

    _generateId() {
        const year = new Date().getFullYear();
        const existing = this.orders
            .filter(o => o.order_id?.startsWith(`BC-${year}-`))
            .map(o => parseInt(o.order_id.split('-')[2]) || 0);
        const next = existing.length > 0 ? Math.max(...existing) + 1 : 1;
        return `BC-${year}-${String(next).padStart(4, '0')}`;
    },
};
