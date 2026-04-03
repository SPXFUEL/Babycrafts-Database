# Babycrafts Atelier Pro V2

Complete order management systeem voor Babycrafts - 3D baby echo beeldjes atelier.

## Wat is dit?

Een professionele webapplicatie voor het beheren van orders, workflow tracking, en team communicatie voor Babycrafts atelier.

## Belangrijkste Features

### Order Management
- ✅ Order aanmaken met complete klant- en productgegevens
- ✅ Real-time order tracking met 8 fases
- ✅ Automatische workflow voor Atelier-Bronze collectie
- ✅ Foto uploads voor kwaliteitscontrole
- ✅ Audit logging (wie heeft wat gewijzigd)

### Team Collaboration
- ✅ Gedeelde order lijst met status indicatoren
- ✅ To-do lijst voor team taken
- ✅ Tijdregistratie per order
- ✅ Real-time updates via Supabase

### Klant Communicatie
- ✅ Klant portal om order status te volgen
- ✅ Automatische email notificaties bij status wijzigingen
- ✅ Track & Trace integratie

### Security & Betrouwbaarheid
- ✅ XSS bescherming
- ✅ Input validatie
- ✅ Error handling
- ✅ Offline indicator
- ✅ Loading states

## Installatie

1. **Clone de repository**
   ```bash
   git clone https://github.com/SPXFUEL/Babycrafts-Database.git
   cd Babycrafts-Database/Babycrafts-Database-V2
   ```

2. **Configureer Supabase**
   - Maak een `.env` file aan (of pas `js/config.js` aan)
   - Vul je Supabase URL en Anon Key in

3. **Deploy**
   - Upload naar je hosting (Netlify, Vercel, etc.)
   - Of gebruik GitHub Pages

## Supabase Schema

De app gebruikt de volgende tabellen:

### orders
- `id` (uuid, primary key)
- `order_nummer` (text)
- `klant_naam`, `klant_email`, `klant_telefoon`
- `straat`, `huisnummer`, `postcode`, `plaats`
- `collectie`, `hoogte_cm`, `kleur_afwerking`, `sokkel`
- `scan_datum`, `deadline`
- `fase` (integer, 1-10)
- `status` (text)
- `created_at`, `updated_at`

### order_photos
- `id` (uuid)
- `order_id` (uuid, foreign key)
- `fase` (integer)
- `photo_type` (text)
- `url`, `path`
- `uploaded_by`

### todos
- `id` (uuid)
- `titel`, `beschrijving`
- `prioriteit` (text)
- `afgerond` (boolean)
- `created_by`

### audit_logs
- `id` (uuid)
- `table_name`, `record_id`
- `action` (INSERT/UPDATE/DELETE)
- `old_data`, `new_data` (jsonb)
- `user_id`, `created_at`

## Fases Workflow

1. **Afspraak gemaakt** - Order aangemaakt
2. **Scan gemaakt** - Echo scan voltooid
3. **Scan bewerkt** - 3D model gemaakt
4. **Goedgekeurd** - Klant heeft goedkeuring gegeven
5. **Besteld** - Bij bronsgieterij besteld
6. **Bronsgieterij** - In productie bij gieterij
7. **Retour atelier** - Terug bij Babycrafts
8. **Afwerking** - Wordt afgewerkt
9. **Verzonden** - Verzonden naar klant
10. **Afgerond** - Order compleet

## Technologie

- **Frontend:** Vanilla JS + Tailwind CSS
- **Backend:** Supabase (PostgreSQL + Realtime)
- **Storage:** Supabase Storage
- **Icons:** Lucide
- **Auth:** Supabase Auth

## Wijzigingen van V1 naar V2

Zie [CHANGELOG.md](CHANGELOG.md) voor volledige lijst.

Belangrijkste verbeteringen:
- 🔒 Security fixes (XSS, input validatie)
- 🧠 Memory leak fixes
- 📱 Betere mobiele ervaring
- 🔍 Search functionaliteit
- 📝 Audit logging
- ⚡ Loading states
- 🎨 Consistent design system

## Licentie

Privé - Babycrafts
