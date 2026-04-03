/**
 * AI AGENT MODULE - Babycrafts Atelier Pro
 * Interne AI assistent voor slimme vragen en antwoorden
 */

const AIAgent = {
    context: null,
    
    initialize() {
        this.context = {
            orders: [],
            todos: [],
            currentDate: new Date()
        };
    },
    
    updateContext(orders, todos) {
        this.context.orders = orders || [];
        this.context.todos = todos || [];
        this.context.currentDate = new Date();
    },
    
    ask(question) {
        const q = question.toLowerCase();
        
        // Vraag: Welke beeldjes moeten vandaag écht af?
        if (q.includes('vandaag') && (q.includes('af') || q.includes('klaar') || q.includes('deadline'))) {
            return this.getTodayPriorityOrders();
        }
        
        // Vraag: Wat is de status van [klantnaam]?
        if (q.includes('status') || q.includes('waar is')) {
            const name = this.extractName(question);
            if (name) return this.getOrderStatus(name);
        }
        
        // Vraag: Hoeveel orders hebben we deze week?
        if (q.includes('hoeveel') && q.includes('week')) {
            return this.getWeeklyStats();
        }
        
        // Vraag: Welke orders zijn vertraagd?
        if (q.includes('vertraagd') || q.includes('te laat')) {
            return this.getDelayedOrders();
        }
        
        // Vraag: Wat moet ik vandaag doen?
        if (q.includes('wat moet') && q.includes('doen')) {
            return this.getTodayTodos();
        }
        
        // Default: geef een overzicht
        return this.getGeneralOverview();
    },
    
    getTodayPriorityOrders() {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Orders met deadline vandaag of morgen
        const urgent = this.context.orders.filter(o => {
            if (!o.deadline || o.huidige_fase >= 12) return false;
            const deadline = new Date(o.deadline);
            return deadline <= tomorrow;
        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        // Orders die al te laat zijn
        const overdue = this.context.orders.filter(o => {
            if (!o.deadline || o.huidige_fase >= 12) return false;
            const deadline = new Date(o.deadline);
            return deadline < today;
        });
        
        let response = "🎯 **Prioriteit voor vandaag:**\n\n";
        
        if (overdue.length > 0) {
            response += `⚠️ **${overdue.length} order(s) zijn over tijd:**\n`;
            overdue.slice(0, 3).forEach(o => {
                response += `• ${o.klant_naam} (${o.order_id}) - ${I18n.getFaseName(o.huidige_fase)}\n`;
            });
            if (overdue.length > 3) response += `  ...en ${overdue.length - 3} meer\n`;
            response += "\n";
        }
        
        if (urgent.length > 0) {
            response += `⏰ **${urgent.length} order(s) met deadline vandaag/morgen:**\n`;
            urgent.slice(0, 5).forEach(o => {
                const daysLeft = Math.ceil((new Date(o.deadline) - today) / (1000 * 60 * 60 * 24));
                const dayText = daysLeft === 0 ? "vandaag" : "morgen";
                response += `• ${o.klant_naam} - ${I18n.getFaseName(o.huidige_fase)} (af ${dayText})\n`;
            });
        } else if (overdue.length === 0) {
            response += "✅ Geen urgente deadlines vandaag!\n";
        }
        
        return response;
    },
    
    getOrderStatus(name) {
        const orders = this.context.orders.filter(o => 
            o.klant_naam?.toLowerCase().includes(name.toLowerCase())
        );
        
        if (orders.length === 0) {
            return `❌ Geen orders gevonden voor "${name}"`;
        }
        
        if (orders.length === 1) {
            const o = orders[0];
            return `📋 **${o.klant_naam}** (${o.order_id})\n\n` +
                   `Fase: ${I18n.getFaseName(o.huidige_fase)}\n` +
                   `Collectie: ${o.collectie}\n` +
                   (o.deadline ? `Deadline: ${Utils.formatDate(o.deadline)}\n` : '') +
                   (o.bestand_url ? '✅ Scan bestand geüpload\n' : '⏳ Wacht op scan bestand');
        }
        
        let response = `📋 **${orders.length} orders gevonden voor "${name}":**\n\n`;
        orders.slice(0, 5).forEach(o => {
            response += `• ${o.order_id} - ${I18n.getFaseName(o.huidige_fase)}\n`;
        });
        return response;
    },
    
    getWeeklyStats() {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        
        const thisWeek = this.context.orders.filter(o => {
            const created = new Date(o.created_at);
            return created >= weekAgo;
        });
        
        const completed = this.context.orders.filter(o => {
            if (!o.afgerond_datum) return false;
            const completed = new Date(o.afgerond_datum);
            return completed >= weekAgo;
        });
        
        return `📊 **Deze week:**\n\n` +
               `• ${thisWeek.length} nieuwe order(s)\n` +
               `• ${completed.length} order(s) afgerond\n` +
               `• ${this.context.orders.filter(o => o.huidige_fase < 12).length} actieve orders in totaal`;
    },
    
    getDelayedOrders() {
        const today = new Date();
        const delayed = this.context.orders.filter(o => {
            if (!o.deadline || o.huidige_fase >= 12) return false;
            return new Date(o.deadline) < today;
        }).sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        
        if (delayed.length === 0) {
            return "✅ Geen vertraagde orders! Alles loopt volgens schema.";
        }
        
        let response = `⚠️ **${delayed.length} order(s) zijn vertraagd:**\n\n`;
        delayed.forEach(o => {
            const daysLate = Math.ceil((today - new Date(o.deadline)) / (1000 * 60 * 60 * 24));
            response += `• ${o.klant_naam} - ${daysLate} dag(en) te laat\n`;
        });
        return response;
    },
    
    getTodayTodos() {
        const allTodos = this.context.todos || [];
        const incomplete = allTodos.filter(t => !t.completed);
        
        if (incomplete.length === 0) {
            return "✅ Geen openstaande taken! Tijd voor een bakkie koffie ☕";
        }
        
        const highPriority = incomplete.filter(t => t.prioriteit === 'hoog');
        const normal = incomplete.filter(t => t.prioriteit !== 'hoog');
        
        let response = `📝 **Jouw taken voor vandaag:**\n\n`;
        
        if (highPriority.length > 0) {
            response += `**Prioriteit hoog:**\n`;
            highPriority.slice(0, 3).forEach(t => {
                response += `🔴 ${t.titel}\n`;
            });
            response += "\n";
        }
        
        if (normal.length > 0) {
            response += `**Overige taken:**\n`;
            normal.slice(0, 5).forEach(t => {
                response += `• ${t.titel}\n`;
            });
        }
        
        return response;
    },
    
    getGeneralOverview() {
        const stats = {
            active: this.context.orders.filter(o => o.huidige_fase < 12).length,
            completed: this.context.orders.filter(o => o.huidige_fase === 12).length,
            delayed: this.context.orders.filter(o => {
                if (!o.deadline || o.huidige_fase >= 12) return false;
                return new Date(o.deadline) < new Date();
            }).length
        };
        
        return `👋 **Hallo!**\n\n` +
               `Ik ben je Babycrafts AI assistent. Je kunt me vragen stellen zoals:\n\n` +
               `• "Welke beeldjes moeten vandaag af?"\n` +
               `• "Welke orders zijn vertraagd?"\n` +
               `• "Wat is de status van [klantnaam]?"\n` +
               `• "Wat moet ik vandaag doen?"\n\n` +
               `📊 **Huidige stand:**\n` +
               `• ${stats.active} actieve orders\n` +
               `• ${stats.completed} afgerond\n` +
               `• ${stats.delayed} vertraagd`;
    },
    
    extractName(question) {
        // Probeer een naam te extraheren uit de vraag
        const patterns = [
            /van (\w+)/i,
            /van ([\w\s]+)\?/i,
            /status (?:van )?(\w+)/i,
            /waar is (\w+)/i
        ];
        
        for (const pattern of patterns) {
            const match = question.match(pattern);
            if (match) return match[1].trim();
        }
        return null;
    }
};
