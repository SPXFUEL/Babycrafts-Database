/**
 * TIME MODULE - Babycrafts
 */

const TimeModule = {
    entries: [],

    async initialize() {
        await this.load();
    },

    async load() {
        // No join on auth.users — anon key cannot read that table
        this.entries = await Repository.timeEntries.getAll();
    },

    getStats(userId) {
        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // For PIN auth, userId is not a UUID, so match on medewerker_naam instead
        const myEntries = this.entries.filter(e => e.status === 'approved');

        return {
            today: myEntries
                .filter(e => e.datum === today)
                .reduce((s, e) => s + (e.totaal_minuten || 0), 0),
            week: myEntries
                .filter(e => new Date(e.datum) >= startOfWeek)
                .reduce((s, e) => s + (e.totaal_minuten || 0), 0),
            month: myEntries
                .filter(e => new Date(e.datum) >= startOfMonth)
                .reduce((s, e) => s + (e.totaal_minuten || 0), 0),
        };
    },

    getPerMedewerker() {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();
        const stats = {};

        this.entries.forEach(e => {
            const key = e.medewerker_naam || 'Onbekend';
            if (!stats[key]) {
                stats[key] = { naam: key, totaalMinuten: 0, dezeMaandMinuten: 0, pending: 0, approved: 0 };
            }
            const d = new Date(e.datum);
            const isThisMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;
            if (e.status === 'approved') {
                stats[key].totaalMinuten += e.totaal_minuten || 0;
                if (isThisMonth) stats[key].dezeMaandMinuten += e.totaal_minuten || 0;
                stats[key].approved++;
            } else if (e.status === 'pending') {
                stats[key].pending++;
            }
        });

        return stats;
    },

    async create(datum, start, eind, pauze = 0, opmerking = '', medewerkerNaam = 'Onbekend') {
        const startMs = new Date(`2000-01-01T${start}`).getTime();
        const eindMs  = new Date(`2000-01-01T${eind}`).getTime();
        const totaal  = Math.round((eindMs - startMs) / 60000) - (pauze || 0);

        const entry = await Repository.timeEntries.create({
            medewerker_naam: medewerkerNaam,
            datum,
            start_tijd: start,
            eind_tijd: eind,
            pauze_minuten: pauze || 0,
            totaal_minuten: totaal,
            opmerking: opmerking || null,
            status: 'pending',
            created_at: new Date().toISOString(),
        });

        if (entry) this.entries.unshift(entry);
        return entry;
    },
};
