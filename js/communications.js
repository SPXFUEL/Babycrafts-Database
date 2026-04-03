/**
 * COMMUNICATIONS MODULE V2
 */

const CommunicationsModule = {
    // PostNL sender configuration
    postnlSender: {
        company: 'Babycrafts 3D',
        name: 'Lindsay',
        street: 'Hooidrift',
        houseNumber: '108',
        zipCode: '3078WB',
        city: 'Rotterdam',
        email: 'info@babycrafts.nl'
    },

    /**
     * Build email content
     */
    buildEmail(type, order) {
        const baseUrl = window.location.origin;
        const trackingUrl = `${baseUrl}/klant-portal.html?order=${order.public_token}`;
        
        const templates = {
            welcome: () => {
                let body = `Hoi ${order.klant_naam},%0D%0A%0D%0A`;
                body += `Leuk dat ik jouw 3D-Scan net hebben mogen maken. 🎉%0D%0A%0D%0A`;
                if (CONFIG.BRONSGIETERIJ.collecties.includes(order.collectie)) {
                    body += `Je hebt gekozen voor een ${order.collectie} beeldje. Dit is een speciaal proces via onze bronsgieterij partner.%0D%0A%0D%0A`;
                }
                body += `Je kunt LIVE volgen hoe jouw beeldje vordert:%0D%0A${trackingUrl}%0D%0A%0D%0A`;
                body += `Jouw ordernummer: ${order.order_id}%0D%0A`;
                body += `Geschatte oplevering: ${order.deadline || 'Binnenkort'}%0D%0A%0D%0A`;
                body += `Lindsay,%0D%0ABabycrafts 3D`;
                
                return {
                    subject: 'Jouw Babycrafts beeldje - Live tracking! 🎨',
                    body
                };
            },
            
            shipping: () => {
                let body = `Hoi ${order.klant_naam},%0D%0A%0D%0A`;
                body += `Goed nieuws! Je ${order.collectie} beeldje (${order.hoogte_cm}cm) is verzonden. 🚚%0D%0A%0D%0A`;
                body += `📦 Track & Trace: ${order.track_trace_code}%0D%0A`;
                body += `🔗 Volg je pakket: https://postnl.nl/tracktrace/?B=${order.track_trace_code}%0D%0A%0D%0A`;
                body += `Bekijk de laatste status: ${trackingUrl}%0D%0A%0D%0A`;
                if (order.bestand_url) {
                    body += `📎 Download je 3D scan: ${order.bestand_url}%0D%0A%0D%0A`;
                }
                body += `We sturen je een berichtje wanneer het pakket is bezorgd.%0D%0A%0D%0A`;
                body += `Lindsay,%0D%0ABabycrafts 3D`;
                
                return {
                    subject: 'Je Babycrafts beeldje is onderweg! 🎉',
                    body
                };
            },
            
            nazorg: () => {
                let body = `Hoi ${order.klant_naam},%0D%0A%0D%0A`;
                body += `We hopen dat je beeldje goed is aangekomen en dat je er blij mee bent!%0D%0A%0D%0A`;
                body += `Mocht je ons kunnen helpen groeien dan stellen we het zeer op prijs als je op Google een review zou achterlaten.%0D%0A%0D%0A`;
                body += `Ieder die dit doet krijgt van ons een cadeaubon toegestuurd van €20 om iemand anders blij mee te maken.%0D%0A`;
                body += `*Voorwaarde: ze zijn niet stapelbaar.%0D%0A%0D%0A`;
                body += `Groetjes,%0D%0ALindsay,%0D%0ABabycrafts 3D`;
                
                return {
                    subject: 'Hoe bevalt je Babycrafts beeldje? 🎁',
                    body
                };
            }
        };
        
        return templates[type] ? templates[type]() : templates.welcome();
    },

    /**
     * Build WhatsApp content
     */
    buildWhatsApp(type, order) {
        const baseUrl = window.location.origin;
        const trackingUrl = `${baseUrl}/klant-portal.html?order=${order.public_token}`;
        
        const templates = {
            welcome: () => {
                let text = `Hoi ${order.klant_naam}! 👋\n\n`;
                text += `Leuk dat ik jouw 3D-Scan net hebben mogen maken. 🎉\n\n`;
                text += `Je kunt LIVE volgen hoe jouw beeldje vordert:\n${trackingUrl}\n\n`;
                text += `Jouw ordernummer: ${order.order_id}\n`;
                text += `Geschatte oplevering: ${order.deadline || 'Binnenkort'}\n\n`;
                text += `Lindsay,\nBabycrafts 3D`;
                return text;
            },
            
            shipping: () => {
                let text = `Hoi ${order.klant_naam}! 🎉\n\n`;
                text += `Goed nieuws! Je ${order.collectie} beeldje (${order.hoogte_cm}cm) is verzonden. 🚚\n\n`;
                text += `📦 Track & Trace: ${order.track_trace_code}\n`;
                text += `🔗 Volg je pakket: https://postnl.nl/tracktrace/?B=${order.track_trace_code}\n\n`;
                text += `Bekijk de laatste status: ${trackingUrl}\n\n`;
                text += `We sturen je een berichtje wanneer het pakket is bezorgd.\n\n`;
                text += `Lindsay,\nBabycrafts 3D`;
                return text;
            },
            
            nazorg: () => {
                let text = `Hoi ${order.klant_naam}! 👋\n\n`;
                text += `We hopen dat je beeldje goed is aangekomen en dat je er blij mee bent! 🎉\n\n`;
                text += `Mocht je ons kunnen helpen groeien, stellen we het zeer op prijs als je op Google een review zou achterlaten. 🌟\n\n`;
                text += `Ieder die dit doet krijgt van ons een cadeaubon van €20! 🎁\n`;
                text += `*Voorwaarde: niet stapelbaar\n\n`;
                text += `Groetjes,\nLindsay\nBabycrafts 3D`;
                return text;
            }
        };
        
        return templates[type] ? templates[type]() : templates.welcome();
    },

    /**
     * Send email
     */
    sendEmail(email, subject, body) {
        const mailtoUrl = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${body}`;
        window.open(mailtoUrl, '_blank', 'noopener,noreferrer');
    },

    /**
     * Send WhatsApp
     */
    sendWhatsApp(phone, text) {
        const formattedPhone = this.formatPhoneForWhatsApp(phone);
        const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(text)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
    },

    /**
     * Format phone for WhatsApp
     */
    formatPhoneForWhatsApp(phone) {
        if (!phone) return '';
        
        let cleaned = phone.replace(/\D/g, '');
        
        if (cleaned.startsWith('0')) {
            cleaned = '31' + cleaned.substring(1);
        }
        
        if (cleaned.startsWith('+')) {
            cleaned = cleaned.substring(1);
        }
        
        if (!cleaned.startsWith('31') && cleaned.length === 9) {
            cleaned = '31' + cleaned;
        }
        
        return cleaned;
    },

    /**
     * Show communication choice modal
     */
    showChoiceModal(order, type, onComplete) {
        const emailData = this.buildEmail(type, order);
        const whatsappText = this.buildWhatsApp(type, order);
        const phone = this.formatPhoneForWhatsApp(order.klant_telefoon || '');
        const hasPhone = phone && phone.length >= 10;
        
        const titles = {
            welcome: I18n.t('communications.welcome'),
            shipping: I18n.t('communications.shipping'),
            nazorg: I18n.t('communications.nazorg')
        };
        
        UI.showBottomSheet({
            title: I18n.t('communications.sendMessage'),
            content: `
                <div class="text-center mb-4">
                    <p class="text-gray-600">${Utils.escapeHtml(order.klant_naam)}</p>
                </div>
                <div class="space-y-3">
                    <button id="commEmailBtn" class="w-full py-3 bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                        <i data-lucide="mail" class="w-5 h-5"></i>
                        ${I18n.t('communications.sendEmail')}
                    </button>
                    
                    ${hasPhone ? `
                        <button id="commWhatsAppBtn" class="w-full py-3 bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                            ${I18n.t('communications.sendWhatsApp')}
                        </button>
                    ` : `
                        <div class="w-full py-3 bg-gray-100 text-gray-400 rounded-xl font-medium flex items-center justify-center gap-2">
                            <i data-lucide="message-circle" class="w-5 h-5"></i>
                            ${I18n.t('communications.noPhone')}
                        </div>
                    `}
                    
                    <button id="commSkipBtn" class="w-full py-3 bg-gray-100 text-gray-700 rounded-xl font-medium">
                        ${I18n.t('communications.skip')}
                    </button>
                </div>
            `,
            onClose: () => {}
        });
        
        // Event listeners
        setTimeout(() => {
            document.getElementById('commEmailBtn')?.addEventListener('click', () => {
                this.sendEmail(order.klant_email, emailData.subject, emailData.body);
                UI.closeBottomSheet();
                if (onComplete) onComplete();
            });
            
            if (hasPhone) {
                document.getElementById('commWhatsAppBtn')?.addEventListener('click', () => {
                    this.sendWhatsApp(order.klant_telefoon, whatsappText);
                    UI.closeBottomSheet();
                    if (onComplete) onComplete();
                });
            }
            
            document.getElementById('commSkipBtn')?.addEventListener('click', () => {
                UI.closeBottomSheet();
                if (onComplete) onComplete();
            });
            
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }, 100);
    },

    /**
     * Show PostNL helper
     */
    showPostNLHelper(order) {
        UI.showBottomSheet({
            title: '📋 PostNL Gegevens',
            content: `
                <div class="space-y-3">
                    ${this.createCopyField('Naam', order.klant_naam)}
                    ${this.createCopyField('Adres', `${order.straat} ${order.huisnummer}`)}
                    ${this.createCopyField('Postcode', order.postcode)}
                    ${this.createCopyField('Plaats', order.plaats)}
                    
                    <div class="pt-3 border-t">
                        <a href="https://mijnpostnlzakelijk.postnl.nl/s/new-shipment#/recipient" 
                           target="_blank" rel="noopener noreferrer"
                           class="block w-full py-3 bg-[#003366] text-white rounded-xl text-center font-medium mb-2">
                            🚀 Open PostNL
                        </a>
                        
                        <button id="postnlDoneBtn" class="w-full py-3 bg-green-500 text-white rounded-xl font-medium">
                            ✅ Klaar - Voer Track & Trace in
                        </button>
                    </div>
                </div>
            `,
            onClose: () => {}
        });
        
        setTimeout(() => {
            document.getElementById('postnlDoneBtn')?.addEventListener('click', () => {
                UI.closeBottomSheet();
                setTimeout(() => {
                    const trackTrace = prompt('📦 Voer Track & Trace code in:');
                    if (trackTrace && trackTrace.trim().length > 5) {
                        window.dispatchEvent(new CustomEvent('postnl-manual-complete', {
                            detail: { 
                                orderId: order.order_id, 
                                trackTrace: trackTrace.trim().toUpperCase() 
                            }
                        }));
                    }
                }, 300);
            });
        }, 100);
    },

    /**
     * Create copy field
     */
    createCopyField(label, value) {
        const safeValue = Utils.escapeHtml(value || '');
        return `
            <div>
                <label class="text-xs text-gray-500 mb-1 block">${label}</label>
                <div class="flex gap-2">
                    <input type="text" value="${safeValue}" readonly 
                           class="flex-1 px-3 py-2 bg-gray-50 border rounded-lg text-sm"
                           id="copy_${label.toLowerCase().replace(/\s+/g, '_')}">
                    <button onclick="Utils.copyToClipboard('${safeValue.replace(/'/g, "\\'")}'); this.textContent='✓'; setTimeout(()=>this.textContent='Kopieer', 1000)" 
                            class="px-3 py-2 bg-amber-500 text-white rounded-lg text-sm whitespace-nowrap">
                        Kopieer
                    </button>
                </div>
            </div>
        `;
    }
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = CommunicationsModule;
}
