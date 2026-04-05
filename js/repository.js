/**
 * REPOSITORY PATTERN - Data Access Layer
 * Centralized database operations with audit logging
 */

const Repository = {
    supabase: null,
    
    /**
     * Initialize repository
     */
    initialize(supabaseClient) {
        this.supabase = supabaseClient;
    },

    /**
     * Generic error handler
     */
    handleError(error, operation) {
        console.error(`Repository error [${operation}]:`, error);
        
        // Create user-friendly error message
        let userMessage = 'Er is een fout opgetreden bij het opslaan van gegevens.';
        
        if (error.code === '42501') {
            userMessage = 'Geen toegang tot database. Controleer of je bent ingelogd met de juiste rechten.';
        } else if (error.code === '23514') {
            if (error.message?.includes('huidige_fase')) {
                userMessage = 'Deze fase wordt niet ondersteund door de database. Neem contact op met de beheerder om fases 13-16 toe te voegen.';
            } else {
                userMessage = 'De ingevoerde waarde voldoet niet aan de database regels.';
            }
        } else if (error.code === '23505') {
            userMessage = 'Dit record bestaat al.';
        } else if (error.code === '23503') {
            userMessage = 'Kan niet verwijderen omdat er gekoppelde gegevens zijn.';
        }
        
        // Store error for UI display
        window.lastRepositoryError = {
            operation,
            code: error.code,
            message: userMessage,
            raw: error.message
        };
        
        // Log to audit if available
        if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
            Audit.log('error', 'repository', operation, { error: error.message, code: error.code });
        }
        
        throw new Error(userMessage);
    },

    // ==========================================
    // ORDERS REPOSITORY
    // ==========================================
    
    orders: {
        /**
         * Get all orders (with optional filtering)
         */
        async getAll(options = {}) {
            try {
                let query = Repository.supabase
                    .from('orders')
                    .select('*');
                
                if (options.status) {
                    query = query.eq('status', options.status);
                }
                
                if (options.fase !== undefined) {
                    query = query.eq('huidige_fase', options.fase);
                }
                
                if (options.orderBy) {
                    query = query.order(options.orderBy, { 
                        ascending: options.ascending ?? false 
                    });
                } else {
                    query = query.order('created_at', { ascending: false });
                }
                
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'orders.getAll');
            }
        },

        /**
         * Get active orders
         */
        async getActive() {
            try {
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .select('*')
                    .neq('status', 'deleted')
                    .lt('huidige_fase', 12)
                    .order('created_at', { ascending: false });
                    
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'orders.getActive');
            }
        },

        /**
         * Get order by ID
         */
        async getById(orderId) {
            try {
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .select('*')
                    .eq('order_id', orderId)
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'orders.getById');
            }
        },

        /**
         * Get order by public token
         */
        async getByToken(token) {
            try {
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .select('*')
                    .eq('public_token', token)
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'orders.getByToken');
            }
        },

        /**
         * Search orders
         */
        async search(query) {
            try {
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .select('*')
                    .or(`order_id.ilike.%${query}%,klant_naam.ilike.%${query}%,klant_email.ilike.%${query}%`)
                    .neq('status', 'deleted')
                    .order('created_at', { ascending: false });
                    
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'orders.search');
            }
        },

        /**
         * Create order
         */
        async create(orderData, userId) {
            try {
                console.log('Repository.orders.create called with:', { orderData, userId });
                
                // Build insert data - only include fields that exist in database
                const insertData = {
                    order_id: orderData.order_id,
                    klant_naam: orderData.klant_naam,
                    klant_email: orderData.klant_email,
                    klant_telefoon: orderData.klant_telefoon || null,
                    straat: orderData.straat || null,
                    huisnummer: orderData.huisnummer || null,
                    postcode: orderData.postcode || null,
                    plaats: orderData.plaats || null,
                    scan_datum: orderData.scan_datum || null,
                    hoogte_cm: parseInt(orderData.hoogte_cm) || 20,
                    collectie: orderData.collectie,
                    kleur_afwerking: orderData.kleur_afwerking || null,
                    sokkel: orderData.sokkel || 'Zonder',
                    sokkel_details: orderData.sokkel_details || null,
                    extra_notities: orderData.extra_notities || null,
                    huidige_fase: 0,
                    toestemming_delen: orderData.toestemming_delen === true || orderData.toestemming_delen === 'on',
                    workflow: orderData.workflow,
                    deadline: orderData.deadline || null,
                    status: 'active',
                    public_token: orderData.public_token
                };
                
                console.log('Inserting order:', insertData);
                
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .insert([insertData])
                    .select()
                    .single();
                    
                if (error) {
                    console.error('Supabase insert error:', error);
                    // Show error in UI
                    const errorMsg = `DB Error: ${error.code} - ${error.message}`;
                    if (window.UI) {
                        UI.showToast(errorMsg, 'error', 10000);
                    }
                    throw new Error(errorMsg);
                }
                
                console.log('Supabase insert success:', data);
                return data;
                
            } catch (error) {
                console.error('Repository.orders.create catch:', error);
                const errorMsg = error.message || 'Database error';
                if (window.UI) {
                    UI.showToast(`Fout: ${errorMsg}`, 'error', 10000);
                }
                throw error;
            }
        },

        /**
         * Update order
         */
        async update(orderId, updates, userId) {
            try {
                const updateData = {
                    ...updates,
                    updated_at: new Date().toISOString()
                };
                
                // Only set updated_by if it's a real Supabase UUID
                if (userId && !userId.startsWith('local_')) {
                    updateData.updated_by = userId;
                }
                
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .update(updateData)
                    .eq('order_id', orderId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Audit log
                if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
                    Audit.log('update', 'order', orderId, { 
                        fields: Object.keys(updates),
                        by: userId || 'unknown'
                    });
                }
                
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'orders.update');
            }
        },

        /**
         * Update fase
         */
        async updateFase(orderId, newFase, userId) {
            try {
                const updates = {
                    huidige_fase: newFase,
                    updated_at: new Date().toISOString()
                };
                
                // Only set updated_by if it's a real Supabase UUID
                if (userId && !userId.startsWith('local_')) {
                    updates.updated_by = userId;
                }
                
                // Add special date fields based on fase
                if (newFase === 10) {
                    updates.verzenddatum = new Date().toISOString().split('T')[0];
                    updates.track_trace_code = Utils.generateTrackTrace();
                }
                
                if (newFase === 11) {
                    updates.nazorg_start_datum = new Date().toISOString();
                }
                
                if (newFase === 12) {
                    updates.status = 'completed';
                    updates.afgerond_datum = new Date().toISOString();
                }
                
                if (newFase === 15) {
                    updates.bronsgieterij_datum = new Date().toISOString();
                }
                
                if (newFase === 16) {
                    updates.terug_gieterij_datum = new Date().toISOString();
                }
                
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .update(updates)
                    .eq('order_id', orderId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Audit log
                if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
                    Audit.log('faseChange', 'order', orderId, { 
                        to: newFase,
                        by: userId || 'unknown'
                    });
                }
                
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'orders.updateFase');
            }
        },

        /**
         * Soft delete order
         */
        async delete(orderId, userId) {
            try {
                const updates = {
                    status: 'deleted',
                    deleted_at: new Date().toISOString()
                };
                
                // Only set deleted_by if it's a real Supabase UUID
                if (userId && !userId.startsWith('local_')) {
                    updates.deleted_by = userId;
                }
                
                const { error } = await Repository.supabase
                    .from('orders')
                    .update(updates)
                    .eq('order_id', orderId);
                    
                if (error) throw error;
                
                // Audit log
                if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
                    Audit.log('delete', 'order', orderId, { by: userId || 'unknown' });
                }
                
                return true;
                
            } catch (error) {
                Repository.handleError(error, 'orders.delete');
            }
        }
    },

    // ==========================================
    // TODOS REPOSITORY
    // ==========================================
    
    todos: {
        async getAll() {
            try {
                const { data, error } = await Repository.supabase
                    .from('todos')
                    .select('*')
                    .order('created_at', { ascending: false });
                    
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'todos.getAll');
            }
        },

        async create(todoData, userId) {
            try {
                const { data, error } = await Repository.supabase
                    .from('todos')
                    .insert([{
                        ...todoData,
                        created_by: userId,
                        status: 'open',
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'todos.create');
            }
        },

        async toggle(id, currentStatus, userId) {
            try {
                const newStatus = currentStatus === 'open' ? 'done' : 'open';
                const updates = {
                    status: newStatus,
                    done_at: newStatus === 'done' ? new Date().toISOString() : null
                };
                
                const { data, error } = await Repository.supabase
                    .from('todos')
                    .update(updates)
                    .eq('id', id)
                    .select()
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'todos.toggle');
            }
        },

        async delete(id) {
            try {
                const { error } = await Repository.supabase
                    .from('todos')
                    .delete()
                    .eq('id', id);
                    
                if (error) throw error;
                return true;
                
            } catch (error) {
                Repository.handleError(error, 'todos.delete');
            }
        }
    },

    // ==========================================
    // TIME ENTRIES REPOSITORY
    // ==========================================
    
    timeEntries: {
        async getAll(options = {}) {
            try {
                let query = Repository.supabase
                    .from('time_entries')
                    .select('*, users:user_id (email, raw_user_meta_data)')
                    .order('datum', { ascending: false });
                
                if (options.userId) {
                    query = query.eq('user_id', options.userId);
                }
                
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'timeEntries.getAll');
            }
        },

        async create(entryData, userId) {
            try {
                // Calculate total minutes
                const startDate = new Date(`2000-01-01T${entryData.start_tijd}`);
                const eindDate = new Date(`2000-01-01T${entryData.eind_tijd}`);
                const diffMinutes = (eindDate - startDate) / (1000 * 60) - (entryData.pauze_minuten || 0);
                
                const { data, error } = await Repository.supabase
                    .from('time_entries')
                    .insert([{
                        user_id: userId,
                        medewerker_naam: entryData.medewerker_naam,
                        datum: entryData.datum,
                        start_tijd: entryData.start_tijd,
                        eind_tijd: entryData.eind_tijd,
                        pauze_minuten: entryData.pauze_minuten || 0,
                        totaal_minuten: diffMinutes,
                        opmerking: entryData.opmerking,
                        status: 'pending'
                    }])
                    .select()
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'timeEntries.create');
            }
        },

        async approve(id, approverId) {
            try {
                const { data, error } = await Repository.supabase
                    .from('time_entries')
                    .update({
                        status: 'approved',
                        approved_by: approverId,
                        approved_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .select()
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'timeEntries.approve');
            }
        },

        async reject(id, approverId) {
            try {
                const { data, error } = await Repository.supabase
                    .from('time_entries')
                    .update({
                        status: 'rejected',
                        approved_by: approverId,
                        approved_at: new Date().toISOString()
                    })
                    .eq('id', id)
                    .select()
                    .single();
                    
                if (error) throw error;
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'timeEntries.reject');
            }
        }
    },

    // ==========================================
    // PHOTOS REPOSITORY
    // ==========================================
    
    photos: {
        async getByOrderId(orderId, fase = null) {
            try {
                let query = Repository.supabase
                    .from('order_photos')
                    .select('*')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: true });
                
                if (fase !== null) {
                    query = query.eq('fase', fase);
                }
                
                const { data, error } = await query;
                if (error) throw error;
                return data || [];
                
            } catch (error) {
                Repository.handleError(error, 'photos.getByOrderId');
            }
        },

        async upload(file, orderId, photoType, fase, userId) {
            try {
                // Upload to storage
                const timestamp = Date.now();
                const fileExt = file.name.split('.').pop() || 'jpg';
                const fileName = `${orderId}_${photoType}_${timestamp}.${fileExt}`;
                
                const { error: uploadError } = await Repository.supabase
                    .storage
                    .from(CONFIG.STORAGE_BUCKETS.PHOTOS)
                    .upload(fileName, file, { 
                        contentType: file.type,
                        upsert: false
                    });
                    
                if (uploadError) throw uploadError;
                
                // Get public URL
                const { data: { publicUrl } } = Repository.supabase
                    .storage
                    .from(CONFIG.STORAGE_BUCKETS.PHOTOS)
                    .getPublicUrl(fileName);
                
                // Save to database
                const { data, error } = await Repository.supabase
                    .from('order_photos')
                    .insert([{
                        order_id: orderId,
                        fase: fase,
                        photo_type: photoType,
                        url: publicUrl,
                        path: fileName,
                        uploaded_by: userId,
                        created_at: new Date().toISOString()
                    }])
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Audit log
                if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
                    Audit.log('photoUpload', 'order', orderId, { 
                        type: photoType,
                        by: userId 
                    });
                }
                
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'photos.upload');
            }
        },

        async delete(photoId, filePath) {
            try {
                // Delete from storage
                await Repository.supabase
                    .storage
                    .from(CONFIG.STORAGE_BUCKETS.PHOTOS)
                    .remove([filePath]);
                
                // Delete from database
                const { error } = await Repository.supabase
                    .from('order_photos')
                    .delete()
                    .eq('id', photoId);
                    
                if (error) throw error;
                return true;
                
            } catch (error) {
                Repository.handleError(error, 'photos.delete');
            }
        }
    },

    // ==========================================
    // FILES REPOSITORY (3D Scans)
    // ==========================================
    
    files: {
        async upload(file, orderId) {
            try {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${orderId}.${fileExt}`;
                
                // Upload to storage
                const { error: uploadError } = await Repository.supabase
                    .storage
                    .from(CONFIG.STORAGE_BUCKETS.SCANS)
                    .upload(fileName, file);
                    
                if (uploadError) throw uploadError;
                
                // Get public URL
                const { data: { publicUrl } } = Repository.supabase
                    .storage
                    .from(CONFIG.STORAGE_BUCKETS.SCANS)
                    .getPublicUrl(fileName);
                
                return { url: publicUrl, path: fileName, name: file.name };
                
            } catch (error) {
                Repository.handleError(error, 'files.upload');
            }
        },

        async updateOrderFile(orderId, fileData, userId) {
            try {
                const { data, error } = await Repository.supabase
                    .from('orders')
                    .update({
                        bestand_url: fileData.url,
                        bestand_naam: fileData.name,
                        bestand_path: fileData.path,
                        updated_at: new Date().toISOString()
                    })
                    .eq('order_id', orderId)
                    .select()
                    .single();
                    
                if (error) throw error;
                
                // Audit log
                if (CONFIG.FEATURES.AUDIT_LOGGING && window.Audit) {
                    Audit.log('fileUpload', 'order', orderId, { 
                        file: fileData.name,
                        by: userId 
                    });
                }
                
                return data;
                
            } catch (error) {
                Repository.handleError(error, 'files.updateOrderFile');
            }
        }
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Repository;
}
