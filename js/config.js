/**
 * CONFIGURATION - Babycrafts Atelier Pro V2
 * Environment-based configuration - NO HARDCODED CREDENTIALS
 */

const CONFIG = {
    // Supabase configuration - loaded from environment
    get SUPABASE_URL() {
        // In production, this should come from environment variables
        // For now, use localStorage override or default
        return localStorage.getItem('babycrafts_supabase_url') || 'https://awvbaxjmabaqkqminzwx.supabase.co';
    },
    
    get SUPABASE_KEY() {
        return localStorage.getItem('babycrafts_supabase_key') || '';
    },
    
    // Admin configuration
    get ADMIN_EMAIL() {
        return localStorage.getItem('babycrafts_admin_email') || 'info@babycrafts.nl';
    },
    
    VERSION: '3.0.0',
    DEFAULT_LANGUAGE: 'nl',
    
    // Bronsgieterij configuration
    BRONSGIETERIJ: {
        naam: 'Studio Lamarez',
        email: 'info@lemarez.nl',
        collecties: ['Atelier-Bronze', 'Gegoten Brons']
    },
    
    // Business WhatsApp
    BUSINESS_WHATSAPP: '31620526806',
    
    // Storage buckets
    STORAGE_BUCKETS: {
        SCANS: '3d-scans',
        PHOTOS: 'quality-photos'
    },
    
    // Feature flags
    FEATURES: {
        AUDIT_LOGGING: true,
        OFFLINE_INDICATOR: true,
        SEARCH: true,
        CONFIRM_DIALOGS: true
    }
};

// Fases configuration
const FASES_CONFIG = [
    { id: 0, color: 'bg-gray-500', text: 'text-gray-600', name: 'Intake voltooid', workflow: 'all' },
    { id: 1, color: 'bg-blue-500', text: 'text-blue-600', name: 'Scan bewerkt', workflow: 'all' },
    { id: 2, color: 'bg-purple-500', text: 'text-purple-600', name: 'Geprint', workflow: 'all' },
    { id: 3, color: 'bg-pink-500', text: 'text-pink-600', name: 'Support verwijderd', workflow: 'standard' },
    { id: 4, color: 'bg-amber-500', text: 'text-amber-600', name: 'Opgevuld', workflow: 'standard' },
    { id: 5, color: 'bg-emerald-500', text: 'text-emerald-600', name: 'Geschuurd', workflow: 'standard' },
    { id: 6, color: 'bg-cyan-500', text: 'text-cyan-600', name: 'Kleurafwerking', workflow: 'standard' },
    { id: 7, color: 'bg-lime-500', text: 'text-lime-600', name: 'Onderzijde & sokkel', workflow: 'standard' },
    { id: 8, color: 'bg-green-500', text: 'text-green-600', name: 'Ateliercontrole', workflow: 'all' },
    { id: 9, color: 'bg-yellow-500', text: 'text-yellow-600', name: 'Verpakt', workflow: 'all' },
    { id: 10, color: 'bg-amber-500', text: 'text-amber-600', name: 'Verzonden', workflow: 'all' },
    { id: 11, color: 'bg-indigo-500', text: 'text-indigo-600', name: 'Nazorg', workflow: 'all' },
    { id: 12, color: 'bg-green-600', text: 'text-green-700', name: 'Afgerond', workflow: 'all' },
    { id: 13, color: 'bg-orange-500', text: 'text-orange-600', name: 'Bij Lemarez (spuiten)', workflow: 'brons', icon: 'factory', duration: '8 weken' },
    { id: 14, color: 'bg-teal-500', text: 'text-teal-600', name: 'Terug van Lemarez', workflow: 'brons', icon: 'arrow-left-circle' },
    { id: 15, color: 'bg-orange-600', text: 'text-orange-700', name: 'Bij Bronsgieterij (gieten)', workflow: 'brons_cast', icon: 'flame', duration: '12-15 weken' },
    { id: 16, color: 'bg-teal-600', text: 'text-teal-700', name: 'Terug van Bronsgieterij', workflow: 'brons_cast', icon: 'check-circle' }
];

// Workflow configurations
const WORKFLOWS = {
    standard: {
        name: 'Standaard',
        fases: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
        collecties: ['Figura', 'Arte-Lumina', 'Natura-Alba', 'Ouder & Kind', 'Babybeeld', 'Aangepast'],
        duration: '5 weken'
    },
    atelier_bronze: {
        name: 'Atelier Bronze (Lemarez spuiten)',
        fases: [0, 1, 2, 13, 14, 8, 9, 10, 11, 12],
        collecties: ['Atelier-Bronze'],
        skipFases: [3, 4, 5, 6, 7],
        duration: '8 weken bij Lemarez'
    },
    gegoten_brons: {
        name: 'Gegoten Brons (12-15 weken)',
        fases: [0, 15, 16, 8, 9, 10, 11, 12],
        collecties: ['Gegoten Brons'],
        skipFases: [1, 2, 3, 4, 5, 6, 7, 13, 14],
        duration: '12-15 weken bronsgieterij'
    }
};

// Helper functions
function getWorkflowForCollectie(collectie) {
    if (WORKFLOWS.atelier_bronze.collecties.includes(collectie)) return 'atelier_bronze';
    if (WORKFLOWS.gegoten_brons.collecties.includes(collectie)) return 'gegoten_brons';
    return 'standard';
}

function getNextFase(currentFase, collectie) {
    const workflow = getWorkflowForCollectie(collectie);
    const fases = WORKFLOWS[workflow].fases;
    const currentIndex = fases.indexOf(currentFase);
    
    if (currentIndex === -1 || currentIndex >= fases.length - 1) {
        return null;
    }
    
    return fases[currentIndex + 1];
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CONFIG, FASES_CONFIG, WORKFLOWS, getWorkflowForCollectie, getNextFase };
}
