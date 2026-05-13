# Interstellar Radar 360 - Handoff progetto

Questo file serve per continuare il progetto da un altro computer senza avere tutta la chat originale.

## Link principali

- Repo GitHub: https://github.com/kevincominelli-commits/interstellar-radar-360
- Demo online Vercel: https://interstellar-radar-360.vercel.app/mockup-wow
- Pagina principale locale: `mockup-wow.html`

## Come aprirlo su un altro PC

```bash
git clone https://github.com/kevincominelli-commits/interstellar-radar-360.git
cd interstellar-radar-360
npm start
```

Poi apri:

```text
http://127.0.0.1:4176/mockup-wow.html
```

Per controllare che il JS sia valido:

```bash
npm run check
```

## Stato attuale

La piattaforma si chiama **Interstellar Radar 360**.

È una dashboard SaaS per trovare prospect/clienti da fonti pubbliche e organizzarli in modo operativo. Il focus attuale è trovare clienti interessati a:

- programmazione
- siti web
- app
- bot
- automazioni AI
- software su misura
- integrazioni API

## Cosa funziona ora

- Dashboard premium con grafico reale.
- Nessun contatto finto nella dashboard.
- Se non ci sono dati, il grafico resta visibile a zero.
- Se arrivano dati reali dal Radar/CRM, il grafico si popola.
- Tema Interstellar e tema Stripe.
- Sezione **Radar 360** semplificata in stile guidato:
  - che tipo di clienti vuoi trovare
  - dove vuoi cercare
  - Italia generale o citta specifica
- Ricerca live tramite API interna su fonti aperte disponibili:
  - Reddit pubblico
  - Hacker News Algolia
  - Stack Exchange / Q&A pubblici
  - DEV Community
  - WordPress.com public search
  - GitHub Issues
  - URL diretti inseriti dall'utente
- Import CSV/manuale.
- Scoring AI-like dei prospect.
- Distinzione tra contatto manuale assistito e automazione possibile.
- CRM base e stati contatto.
- Deploy automatico su Vercel quando si pusha su `main`.

## Regole importanti del prodotto

La piattaforma non deve fare spam automatico sui social.

Sui social/app chiuse deve fare solo:

- trovare prospect pubblici
- analizzare il segnale
- creare messaggio suggerito
- copiare il messaggio
- aprire profilo/fonte
- lasciare l'invio manuale all'utente

Automazione possibile solo su:

- email business pubbliche
- form contatto pubblici
- directory aziendali pubbliche
- lead importati/autorizzati
- CRM opt-in

Sempre con:

- anteprima
- conferma utente
- source URL
- log
- limiti
- controllo duplicati

## File principali

- `mockup-wow.html`: struttura della piattaforma.
- `mockup-wow.css`: grafica, temi, dashboard, Radar.
- `mockup-wow.js`: logica frontend, localStorage, dashboard, Radar, CRM.
- `api/radar-search.js`: endpoint Vercel per ricerca live open web.
- `vercel.json`: configurazione Vercel.
- `package.json`: comandi locali.

## Ultime modifiche importanti

- Ripristinato grafico grande nella dashboard.
- Rimossi dati/mockup falsi dalla dashboard.
- Sistemato bug online causato da dati Radar salvati nel browser.
- Aggiornata cache asset a `radar360-5`.
- Avviata costruzione dal PDF V6 senza cambiare grafica: aggiunti piano workspace, crediti, usage logs, feature flags, tasks, appointments e struttura dati SaaS nel motore locale.
- Radar 360 ora usa una pipeline a imbuto: raw collected, cleaning, pre-filter, semantic matching, AI base, AI advanced e final leads.
- Ogni ricerca Radar registra funnel metrics, crediti stimati/usati, costo per lead finale e usage log.
- Lead card operative estese: Contatta, Posticipa, Archivia, Proponi appuntamento, Copia messaggio.
- Aggiunto Opportunity Radar nel motore: cluster domanda locale, richieste prezzo, ricerca servizio, problemi urgenti, aziende con contatto business e lead pronti per appuntamento.
- Aggiunto Conversation Starter: versioni breve/naturale/professionale, risposte alle obiezioni e anti-spam score.
- Collegati i prospect Radar a AI Content e CRM senza cambiare layout: da Dettaglio prospect si puo aprire il contenuto AI o creare/qualificare il lead nel CRM.
- Aggiunto Manual Reply Assistant in AI Content: l'utente incolla una risposta ricevuta, il motore rileva intento/obiezione/urgenza/appuntamento e genera la risposta suggerita.
- Aggiunto Follow-up Reminder avanzato: Hot = 24/48h, Warm = 3/7 giorni, Cold = 1 follow-up; i task appaiono nella sezione Automations e possono essere completati.
- CRM reso piu operativo: ogni card ha azioni rapide Risposta, Follow-up, Appuntamento e Perso.
- Aggiunto Offer Engine nella sezione Campaigns: da un lead CRM si genera una proposta concreta con pacchetto, deliverable, fascia prezzo e messaggio copiabile.
- Aggiunto Campaign Launcher collegato alle offerte: una proposta puo creare una campagna con piano operativo e canale coerente, senza invii automatici social.
- Aggiunto Appointment Manager nella sezione Automations: le call proposte vengono salvate, si copia la conferma e si puo aprire un invito Google Calendar.
- Aggiornata cache asset a `radar360-9`.
- Esteso il backend Radar live oltre GitHub/Reddit: aggiunti Stack Exchange, DEV, WordPress public search e analisi URL diretti, con filtro sugli ultimi mesi e provider status.
- Sistemata ricerca live in locale: se la pagina e aperta con `file://`, `localhost` o `127.0.0.1`, usa comunque l'API online Vercel invece di chiamare il server statico locale.
- Aggiornata cache asset a `radar360-10`.

## Regola operativa per il PDF completo

Il file `/Users/kevincominelli/Downloads/Interstellar_Radar_360_Master_Blueprint_V6_Tutto.pdf` contiene la visione completa del prodotto.

Quando Kevin dira di iniziare a costruire dal PDF completo:

- leggere il PDF e trasformarlo in implementazione progressiva;
- lavorare soprattutto sul motore, architettura, backend, database, Radar, CRM, automazioni e logica prodotto;
- non stravolgere grafica, dashboard o identita visiva gia approvata;
- non cambiare layout generale senza richiesta esplicita;
- mantenere lo stile Interstellar/Stripe pulito e professionale;
- prima di grosse modifiche estetiche, fermarsi e chiedere conferma;
- per bug, motore, logica, dati, API e struttura tecnica, procedere in autonomia quanto possibile.

Prima fase immediata prima del lavoro dal PDF:

- rendere Radar 360 piu pulito, semplice e leggibile;
- togliere complessita inutile dalla UI Radar;
- mantenere dashboard e grafica generale stabili.

## Prossimi step consigliati

1. Rendere Radar 360 ancora piu semplice per un cliente non tecnico, senza stravolgere la grafica.
2. Migliorare i risultati per la nicchia "clienti interessati a programmazione".
3. Aggiungere fonti reali autorizzate/provider seri per web e directory.
4. Salvare utenti e workspace in database vero, non solo localStorage.
5. Aggiungere login, piani, abbonamenti e limiti per pacchetto.
6. Collegare Google Calendar/Meet con OAuth vero quando si passa da MVP locale a SaaS.
7. Separare meglio:
   - dashboard
   - radar
   - CRM
   - outreach assistito
   - analytics

## Nota per chi continua

Non promettere che Instagram, TikTok, LinkedIn o Facebook possano essere automatizzati al 100%. La piattaforma deve restare realistica:

- social = assistenza manuale
- web/email/form pubblici = automazione controllata

Obiettivo: una piattaforma professionale, non fuffa/scam.
