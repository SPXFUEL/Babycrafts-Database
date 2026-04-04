/**
 * ORDERS MODULE V2
 * Clean, modular order management
 */

const OrdersModule = {
    orders: [],
    filteredOrders: [],
    qualityPhotos: {},
    currentDetailOrderId: null,
    subscriptions: [],
    
    /**
     * Initialize module
     */
    async initialize() {
        await this.load();
    },

    /**
     * Load orders from database
     */
    async load() {
        try {
            this.orders = await Repository.orders.getAll();
            this.filteredOrders = [...this.orders];
            return this.orders;
        } catch (error) {
            UI.showToast(I18n.t('errors.loading'), 'error');
            throw error;
        }
    },

    /**
     * Search orders
     */
    search(query) {
        if (!query || query.trim() === '') {
            this.filteredOrders = [...this.orders];
            return this.filteredOrders;
        }
        
        const lowerQuery = query.toLowerCase();
        this.filteredOrders = this.orders.filter(o => 
            o.order_id?.toLowerCase().includes(lowerQuery) ||
            o.klant_naam?.toLowerCase().includes(lowerQuery) ||
            o.klant_email?.toLowerCase().includes(lowerQuery) ||
            o.collectie?.toLowerCase().includes(lowerQuery)
        );
        
        return this.filteredOrders;
    },

    /**
     * Filter by fase
     */
    filterByFase(faseId) {
        if (faseId === null || faseId === undefined) {
            this.filteredOrders = [...this.orders];
        } else {
            this.filteredOrders = this.orders.filter(o => o.huidige_fase === faseId);
        }
        return this.filteredOrders;
    },

    /**
     * Sort orders
     */
    sort(by) {
        switch (by) {
            case 'newest':
                this.filteredOrders.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'oldest':
                this.filteredOrders.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
                break;
            case 'deadline':
                this.filteredOrders.sort((a, b) => {
                    if (!a.deadline) return 1;
                    if (!b.deadline) return -1;
                    return new Date(a.deadline) - new Date(b.deadline);
                });
                break;
            case 'fase':
                this.filteredOrders.sort((a, b) => a.huidige_fase - b.huidige_fase);
                break;
        }
        return this.filteredOrders;
    },

    /**
     * Get active orders (not deleted, not completed)
     */
    getActive() {
        return this.orders.filter(o => 
            o.status !== 'deleted' && o.huidige_fase < 12
        );
    },

    /**
     * Get order by ID
     */
    getById(orderId) {
        return this.orders.find(o => o.order_id === orderId);
    },

    /**
     * Get orders by fase
     */
    getByFase(faseId) {
        return this.orders.filter(o => 
            o.huidige_fase === faseId && o.status !== 'deleted'
        );
    },

    /**
     * Create new order
     */
    async create(formData, userId) {
        try {
            console.log('OrdersModule.create called with:', { formData, userId });
            
            const orderId = Utils.generateOrderId(this.orders);
            
            // Handle custom collectie
            let collectie = formData.collectie;
            if (collectie === 'Aangepast' && formData.collectie_custom) {
                collectie = formData.collectie_custom.trim();
            }
            
            const workflow = getWorkflowForCollectie(collectie);
            
            const orderData = {
                order_id: orderId,
                klant_naam: formData.klant_naam?.trim(),
                klant_email: formData.klant_email?.trim(),
                klant_telefoon: formData.klant_telefoon?.trim() || null,
                straat: formData.straat?.trim() || null,
                huisnummer: formData.huisnummer?.trim() || null,
                postcode: formData.postcode?.trim() || null,
                plaats: formData.plaats?.trim() || null,
                scan_datum: formData.scan_datum || null,
                hoogte_cm: parseInt(formData.hoogte_cm) || 20,
                collectie: collectie,
                kleur_afwerking: formData.kleur_afwerking?.trim() || null,
                sokkel: formData.sokkel || 'Zonder',
                sokkel_details: formData.sokkel_details?.trim() || null,
                extra_notities: formData.extra_notities?.trim() || null,
                huidige_fase: 0,
                toestemming_delen: formData.toestemming_delen === 'on' || formData.toestemming_delen === true,
                workflow: workflow,
                deadline: formData.deadline || null,
                verantwoordelijke_user: userId,
                created_by: userId,
                status: 'active',
                public_token: Utils.generatePublicToken()
            };
            
            console.log('Order data prepared:', orderData);
            
            const order = await Repository.orders.create(orderData, userId);
            
            console.log('Repository response:', order);
            
            if (order) {
                this.orders.unshift(order);
                this.filteredOrders = [...this.orders];
            }
            
            return order;
            
        } catch (error) {
            console.error('OrdersModule.create error:', error);
            throw error;
        }
    },

    /**
     * Update order
     */
    async update(orderId, formData, userId) {
        try {
            console.log('OrdersModule.update called with:', { orderId, formData, userId });
            
            const updates = {
                klant_naam: formData.klant_naam?.trim(),
                klant_email: formData.klant_email?.trim(),
                klant_telefoon: formData.klant_telefoon?.trim() || null,
                straat: formData.straat?.trim() || null,
                huisnummer: formData.huisnummer?.trim() || null,
                postcode: formData.postcode?.trim() || null,
                plaats: formData.plaats?.trim() || null,
                scan_datum: formData.scan_datum || null,
                hoogte_cm: parseInt(formData.hoogte_cm) || 20,
                collectie: formData.collectie,
                kleur_afwerking: formData.kleur_afwerking?.trim() || null,
                sokkel: formData.sokkel || 'Zonder',
                extra_notities: formData.extra_notities?.trim() || null,
                deadline: formData.deadline || null
            };
            
            console.log('Order updates prepared:', updates);
            
            const order = await Repository.orders.update(orderId, updates, userId);
            
            console.log('Repository update response:', order);
            
            // Update local cache
            const index = this.orders.findIndex(o => o.order_id === orderId);
            if (index !== -1) {
                this.orders[index] = { ...this.orders[index], ...order };
            }
            
            return order;
            
        } catch (error) {
            console.error('OrdersModule.update error:', error);
            throw error;
        }
    },

    /**
     * Update order fase
     */
    async updateFase(orderId, newFase, userId) {
        try {
            const order = await Repository.orders.updateFase(orderId, newFase, userId);
            
            // Update local cache
            const index = this.orders.findIndex(o => o.order_id === orderId);
            if (index !== -1) {
                this.orders[index] = { ...this.orders[index], ...order };
            }
            
            return order;
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * Delete order (soft delete)
     */
    async delete(orderId, userId) {
        try {
            await Repository.orders.delete(orderId, userId);
            
            // Update local cache
            const index = this.orders.findIndex(o => o.order_id === orderId);
            if (index !== -1) {
                this.orders[index].status = 'deleted';
            }
            
            this.filteredOrders = this.filteredOrders.filter(o => o.order_id !== orderId);
            
            return true;
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * Upload 3D scan file
     */
    async uploadScanFile(orderId, file, userId) {
        try {
            const fileData = await Repository.files.upload(file, orderId);
            const order = await Repository.files.updateOrderFile(orderId, fileData, userId);
            
            // Update local cache
            const index = this.orders.findIndex(o => o.order_id === orderId);
            if (index !== -1) {
                this.orders[index].bestand_url = fileData.url;
                this.orders[index].bestand_naam = fileData.name;
                this.orders[index].bestand_path = fileData.path;
            }
            
            return order;
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * Load quality photos for order
     */
    async loadQualityPhotos(orderId) {
        try {
            const photos = await Repository.photos.getByOrderId(orderId, 8);
            this.qualityPhotos[orderId] = photos;
            return photos;
        } catch (error) {
            console.error('Load photos error:', error);
            return [];
        }
    },

    /**
     * Upload quality photo
     */
    async uploadQualityPhoto(orderId, photoType, file, userId) {
        try {
            const photo = await Repository.photos.upload(file, orderId, photoType, 8, userId);
            
            if (!this.qualityPhotos[orderId]) {
                this.qualityPhotos[orderId] = [];
            }
            this.qualityPhotos[orderId].push(photo);
            
            return photo;
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * Delete quality photo
     */
    async deleteQualityPhoto(photoId, filePath, orderId) {
        try {
            await Repository.photos.delete(photoId, filePath);
            
            if (this.qualityPhotos[orderId]) {
                this.qualityPhotos[orderId] = this.qualityPhotos[orderId].filter(p => p.id !== photoId);
            }
            
            return true;
            
        } catch (error) {
            throw error;
        }
    },

    /**
     * Get quality photo status
     */
    getQualityPhotoStatus(orderId) {
        const photos = this.qualityPhotos[orderId] || [];
        return {
            front: photos.find(p => p.photo_type === 'front'),
            back: photos.find(p => p.photo_type === 'back'),
            bottom: photos.find(p => p.photo_type === 'bottom'),
            allComplete: photos.filter(p => ['front', 'back', 'bottom'].includes(p.photo_type)).length >= 3
        };
    },

    /**
     * Get dashboard stats
     */
    getDashboardStats() {
        const active = this.orders.filter(o => 
            o.huidige_fase < 12 && o.status !== 'deleted'
        ).length;
        
        const completed = this.orders.filter(o => o.huidige_fase === 12
        ).length;
        
        const delayed = this.orders.filter(o => {
            if (!o.deadline || o.huidige_fase >= 12 || o.status === 'deleted') return false;
            return new Date(o.deadline) < new Date();
        }).length;
        
        const atBronsgieterij = this.orders.filter(o => 
            (o.huidige_fase === 13 || o.huidige_fase === 15) && o.status !== 'deleted'
        ).length;
        
        return { active, completed, delayed, atBronsgieterij };
    },

    /**
     * Check if order can advance
     */
    canAdvance(order) {
        // Fase 1 = Scan bewerkt: need file
        if (order.huidige_fase === 1 && !order.bestand_url) {
            return { can: false, reason: I18n.t('orders.requiredFile') };
        }
        
        // Fase 8 = Ateliercontrole: need photos
        if (order.huidige_fase === 8) {
            const status = this.getQualityPhotoStatus(order.order_id);
            if (!status.allComplete) {
                return { can: false, reason: I18n.t('orders.requiredPhotos') };
            }
        }
        
        return { can: true };
    },

    /**
     * Get advance button text
     */
    getAdvanceButtonText(order) {
        const nextFase = getNextFase(order.huidige_fase, order.collectie);
        
        if (nextFase === null) {
            return 'Afgerond';
        }
        
        const check = this.canAdvance(order);
        if (!check.can) {
            return check.reason;
        }
        
        const faseName = I18n.getFaseName(nextFase);
        return `${I18n.t('orders.toNext')}: ${faseName}`;
    },

    /**
     * Get nazorg orders
     */
    getNazorgOrders() {
        return this.orders.filter(o => 
            (o.huidige_fase === 10 || o.huidige_fase === 11) && 
            o.status !== 'deleted'
        );
    },

    /**
     * Get nazorg color
     */
    getNazorgColor(order) {
        if (!order.verzenddatum) return 'blue';
        
        const shipDate = new Date(order.verzenddatum);
        const now = new Date();
        const daysSinceShipping = (now - shipDate) / (1000 * 60 * 60 * 24);
        
        return daysSinceShipping >= 4 ? 'pink' : 'blue';
    },

    /**
     * Cleanup
     */
    cleanup() {
        this.subscriptions.forEach(unsub => unsub && unsub());
        this.subscriptions = [];
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OrdersModule;
}
