# Interstellar Radar 360

Piattaforma SaaS per trovare prospect/clienti da fonti pubbliche, analizzarli, assegnare priorita e gestirli in CRM.

Demo online: https://interstellar-radar-360.vercel.app/mockup-wow

## Da leggere quando si riprende il progetto

Prima di lavorare, apri:

```text
PROJECT_HANDOFF.md
```

Quello e il file principale per non perdersi: contiene stato attuale, cosa funziona, regole prodotto, file importanti e prossimi step.

Prompt consigliato da dare a Codex quando si ricomincia:

```text
Leggi PROJECT_HANDOFF.md, controlla git status e ultimi commit, poi dimmi in 5 righe dove siamo e riprendiamo da li.
```

## Avvio locale

```bash
git clone https://github.com/kevincominelli-commits/interstellar-radar-360.git
cd interstellar-radar-360
npm start
```

Apri:

```text
http://127.0.0.1:4176/mockup-wow.html
```

## Controllo rapido

```bash
npm run check
```

## File principali

- `PROJECT_HANDOFF.md`: stato progetto e istruzioni per riprendere.
- `mockup-wow.html`: struttura app.
- `mockup-wow.css`: grafica, layout, temi.
- `mockup-wow.js`: logica dashboard, Radar 360, CRM, localStorage.
- `api/radar-search.js`: ricerca live su fonti open web supportate. In modalita Italia esclude provider inglesi rumorosi e usa Reddit Italia, WordPress, Serper, Open Web IT e URL diretti.
- `vercel.json`: configurazione deploy.

## Motore SaaS attuale

Il frontend include gia un motore locale per piani e limiti:

- Free / Pro / Agency / Internal
- crediti mensili
- limiti per ricerche live, analisi Radar, export, campagne, offerte, appuntamenti e automazioni
- usage log mensile in Settings

Stripe/Supabase sono il prossimo collegamento cloud, non ancora credenziali reali.

## Stato motore Radar

Il motore live attuale e reale ma ancora MVP: usa fonti pubbliche senza login e provider esterni autorizzati dove configurati. Per aumentare davvero volume e qualita dei lead servono Serper, Apify, Reddit API, YouTube API e directory business.

Variabile richiesta per Serper:

```text
SERPER_API_KEY=...
```

Variabili Apify:

```text
APIFY_TOKEN=...
APIFY_MAX_RESULTS=5
APIFY_MAX_RUNS=3
APIFY_MAX_CHARGE_USD=0.35
APIFY_INSTAGRAM_SEARCH_ACTOR_ID=apify/instagram-search-scraper
APIFY_INSTAGRAM_HASHTAG_ACTOR_ID=apify/instagram-hashtag-scraper
APIFY_TIKTOK_ACTOR_ID=clockworks/tiktok-scraper
APIFY_YOUTUBE_ACTOR_ID=streamers/youtube-scraper
APIFY_FACEBOOK_GROUPS_ACTOR_ID=apify/facebook-groups-scraper
APIFY_YOUTUBE_COMMENTS_ACTOR_ID=knotless_cadence/youtube-comments-scraper
APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT=2
APIFY_YOUTUBE_COMMENTS_PER_VIDEO=25
```

`APIFY_YOUTUBE_COMMENTS_ACTOR_ID` e opzionale: se non lo imposti, il backend usa un Actor commenti YouTube predefinito con limiti bassi. Puoi mettere `off` per disattivare il comment mining.

## Regola prodotto fondamentale

La piattaforma deve essere professionale e realistica:

- social/app chiuse = contatto manuale assistito
- siti, email business pubbliche, form e lead autorizzati = automazione possibile con conferma e log

Niente promesse impossibili, niente spam automatico sui social.
