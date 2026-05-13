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
  - GitHub Issues
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

1. Continuare il motore dal PDF: Manual Reply Assistant, Follow-up Reminder avanzato e CRM Kanban piu operativo.
2. Rendere Radar 360 ancora piu semplice per un cliente non tecnico, senza stravolgere la grafica.
3. Migliorare i risultati per la nicchia "clienti interessati a programmazione".
4. Aggiungere fonti reali autorizzate/provider seri per web e directory.
5. Salvare utenti e workspace in database vero, non solo localStorage.
6. Aggiungere login, piani, abbonamenti e limiti per pacchetto.
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
