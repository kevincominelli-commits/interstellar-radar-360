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
- `api/radar-search.js`: motore Radar audience-first. Serper serve solo a scoprire fonti social/community; Apify estrae commentatori, like, follower pubblici disponibili e profili pubblici; i provider web generici sono esclusi dal flusso principale per evitare offerte di lavoro e articoli inutili.
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
APIFY_MAX_RUNS=6
APIFY_MAX_CHARGE_USD=0.12
APIFY_COMMENTS_PER_SOURCE=15
APIFY_FOLLOWERS_PER_SOURCE=20
APIFY_LIKES_PER_SOURCE=20
APIFY_PROFILES_PER_SOURCE=6
APIFY_INSTAGRAM_POSTS_PER_PROFILE=4
APIFY_INSTAGRAM_SEARCH_ACTOR_ID=apify/instagram-search-scraper
APIFY_INSTAGRAM_HASHTAG_ACTOR_ID=apify/instagram-hashtag-scraper
APIFY_INSTAGRAM_POSTS_ACTOR_ID=apify/instagram-post-scraper
APIFY_INSTAGRAM_COMMENTS_ACTOR_ID=apify/instagram-comment-scraper
APIFY_INSTAGRAM_PROFILE_ACTOR_ID=apify/instagram-profile-scraper
APIFY_INSTAGRAM_FOLLOWERS_ACTOR_ID=scrapapi/instagram-followers-scraper
APIFY_INSTAGRAM_LIKES_ACTOR_ID=scrapapi/instagram-likes-scraper
APIFY_ENABLE_INSTAGRAM_LIKES=true
APIFY_INSTAGRAM_SESSION_ID=
APIFY_TIKTOK_ACTOR_ID=clockworks/tiktok-scraper
APIFY_TIKTOK_COMMENTS_ACTOR_ID=dltik/tiktok-scraper
APIFY_TIKTOK_PROFILE_ACTOR_ID=dltik/tiktok-scraper
APIFY_TIKTOK_FOLLOWERS_ACTOR_ID=dltik/tiktok-scraper
APIFY_YOUTUBE_ACTOR_ID=streamers/youtube-scraper
APIFY_FACEBOOK_GROUPS_ACTOR_ID=apify/facebook-groups-scraper
APIFY_FACEBOOK_COMMENTS_ACTOR_ID=apify/facebook-comments-scraper
APIFY_FACEBOOK_PAGES_ACTOR_ID=apify/facebook-pages-scraper
APIFY_FACEBOOK_SEARCH_ACTOR_ID=apify/facebook-search-scraper
APIFY_FACEBOOK_ADS_ACTOR_ID=apify/facebook-ads-scraper
APIFY_ENABLE_FACEBOOK_SEARCH=false
APIFY_ENABLE_FACEBOOK_ADS=false
APIFY_YOUTUBE_COMMENTS_ACTOR_ID=knotless_cadence/youtube-comments-scraper
APIFY_ENABLE_YOUTUBE_SEARCH_ACTOR=false
APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT=2
APIFY_YOUTUBE_COMMENTS_PER_VIDEO=15
APIFY_LINKEDIN_POSTS_ACTOR_ID=apimaestro/linkedin-posts-search-scraper-no-cookies
APIFY_LINKEDIN_PROFILE_ACTOR_ID=automation-lab/linkedin-profile-scraper
APIFY_LINKEDIN_COMPANY_ACTOR_ID=automation-lab/linkedin-company-scraper
APIFY_TWITTER_SEARCH_ACTOR_ID=automation-lab/twitter-scraper
APIFY_TWITTER_PROFILE_ACTOR_ID=automation-lab/twitter-scraper
APIFY_TWITTER_FOLLOWERS_ACTOR_ID=automation-lab/twitter-scraper
APIFY_ENABLE_TWITTER_SEARCH=false
APIFY_REDDIT_ACTOR_ID=prodiger/reddit-scraper
APIFY_TELEGRAM_ACTOR_ID=viralanalyzer/telegram-channel-scraper
```

Budget iniziale consigliato: circa 30 euro/mese. Per questo i default sono prudenti: massimo 6 Actor Apify per ricerca, pochi commenti/follower/like per fonte e costo massimo basso per run. Gli Actor pesanti o piu rischiosi per budget, come Facebook Search/Ads e X Search, sono agganciati ma disattivati finche non li abiliti con le variabili `APIFY_ENABLE_*`.

Nota prodotto: il Radar non deve usare Serper/Google per mostrare “clienti”. Serper trova fonti da minare: pagine Instagram, video YouTube, creator TikTok, gruppi, canali e community. I prospect rivelati devono arrivare soprattutto da commenti, like, follower pubblici disponibili e profili attivi estratti da quelle fonti.

Di default YouTube usa Serper per scoprire video e Apify solo per leggere commenti recenti. `APIFY_ENABLE_YOUTUBE_SEARCH_ACTOR=true` riattiva anche l'Actor YouTube Search, ma puo essere lento su Vercel. `APIFY_YOUTUBE_COMMENTS_ACTOR_ID` puo essere `off` per disattivare il comment mining.

## Regola prodotto fondamentale

La piattaforma deve essere professionale e realistica:

- social/app chiuse = contatto manuale assistito
- siti, email business pubbliche, form e lead autorizzati = automazione possibile con conferma e log

Niente promesse impossibili, niente spam automatico sui social.
