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

## Prossimi step consigliati

1. Rendere Radar 360 ancora piu semplice per un cliente non tecnico.
2. Migliorare i risultati per la nicchia "clienti interessati a programmazione".
3. Aggiungere fonti reali autorizzate/provider seri per web e directory.
4. Salvare utenti e workspace in database vero, non solo localStorage.
5. Aggiungere login, piani, abbonamenti e limiti per pacchetto.
6. Separare meglio:
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
