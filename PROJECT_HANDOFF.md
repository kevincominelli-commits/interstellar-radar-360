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
- Aggiunto SaaS Plan & Usage Engine: piani Free/Pro/Agency/Internal, crediti mensili, limiti per ricerche live, analisi Radar, export, campagne, offerte, appuntamenti e automazioni.
- Settings ora mostra piano attivo, utilizzo mensile e usage log operativo. Il motore blocca le azioni quando il piano supera i limiti.
- Aggiornata cache asset a `radar360-11`.
- Sistemata modalita Italia del Radar live: esclusi provider inglesi/rumorosi per ricerche italiane, aggiunte query Reddit Italia piu mirate e filtro lingua prima dei risultati.
- Aggiunto provider `Open Web IT` basato su ricerca pubblica DuckDuckGo HTML per ampliare siti/forum/blog italiani indicizzati senza login social.
- Migliorati i messaggi suggeriti: ora usano segnale reale, soluzione richiesta, tono diverso tra manual assist e email/form business, domanda finale e opt-out dove serve.
- Rimosso pulsante "Q&A tecnici" dalla UI Radar e sostituito con "Forum italiani".
- Aggiornata cache asset a `radar360-12`.
- Integrato provider Serper nel backend Radar: usa `SERPER_API_KEY` da Vercel, massimo 6 query mirate per ricerca, `gl=it`/`hl=it` in modalita Italia, parsing risultati organici e People Also Ask.
- La UI Radar ora mostra anche errori provider, per esempio quando Serper non e ancora configurato.
- Aggiornata cache asset a `radar360-13`.
- Corretta la UX della ricerca live: dopo "Cerca clienti" la UI mostra solo i risultati dell'ultima ricerca live, non li rimescola con vecchi prospect salvati nel browser/localStorage.
- Aggiornata cache asset a `radar360-14`.
- Corretta copy feedback ricerca live: mostra risultati live analizzati e nuovi inseriti nel database separatamente.
- Aggiornata cache asset a `radar360-15`.
- Stretta ulteriore su Serper per programmazione: query orientate a richieste esplicite e filtro che scarta articoli/guide/contenuti SEO se non contengono frasi tipo "cerco sviluppatore/programmatore", "budget", "pubblicato da", "solo a chi parla italiano".
- Spostata la strategia Serper da forum generici a pagine/fonti calde: gruppi Facebook, marketplace freelance, LinkedIn posts, TechLance, AddLance, Freelancer, Malt e solo forum/community come fallback. I risultati social vengono marcati come Facebook/LinkedIn/Instagram ecc. per contact mode manual assist.
- Aggiornata cache asset a `radar360-16`.
- Integrato provider Apify nel backend Radar: usa `APIFY_TOKEN` da Vercel, lancia Actor social con limiti stretti di risultati/costo, normalizza output Instagram/TikTok/YouTube/Facebook in prospect Radar e mantiene social in manual assist.
- Aggiunto passaggio hashtag dal frontend al backend per usare gli Actor social Apify.
- Aggiornata cache asset a `radar360-17`.
- Esteso Apify con logica audience-first: YouTube Search trova video/fonti calde, poi il backend usa i video come input per YouTube Comments e trasforma i commentatori in prospect. I video sorgente non vengono piu trattati come clienti finali.
- Aggiunta logica intent trading riutilizzabile: cerca commenti con bisogno reale tipo "come iniziare", "quale broker", "prop firm", "bot trading", "MT5", "segnali", senza promettere risultati finanziari.
- Ottimizzata strategia YouTube per Vercel: Serper scopre i video rilevanti rapidamente, Apify viene usato per i commenti. L'Actor YouTube Search resta opt-in con `APIFY_ENABLE_YOUTUBE_SEARCH_ACTOR=true` perché puo andare in timeout.
- Aumentato spazio Serper e riordinate query Italia: programmazione/trading cercano anche forum/community mirati come Inforge, Forum HTML.it, Reddit ItalyInformatica, FinanzaOnline, InvestireOggi e MQL5, non solo Facebook/YouTube/marketplace.
- Migliorato filtro anti-fuffa: annunci/pagine che vendono servizi tipo "vuoi creare", "creo per te", webinar, call gratuite e web agency non vengono trattati come prospect; diventano fonti da minare solo dove abbiamo comment mining.
- Riscritti i messaggi suggeriti Radar: tolto testo innaturale tipo "non ti scrivo un copia-incolla", tono piu breve, concreto e legato al segnale reale.
- Ridisegnata sezione Radar: mission control piu semplice, fonti calde, flow a 4 step, risultati piu leggibili e tab "Tutti" di default.
- Aggiornata cache asset a `radar360-18`.

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
3. Configurare `SERPER_API_KEY` su Vercel e fare redeploy, poi misurare qualita/volume dei risultati.
4. Configurare `APIFY_TOKEN` su Vercel e testare gli Actor con limiti bassi: Instagram Search, Instagram Hashtag, TikTok Search, YouTube Search e Facebook Groups su URL pubblici.
4. Salvare utenti e workspace in database vero, non solo localStorage.
5. Collegare Stripe reale ai piani gia presenti nel motore.
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
