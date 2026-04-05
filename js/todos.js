/**
 * TODOS MODULE V2
 */

const TodosModule = {
    todos: [],
    
    async initialize() {
        await this.load();
    },

    async load() {
        try {
            this.todos = await Repository.todos.getAll();
            return this.todos;
        } catch (error) {
            UI.showToast(I18n.t('errors.loading'), 'error');
            throw error;
        }
    },

    async create(title, category = 'eenmalig', priority = 'medium', userId) {
        try {
            const todo = await Repository.todos.create({
                titel: title.trim(),
                categorie: category,
                prioriteit: priority
            }, userId);
            
            if (todo) {
                this.todos.unshift(todo);
            }
            
            return todo;
        } catch (error) {
            throw error;
        }
    },

    async toggle(id, userId) {
        try {
            const todo = this.todos.find(t => t.id === id);
            if (!todo) throw new Error('Todo not found');
            
            const updated = await Repository.todos.toggle(id, todo.status, userId);
            
            const index = this.todos.findIndex(t => t.id === id);
            if (index !== -1) {
                this.todos[index] = updated;
            }
            
            return updated;
        } catch (error) {
            throw error;
        }
    },

    async delete(id) {
        try {
            await Repository.todos.delete(id);
            this.todos = this.todos.filter(t => t.id !== id);
            return true;
        } catch (error) {
            throw error;
        }
    },

    getByCategory() {
        const categories = ['dagelijks', 'wekelijks', 'maandelijks', 'eenmalig'];
        const result = {};
        
        categories.forEach(cat => {
            result[cat] = this.todos.filter(t => 
                t.categorie === cat && t.status === 'open'
            );
        });
        
        return result;
    },

    getCompleted(limit = 5) {
        return this.todos
            .filter(t => t.status === 'done')
            .slice(0, limit);
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodosModule;
}
