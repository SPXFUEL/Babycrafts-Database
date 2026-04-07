/**
 * TODOS MODULE - Babycrafts
 */

const TodosModule = {
    todos: [],

    async initialize() {
        await this.load();
    },

    async load() {
        this.todos = await Repository.todos.getAll();
    },

    getByCategory() {
        const open = this.todos.filter(t => t.status !== 'done');
        return {
            dagelijks:   open.filter(t => t.categorie === 'dagelijks'),
            wekelijks:   open.filter(t => t.categorie === 'wekelijks'),
            maandelijks: open.filter(t => t.categorie === 'maandelijks'),
            eenmalig:    open.filter(t => t.categorie === 'eenmalig'),
        };
    },

    getOpenCount() {
        return this.todos.filter(t => t.status !== 'done').length;
    },

    async create(titel, categorie, prioriteit = 'medium') {
        const todo = await Repository.todos.create({
            titel,
            categorie,
            prioriteit,
            status: 'open',
            created_at: new Date().toISOString(),
        });
        if (todo) this.todos.unshift(todo);
        return todo;
    },

    async toggle(id) {
        const todo = this.todos.find(t => t.id === id);
        if (!todo) return;
        const newStatus = todo.status === 'done' ? 'open' : 'done';
        const updated = await Repository.todos.update(id, { status: newStatus });
        if (updated) {
            const idx = this.todos.findIndex(t => t.id === id);
            if (idx !== -1) this.todos[idx] = updated;
        }
        return updated;
    },

    async delete(id) {
        await Repository.todos.delete(id);
        this.todos = this.todos.filter(t => t.id !== id);
    },
};
