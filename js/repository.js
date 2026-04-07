/**
 * REPOSITORY - Babycrafts Data Access Layer
 * All Supabase queries go through here.
 */

const Repository = {
    supabase: null,

    initialize(client) {
        this.supabase = client;
    },

    // Convert PIN-based user ID to null (UUID columns reject non-UUID strings)
    toUUID(id) {
        if (!id) return null;
        return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
    },

    // Map Supabase error codes to friendly Dutch messages
    friendlyError(err) {
        if (!err) return 'Onbekende fout';
        const map = {
            '42501': 'Geen toegang tot database.',
            '23514': err.message?.includes('huidige_fase')
                ? 'Fase niet ondersteund in database.'
                : 'Ongeldige waarde ingevoerd.',
            '23505': 'Dit record bestaat al.',
            '23503': 'Kan niet verwijderen: gekoppelde data aanwezig.',
            '22P02': 'Ongeldig gegevensformaat.',
            'PGRST116': 'Record niet gevonden.',
        };
        return map[err.code] || err.message || 'Fout bij opslaan.';
    },

    // ── ORDERS ─────────────────────────────────────────────────────────────

    orders: {
        async getAll() {
            const { data, error } = await Repository.supabase
                .from('orders')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw new Error(Repository.friendlyError(error));
            return data || [];
        },

        async create(orderData) {
            const { data, error } = await Repository.supabase
                .from('orders')
                .insert([orderData])
                .select()
                .single();
            if (error) throw new Error(Repository.friendlyError(error));
            return data;
        },

        async update(orderId, updates) {
            const { data, error } = await Repository.supabase
                .from('orders')
                .update({ ...updates, updated_at: new Date().toISOString() })
                .eq('order_id', orderId)
                .select()
                .single();
            if (error) throw new Error(Repository.friendlyError(error));
            return data;
        },

        async delete(orderId) {
            const { error } = await Repository.supabase
                .from('orders')
                .update({ status: 'deleted', deleted_at: new Date().toISOString() })
                .eq('order_id', orderId);
            if (error) throw new Error(Repository.friendlyError(error));
            return true;
        },
    },

    // ── TODOS ──────────────────────────────────────────────────────────────

    todos: {
        async getAll() {
            const { data, error } = await Repository.supabase
                .from('todos')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw new Error(Repository.friendlyError(error));
            return data || [];
        },

        async create(todoData) {
            const { data, error } = await Repository.supabase
                .from('todos')
                .insert([todoData])
                .select()
                .single();
            if (error) throw new Error(Repository.friendlyError(error));
            return data;
        },

        async update(id, updates) {
            const { data, error } = await Repository.supabase
                .from('todos')
                .update(updates)
                .eq('id', id)
                .select()
                .single();
            if (error) throw new Error(Repository.friendlyError(error));
            return data;
        },

        async delete(id) {
            const { error } = await Repository.supabase
                .from('todos')
                .delete()
                .eq('id', id);
            if (error) throw new Error(Repository.friendlyError(error));
            return true;
        },
    },

    // ── TIME ENTRIES ───────────────────────────────────────────────────────

    timeEntries: {
        async getAll() {
            // No join on auth.users — anon key cannot read that table
            const { data, error } = await Repository.supabase
                .from('time_entries')
                .select('*')
                .order('datum', { ascending: false });
            if (error) throw new Error(Repository.friendlyError(error));
            return data || [];
        },

        async create(entryData) {
            const { data, error } = await Repository.supabase
                .from('time_entries')
                .insert([entryData])
                .select()
                .single();
            if (error) throw new Error(Repository.friendlyError(error));
            return data;
        },
    },
};
