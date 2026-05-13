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
- `api/radar-search.js`: ricerca live su fonti open web supportate: Reddit, Q&A, DEV, WordPress, GitHub tecnico e URL diretti.
- `vercel.json`: configurazione deploy.

## Regola prodotto fondamentale

La piattaforma deve essere professionale e realistica:

- social/app chiuse = contatto manuale assistito
- siti, email business pubbliche, form e lead autorizzati = automazione possibile con conferma e log

Niente promesse impossibili, niente spam automatico sui social.
