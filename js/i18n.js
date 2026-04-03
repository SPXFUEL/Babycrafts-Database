/**
 * I18N - Internationalization for Babycrafts Atelier Pro V2
 */

const TRANSLATIONS = {
    nl: {
        app: {
            name: 'BabyCrafts Atelier Pro',
            version: 'Versie'
        },
        nav: {
            dashboard: 'Dashboard',
            schema: 'Productie Schema',
            archief: 'Archief',
            orders: 'Orders',
            nazorg: 'Nazorg',
            todos: 'To-Do Lijst',
            time: 'Tijdregistratie',
            analytics: 'Analytics',
            settings: 'Instellingen',
            search: 'Zoek orders...'
        },
        auth: {
            login: 'Inloggen',
            logout: 'Uitloggen',
            email: 'E-mailadres',
            password: 'Wachtwoord',
            loginButton: 'Inloggen',
            loginError: 'Vul e-mail en wachtwoord in',
            loginSuccess: 'Succesvol ingelogd',
            logoutSuccess: 'Succesvol uitgelogd',
            admin: 'Beheerder',
            medewerker: 'Medewerker',
            onlyAdmin: 'Alleen beheerders kunnen dit',
            sessionExpired: 'Sessie verlopen, log opnieuw in'
        },
        orders: {
            new: 'Nieuwe Order',
            create: 'Order Aanmaken',
            created: 'Order aangemaakt',
            deleted: 'Order verwijderd',
            updated: 'Order bijgewerkt',
            faseUpdated: 'Fase bijgewerkt',
            notFound: 'Order niet gevonden',
            customerName: 'Klantnaam',
            customerEmail: 'E-mail',
            customerPhone: 'Telefoon',
            address: 'Adres',
            street: 'Straat',
            houseNumber: 'Huisnummer',
            postcode: 'Postcode',
            city: 'Plaats',
            scanDate: 'Scan datum',
            height: 'Hoogte',
            heightCm: 'Hoogte (cm)',
            collection: 'Collectie',
            color: 'Kleurafwerking',
            base: 'Sokkel',
            baseNone: 'Zonder',
            baseWith: 'Met',
            baseFixed: 'Met én Vast',
            baseDetails: 'Sokkel details',
            notes: 'Extra notities',
            deadline: 'Deadline',
            permission: 'Toestemming delen',
            tracking: 'Track & Trace',
            trackUrl: 'Tracking URL',
            download3d: 'Download 3D bestand',
            fases: [
                'Intake voltooid',
                'Scan bewerkt',
                'Geprint',
                'Support verwijderd',
                'Opgevuld',
                'Geschuurd',
                'Kleurafwerking',
                'Onderzijde & sokkel',
                'Ateliercontrole',
                'Verpakt',
                'Verzonden',
                'Nazorg',
                'Afgerond',
                'Bij Lemarez (spuiten)',
                'Terug van Lemarez',
                'Bij Bronsgieterij (gieten)',
                'Terug van Bronsgieterij'
            ],
            active: 'Actieve orders',
            shipped: 'Verzonden',
            delayed: 'In vertraging',
            atBronsgieterij: 'Bij bronsgieterij',
            filter: 'Filter',
            sort: 'Sorteren',
            sortNewest: 'Nieuwste eerst',
            sortOldest: 'Oudste eerst',
            sortDeadline: 'Deadline',
            sortFase: 'Fase',
            search: 'Zoeken...',
            noResults: 'Geen orders gevonden',
            requiredFile: 'Eerst 3D bestand uploaden',
            requiredPhotos: 'Eerst 3 foto\'s maken',
            photosComplete: 'Alle foto\'s compleet',
            toNext: 'Naar',
            confirmDelete: 'Order verwijderen?',
            confirmDeleteDesc: 'Deze actie kan niet ongedaan worden gemaakt.',
            audit: {
                created: 'aangemaakt',
                updated: 'bijgewerkt',
                deleted: 'verwijderd',
                faseChange: 'fase gewijzigd',
                photoUpload: 'foto geüpload',
                fileUpload: 'bestand geüpload'
            }
        },
        todos: {
            new: 'Nieuwe Taak',
            title: 'Titel',
            category: 'Categorie',
            priority: 'Prioriteit',
            daily: 'Dagelijks',
            weekly: 'Wekelijks',
            monthly: 'Maandelijks',
            onetime: 'Eenmalig',
            low: 'Laag',
            medium: 'Gemiddeld',
            high: 'Hoog',
            added: 'Taak toegevoegd',
            done: 'Taak afgevinkt',
            reopened: 'Taak heropend',
            deleted: 'Taak verwijderd',
            empty: 'Geen taken',
            completed: 'Afgerond',
            openTasks: 'openstaande taken'
        },
        time: {
            register: 'Tijd registreren',
            date: 'Datum',
            start: 'Start',
            end: 'Eind',
            break: 'Pauze (min)',
            total: 'Totaal',
            today: 'Vandaag',
            thisWeek: 'Deze week',
            thisMonth: 'Deze maand',
            pending: 'In afwachting',
            approved: 'Goedgekeurd',
            rejected: 'Afgekeurd',
            approve: 'Goedkeuren',
            reject: 'Afkeuren',
            approveAll: 'Alles goedkeuren',
            hours: 'uren',
            minutes: 'minuten',
            empty: 'Geen tijdregistraties',
            pendingApproval: 'Wacht op goedkeuring'
        },
        communications: {
            sendMessage: 'Bericht versturen',
            sendEmail: 'E-mail versturen',
            sendWhatsApp: 'WhatsApp versturen',
            welcome: 'Welkomstbericht',
            shipping: 'Verzendbericht',
            nazorg: 'Nazorg bericht',
            skip: 'Overslaan',
            confirmComplete: 'Afronden zonder bericht?',
            noPhone: 'Geen telefoonnummer'
        },
        errors: {
            general: 'Er is iets misgegaan',
            noConnection: 'Geen verbinding met database',
            loading: 'Fout bij laden',
            saving: 'Fout bij opslaan',
            notFound: 'Niet gevonden',
            unauthorized: 'Geen toegang',
            offline: 'Je bent offline',
            invalidEmail: 'Ongeldig e-mailadres',
            invalidPhone: 'Ongeldig telefoonnummer',
            invalidPostcode: 'Ongeldige postcode',
            fileTooLarge: 'Bestand te groot',
            invalidFileType: 'Ongeldig bestandstype',
            requiredField: 'Dit veld is verplicht'
        },
        success: {
            saved: 'Opgeslagen',
            deleted: 'Verwijderd',
            updated: 'Bijgewerkt',
            copied: 'Gekopieerd',
            uploaded: 'Geüpload'
        },
        offline: {
            title: 'Geen internetverbinding',
            message: 'Sommige functies zijn beperkt tot je weer online bent.',
            retry: 'Opnieuw proberen'
        }
    },
    en: {
        app: {
            name: 'BabyCrafts Studio Pro',
            version: 'Version'
        },
        nav: {
            dashboard: 'Dashboard',
            schema: 'Production Schedule',
            archief: 'Archive',
            orders: 'Orders',
            nazorg: 'Aftercare',
            todos: 'To-Do List',
            time: 'Time Tracking',
            analytics: 'Analytics',
            settings: 'Settings',
            search: 'Search orders...'
        },
        auth: {
            login: 'Login',
            logout: 'Logout',
            email: 'Email',
            password: 'Password',
            loginButton: 'Login',
            loginError: 'Please enter email and password',
            loginSuccess: 'Successfully logged in',
            logoutSuccess: 'Successfully logged out',
            admin: 'Administrator',
            medewerker: 'Employee',
            onlyAdmin: 'Only administrators can do this',
            sessionExpired: 'Session expired, please login again'
        },
        orders: {
            new: 'New Order',
            create: 'Create Order',
            created: 'Order created',
            deleted: 'Order deleted',
            updated: 'Order updated',
            faseUpdated: 'Phase updated',
            notFound: 'Order not found',
            customerName: 'Customer Name',
            customerEmail: 'Email',
            customerPhone: 'Phone',
            address: 'Address',
            street: 'Street',
            houseNumber: 'House Number',
            postcode: 'Postcode',
            city: 'City',
            scanDate: 'Scan Date',
            height: 'Height',
            heightCm: 'Height (cm)',
            collection: 'Collection',
            color: 'Color Finish',
            base: 'Base',
            baseNone: 'Without',
            baseWith: 'With',
            baseFixed: 'With & Fixed',
            baseDetails: 'Base details',
            notes: 'Extra notes',
            deadline: 'Deadline',
            permission: 'Permission to share',
            tracking: 'Track & Trace',
            trackUrl: 'Tracking URL',
            download3d: 'Download 3D file',
            fases: [
                'Intake Complete',
                'Scan Processed',
                'Printed',
                'Support Removed',
                'Filled',
                'Sanded',
                'Color Finish',
                'Bottom & Base',
                'Studio Check',
                'Packed',
                'Shipped',
                'Aftercare',
                'Completed',
                'At Lemarez (spraying)',
                'Back from Lemarez',
                'At Foundry (casting)',
                'Back from Foundry'
            ],
            active: 'Active orders',
            shipped: 'Shipped',
            delayed: 'Delayed',
            atBronsgieterij: 'At foundry',
            filter: 'Filter',
            sort: 'Sort',
            sortNewest: 'Newest first',
            sortOldest: 'Oldest first',
            sortDeadline: 'Deadline',
            sortFase: 'Phase',
            search: 'Search...',
            noResults: 'No orders found',
            requiredFile: 'Upload 3D file first',
            requiredPhotos: 'Take 3 photos first',
            photosComplete: 'All photos complete',
            toNext: 'To',
            confirmDelete: 'Delete order?',
            confirmDeleteDesc: 'This action cannot be undone.',
            audit: {
                created: 'created',
                updated: 'updated',
                deleted: 'deleted',
                faseChange: 'phase changed',
                photoUpload: 'photo uploaded',
                fileUpload: 'file uploaded'
            }
        },
        todos: {
            new: 'New Task',
            title: 'Title',
            category: 'Category',
            priority: 'Priority',
            daily: 'Daily',
            weekly: 'Weekly',
            monthly: 'Monthly',
            onetime: 'One-time',
            low: 'Low',
            medium: 'Medium',
            high: 'High',
            added: 'Task added',
            done: 'Task completed',
            reopened: 'Task reopened',
            deleted: 'Task deleted',
            empty: 'No tasks',
            completed: 'Completed',
            openTasks: 'open tasks'
        },
        time: {
            register: 'Register Time',
            date: 'Date',
            start: 'Start',
            end: 'End',
            break: 'Break (min)',
            total: 'Total',
            today: 'Today',
            thisWeek: 'This week',
            thisMonth: 'This month',
            pending: 'Pending',
            approved: 'Approved',
            rejected: 'Rejected',
            approve: 'Approve',
            reject: 'Reject',
            approveAll: 'Approve all',
            hours: 'hours',
            minutes: 'minutes',
            empty: 'No time entries',
            pendingApproval: 'Pending approval'
        },
        communications: {
            sendMessage: 'Send message',
            sendEmail: 'Send email',
            sendWhatsApp: 'Send WhatsApp',
            welcome: 'Welcome message',
            shipping: 'Shipping message',
            nazorg: 'Aftercare message',
            skip: 'Skip',
            confirmComplete: 'Complete without message?',
            noPhone: 'No phone number'
        },
        errors: {
            general: 'Something went wrong',
            noConnection: 'No database connection',
            loading: 'Error loading',
            saving: 'Error saving',
            notFound: 'Not found',
            unauthorized: 'No access',
            offline: 'You are offline',
            invalidEmail: 'Invalid email',
            invalidPhone: 'Invalid phone number',
            invalidPostcode: 'Invalid postcode',
            fileTooLarge: 'File too large',
            invalidFileType: 'Invalid file type',
            requiredField: 'This field is required'
        },
        success: {
            saved: 'Saved',
            deleted: 'Deleted',
            updated: 'Updated',
            copied: 'Copied',
            uploaded: 'Uploaded'
        },
        offline: {
            title: 'No internet connection',
            message: 'Some features are limited until you are back online.',
            retry: 'Retry'
        }
    }
};

const I18n = {
    currentLang: Utils.storage.get('babycrafts_language', CONFIG.DEFAULT_LANGUAGE),
    
    t(key, options = {}) {
        const lang = TRANSLATIONS[this.currentLang] || TRANSLATIONS.nl;
        
        // Support nested keys like 'orders.fases.0'
        const keys = key.split('.');
        let value = lang;
        
        for (const k of keys) {
            if (value === undefined || value === null) break;
            
            // Handle array indices
            if (!isNaN(k) && Array.isArray(value)) {
                value = value[parseInt(k)];
            } else {
                value = value[k];
            }
        }
        
        if (value === undefined || value === null) {
            // Fallback to key
            return key;
        }
        
        // Handle string with interpolation
        if (typeof value === 'string') {
            return value.replace(/\{\{(\w+)\}\}/g, (match, varName) => {
                return options[varName] !== undefined ? options[varName] : match;
            });
        }
        
        return value;
    },
    
    setLanguage(lang) {
        if (TRANSLATIONS[lang]) {
            this.currentLang = lang;
            Utils.storage.set('babycrafts_language', lang);
            document.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
            return true;
        }
        return false;
    },
    
    getLanguage() {
        return this.currentLang;
    },
    
    getFaseName(index) {
        return this.t(`orders.fases.${index}`) || `Fase ${index}`;
    },
    
    getAvailableLanguages() {
        return [
            { code: 'nl', name: 'Nederlands', flag: '🇳🇱' },
            { code: 'en', name: 'English', flag: '🇬🇧' }
        ];
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { I18n, TRANSLATIONS };
}
