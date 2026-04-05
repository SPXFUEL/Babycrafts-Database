/**
 * AUDIT LOGGING - Track all changes
 */

const Audit = {
    logs: [],
    maxLogs: 100,
    
    /**
     * Initialize audit system
     */
    initialize() {
        // Load existing logs from session storage
        this.logs = Utils.session.get('audit_logs', []);
    },

    /**
     * Log an action
     */
    log(action, entityType, entityId, details = {}) {
        const logEntry = {
            id: Utils.generateId(),
            timestamp: new Date().toISOString(),
            action,
            entityType,
            entityId,
            details,
            user: App.currentUser ? {
                id: App.currentUser.id,
                email: App.currentUser.email
            } : null,
            userAgent: navigator.userAgent
        };
        
        this.logs.unshift(logEntry);
        
        // Keep only max logs
        if (this.logs.length > this.maxLogs) {
            this.logs = this.logs.slice(0, this.maxLogs);
        }
        
        // Save to session storage
        Utils.session.set('audit_logs', this.logs);
        
        // Console log for debugging
        console.log('[AUDIT]', logEntry);
        
        return logEntry;
    },

    /**
     * Get all logs
     */
    getLogs(filters = {}) {
        let logs = [...this.logs];
        
        if (filters.entityType) {
            logs = logs.filter(l => l.entityType === filters.entityType);
        }
        
        if (filters.action) {
            logs = logs.filter(l => l.action === filters.action);
        }
        
        if (filters.entityId) {
            logs = logs.filter(l => l.entityId === filters.entityId);
        }
        
        if (filters.since) {
            const sinceDate = new Date(filters.since);
            logs = logs.filter(l => new Date(l.timestamp) >= sinceDate);
        }
        
        return logs;
    },

    /**
     * Get logs for specific order
     */
    getOrderLogs(orderId) {
        return this.getLogs({ entityType: 'order', entityId: orderId });
    },

    /**
     * Get recent activity summary
     */
    getRecentActivity(limit = 10) {
        return this.logs.slice(0, limit).map(log => ({
            time: new Date(log.timestamp).toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' }),
            action: this.formatAction(log.action),
            entity: log.entityId,
            user: log.user?.email?.split('@')[0] || 'Systeem'
        }));
    },

    /**
     * Format action for display
     */
    formatAction(action) {
        const actionMap = {
            'create': 'aangemaakt',
            'update': 'bijgewerkt',
            'delete': 'verwijderd',
            'faseChange': 'fase gewijzigd',
            'photoUpload': 'foto geüpload',
            'fileUpload': 'bestand geüpload',
            'login': 'ingelogd',
            'logout': 'uitgelogd',
            'error': 'fout'
        };
        return actionMap[action] || action;
    },

    /**
     * Clear old logs
     */
    clear() {
        this.logs = [];
        Utils.session.remove('audit_logs');
    },

    /**
     * Export logs as JSON
     */
    export() {
        return JSON.stringify(this.logs, null, 2);
    },

    /**
     * Render audit log viewer
     */
    render(container, filters = {}) {
        const logs = this.getLogs(filters);
        
        if (logs.length === 0) {
            container.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    Geen audit logs gevonden
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <div class="space-y-2">
                ${logs.slice(0, 50).map(log => `
                    <div class="bg-gray-50 rounded-lg p-3 text-sm">
                        <div class="flex items-center justify-between mb-1">
                            <span class="font-medium text-gray-900">${this.formatAction(log.action)}</span>
                            <span class="text-xs text-gray-500">${new Date(log.timestamp).toLocaleString('nl-NL')}</span>
                        </div>
                        <div class="text-gray-600">
                            ${log.entityType}: <span class="font-mono">${log.entityId}</span>
                        </div>
                        ${log.user ? `
                            <div class="text-xs text-gray-500 mt-1">
                                Door: ${log.user.email}
                            </div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        `;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Audit;
}
