/**
 * TIME REGISTRATION MODULE V2
 */

const TimeModule = {
    entries: [],
    
    async initialize() {
        await this.load();
    },

    async load() {
        try {
            this.entries = await Repository.timeEntries.getAll();
            return this.entries;
        } catch (error) {
            UI.showToast(I18n.t('errors.loading'), 'error');
            throw error;
        }
    },

    async create(datum, start, eind, pauze = 0, opmerking = '', userId, userEmail) {
        try {
            const medewerkerNaam = userEmail ? userEmail.split('@')[0] : 'onbekend';
            
            const entry = await Repository.timeEntries.create({
                medewerker_naam: medewerkerNaam,
                datum,
                start_tijd: start,
                eind_tijd: eind,
                pauze_minuten: pauze,
                opmerking
            }, userId);
            
            if (entry) {
                this.entries.unshift(entry);
            }
            
            return entry;
        } catch (error) {
            throw error;
        }
    },

    async approve(id, approverId) {
        try {
            const updated = await Repository.timeEntries.approve(id, approverId);
            
            const index = this.entries.findIndex(e => e.id === id);
            if (index !== -1) {
                this.entries[index] = updated;
            }
            
            return updated;
        } catch (error) {
            throw error;
        }
    },

    async reject(id, approverId) {
        try {
            const updated = await Repository.timeEntries.reject(id, approverId);
            
            const index = this.entries.findIndex(e => e.id === id);
            if (index !== -1) {
                this.entries[index] = updated;
            }
            
            return updated;
        } catch (error) {
            throw error;
        }
    },

    getStats(userId) {
        const now = new Date();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        const myEntries = this.entries.filter(e => e.user_id === userId && e.status === 'approved');
        
        return {
            today: myEntries
                .filter(e => e.datum === new Date().toISOString().split('T')[0])
                .reduce((sum, e) => sum + (e.totaal_minuten || 0), 0),
            week: myEntries
                .filter(e => new Date(e.datum) >= startOfWeek)
                .reduce((sum, e) => sum + (e.totaal_minuten || 0), 0),
            month: myEntries
                .filter(e => new Date(e.datum) >= startOfMonth)
                .reduce((sum, e) => sum + (e.totaal_minuten || 0), 0),
            pending: this.entries.filter(e => e.status === 'pending')
        };
    },

    getPending() {
        return this.entries.filter(e => e.status === 'pending');
    },

    getPerMedewerker() {
        const stats = {};
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        
        this.entries.forEach(entry => {
            const userId = entry.user_id;
            const entryDate = new Date(entry.datum);
            const isCurrentMonth = entryDate.getMonth() === currentMonth &&
                                  entryDate.getFullYear() === currentYear;
            
            if (!stats[userId]) {
                const email = entry.users?.email || '';
                const meta = entry.users?.raw_user_meta_data || {};
                const name = meta.full_name || meta.name || email.split('@')[0] || 'Onbekend';
                
                stats[userId] = {
                    naam: name,
                    email,
                    totaalMinuten: 0,
                    dezeMaandMinuten: 0,
                    pending: 0,
                    approved: 0
                };
            }
            
            if (entry.status === 'approved') {
                stats[userId].totaalMinuten += entry.totaal_minuten || 0;
                if (isCurrentMonth) {
                    stats[userId].dezeMaandMinuten += entry.totaal_minuten || 0;
                }
                stats[userId].approved++;
            } else if (entry.status === 'pending') {
                stats[userId].pending++;
            }
        });
        
        return stats;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TimeModule;
}
