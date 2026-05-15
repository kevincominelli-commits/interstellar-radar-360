const canvas = document.querySelector("#starCanvas");
const ctx = canvas.getContext("2d");
const stars = [];
const frameEl = document.querySelector(".stage-frame");
const shellEl = document.querySelector(".dashboard-shell");
const desktopWidth = 1180;
const svgNs = "http://www.w3.org/2000/svg";

const dashboardChartSeriesByTheme = {
  stripe: [
    { key: "prospects", label: "Prospect", color: "#5b67d8", glow: "#8d96ff" },
    { key: "contacts", label: "Contatti", color: "#24a69a", glow: "#54d4ca" },
    { key: "clients", label: "Clienti", color: "#38a8c4", glow: "#7ed7ea", thin: true }
  ],
  interstellar: [
    { key: "prospects", label: "Prospect", color: "#7c4dff", glow: "#9b78ff" },
    { key: "contacts", label: "Contatti", color: "#1f8fff", glow: "#52b4ff" },
    { key: "clients", label: "Clienti", color: "#2ee9f0", glow: "#71ffff", thin: true }
  ]
};

document.addEventListener(
  "click",
  (event) => {
    const navButton = event.target.closest?.("[data-nav]");
    if (navButton) {
      navigateTo(navButton.dataset.nav);
      return;
    }

    const jumpButton = event.target.closest?.("[data-jump]");
    if (jumpButton) {
      navigateTo(jumpButton.dataset.jump);
    }
  },
  true
);

function resize() {
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.floor(window.innerWidth * ratio);
  canvas.height = Math.floor(window.innerHeight * ratio);
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function fitDesktopPreview() {
  if (!frameEl || !shellEl) return;

  const availableWidth = Math.max(window.innerWidth - 20, 320);
  if (availableWidth >= desktopWidth) {
    frameEl.style.width = "";
    frameEl.style.height = "";
    shellEl.style.width = "";
    shellEl.style.transform = "";
    return;
  }

  const scale = availableWidth / desktopWidth;
  shellEl.style.width = `${desktopWidth}px`;
  shellEl.style.transform = `scale(${scale})`;
  frameEl.style.width = `${desktopWidth * scale}px`;
  frameEl.style.height = `${shellEl.scrollHeight * scale}px`;
}

function createSvgElement(tag, attributes = {}) {
  const element = document.createElementNS(svgNs, tag);
  for (const [name, value] of Object.entries(attributes)) {
    element.setAttribute(name, String(value));
  }
  return element;
}

function createSvgChild(parent, tag, attributes = {}) {
  const element = createSvgElement(tag, attributes);
  parent.appendChild(element);
  return element;
}

function smoothPath(points) {
  if (points.length < 2) return "";

  const commands = [`M ${points[0].x} ${points[0].y}`];
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] || points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] || p2;
    const tension = 0.92;
    const c1x = p1.x + ((p2.x - p0.x) / 6) * tension;
    const c1y = p1.y + ((p2.y - p0.y) / 6) * tension;
    const c2x = p2.x - ((p3.x - p1.x) / 6) * tension;
    const c2y = p2.y - ((p3.y - p1.y) / 6) * tension;
    commands.push(`C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2.x} ${p2.y}`);
  }

  return commands.join(" ");
}

function areaPath(points, baseline) {
  if (!points.length) return "";
  return `${smoothPath(points)} L ${points[points.length - 1].x} ${baseline} L ${points[0].x} ${baseline} Z`;
}

function formatMetric(value) {
  return new Intl.NumberFormat("it-IT").format(value);
}

function createAreaChart(root, initialData, series) {
  const svg = root?.querySelector(".area-chart__svg");
  const tooltip = root?.querySelector(".area-chart__tooltip");
  if (!root || !svg || !tooltip) return null;

  let activeSeries = [...series];
  const viewBox = { width: 860, height: 330, top: 30, right: 34, bottom: 42, left: 54 };
  const chart = {
    data: [...initialData],
    pointsByIndex: [],
    pointNodes: [],
    guide: null
  };

  function buildDefinitions() {
    const defs = createSvgElement("defs");

    const glow = createSvgChild(defs, "filter", {
      id: "interstellarChartGlow",
      x: "-55%",
      y: "-55%",
      width: "210%",
      height: "210%"
    });
    createSvgChild(glow, "feGaussianBlur", { stdDeviation: "5", result: "blur" });
    const merge = createSvgChild(glow, "feMerge");
    createSvgChild(merge, "feMergeNode", { in: "blur" });
    createSvgChild(merge, "feMergeNode", { in: "SourceGraphic" });

    const pointGlow = createSvgChild(defs, "filter", {
      id: "interstellarPointGlow",
      x: "-90%",
      y: "-90%",
      width: "280%",
      height: "280%"
    });
    createSvgChild(pointGlow, "feGaussianBlur", { stdDeviation: "7", result: "pointBlur" });
    const pointMerge = createSvgChild(pointGlow, "feMerge");
    createSvgChild(pointMerge, "feMergeNode", { in: "pointBlur" });
    createSvgChild(pointMerge, "feMergeNode", { in: "SourceGraphic" });

    for (const item of activeSeries) {
      const areaGradient = createSvgChild(defs, "linearGradient", {
        id: `area-${item.key}`,
        x1: "0",
        y1: "0",
        x2: "0",
        y2: "1"
      });
      const areaTop = createSvgChild(areaGradient, "stop", {
        offset: "0%",
        "stop-color": item.color,
        "stop-opacity": item.key === "replies" ? "0.18" : "0.32"
      });
      createSvgChild(areaTop, "animate", {
        attributeName: "stop-opacity",
        values: item.key === "replies" ? "0.12;0.24;0.12" : "0.24;0.42;0.24",
        dur: "4.8s",
        repeatCount: "indefinite"
      });
      createSvgChild(areaGradient, "stop", {
        offset: "100%",
        "stop-color": item.color,
        "stop-opacity": "0"
      });

      const strokeGradient = createSvgChild(defs, "linearGradient", {
        id: `stroke-${item.key}`,
        x1: "0",
        y1: "0",
        x2: "1",
        y2: "0"
      });
      createSvgChild(strokeGradient, "stop", {
        offset: "0%",
        "stop-color": item.color,
        "stop-opacity": "0.78"
      });
      const middleStop = createSvgChild(strokeGradient, "stop", {
        offset: "50%",
        "stop-color": item.glow,
        "stop-opacity": "1"
      });
      createSvgChild(middleStop, "animate", {
        attributeName: "offset",
        values: "18%;62%;18%",
        dur: "5.2s",
        repeatCount: "indefinite"
      });
      createSvgChild(strokeGradient, "stop", {
        offset: "100%",
        "stop-color": item.color,
        "stop-opacity": "0.86"
      });
    }

    return defs;
  }

  function getChartGeometry() {
    const width = viewBox.width - viewBox.left - viewBox.right;
    const height = viewBox.height - viewBox.top - viewBox.bottom;
    const maxValue = Math.max(...chart.data.flatMap((entry) => activeSeries.map((item) => entry[item.key])));
    const max = Math.max(10, Math.ceil((maxValue * 1.18) / 10) * 10 || 10);
    const step = chart.data.length > 1 ? width / (chart.data.length - 1) : width;

    return {
      width,
      height,
      max,
      baseline: viewBox.top + height,
      x: (index) => viewBox.left + index * step,
      y: (value) => viewBox.top + (1 - value / max) * height
    };
  }

  function setActive(index, localX = null) {
    const entry = chart.data[index];
    const points = chart.pointsByIndex[index];
    if (!entry || !points || !chart.guide) return;

    root.classList.add("is-hovering");
    chart.guide.setAttribute("x1", points.x);
    chart.guide.setAttribute("x2", points.x);

    for (const point of chart.pointNodes) {
      const isActive = Number(point.dataset.index) === index;
      point.classList.toggle("is-active", isActive);
      point.setAttribute("r", isActive ? "5.8" : "3.3");
      point.setAttribute("filter", isActive ? "url(#interstellarPointGlow)" : "none");
    }

    tooltip.hidden = false;
    tooltip.innerHTML = `
      <div class="tooltip-date">${entry.label}</div>
      ${activeSeries
        .map(
          (item) => `
            <div class="tooltip-row">
              <span style="color:${item.color}"><i style="background:${item.color}"></i>${item.label}</span>
              <strong>${formatMetric(entry[item.key])}</strong>
            </div>
          `
        )
        .join("")}
    `;

    const positionX = localX ?? points.x;
    tooltip.style.left = `${Math.max(96, Math.min(root.clientWidth - 96, positionX))}px`;
    tooltip.style.top = `${Math.max(88, points.minY - 8)}px`;
  }

  function render() {
    svg.replaceChildren();
    chart.pointsByIndex = [];
    chart.pointNodes = [];
    svg.appendChild(buildDefinitions());

    const geometry = getChartGeometry();
    const grid = createSvgChild(svg, "g", { "aria-hidden": "true" });

    for (let index = 0; index < 6; index += 1) {
      const y = viewBox.top + (geometry.height / 5) * index;
      createSvgChild(grid, "line", {
        class: "chart-grid-line",
        x1: viewBox.left,
        y1: y,
        x2: viewBox.width - viewBox.right,
        y2: y
      });
    }

    for (let index = 0; index < chart.data.length; index += 1) {
      const x = geometry.x(index);
      createSvgChild(grid, "line", {
        class: "chart-grid-line",
        x1: x,
        y1: viewBox.top,
        x2: x,
        y2: geometry.baseline
      });
    }

    for (const item of activeSeries) {
      const points = chart.data.map((entry, index) => ({
        x: geometry.x(index),
        y: geometry.y(entry[item.key]),
        value: entry[item.key]
      }));

      createSvgChild(svg, "path", {
        class: "chart-area",
        d: areaPath(points, geometry.baseline),
        fill: `url(#area-${item.key})`
      });

      const line = createSvgChild(svg, "path", {
        class: `chart-line${item.thin ? " chart-line--thin" : ""}`,
        d: smoothPath(points),
        stroke: `url(#stroke-${item.key})`,
        filter: "url(#interstellarChartGlow)"
      });

      requestAnimationFrame(() => {
        line.style.setProperty("--line-length", line.getTotalLength());
      });

      points.forEach((point, index) => {
        chart.pointsByIndex[index] ||= { x: point.x, minY: point.y };
        chart.pointsByIndex[index].minY = Math.min(chart.pointsByIndex[index].minY, point.y);
        const circle = createSvgChild(svg, "circle", {
          class: "chart-point",
          cx: point.x,
          cy: point.y,
          r: index === chart.data.length - 1 ? "5.8" : "3.3",
          stroke: item.color,
          style: `color:${item.color}`
        });
        circle.dataset.index = String(index);
        if (index === chart.data.length - 1) {
          circle.classList.add("is-active");
          circle.setAttribute("filter", "url(#interstellarPointGlow)");
        }
        chart.pointNodes.push(circle);
      });
    }

    const labels = createSvgChild(svg, "g", { "aria-hidden": "true" });
    chart.data.forEach((entry, index) => {
      const label = createSvgChild(labels, "text", {
        class: "chart-axis-label",
        x: geometry.x(index),
        y: viewBox.height - 10,
        "text-anchor": "middle"
      });
      label.textContent = entry.label;
    });

    chart.guide = createSvgChild(svg, "line", {
      class: "chart-guide",
      x1: chart.pointsByIndex.at(-1)?.x ?? viewBox.left,
      y1: viewBox.top,
      x2: chart.pointsByIndex.at(-1)?.x ?? viewBox.left,
      y2: geometry.baseline
    });

    setActive(chart.data.length - 1);
    root.classList.remove("is-hovering");
    tooltip.hidden = true;
  }

  function handlePointer(event) {
    const rect = root.getBoundingClientRect();
    const scaleX = root.clientWidth / rect.width;
    const localX = (event.clientX - rect.left) * scaleX;
    const geometry = getChartGeometry();
    const relative = Math.max(0, Math.min(geometry.width, localX - viewBox.left));
    const index = Math.round((relative / geometry.width) * (chart.data.length - 1));
    setActive(index, localX);
  }

  root.addEventListener("pointermove", handlePointer);
  root.addEventListener("pointerdown", handlePointer);

  root.addEventListener("pointerleave", () => {
    setActive(chart.data.length - 1);
    root.classList.remove("is-hovering");
    tooltip.hidden = true;
  });

  render();

  return {
    setData(nextData) {
      chart.data = [...nextData];
      render();
      fitDesktopPreview();
    },
    setSeries(nextSeries) {
      activeSeries = [...nextSeries];
      render();
      fitDesktopPreview();
    }
  };
}

function seed() {
  stars.length = 0;
  for (let index = 0; index < 120; index += 1) {
    stars.push({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.1 + 0.2,
      a: Math.random() * 0.45 + 0.08,
      drift: Math.random() * 0.08 + 0.02
    });
  }
}

function frame() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  for (const star of stars) {
    star.y += star.drift;
    if (star.y > window.innerHeight + 2) {
      star.y = -2;
      star.x = Math.random() * window.innerWidth;
    }
    ctx.beginPath();
    ctx.fillStyle = `rgba(245, 247, 250, ${star.a})`;
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  requestAnimationFrame(frame);
}

window.addEventListener("resize", () => {
  resize();
  fitDesktopPreview();
  seed();
});

resize();
fitDesktopPreview();
seed();
frame();

const themePicker = document.querySelector("#themePicker");
const availableThemes = new Set(["stripe", "interstellar"]);
const themeStorageKey = "interstellar-theme-v2";

function getStoredTheme() {
  try {
    return localStorage.getItem(themeStorageKey);
  } catch {
    return null;
  }
}

function storeTheme(theme) {
  try {
    localStorage.setItem(themeStorageKey, theme);
  } catch {
    // Theme switching still works without persistence if storage is blocked.
  }
}

function applyTheme(theme, persist = true) {
  const nextTheme = availableThemes.has(theme) ? theme : "stripe";
  document.body.dataset.theme = nextTheme;
  if (themePicker) themePicker.value = nextTheme;
  if (persist) storeTheme(nextTheme);
}

if (themePicker) {
  themePicker.addEventListener("change", (event) => {
    applyTheme(event.target.value);
    renderDashboardData();
  });
}

applyTheme(getStoredTheme() || document.body.dataset.theme || "stripe", false);
fitDesktopPreview();

const workspaceKey = "interstellar-lead-finder-workspace-v3";
const statusLabels = {
  new: "Nuovo",
  qualified: "Qualificato",
  contacted: "Contattato",
  interested: "Interessato",
  client: "Cliente",
  discarded: "Scartato"
};
const statusOrder = Object.keys(statusLabels);
const leadResultTabs = {
  top: "Top Leads",
  engaged: "Engaged Users",
  competitor: "Competitor Audience",
  lookalike: "Lookalike AI",
  fresh: "Fresh Leads"
};
const targetExpansionMap = {
  finanza: ["trading", "investing", "forex", "crypto", "borsa", "educazione finanziaria", "side hustle", "business"],
  trading: ["forex", "prop firm", "crypto", "investing", "metatrader", "price action", "finanza", "risk management"],
  crypto: ["bitcoin", "web3", "defi", "trading", "investing", "blockchain", "nft", "finanza"],
  fitness: ["palestra", "personal trainer", "dimagrimento", "bodybuilding", "wellness", "nutrizione", "coach"],
  business: ["entrepreneur", "startup", "marketing", "vendite", "lead generation", "agency", "side hustle"],
  marketing: ["ads", "meta ads", "funnel", "ecommerce", "lead generation", "copywriting", "creator economy"],
  ecommerce: ["shopify", "dropshipping", "brand", "ads", "conversioni", "email marketing", "retail"],
  ai: ["automazioni", "chatbot", "openai", "no-code", "workflow", "agents", "saas", "produttività"]
};
const testLeadDataset = [
  "trader_italia,Instagram,Parlo di trading forex crypto e finanza personale,3200,850,5.2,it,Italia,trading forex crypto finanza,2,@pagina_finanza,false,12,@trader_italia",
  "investiresemplice,TikTok,Video brevi su investing side hustle e business online,18400,310,7.8,it,Italia,investing business side hustle,1,#finanzapersonale,false,9,",
  "crypto_milano,Telegram,Community crypto italiana molto attiva su bitcoin web3 e DeFi,5600,420,6.1,it,Italia,crypto bitcoin web3 defi,3,canale crypto italia,false,18,@crypto_milano",
  "forex_daily_it,Instagram,Analisi forex price action risk management e prop firm,9200,780,4.6,it,Italia,forex trading prop firm risk management,4,@forex_italia,false,22,",
  "business_luca,LinkedIn,Founder interessato ad AI automazioni lead generation e crescita commerciale,2600,1100,3.4,it,Italia,ai business lead generation automazioni,5,@startup_italia,false,8,luca@example.com",
  "finanza_pratica,YouTube,Canale educational su borsa ETF investimenti e educazione finanziaria,12500,120,5.5,it,Italia,borsa investing educazione finanziaria,6,commenti canale finanza,false,15,",
  "sidehustle_roma,TikTok,Creo contenuti su business side hustle marketing e vendita online,7800,930,8.4,it,Italia,business side hustle marketing ecommerce,1,#businessitalia,false,11,",
  "ai_growth_studio,LinkedIn,AI workflow no-code automazioni chatbot e sistemi SaaS per aziende,4100,1500,4.1,it,Italia,ai automazioni chatbot saas no-code,3,@ai_italia,false,5,hello@aigrowth.test",
  "fitness_mindset,Instagram,Coach fitness nutrizione e business per personal trainer,5200,880,4.9,it,Italia,fitness coach business marketing,7,@fitnessitalia,false,19,",
  "ecom_brand_lab,TikTok,Shopify ecommerce ads conversioni email marketing e crescita brand,11200,760,6.7,it,Italia,ecommerce shopify ads marketing,2,#ecommerceitalia,false,13,",
  "trading_private,Instagram,Profilo privato trading crypto forex,1500,1200,5.8,it,Italia,trading crypto forex,2,@pagina_finanza,true,10,",
  "bot_finance_001,Twitter/X,Free crypto pump signals daily profit guaranteed,24000,50,0.4,en,Italia,crypto trading,1,#crypto,false,92,",
  "finance_creator_uk,YouTube,Investing trading and side hustle content for young entrepreneurs,8800,320,5.1,en,UK,investing trading entrepreneur business,4,@financeuk,false,16,",
  "marketing_anna,LinkedIn,Consulente marketing funnel lead generation e AI content per PMI,3400,980,3.7,it,Italia,marketing funnel lead generation ai,3,@marketingitalia,false,7,anna@example.com",
  "telegram_invest_club,Telegram,Gruppo italiano su investing crypto forex con commenti giornalieri,6700,500,6.3,it,Italia,investing crypto forex community,1,canale invest club,false,21,@invest_club"
].join("\n");
const helpContent = {
  leadFinderOverview: {
    title: "Cos'è il Lead Finder",
    intro: "È il motore che trova e ordina potenziali clienti o utenti interessati. Qui non si contatta nessuno: si raccolgono, filtrano e classificano lead.",
    steps: ["Inserisci nicchia, area e piattaforme.", "Importa o collega una fonte dati reale.", "Clicca TROVA LEAD.", "Apri i risultati migliori e usali nella sezione outreach separata."],
    example: "Esempio: nicchia finanza, Italia, Instagram + TikTok, modalità Engaged Users."
  },
  niche: {
    title: "Nicchia / target",
    intro: "È l'argomento o tipo di persona che vuoi trovare. Non serve essere perfetti: il sistema espande la parola in keyword correlate.",
    steps: ["Scrivi una parola semplice.", "Evita frasi troppo lunghe.", "Usa il target reale che vuoi vendere o studiare."],
    example: "finanza diventa anche trading, investing, forex, crypto, business."
  },
  country: {
    title: "Paese",
    intro: "Limita i risultati a utenti di un paese specifico.",
    steps: ["Scrivi Italia per utenti italiani.", "Lascia vuoto se vuoi cercare ovunque.", "Usalo insieme a Lingua per risultati più puliti."],
    example: "Paese: Italia, Lingua: Italiano."
  },
  city: {
    title: "Città",
    intro: "Serve quando vuoi lead localizzati in una città o area precisa.",
    steps: ["Compila solo se la posizione conta davvero.", "Lascia vuoto per cercare in tutto il paese."],
    example: "Milano per creator, networker o attività locali in zona Milano."
  },
  language: {
    title: "Lingua",
    intro: "Filtra gli utenti in base alla lingua principale del profilo o dei contenuti.",
    steps: ["Italiano per mercato italiano.", "Inglese per mercato internazionale.", "Qualsiasi se vuoi più volume."],
    example: "Lingua Italiano evita molti profili esteri non utili."
  },
  timezone: {
    title: "Timezone",
    intro: "Aiuta a capire se l'utente è attivo in una fascia oraria compatibile con il tuo mercato.",
    steps: ["Europe/Rome per Italia.", "Qualsiasi se non ti interessa l'orario.", "Utile quando collegheremo fonti reali con attività recente."],
    example: "Europe/Rome per lead italiani attivi durante orari italiani."
  },
  platforms: {
    title: "Piattaforme",
    intro: "Sono i canali dove cercare lead. Puoi selezionarne una o più.",
    steps: ["Instagram/TikTok per creator e utenti consumer.", "LinkedIn per B2B e aziende.", "Telegram per community verticali.", "YouTube per audience di creator e commentatori."],
    example: "Per network marketing: Instagram + TikTok. Per aziende: LinkedIn."
  },
  searchModes: {
    title: "Modalità ricerca",
    intro: "Scegli il tipo di ricerca. Non sono tutte uguali: cambiano il modo in cui il sistema dà priorità ai lead.",
    steps: [
      "Keyword Search: cerca profili e contenuti collegati alla nicchia.",
      "Competitor Audience: cerca utenti vicini a un competitor o creator.",
      "Engaged Users: dà priorità a chi commenta, interagisce o è molto attivo.",
      "Lookalike AI: trova utenti simili a competitor o lead già buoni.",
      "Fresh Leads: preferisce utenti attivi da poco."
    ],
    example: "Se non sai cosa scegliere, parti da Engaged Users: di solito vale più di follower casuali."
  },
  competitor: {
    title: "Competitor / creator / community",
    intro: "È una pagina, creator, canale o community da usare come riferimento.",
    steps: ["Inserisci @username o nome community.", "Funziona meglio con modalità Competitor Audience o Lookalike AI.", "Lascia vuoto se vuoi fare solo ricerca per nicchia."],
    example: "@pagina_finanza per trovare utenti simili o coinvolti nella nicchia finanza."
  },
  minEngagement: {
    title: "Engagement minimo",
    intro: "Filtra utenti poco attivi. Engagement alto significa che il profilo riceve o genera interazioni.",
    steps: ["2 è morbido.", "5 è più selettivo.", "Troppo alto riduce molto i risultati."],
    example: "Metti 2 per partire, poi alza a 5 se vuoi solo lead più caldi."
  },
  minFollowers: {
    title: "Follower minimi",
    intro: "Esclude account troppo piccoli o vuoti. Non significa che più follower sia sempre meglio.",
    steps: ["100 è un filtro base.", "1000+ per profili più strutturati.", "Per clienti consumer lascia basso."],
    example: "Per networker e creator: 100. Per B2B/creator seri: 1000."
  },
  minScore: {
    title: "Score minimo",
    intro: "È la soglia di qualità AI. Sotto questa soglia il lead non viene mostrato.",
    steps: ["55 mostra più risultati.", "70 mostra lead migliori.", "80+ mostra pochi lead ma molto selezionati."],
    example: "Parti da 55; quando hai tanti dati, alza a 70."
  },
  activeDays: {
    title: "Attivi ultimi giorni",
    intro: "Mostra solo utenti con attività recente. Serve a evitare lead morti.",
    steps: ["7 giorni è molto fresco.", "14 giorni è equilibrato.", "30 giorni dà più volume."],
    example: "14 significa: mostrami utenti attivi nelle ultime due settimane."
  },
  resultLimit: {
    title: "Numero risultati",
    intro: "Decide quanti lead vuoi vedere per ricerca.",
    steps: ["25 è comodo per lavorare a mano.", "50-100 quando hai un dataset grande.", "Meglio pochi buoni che tanti confusi."],
    example: "25 risultati per una prima lista pulita."
  },
  rotationSeed: {
    title: "Seed rotazione",
    intro: "Serve a diversificare i risultati. Utenti diversi con seed diversi non vedono sempre gli stessi lead nello stesso ordine.",
    steps: ["Lascia internal-alpha per noi.", "Cambia seed per simulare un altro workspace.", "In SaaS sarà legato all'account cliente."],
    example: "agency-001 e agency-002 ricevono ordini diversi sugli stessi dati."
  },
  excludeBots: {
    title: "No bot",
    intro: "Nasconde profili con rischio bot alto.",
    steps: ["Tienilo attivo quasi sempre.", "Disattivalo solo per analizzare dati sporchi.", "Il bot risk arriva dal dataset o dal connettore."],
    example: "Se bot risk è 80/100, il profilo viene escluso."
  },
  excludePrivate: {
    title: "No privati",
    intro: "Nasconde profili privati o con dati troppo limitati.",
    steps: ["Tienilo attivo per lead più lavorabili.", "Disattivalo se vuoi vedere anche profili incompleti."],
    example: "Un profilo privato può essere interessante, ma spesso è meno valutabile."
  },
  freshFirst: {
    title: "Freshness prioritaria",
    intro: "Dà un boost agli utenti attivi da poco.",
    steps: ["Utile per nicchie calde.", "Aiuta a evitare account abbandonati.", "Non sostituisce lo score, lo influenza."],
    example: "Un utente attivo 2 giorni fa sale sopra uno attivo 25 giorni fa."
  },
  findLeads: {
    title: "TROVA LEAD",
    intro: "Lancia la ricerca sul database importato o sulla fonte collegata. Non manda messaggi.",
    steps: ["Controlla nicchia e piattaforme.", "Importa dati se il database è vuoto.", "Clicca TROVA LEAD.", "Guarda Top Leads o Engaged Users."],
    example: "Se non esce nulla, abbassa score minimo o importa più dati."
  },
  targetExpansion: {
    title: "Target expansion AI",
    intro: "Mostra le parole correlate che il sistema userà oltre alla nicchia scritta da te.",
    steps: ["Serve a non cercare solo una keyword secca.", "Aumenta la probabilità di trovare utenti davvero affini.", "In futuro sarà generata da AI e dati reali."],
    example: "AI può espandersi in automazioni, chatbot, no-code, SaaS, agents."
  },
  noOutreach: {
    title: "Niente outreach qui",
    intro: "Questa sezione non deve contattare nessuno. È solo per trovare e ordinare lead.",
    steps: ["Trova lead qui.", "Apri dettagli e qualità.", "Esporta o passa alla sezione outreach.", "Invio messaggi solo in una sezione separata e controllata."],
    example: "Qui prepari la lista; in Outreach decidi se e come contattare."
  },
  exportResults: {
    title: "Esporta risultati",
    intro: "Scarica o copia solo i lead visibili nella ricerca attuale.",
    steps: ["Applica filtri e tab.", "Clicca esporta.", "Se il browser blocca gli appunti, viene scaricato un file JSON."],
    example: "Esporta Top Leads per passarli a CRM o outreach."
  },
  tabTop: {
    title: "Top Leads",
    intro: "Mostra i lead migliori in base a score, keyword, freshness e rotazione.",
    steps: ["Parti sempre da qui.", "Apri i dettagli dei primi risultati.", "Esporta solo se la lista ti convince."],
    example: "È la vista principale per lavorare lead di qualità."
  },
  tabEngaged: {
    title: "Engaged Users",
    intro: "Mostra utenti più coinvolti: commentano, interagiscono o hanno engagement alto.",
    steps: ["Usalo quando vuoi persone più reattive.", "È spesso più utile dei semplici follower.", "Richiede dati engagement nel dataset."],
    example: "Meglio 100 utenti che commentano che 10.000 follower freddi."
  },
  tabCompetitor: {
    title: "Competitor Audience",
    intro: "Mostra lead collegati a competitor, creator o community indicati.",
    steps: ["Inserisci un competitor.", "Scegli modalità Competitor Audience.", "Cerca utenti provenienti da quella fonte."],
    example: "@pagina_finanza come provenienza o riferimento."
  },
  tabLookalike: {
    title: "Lookalike AI",
    intro: "Mostra utenti simili alla nicchia, competitor o lead buoni.",
    steps: ["Funziona meglio con keyword espanse.", "Cerca più segnali in bio/interessi/provenienza.", "Utile quando vuoi scalare una lista già validata."],
    example: "Se un lead valido parla di forex e business, cerca profili con segnali simili."
  },
  tabFresh: {
    title: "Fresh Leads",
    intro: "Mostra utenti attivi recentemente.",
    steps: ["Utile per campagne veloci.", "Evita lead morti.", "Dipende dal campo ultima attività o active days."],
    example: "Utenti attivi oggi o negli ultimi 7 giorni."
  },
  importDataset: {
    title: "Importa dataset reale",
    intro: "Carica lead raccolti da fonti consentite, export o ricerche manuali.",
    steps: ["Incolla una riga per lead.", "Rispetta l'ordine dei campi indicato nel placeholder.", "Poi clicca Importa dataset e TROVA LEAD."],
    example: "username, Instagram, bio, 3200, 850, 5.2, it, Italia, trading crypto, 2, @competitor, false, 12, email"
  },
  importButton: {
    title: "Importa dataset",
    intro: "Salva le righe incollate nel database locale della piattaforma.",
    steps: ["Non cerca online da solo.", "Non manda messaggi.", "Evita duplicati uguali per piattaforma e username."],
    example: "Importi 200 righe, poi il finder le filtra e ordina."
  },
  testDataset: {
    title: "Carica dataset test",
    intro: "Inserisce lead di prova nel database locale per testare subito ricerca, score, tab e filtri.",
    steps: ["Clicca il bottone.", "Poi premi TROVA LEAD.", "Cambia modalità, piattaforme o score per vedere come cambiano i risultati."],
    example: "È solo un dataset locale di test: non sono lead reali da contattare."
  },
  youtubeApi: {
    title: "YouTube API reale",
    intro: "Questo connettore usa la YouTube Data API ufficiale per cercare video pubblici e leggere commentatori pubblici collegati alla nicchia.",
    steps: ["Inserisci una API key YouTube Data API.", "Imposta nicchia, lingua e paese nel Lead Finder.", "Clicca Cerca lead veri da YouTube.", "I canali e i commentatori trovati finiscono nel database lead."],
    example: "Nicchia finanza + Italia + Italiano può trovare video e commentatori pubblici su trading, investing e crypto."
  },
  youtubeApiKey: {
    title: "API key YouTube",
    intro: "È la chiave ufficiale Google/YouTube che autorizza la ricerca. Senza questa chiave non possiamo prendere dati veri da YouTube.",
    steps: ["Creala da Google Cloud abilitando YouTube Data API v3.", "Incollala qui.", "La chiave resta nel browser locale durante il test."],
    example: "Se la key è errata o senza quota, vedrai un errore nel box sotto al bottone."
  },
  clearDatabase: {
    title: "Svuota database",
    intro: "Cancella i lead importati nel database locale.",
    steps: ["Usalo solo se vuoi ripartire da zero.", "Non cancella file esterni.", "Dopo il reset la ricerca non avrà dati finché non importi di nuovo."],
    example: "Comodo per pulire un dataset di test."
  }
};

const integrationItems = [
  ["Google Maps", "Ricerca aziende locali e segnali base", "Da collegare"],
  ["Instagram", "Ricerca creator, networker e attività visibili", "Da collegare"],
  ["LinkedIn", "Prospecting B2B e decision maker", "Da collegare"],
  ["Email SMTP", "Invio solo dopo approvazione manuale", "Sicuro"],
  ["Supabase", "Database utenti e workspace cloud", "Roadmap"],
  ["Stripe", "Abbonamenti mensili e annuali", "Roadmap"]
];

const planCatalog = {
  free: {
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 150,
    limits: {
      live_search: 5,
      radar_search: 30,
      export: 3,
      campaign: 2,
      offer: 5,
      appointment: 5,
      automation: 3
    }
  },
  pro: {
    name: "Pro",
    monthlyPrice: 97,
    annualPrice: 970,
    credits: 5000,
    limits: {
      live_search: 250,
      radar_search: 600,
      export: 100,
      campaign: 40,
      offer: 120,
      appointment: 120,
      automation: 60
    }
  },
  agency: {
    name: "Agency",
    monthlyPrice: 297,
    annualPrice: 2970,
    credits: 25000,
    limits: {
      live_search: 1500,
      radar_search: 4000,
      export: 600,
      campaign: 250,
      offer: 900,
      appointment: 900,
      automation: 300
    }
  },
  internal: {
    name: "Internal",
    monthlyPrice: 0,
    annualPrice: 0,
    credits: 999999,
    limits: {
      live_search: Infinity,
      radar_search: Infinity,
      export: Infinity,
      campaign: Infinity,
      offer: Infinity,
      appointment: Infinity,
      automation: Infinity
    }
  }
};

const usageLabels = {
  live_search: "Ricerche live",
  radar_search: "Analisi Radar",
  export: "Export",
  campaign: "Campagne",
  offer: "Offerte",
  appointment: "Appuntamenti",
  automation: "Automazioni"
};

function uid(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function defaultWorkspace() {
  return {
    settings: {
      workspace: "Interstellar Internal",
      signature: "Kevin - Interstellar"
    },
    plan: {
      name: "Pro",
      tier: "pro",
      status: "active",
      interval: "monthly",
      periodKey: "",
      seats: 1
    },
    credits: {
      balance: 5000,
      monthlyIncluded: 5000,
      spent: 0,
      softLimit: 4800,
      mode: "balanced"
    },
    creditsLedger: [],
    usageLogs: [],
    featureFlags: {
      radarFunnel: true,
      credits: true,
      opportunityRadar: false,
      conversationStarter: false,
      appointments: false,
      billing: false
    },
    leads: [],
    finder: {
      activeTab: "top",
      expandedKeywords: [],
      resultIds: [],
      lastSearch: null,
      assignments: {}
    },
    radarProspects: [],
    radar: {
      activeTab: "all",
      activeView: "revealed",
      resultIds: [],
      lastSearch: null,
      contactLogs: [],
      dailyCount: 0,
      dailyDate: "",
      assignments: {},
      searches: [],
      leadPools: [],
      leadPoolMembers: [],
      leadSources: [],
      leadReveals: [],
      savedLeadIds: [],
      lastProviderStatus: [],
      lastFunnel: null,
      lastCreditEstimate: null,
      operationMode: "balanced"
    },
    campaigns: [],
    automations: [],
    tasks: [],
    appointments: [],
    customers: [],
    deals: [],
    offers: [],
    opportunities: [],
    conversations: [],
    complianceLogs: [],
    optOuts: [],
    billingEvents: []
  };
}

const radarSocialPlatforms = new Set([
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "YouTube",
  "Reddit",
  "Telegram"
]);

const radarIntentPatterns = [
  { label: "prezzo", weight: 22, patterns: ["quanto costa", "prezzo", "preventivo", "costo", "tariffa", "price", "pricing"] },
  { label: "richiesta info", weight: 18, patterns: ["info", "informazioni", "come funziona", "mi interessa", "vorrei capire", "details"] },
  { label: "ricerca servizio", weight: 24, patterns: ["cerco", "qualcuno conosce", "mi serve", "sto cercando", "dove posso trovare", "consigliate"] },
  { label: "problema espresso", weight: 18, patterns: ["non riesco", "problema", "aiuto", "bloccato", "non so da dove partire", "fallito"] },
  { label: "urgenza", weight: 16, patterns: ["urgente", "subito", "prima possibile", "asap", "entro", "oggi"] },
  { label: "località", weight: 10, patterns: ["zona", "roma", "milano", "torino", "napoli", "bologna", "vicino"] },
  { label: "valutazione acquisto", weight: 14, patterns: ["vale la pena", "alternative", "migliore", "recensioni", "opinioni", "conviene"] }
];

const radarModeProfiles = {
  economy: {
    label: "Economy",
    description: "Cerca largo con AI minima e costo basso.",
    advancedMultiplier: 1,
    creditMultiplier: 0.65
  },
  balanced: {
    label: "Balanced",
    description: "Default: buon equilibrio tra copertura, qualità e costo.",
    advancedMultiplier: 2,
    creditMultiplier: 1
  },
  aggressive: {
    label: "Aggressive",
    description: "Più profondità e più candidati analizzati, da usare su ricerche ad alto valore.",
    advancedMultiplier: 4,
    creditMultiplier: 1.85
  }
};

const radarPhaseLabels = {
  rawCollected: "Raw collected",
  afterCleaning: "After cleaning",
  afterPreFilter: "After pre-filter",
  afterSemantic: "After semantic",
  afterAiBase: "After AI base",
  afterAiAdvanced: "After AI advanced",
  finalLeads: "Final leads"
};

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function scoreLead(input) {
  let score = 34;
  const engagement = Number(input.engagement || 0);
  const followers = Number(input.followers || 0);
  const following = Number(input.following || 0);
  const text = `${input.username} ${input.bio} ${input.interests} ${input.origin} ${input.note}`.toLowerCase();
  if (text.length > 80) score += 8;
  if (engagement >= 2) score += 10;
  if (engagement >= 5) score += 8;
  if (followers >= 100) score += 5;
  if (followers >= 1000) score += 5;
  if (following > 0 && followers / following > 0.2) score += 4;
  if (input.email || input.telegram || input.contact) score += 9;
  if (Number(input.activeDays ?? 999) <= 7) score += 12;
  if (Number(input.activeDays ?? 999) <= 2) score += 6;
  if (String(input.private).toLowerCase() === "true" || input.private === true) score -= 18;
  if (Number(input.botRisk || 0) >= 60) score -= 24;
  if (text.includes("trading") || text.includes("crypto") || text.includes("business") || text.includes("ai")) score += 6;
  return Math.max(1, Math.min(99, Math.round(score)));
}

function normalizeLead(input = {}) {
  const manualScore = clampScore(input.score);
  const createdAt = input.createdAt || new Date().toISOString();
  const username = String(input.username || input.handle || input.name || "").trim();
  const platform = String(input.platform || input.source || "Manuale").trim();
  const followers = Number(input.followers || 0);
  const following = Number(input.following || 0);
  const engagement = Number(input.engagement || 0);
  const activeDays = Number(input.activeDays ?? input.lastActiveDays ?? 999);
  const finalScore = manualScore ?? scoreLead({ ...input, username, platform, followers, following, engagement, activeDays });
  return {
    id: input.id || uid("lead"),
    username,
    name: username,
    company: String(input.company || username).trim(),
    platform,
    source: platform,
    bio: String(input.bio || input.note || "").trim(),
    followers,
    following,
    engagement,
    language: String(input.language || input.lang || "it").trim(),
    country: String(input.country || input.paese || "").trim(),
    timezone: String(input.timezone || "").trim(),
    interests: String(input.interests || input.target || "").trim(),
    lastActivity: String(input.lastActivity || "").trim(),
    activeDays,
    origin: String(input.origin || input.provenance || input.provenienza || "").trim(),
    private: input.private === true || String(input.private).toLowerCase() === "true" || String(input.private).toLowerCase() === "si",
    botRisk: Number(input.botRisk || 0),
    contact: String(input.contact || input.email || input.telegram || "").trim(),
    city: String(input.city || input.area || "").trim(),
    target: String(input.target || "Attività locali").trim(),
    offer: String(input.offer || workspace?.settings?.defaultOffer || "Sito web + automazioni AI").trim(),
    email: String(input.email || "").trim(),
    phone: String(input.phone || "").trim(),
    url: String(input.url || "").trim(),
    nextAction: String(input.nextAction || "Preparare primo messaggio").trim(),
    nextDue: String(input.nextDue || "").trim(),
    score: finalScore,
    quality: finalScore >= 80 ? "hot" : finalScore >= 58 ? "warm" : "cold",
    temperature: finalScore >= 80 ? "Hot" : finalScore >= 58 ? "Warm" : "Cold",
    status: statusLabels[input.status] ? input.status : "new",
    note: String(input.note || input.bio || "").trim(),
    draft: String(input.draft || "").trim(),
    createdAt,
    updatedAt: input.updatedAt || createdAt,
    lastContactAt: input.lastContactAt || "",
    assignedUntil: input.assignedUntil || "",
    sourceRadarId: String(input.sourceRadarId || input.radarLeadId || "").trim()
  };
}

function createLead(nameOrInput, company, source, city, target, offer, score = null) {
  if (typeof nameOrInput === "object" && nameOrInput !== null) {
    return normalizeLead(nameOrInput);
  }
  return normalizeLead({ name: nameOrInput, company, source, city, target, offer, score });
}

function currentPeriodKey(date = new Date()) {
  return date.toISOString().slice(0, 7);
}

function getPlanDefinition(tier = workspace?.plan?.tier || "pro") {
  return planCatalog[tier] || planCatalog.pro;
}

function normalizeWorkspacePlan(plan = {}) {
  const tier = planCatalog[plan.tier] ? plan.tier : "pro";
  const definition = getPlanDefinition(tier);
  return {
    name: definition.name,
    tier,
    status: plan.status || "active",
    interval: plan.interval === "annual" ? "annual" : "monthly",
    periodKey: plan.periodKey || currentPeriodKey(),
    seats: Math.max(1, Number(plan.seats || 1)),
    updatedAt: plan.updatedAt || new Date().toISOString()
  };
}

function formatPlanLimit(value) {
  return value === Infinity ? "Illimitato" : formatMetric(value);
}

function usageInCurrentPeriod(type) {
  const period = currentPeriodKey();
  return (workspace.usageLogs || []).filter((log) => log.type === type && (log.period || String(log.created_at || "").slice(0, 7)) === period).length;
}

function usageLimitStatus(type) {
  const limit = getPlanDefinition().limits[type] ?? Infinity;
  const used = usageInCurrentPeriod(type);
  return {
    type,
    label: usageLabels[type] || type,
    used,
    limit,
    remaining: limit === Infinity ? Infinity : Math.max(0, limit - used),
    blocked: limit !== Infinity && used >= limit
  };
}

function setPlanBlockedFeedback(selector, status) {
  setFeedback(
    selector,
    `${status.label} bloccato: piano ${getPlanDefinition().name} ha limite ${formatPlanLimit(status.limit)} al mese. Passa a un piano superiore o attendi il rinnovo.`
  );
}

function canUsePlanFeature(type, feedbackSelector = "#settingsFeedback") {
  refreshPlanPeriod();
  const status = usageLimitStatus(type);
  if (status.blocked) {
    setPlanBlockedFeedback(feedbackSelector, status);
    return false;
  }
  return true;
}

function recordUsage(type, module, units = 1, credits = 0, meta = {}) {
  workspace.usageLogs.unshift({
    id: uid("usage"),
    type,
    module,
    period: currentPeriodKey(),
    credits,
    units,
    workspace: workspace.settings.workspace,
    created_at: new Date().toISOString(),
    meta
  });
  workspace.usageLogs = workspace.usageLogs.slice(0, 160);
}

function refreshPlanPeriod() {
  workspace.plan = normalizeWorkspacePlan(workspace.plan);
  const period = currentPeriodKey();
  if (workspace.plan.periodKey === period) return;
  const definition = getPlanDefinition();
  workspace.plan.periodKey = period;
  workspace.plan.updatedAt = new Date().toISOString();
  workspace.credits.balance = definition.credits;
  workspace.credits.monthlyIncluded = definition.credits;
  workspace.credits.spent = 0;
  workspace.creditsLedger.unshift({
    id: uid("credit"),
    type: "credit",
    amount: definition.credits,
    balance_after: workspace.credits.balance,
    reason: "monthly_plan_renewal",
    created_at: new Date().toISOString()
  });
  workspace.billingEvents.unshift({
    id: uid("billing"),
    type: "period_renewal",
    plan: definition.name,
    period,
    created_at: new Date().toISOString()
  });
}

function applyPlanTier(tier, interval = "monthly") {
  const definition = getPlanDefinition(tier);
  workspace.plan = normalizeWorkspacePlan({
    ...workspace.plan,
    tier: planCatalog[tier] ? tier : "pro",
    interval,
    periodKey: currentPeriodKey(),
    updatedAt: new Date().toISOString()
  });
  workspace.credits.balance = definition.credits;
  workspace.credits.monthlyIncluded = definition.credits;
  workspace.credits.spent = 0;
  workspace.billingEvents.unshift({
    id: uid("billing"),
    type: "plan_changed",
    plan: definition.name,
    interval,
    price: interval === "annual" ? definition.annualPrice : definition.monthlyPrice,
    created_at: new Date().toISOString()
  });
}

function loadWorkspace() {
  const fallback = defaultWorkspace();
  try {
    const saved = JSON.parse(localStorage.getItem(workspaceKey));
    if (saved?.leads && saved?.campaigns && saved?.automations) {
      return {
        ...fallback,
        ...saved,
        settings: {
          ...fallback.settings,
          ...(saved.settings || {})
        },
        finder: {
          ...fallback.finder,
          ...(saved.finder || {})
        },
        radar: {
          ...fallback.radar,
          ...(saved.radar || {})
        },
        leads: Array.isArray(saved.leads) ? saved.leads : fallback.leads,
        radarProspects: Array.isArray(saved.radarProspects) ? saved.radarProspects : fallback.radarProspects,
        campaigns: Array.isArray(saved.campaigns) ? saved.campaigns : fallback.campaigns,
        automations: Array.isArray(saved.automations) ? saved.automations : fallback.automations
      };
    }
  } catch {
    // Corrupted local data falls back to the internal seed.
  }
  const workspace = fallback;
  saveWorkspace(workspace);
  return workspace;
}

function saveWorkspace(nextWorkspace = workspace) {
  localStorage.setItem(workspaceKey, JSON.stringify(nextWorkspace));
}

let workspace = loadWorkspace();
let activePage = "dashboard";
let selectedLeadId = workspace.leads[0]?.id || "";
let activeLeadTab = workspace.finder?.activeTab || "top";
let selectedRadarId = workspace.radarProspects?.[0]?.lead_id || "";
let activeRadarTab = workspace.radar?.activeTab || "all";
let activeRadarView = workspace.radar?.activeView || "revealed";

workspace.finder = { ...defaultWorkspace().finder, ...(workspace.finder || {}) };
workspace.radar = { ...defaultWorkspace().radar, ...(workspace.radar || {}) };
workspace.plan = { ...defaultWorkspace().plan, ...(workspace.plan || {}) };
workspace.credits = { ...defaultWorkspace().credits, ...(workspace.credits || {}) };
workspace.creditsLedger = Array.isArray(workspace.creditsLedger) ? workspace.creditsLedger : [];
workspace.usageLogs = Array.isArray(workspace.usageLogs) ? workspace.usageLogs : [];
workspace.featureFlags = { ...defaultWorkspace().featureFlags, ...(workspace.featureFlags || {}) };
workspace.radar.searches = Array.isArray(workspace.radar.searches) ? workspace.radar.searches : [];
workspace.radar.contactLogs = Array.isArray(workspace.radar.contactLogs) ? workspace.radar.contactLogs : [];
workspace.radar.lastProviderStatus = Array.isArray(workspace.radar.lastProviderStatus) ? workspace.radar.lastProviderStatus : [];
workspace.radar.assignments = workspace.radar.assignments || {};
workspace.radar.leadPools = Array.isArray(workspace.radar.leadPools) ? workspace.radar.leadPools : [];
workspace.radar.leadPoolMembers = Array.isArray(workspace.radar.leadPoolMembers) ? workspace.radar.leadPoolMembers : [];
workspace.radar.leadSources = Array.isArray(workspace.radar.leadSources) ? workspace.radar.leadSources : [];
workspace.radar.leadReveals = Array.isArray(workspace.radar.leadReveals) ? workspace.radar.leadReveals : [];
workspace.radar.savedLeadIds = Array.isArray(workspace.radar.savedLeadIds) ? workspace.radar.savedLeadIds : [];
workspace.radar.activeView = workspace.radar.activeView || "revealed";
["tasks", "appointments", "customers", "deals", "offers", "opportunities", "conversations", "complianceLogs", "optOuts", "billingEvents"].forEach((key) => {
  workspace[key] = Array.isArray(workspace[key]) ? workspace[key] : [];
});
refreshPlanPeriod();
workspace.leads = workspace.leads.map((lead) => normalizeLead(lead)).filter((lead) => lead.username || lead.company);
workspace.radarProspects = (workspace.radarProspects || [])
  .map((prospect) => normalizeRadarProspect(prospect))
  .filter((prospect) => (prospect.username_public || prospect.business_name || prospect.source_url || prospect.relevant_text) && !radarIsSellerOrAdNoise(prospect));
saveWorkspace();

function navigateTo(page) {
  activePage = page;
  document.body.dataset.activePage = page;
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.classList.toggle("active", button.dataset.nav === page);
  });
  document.querySelectorAll("[data-page]").forEach((section) => {
    section.classList.toggle("active", section.dataset.page === page);
  });
  fitDesktopPreview();
}

function leadStatusOptions(current) {
  return Object.entries(statusLabels)
    .map(([value, label]) => `<option value="${value}" ${current === value ? "selected" : ""}>${label}</option>`)
    .join("");
}

function formatDate(value) {
  if (!value) return "Nessuna";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

function formatDashboardAge(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return "data n/d";
  const diff = Math.max(0, Date.now() - time);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "ora";
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} ore`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}g`;
  return formatDate(value);
}

function getLeadById(id = selectedLeadId) {
  return workspace.leads.find((lead) => lead.id === id) || null;
}

function syncLeadSourceFilter() {
  const select = document.querySelector("#leadSourceFilter");
  if (!select) return;
  const current = select.value || "all";
  const sources = [...new Set(workspace.leads.map((lead) => lead.source).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "it")
  );
  select.innerHTML = `<option value="all">Tutti i canali</option>${sources
    .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
    .join("")}`;
  select.value = sources.includes(current) ? current : "all";
}

function filteredLeads() {
  const search = document.querySelector("#leadSearch")?.value?.toLowerCase().trim() ?? "";
  const status = document.querySelector("#leadStatusFilter")?.value ?? "all";
  const source = document.querySelector("#leadSourceFilter")?.value ?? "all";
  const sort = document.querySelector("#leadSort")?.value ?? "score";
  const leads = workspace.leads.filter((lead) => {
    const matchesStatus = status === "all" || lead.status === status;
    const matchesSource = source === "all" || lead.source === source;
    const haystack = `${lead.name} ${lead.company} ${lead.source} ${lead.city} ${lead.target} ${lead.offer} ${lead.email} ${lead.phone} ${lead.note}`.toLowerCase();
    return matchesStatus && matchesSource && (!search || haystack.includes(search));
  });
  return leads.sort((a, b) => {
    if (sort === "recent") return new Date(b.createdAt) - new Date(a.createdAt);
    if (sort === "due") return (a.nextDue || "9999-12-31").localeCompare(b.nextDue || "9999-12-31");
    if (sort === "company") return a.company.localeCompare(b.company, "it");
    return b.score - a.score;
  });
}

function renderLeads() {
  const table = document.querySelector("#leadTable");
  if (!table) return;
  syncLeadSourceFilter();
  const leads = filteredLeads();
  table.innerHTML = leads.length
    ? leads
        .map(
          (lead) => `
            <div class="lead-row" data-lead-id="${lead.id}">
              <div>
                <strong>${escapeHtml(lead.company)}</strong>
                <p>${escapeHtml(lead.name || "Contatto da trovare")} · ${escapeHtml(lead.city || "Area non definita")} · ${escapeHtml(lead.source)}</p>
                <p>${escapeHtml(lead.nextAction || lead.note || "Prossima azione da definire")} · ${formatDate(lead.nextDue)}</p>
              </div>
              <span class="lead-score">${lead.score}</span>
              <select data-lead-status="${lead.id}">${leadStatusOptions(lead.status)}</select>
              <div class="lead-actions">
                <button type="button" data-select-lead="${lead.id}">Apri</button>
                <button type="button" data-edit-lead="${lead.id}">Modifica</button>
                <button type="button" data-advance-lead="${lead.id}">Avanza</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="system-list-item"><div><strong>Nessun lead operativo</strong><p>Inserisci un contatto reale o importa una lista.</p></div></div>`;
}

function renderLeadSelect() {
  const options = workspace.leads.length
    ? workspace.leads
        .map((lead) => `<option value="${lead.id}">${escapeHtml(lead.company)} - ${escapeHtml(lead.name || "Contatto")}</option>`)
        .join("")
    : `<option value="">Nessun lead disponibile</option>`;
  ["#messageLeadSelect", "#replyLeadSelect", "#campaignLeadSelect", "#offerLeadSelect"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (select) select.innerHTML = options;
  });
}

function renderLeadDetail() {
  const detail = document.querySelector("#leadDetail");
  const title = document.querySelector("#leadDetailTitle");
  const draftOutput = document.querySelector("#leadDraftOutput");
  if (!detail || !title || !draftOutput) return;
  const lead = getLeadById();
  if (!lead) {
    title.textContent = "Seleziona un lead";
    detail.innerHTML = `<div class="empty-state"><strong>Nessun lead selezionato</strong><p>Apri un contatto dalla pipeline per lavorarlo.</p></div>`;
    draftOutput.value = "";
    return;
  }
  title.textContent = lead.company;
  draftOutput.value = lead.draft || "";
  detail.innerHTML = `
    <div class="detail-grid">
      <div><span>Contatto</span><strong>${escapeHtml(lead.name || "Da trovare")}</strong></div>
      <div><span>Stato</span><strong>${escapeHtml(statusLabels[lead.status])}</strong></div>
      <div><span>Canale</span><strong>${escapeHtml(lead.source)}</strong></div>
      <div><span>Score</span><strong>${lead.score}/100</strong></div>
      <div><span>Email</span><strong>${escapeHtml(lead.email || "Non inserita")}</strong></div>
      <div><span>Telefono</span><strong>${escapeHtml(lead.phone || "Non inserito")}</strong></div>
      <div><span>Area</span><strong>${escapeHtml(lead.city || "Non definita")}</strong></div>
      <div><span>Scadenza</span><strong>${formatDate(lead.nextDue)}</strong></div>
    </div>
    <div class="detail-note">
      <span>Prossima azione</span>
      <strong>${escapeHtml(lead.nextAction || "Da definire")}</strong>
      <p>${escapeHtml(lead.note || "Nessuna nota operativa.")}</p>
    </div>
    <div class="detail-actions">
      <button type="button" data-edit-lead="${lead.id}">Modifica dati</button>
      <button type="button" data-draft-lead="${lead.id}">Apri in AI Content</button>
      <button type="button" data-delete-lead="${lead.id}">Elimina</button>
    </div>
  `;
}

function renderCampaigns() {
  const board = document.querySelector("#campaignBoard");
  if (!board) return;
  board.innerHTML = workspace.campaigns.length
    ? workspace.campaigns
    .map(
      (campaign) => `
        <div class="system-list-item">
          <div>
            <strong>${escapeHtml(campaign.name)}</strong>
            <p>${escapeHtml(campaign.goal)} · ${escapeHtml(campaign.channel)} · ${campaign.sent || 0} contatti preparati</p>
            ${campaign.offer_title ? `<p>Offerta: ${escapeHtml(campaign.offer_title)}</p>` : ""}
          </div>
          <div class="detail-actions">
            <button type="button" data-copy-campaign="${campaign.id}">Copia piano</button>
            <span class="status-pill">${escapeHtml(campaign.status)}</span>
          </div>
        </div>
      `
    )
    .join("")
    : `<div class="system-list-item"><div><strong>Nessuna campagna</strong><p>Crea una campagna quando hai una lista lead pronta.</p></div></div>`;
}

function renderOffers() {
  const board = document.querySelector("#offerBoard");
  if (!board) return;
  board.innerHTML = workspace.offers.length
    ? workspace.offers
        .slice(0, 8)
        .map(
          (offer) => `
            <div class="system-list-item">
              <div>
                <strong>${escapeHtml(offer.title)}</strong>
                <p>${escapeHtml(offer.package_name)} · ${escapeHtml(offer.price_range)} · ${escapeHtml(offer.status)}</p>
              </div>
              <div class="detail-actions">
                <button type="button" data-copy-offer="${offer.id}">Copia</button>
                <button type="button" data-campaign-from-offer="${offer.id}">Campagna</button>
                <button type="button" data-appointment-from-offer="${offer.id}">Call</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="system-list-item"><div><strong>Nessuna offerta</strong><p>Genera una proposta da un lead in CRM o da Radar.</p></div></div>`;
}

function renderAutomations() {
  const list = document.querySelector("#automationList");
  if (!list) return;
  const automationItems = workspace.automations.map(
    (automation) => `
        <div class="system-list-item">
          <div>
            <strong>${escapeHtml(automation.trigger)}</strong>
            <p>${escapeHtml(automation.action)}</p>
          </div>
          <button type="button" data-toggle-auto="${automation.id}">${automation.enabled ? "Attiva" : "Pausa"}</button>
        </div>
      `
  );
  const taskItems = (workspace.tasks || [])
    .filter((task) => task.status !== "done")
    .slice(0, 8)
    .map(
      (task) => `
        <div class="system-list-item">
          <div>
            <strong>${escapeHtml(task.title)}</strong>
            <p>${escapeHtml(task.type)} · ${formatDate(task.due_at)} · ${escapeHtml(task.status)}</p>
          </div>
          <button type="button" data-complete-task="${task.id}">Fatto</button>
        </div>
      `
    );
  list.innerHTML = [...automationItems, ...taskItems].length
    ? [...automationItems, ...taskItems].join("")
    : `<div class="system-list-item"><div><strong>Nessuna automazione</strong><p>Aggiungi regole quando hai iniziato l'outreach.</p></div></div>`;
}

function renderAppointments() {
  const list = document.querySelector("#appointmentList");
  if (!list) return;
  list.innerHTML = workspace.appointments.length
    ? workspace.appointments
        .slice(0, 10)
        .map(
          (appointment) => `
            <div class="system-list-item">
              <div>
                <strong>${escapeHtml(appointment.title)}</strong>
                <p>${formatDate(appointment.scheduled_at)} · ${appointment.duration_minutes || 30} min · ${escapeHtml(appointment.status)}</p>
                ${appointment.meeting_url ? `<p>Invito calendar pronto</p>` : ""}
              </div>
              <div class="detail-actions">
                <button type="button" data-copy-appointment="${appointment.id}">Copia conferma</button>
                <button type="button" data-calendar-appointment="${appointment.id}">Google Calendar</button>
                <button type="button" data-complete-appointment="${appointment.id}">Fatto</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="system-list-item"><div><strong>Nessun appuntamento</strong><p>Quando un lead è interessato, crea una call dal CRM o da Radar.</p></div></div>`;
}

function renderCrm() {
  const board = document.querySelector("#crmBoard");
  if (!board) return;
  board.innerHTML = Object.entries(statusLabels)
    .map(([status, label]) => {
      const leads = workspace.leads.filter((lead) => lead.status === status);
      return `
        <div class="crm-column">
          <h3>${label} · ${leads.length}</h3>
          ${leads
            .map(
              (lead) => `
                <div class="crm-card">
                  <strong>${escapeHtml(lead.company)}</strong>
                  <p>${escapeHtml(lead.name)} · score ${lead.score}</p>
                  <p>${escapeHtml(lead.offer)}</p>
                  <button type="button" data-advance-lead="${lead.id}">Avanza</button>
                  <button type="button" data-crm-reply="${lead.id}">Risposta</button>
                  <button type="button" data-crm-followup="${lead.id}">Follow-up</button>
                  <button type="button" data-crm-appointment="${lead.id}">Appuntamento</button>
                  <button type="button" data-crm-offer="${lead.id}">Offerta</button>
                  <button type="button" data-crm-lost="${lead.id}">Perso</button>
                </div>
              `
            )
            .join("")}
        </div>
      `;
    })
    .join("");
}

function renderAnalytics() {
  const analytics = document.querySelector("#analyticsGrid");
  const actions = document.querySelector("#nextActions");
  if (!analytics || !actions) return;
  const leads = workspace.leads.length;
  const hot = workspace.leads.filter((lead) => lead.score >= 80).length;
  const contacted = workspace.leads.filter((lead) => lead.status !== "new").length;
  const clients = workspace.leads.filter((lead) => lead.status === "client").length;
  const funnel = workspace.radar.lastFunnel || {};
  const opportunities = currentOpportunityClusters();
  analytics.innerHTML = [
    ["Piano", getPlanDefinition().name],
    ["Lead totali", leads],
    ["Lead caldi", hot],
    ["Contattati", contacted],
    ["Clienti", clients],
    ["Campagne", workspace.campaigns.length],
    ["Automazioni", workspace.automations.filter((item) => item.enabled).length],
    ["Crediti rimasti", workspace.credits.balance ?? 0],
    ["Live search mese", usageInCurrentPeriod("live_search")],
    ["Radar finali", funnel.finalLeads ?? 0],
    ["Raw analizzati", funnel.rawCollected ?? 0],
    ["Task", workspace.tasks.length],
    ["Appuntamenti", workspace.appointments.length],
    ["Offerte", workspace.offers.length],
    ["Opportunity", opportunities.length]
  ]
    .map(([label, value]) => `<div class="analytics-tile"><p>${label}</p><strong>${value}</strong></div>`)
    .join("");

  actions.innerHTML = [
    ...opportunities.slice(0, 3).map((cluster) => `${cluster.title}: ${cluster.action_today} (${cluster.count} lead, urgenza ${cluster.urgency}).`),
    "Genera bozze per i lead con score sopra 80.",
    "Sposta in CRM i contatti che hanno una risposta positiva.",
    "Prima di collegare email/DM, mantieni approvazione manuale.",
    workspace.radar.lastCreditEstimate
      ? `Ultima ricerca: ${workspace.radar.lastCreditEstimate.total} crediti, costo/lead ${workspace.radar.lastCreditEstimate.costPerFinalLead}.`
      : "Lancia Radar 360 per generare metriche imbuto e consumo crediti.",
    `Piano attivo: ${getPlanDefinition().name}, crediti residui ${formatMetric(workspace.credits.balance || 0)}.`
  ]
    .map((action) => `<div class="system-list-item"><div><strong>${action}</strong><p>Priorità operativa interna.</p></div></div>`)
    .join("");
}

function renderPlanUsagePanel() {
  const panel = document.querySelector("#planUsagePanel");
  const usagePanel = document.querySelector("#usageLogPanel");
  if (!panel && !usagePanel) return;
  const definition = getPlanDefinition();
  const price = workspace.plan.interval === "annual" ? definition.annualPrice : definition.monthlyPrice;
  const usageRows = ["live_search", "radar_search", "export", "campaign", "offer", "appointment", "automation"].map(usageLimitStatus);
  if (panel) {
    panel.innerHTML = `
      <div class="system-list-item">
        <div>
          <strong>${escapeHtml(definition.name)} · ${workspace.plan.interval === "annual" ? "Annuale" : "Mensile"}</strong>
          <p>${price ? `${price}€/ ${workspace.plan.interval === "annual" ? "anno" : "mese"}` : "Piano interno/test"} · ${formatMetric(workspace.credits.balance || 0)} crediti rimasti su ${formatMetric(workspace.credits.monthlyIncluded || definition.credits)}</p>
        </div>
        <span class="status-pill">${escapeHtml(workspace.plan.status || "active")}</span>
      </div>
      ${usageRows
        .map(
          (row) => `
            <div class="system-list-item">
              <div>
                <strong>${escapeHtml(row.label)}</strong>
                <p>${formatMetric(row.used)} usati questo mese · limite ${formatPlanLimit(row.limit)}</p>
              </div>
              <span class="status-pill">${row.blocked ? "Limite" : row.remaining === Infinity ? "OK" : `${formatMetric(row.remaining)} rim.`}</span>
            </div>
          `
        )
        .join("")}
    `;
  }
  if (usagePanel) {
    usagePanel.innerHTML = (workspace.usageLogs || []).length
      ? workspace.usageLogs
          .slice(0, 10)
          .map(
            (log) => `
              <div class="system-list-item">
                <div>
                  <strong>${escapeHtml(usageLabels[log.type] || log.type)}</strong>
                  <p>${escapeHtml(log.module || "workspace")} · ${formatMetric(log.units || 0)} unità · ${formatMetric(log.credits || 0)} crediti · ${formatDate(log.created_at)}</p>
                </div>
                <span class="status-pill">${escapeHtml(log.period || String(log.created_at || "").slice(0, 7))}</span>
              </div>
            `
          )
          .join("")
      : `<div class="system-list-item"><div><strong>Nessun utilizzo tracciato</strong><p>Ricerche, export e automazioni appariranno qui.</p></div></div>`;
  }
}

function renderIntegrations() {
  const grid = document.querySelector("#integrationGrid");
  if (!grid) return;
  grid.innerHTML = integrationItems
    .map(
      ([name, description, status]) => `
        <div class="integration-card">
          <strong>${name}</strong>
          <p>${description}</p>
          <em>${status}</em>
        </div>
      `
    )
    .join("");
}

function renderSettings() {
  const form = document.querySelector("#workspaceSettings");
  if (form) {
    const workspaceInput = form.elements.namedItem("workspace");
    const signatureInput = form.elements.namedItem("signature");
    if (workspaceInput) workspaceInput.value = workspace.settings?.workspace || "Interstellar Internal";
    if (signatureInput) signatureInput.value = workspace.settings?.signature || "Kevin - Interstellar";
  }
  const planForm = document.querySelector("#planSettings");
  if (planForm) {
    const tierInput = planForm.elements.namedItem("tier");
    const intervalInput = planForm.elements.namedItem("interval");
    if (tierInput) tierInput.value = workspace.plan.tier || "pro";
    if (intervalInput) intervalInput.value = workspace.plan.interval || "monthly";
  }
  renderPlanUsagePanel();
}

const dashboardDemoUsernames = new Set(
  testLeadDataset
    .split(/\r?\n/)
    .map((row) => row.split(",")[0]?.trim().toLowerCase())
    .filter(Boolean)
);

function isDashboardDemoProspect(prospect = {}) {
  const handle = String(prospect.username_public || prospect.username || "").toLowerCase();
  const email = String(prospect.email_business_public || prospect.email || "").toLowerCase();
  return dashboardDemoUsernames.has(handle) || email.endsWith(".test") || email.endsWith("@example.com");
}

function dashboardProspects() {
  return allRadarProspects()
    .filter((prospect) => !isDashboardDemoProspect(prospect))
    .map((prospect) => {
      const capability = getRadarCapability(prospect);
      const scored = scoreRadarProspect({ ...prospect, ...capability }, workspace.radar.lastSearch || {});
      return {
        ...prospect,
        ...capability,
        ...scored
      };
    });
}

function dashboardEmpty(title, text, target = "radar", label = "Apri Radar 360") {
  return `
    <div class="dashboard-empty">
      <strong>${escapeHtml(title)}</strong>
      <p>${escapeHtml(text)}</p>
      <button type="button" data-jump="${escapeHtml(target)}">${escapeHtml(label)}</button>
    </div>
  `;
}

function buildDashboardChartData(prospects, contacts, clients) {
  const formatter = new Intl.DateTimeFormat("it-IT", { day: "2-digit", month: "short" });
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, label: formatter.format(date), prospects: 0, contacts: 0, clients: 0 };
  });
  const byKey = new Map(days.map((day) => [day.key, day]));
  const bump = (value, field) => {
    const date = new Date(value || "");
    if (Number.isNaN(date.getTime())) return;
    const key = date.toISOString().slice(0, 10);
    const day = byKey.get(key);
    if (day) day[field] += 1;
  };
  prospects.forEach((prospect) => bump(prospect.collected_at || prospect.updated_at, "prospects"));
  contacts.forEach((log) => bump(log.created_at, "contacts"));
  clients.forEach((lead) => bump(lead.updatedAt || lead.createdAt, "clients"));
  return days;
}

function renderDashboardChart(root, chartData) {
  if (!root) return;
  const hasData = chartData.some((day) => day.prospects || day.contacts || day.clients);
  root.innerHTML = `
    <div class="dashboard-live-chart-head">
      <div>
        <strong>Andamento reale ultimi 7 giorni</strong>
        <p>Prospect, contatti avviati e clienti dal workspace.</p>
      </div>
      <div class="legend">
        <span><i class="purple-dot"></i>Prospect</span>
        <span><i class="blue-dot"></i>Contatti</span>
        <span><i class="cyan-dot"></i>Clienti</span>
      </div>
    </div>
    <div class="area-chart dashboard-live-area-chart ${hasData ? "" : "is-empty"}" role="img" aria-label="Grafico reale degli ultimi sette giorni">
      <svg class="area-chart__svg" viewBox="0 0 860 330" preserveAspectRatio="none"></svg>
      <div class="area-chart__tooltip" hidden></div>
      ${hasData ? "" : `
        <div class="dashboard-chart-empty-note">
          <strong>Nessun dato reale ancora</strong>
          <p>Il grafico resta pronto e si riempie appena usi Radar 360, avvii contatti o salvi clienti nel CRM.</p>
        </div>
      `}
    </div>
  `;

  const chartRoot = root.querySelector(".dashboard-live-area-chart");
  if (chartRoot) {
    const theme = document.body.dataset.theme || "stripe";
    createAreaChart(chartRoot, chartData, dashboardChartSeriesByTheme[theme] || dashboardChartSeriesByTheme.stripe);
  }
}

function renderDashboardOverview(prospects, contacts, clients) {
  const overview = document.querySelector("#dashboardRealOverview");
  if (!overview) return;
  const sourceCount = new Set(prospects.map((prospect) => prospect.platform).filter(Boolean)).size;
  const automated = prospects.filter((prospect) => prospect.contact_mode === "automated_possible").length;
  const manual = prospects.filter((prospect) => prospect.contact_mode === "manual_assist").length;
  const lastSearchCount = workspace.radar.resultIds?.length || 0;
  const chartData = buildDashboardChartData(prospects, contacts, clients);

  overview.innerHTML = `
    <div class="dashboard-live-chart" id="dashboardLiveChart"></div>
    <div class="dashboard-real-grid dashboard-real-grid--compact">
      <div>
        <span>Radar 360</span>
        <strong>${formatMetric(prospects.length)}</strong>
        <p>Prospect salvati o importati da fonti reali/autorizzate.</p>
      </div>
      <div>
        <span>Ultima ricerca</span>
        <strong>${formatMetric(lastSearchCount)}</strong>
        <p>Risultati filtrati nell'ultima sessione Radar.</p>
      </div>
      <div>
        <span>Contatto manuale</span>
        <strong>${formatMetric(manual)}</strong>
        <p>Social e community dove il messaggio resta assistito.</p>
      </div>
      <div>
        <span>Automazione possibile</span>
        <strong>${formatMetric(automated)}</strong>
        <p>Email business, form o import autorizzati con conferma.</p>
      </div>
    </div>
    <div class="dashboard-workspace-note">
      <strong>${contacts.length ? `${contacts.length} log contatto salvati` : "Nessun contatto reale ancora"}</strong>
      <p>${clients.length} clienti nel CRM · ${sourceCount} fonti dati rilevate. Nessun numero viene simulato nella dashboard.</p>
    </div>
  `;
  renderDashboardChart(overview.querySelector("#dashboardLiveChart"), chartData);
}

function renderDashboardActivity(prospects) {
  const list = document.querySelector("#dashboardActivityList");
  if (!list) return;
  const events = [
    ...(workspace.radar.contactLogs || []).map((log) => ({
      icon: "send",
      color: "blue",
      title: log.action === "automation_preview_confirmed" ? "Contatto automatico preparato" : "Contatto manuale avviato",
      text: `${log.channel || "Canale n/d"} · ${log.source_url || "fonte n/d"}`,
      date: log.created_at
    })),
    ...prospects.map((prospect) => ({
      icon: "search",
      color: prospect.temperature === "hot" ? "gold" : prospect.temperature === "warm" ? "purple" : "cyan",
      title: prospect.business_name || prospect.public_name || prospect.username_public || "Prospect salvato",
      text: `${prospect.platform || "Fonte n/d"} · score ${prospect.score_ai}/100`,
      date: prospect.collected_at || prospect.updated_at
    })),
    ...workspace.campaigns.map((campaign) => ({
      icon: "send",
      color: "purple",
      title: campaign.name || "Campagna",
      text: `${campaign.channel || "Canale n/d"} · ${campaign.status || "stato n/d"}`,
      date: campaign.createdAt || campaign.updatedAt
    })),
    ...(workspace.offers || []).map((offer) => ({
      icon: "card",
      color: "blue",
      title: offer.title || "Offerta",
      text: `${offer.package_name || "Pacchetto"} · ${offer.status || "bozza"}`,
      date: offer.created_at || offer.updated_at
    })),
    ...(workspace.tasks || []).map((task) => ({
      icon: "calendar",
      color: "cyan",
      title: task.title || "Task operativo",
      text: `${task.type || "task"} · ${task.status || "open"}`,
      date: task.created_at || task.due_at
    })),
    ...(workspace.appointments || []).map((appointment) => ({
      icon: "users",
      color: "gold",
      title: appointment.title || "Appuntamento",
      text: `${appointment.status || "proposto"} · ${appointment.duration_minutes || 30} min`,
      date: appointment.created_at || appointment.scheduled_at
    }))
  ]
    .filter((event) => event.title)
    .sort((a, b) => (Date.parse(b.date || "") || 0) - (Date.parse(a.date || "") || 0))
    .slice(0, 5);

  list.innerHTML = events.length
    ? events
        .map(
          (event) => `
            <div class="activity-item">
              <span class="activity-icon ${event.color}"><svg class="icon"><use href="#icon-${event.icon}"></use></svg></span>
              <div>
                <strong>${escapeHtml(event.title)}</strong>
                <p>${escapeHtml(event.text)}</p>
              </div>
              <small>${escapeHtml(formatDashboardAge(event.date))}</small>
            </div>
          `
        )
        .join("")
    : dashboardEmpty("Nessuna attività reale", "Quando importi prospect, avvii un contatto o crei una campagna, apparirà qui.", "radar", "Importa prospect");
}

function renderDashboardCampaigns() {
  const list = document.querySelector("#dashboardCampaignList");
  if (!list) return;
  list.innerHTML = workspace.campaigns.length
    ? workspace.campaigns
        .map(
          (campaign) => `
            <div class="campaign-row">
              <span class="source-logo">${escapeHtml((campaign.channel || campaign.name || "C").slice(0, 2).toUpperCase())}</span>
              <div>
                <strong>${escapeHtml(campaign.name || "Campagna senza nome")}</strong>
                <p>${escapeHtml(campaign.goal || "Obiettivo da definire")} · ${formatMetric(campaign.sent || 0)} contatti preparati</p>
              </div>
              <em class="${campaign.status === "In pausa" ? "paused" : ""}">${escapeHtml(campaign.status || "Bozza")}</em>
            </div>
          `
        )
        .join("")
    : dashboardEmpty("Nessuna campagna reale", "Le campagne appariranno qui solo quando le crei nella sezione Campagne.", "campaigns", "Crea campagna");
}

function renderDashboardSources(prospects) {
  const root = document.querySelector("#dashboardSources");
  if (!root) return;
  const counts = prospects.reduce((map, prospect) => {
    const source = prospect.platform || "Fonte n/d";
    map.set(source, (map.get(source) || 0) + 1);
    return map;
  }, new Map());
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, count]) => sum + count, 0);

  root.innerHTML = entries.length
    ? `
      <div class="source-list source-bars">
        ${entries
          .map(([source, count], index) => {
            const percent = total ? Math.round((count / total) * 100) : 0;
            const dotClass = ["purple-dot", "blue-dot", "cyan-dot", "gold-dot"][index % 4];
            return `
              <span>
                <i class="${dotClass}"></i>
                <b>${escapeHtml(source)}</b>
                <em style="--source-width:${percent}%"></em>
                <strong>${formatMetric(count)}</strong>
              </span>
            `;
          })
          .join("")}
      </div>
    `
    : dashboardEmpty("Nessuna fonte collegata", "Importa CSV, URL pubblici o risultati API nel Radar 360 per vedere i canali qui.", "radar", "Apri Radar");
}

function renderDashboardData() {
  const metricValues = document.querySelectorAll(".metric-card strong");
  const prospects = dashboardProspects();
  const contactLogs = workspace.radar.contactLogs || [];
  const hotProspects = prospects.filter((prospect) => prospect.temperature === "hot").length;
  const contacted = contactLogs.length + prospects.filter((prospect) => /contact/.test(prospect.contact_state || "")).length;
  const clients = workspace.leads.filter((lead) => lead.status === "client");
  [prospects.length, hotProspects, contacted, clients.length].forEach((value, index) => {
    if (metricValues[index]) metricValues[index].textContent = formatMetric(value);
  });
  renderDashboardOverview(prospects, contactLogs, clients);
  renderDashboardActivity(prospects);
  renderDashboardCampaigns();
  renderDashboardSources(prospects);
}

function renderAll() {
  renderLeads();
  renderLeadSelect();
  renderLeadDetail();
  renderCampaigns();
  renderOffers();
  renderAutomations();
  renderAppointments();
  renderCrm();
  renderAnalytics();
  renderIntegrations();
  renderSettings();
  renderDashboardData();
  renderRadar();
  fitDesktopPreview();
}

function leadFromForm(form) {
  const data = new FormData(form);
  return normalizeLead({
    id: data.get("id"),
    company: data.get("company"),
    name: data.get("name"),
    target: data.get("target"),
    offer: data.get("offer"),
    city: data.get("area"),
    source: data.get("source"),
    status: data.get("status"),
    email: data.get("email"),
    phone: data.get("phone"),
    url: data.get("url"),
    score: data.get("score"),
    nextAction: data.get("nextAction"),
    nextDue: data.get("nextDue"),
    note: data.get("note")
  });
}

function setLeadForm(lead = null) {
  const form = document.querySelector("#leadForm");
  if (!form) return;
  const values = lead || {
    id: "",
    company: "",
    name: "",
    target: "Attività locali",
    offer: "Sito web + automazioni AI",
    city: "Milano",
    source: "Google Maps",
    status: "new",
    email: "",
    phone: "",
    url: "",
    score: "",
    nextAction: "Preparare primo messaggio",
    nextDue: "",
    note: ""
  };
  form.elements.namedItem("id").value = values.id || "";
  form.elements.namedItem("company").value = values.company || "";
  form.elements.namedItem("name").value = values.name || "";
  form.elements.namedItem("target").value = values.target || "Attività locali";
  form.elements.namedItem("offer").value = values.offer || "Sito web + automazioni AI";
  form.elements.namedItem("area").value = values.city || "Milano";
  form.elements.namedItem("source").value = values.source || "Google Maps";
  form.elements.namedItem("status").value = values.status || "new";
  form.elements.namedItem("email").value = values.email || "";
  form.elements.namedItem("phone").value = values.phone || "";
  form.elements.namedItem("url").value = values.url || "";
  form.elements.namedItem("score").value = Number.isFinite(Number(values.score)) ? values.score : "";
  form.elements.namedItem("nextAction").value = values.nextAction || "Preparare primo messaggio";
  form.elements.namedItem("nextDue").value = values.nextDue || "";
  form.elements.namedItem("note").value = values.note || "";
}

function saveLeadFromForm(form) {
  const lead = leadFromForm(form);
  if (!lead.company) return;
  const existingIndex = workspace.leads.findIndex((item) => item.id === lead.id);
  lead.updatedAt = new Date().toISOString();
  if (existingIndex >= 0) {
    workspace.leads[existingIndex] = { ...workspace.leads[existingIndex], ...lead };
    selectedLeadId = lead.id;
    setFeedback("#leadsFeedback", "Lead aggiornato.");
  } else {
    workspace.leads.unshift(lead);
    selectedLeadId = lead.id;
    setFeedback("#leadsFeedback", "Lead salvato.");
  }
  saveWorkspace();
  renderAll();
}

function parseCsvLine(line) {
  const cells = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];
    if (char === '"' && quoted && next === '"') {
      current += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  cells.push(current.trim());
  return cells;
}

function importLeadsFromText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const leads = rows
    .map(parseCsvLine)
    .filter((cells) => cells[0])
    .map((cells) =>
      normalizeLead({
        company: cells[0],
        name: cells[1],
        city: cells[2],
        source: cells[3] || "Import",
        target: cells[4] || "Da qualificare",
        offer: cells[5] || "Da definire",
        email: cells[6],
        phone: cells[7],
        url: cells[8],
        note: cells[9],
        nextAction: "Qualificare e preparare messaggio"
      })
    );
  const knownKeys = new Set(workspace.leads.map((lead) => `${lead.company}|${lead.city}|${lead.email}`.toLowerCase()));
  const freshLeads = leads.filter((lead) => {
    const key = `${lead.company}|${lead.city}|${lead.email}`.toLowerCase();
    if (knownKeys.has(key)) return false;
    knownKeys.add(key);
    return true;
  });
  workspace.leads.unshift(...freshLeads);
  selectedLeadId = freshLeads[0]?.id || selectedLeadId;
  saveWorkspace();
  renderAll();
  setFeedback("#leadsFeedback", `${freshLeads.length} lead importati.`);
}

function buildMessage(lead, tone, goal) {
  const firstName = lead.name?.trim().split(" ")[0];
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao, piacere,";
  const location = lead.city ? ` a ${lead.city}` : "";
  const reason = lead.note || `potresti essere un buon fit per ${lead.offer}`;
  return `${greeting}

ho visto ${lead.company}${location} e secondo me c'e un angolo interessante: ${reason}

Noi stiamo costruendo Interstellar per aiutare attivita come la tua a trovare clienti, organizzare contatti e automatizzare follow-up senza perdere controllo sui messaggi.

Per ${lead.target}, partirei da una cosa molto concreta: ${lead.offer}.

${goal}. Ti va se ti mando due idee pratiche su come lo imposterei per ${lead.company}?

${workspace.settings.signature}

Tono: ${tone}`;
}

function formatConversationStarterOutput(target, tone, goal) {
  const prospect = target.lead_id ? target : radarProspectFromLead(target);
  const starter = buildConversationStarters(prospect, goal || "aprire conversazione");
  return `VERSIONE BREVE
${starter.variants.breve}

VERSIONE NATURALE
${starter.variants.naturale}

VERSIONE PROFESSIONALE
${starter.variants.professionale}

RISPOSTE RAPIDE
- Quanto costa: ${starter.objections["quanto costa"]}
- Mandami info: ${starter.objections["mandami info"]}
- Ci penso: ${starter.objections["ci penso"]}
- Non mi interessa: ${starter.objections["non mi interessa"]}
- Chi sei: ${starter.objections["chi sei"]}
- Come funziona: ${starter.objections["come funziona"]}

TONO CONSIGLIATO
${starter.suggestedTone} · anti-spam score ${starter.antiSpamScore}/100

Tono richiesto: ${tone}`;
}

function setFeedback(selector, message) {
  const element = document.querySelector(selector);
  if (element) element.textContent = message;
}

function downloadTextFile(filename, payload, type = "application/json") {
  const blob = new Blob([payload], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

async function copyText(payload) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(payload);
      return true;
    }
  } catch (error) {
    return false;
  }

  return false;
}

function ensureHelpPanel() {
  let panel = document.querySelector("#helpPanel");
  if (panel) return panel;
  document.body.insertAdjacentHTML(
    "beforeend",
    `
      <div class="help-panel" id="helpPanel" hidden>
        <div class="help-card" role="dialog" aria-modal="true" aria-labelledby="helpTitle">
          <button type="button" class="help-close" data-help-close>Chiudi</button>
          <span class="help-kicker">Guida rapida</span>
          <h3 id="helpTitle"></h3>
          <p id="helpIntro"></p>
          <ol id="helpSteps"></ol>
          <div class="help-example">
            <strong>Esempio pratico</strong>
            <p id="helpExample"></p>
          </div>
        </div>
      </div>
    `
  );
  panel = document.querySelector("#helpPanel");
  panel.addEventListener("click", (event) => {
    if (event.target === panel || event.target.closest("[data-help-close]")) {
      closeHelpPanel();
    }
  });
  return panel;
}

function openHelpPanel(key) {
  const content = helpContent[key];
  if (!content) return;
  const panel = ensureHelpPanel();
  panel.querySelector("#helpTitle").textContent = content.title;
  panel.querySelector("#helpIntro").textContent = content.intro;
  panel.querySelector("#helpSteps").innerHTML = (content.steps || [])
    .map((step) => `<li>${escapeHtml(step)}</li>`)
    .join("");
  panel.querySelector("#helpExample").textContent = content.example || "Nessun esempio disponibile.";
  panel.hidden = false;
  document.body.classList.add("help-open");
}

function closeHelpPanel() {
  const panel = document.querySelector("#helpPanel");
  if (panel) panel.hidden = true;
  document.body.classList.remove("help-open");
}

document.addEventListener(
  "click",
  (event) => {
    const helpTrigger = event.target.closest?.("[data-help]");
    if (!helpTrigger) return;
    event.preventDefault();
    event.stopPropagation();
    openHelpPanel(helpTrigger.dataset.help);
  },
  true
);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeHelpPanel();
});

function normalizeToken(value = "") {
  return String(value).toLowerCase().trim();
}

function expandTarget(niche = "") {
  const tokens = normalizeToken(niche)
    .split(/[\s,;/]+/)
    .filter(Boolean);
  const expanded = new Set(tokens);
  for (const token of tokens) {
    const mapped = targetExpansionMap[token] || [];
    mapped.forEach((item) => expanded.add(item));
  }
  if (!expanded.size && niche) expanded.add(niche);
  return [...expanded].slice(0, 18);
}

function hashString(value = "") {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

function deriveActiveDays(value) {
  const raw = String(value || "").trim();
  if (!raw) return 999;
  const numeric = Number(raw);
  if (Number.isFinite(numeric)) return Math.max(0, numeric);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
}

function getSelectedPlatforms(form) {
  return [...form.querySelectorAll('input[name="platforms"]:checked')].map((input) => input.value);
}

function getFinderConfig(form = document.querySelector("#leadFinderForm")) {
  const data = new FormData(form);
  const niche = String(data.get("niche") || "").trim();
  return {
    niche,
    country: String(data.get("country") || "").trim(),
    city: String(data.get("city") || "").trim(),
    language: String(data.get("language") || "any"),
    timezone: String(data.get("timezone") || "any"),
    platforms: getSelectedPlatforms(form),
    mode: String(data.get("mode") || "keyword"),
    competitor: String(data.get("competitor") || "").trim(),
    minEngagement: Number(data.get("minEngagement") || 0),
    minFollowers: Number(data.get("minFollowers") || 0),
    minScore: Number(data.get("minScore") || 0),
    activeDays: Number(data.get("activeDays") || 999),
    limit: Math.max(5, Math.min(100, Number(data.get("limit") || 25))),
    workspaceSeed: String(data.get("workspaceSeed") || "internal-alpha").trim(),
    excludeBots: data.get("excludeBots") === "on",
    excludePrivate: data.get("excludePrivate") === "on",
    freshFirst: data.get("freshFirst") === "on"
  };
}

function leadText(lead) {
  return `${lead.username} ${lead.platform} ${lead.bio} ${lead.interests} ${lead.country} ${lead.city} ${lead.origin}`.toLowerCase();
}

function scoreForSearch(lead, config, expandedKeywords) {
  const text = leadText(lead);
  const keywordHits = expandedKeywords.filter((keyword) => text.includes(keyword.toLowerCase())).length;
  const competitorHit = config.competitor && text.includes(config.competitor.toLowerCase().replace("@", ""));
  const freshness = Math.max(0, 30 - Math.min(30, Number(lead.activeDays || 999)));
  let score = lead.score + keywordHits * 5 + Math.round(freshness * 0.45);
  if (competitorHit) score += 12;
  if (lead.engagement >= 5) score += 7;
  if (lead.contact) score += 5;
  if (config.mode === "engaged" && lead.engagement >= 4) score += 10;
  if (config.mode === "fresh" && lead.activeDays <= 3) score += 10;
  if (config.mode === "lookalike" && keywordHits >= 2) score += 8;
  return Math.max(1, Math.min(99, score));
}

function passesFinderFilters(lead, config, expandedKeywords) {
  const text = leadText(lead);
  const platformOk = !config.platforms.length || config.platforms.includes(lead.platform);
  const languageOk = config.language === "any" || lead.language === config.language;
  const countryOk = !config.country || lead.country.toLowerCase().includes(config.country.toLowerCase());
  const cityOk = !config.city || lead.city.toLowerCase().includes(config.city.toLowerCase());
  const keywordOk = expandedKeywords.some((keyword) => text.includes(keyword.toLowerCase()));
  const competitorOk = !config.competitor || text.includes(config.competitor.toLowerCase().replace("@", ""));
  const activeOk = Number(lead.activeDays || 999) <= config.activeDays;
  const botOk = !config.excludeBots || Number(lead.botRisk || 0) < 60;
  const privateOk = !config.excludePrivate || !lead.private;
  return (
    platformOk &&
    languageOk &&
    countryOk &&
    cityOk &&
    activeOk &&
    botOk &&
    privateOk &&
    Number(lead.followers || 0) >= config.minFollowers &&
    Number(lead.engagement || 0) >= config.minEngagement &&
    (keywordOk || competitorOk)
  );
}

function executeLeadSearch(config = getFinderConfig()) {
  const expandedKeywords = expandTarget(config.niche);
  const now = Date.now();
  const results = workspace.leads
    .map((lead) => normalizeLead(lead))
    .filter((lead) => passesFinderFilters(lead, config, expandedKeywords))
    .map((lead) => {
      const score = scoreForSearch(lead, config, expandedKeywords);
      const cooldownUntil = workspace.finder.assignments?.[lead.id] || 0;
      const cooldownPenalty = cooldownUntil > now ? 18 : 0;
      const randomOffset = hashString(`${config.workspaceSeed}:${lead.id}:${config.niche}`) % 17;
      const freshnessBoost = config.freshFirst ? Math.max(0, 10 - Math.min(10, lead.activeDays || 999)) : 0;
      return {
        ...lead,
        score,
        quality: score >= 80 ? "hot" : score >= 58 ? "warm" : "cold",
        temperature: score >= 80 ? "Hot" : score >= 58 ? "Warm" : "Cold",
        searchRank: score + randomOffset + freshnessBoost - cooldownPenalty
      };
    })
    .filter((lead) => lead.score >= config.minScore)
    .sort((a, b) => b.searchRank - a.searchRank)
    .slice(0, config.limit);

  workspace.leads = workspace.leads.map((lead) => {
    const result = results.find((item) => item.id === lead.id);
    return result ? { ...lead, ...result, updatedAt: new Date().toISOString() } : lead;
  });
  workspace.finder.expandedKeywords = expandedKeywords;
  workspace.finder.resultIds = results.map((lead) => lead.id);
  workspace.finder.lastSearch = config;
  workspace.finder.activeTab = activeLeadTab;
  workspace.finder.assignments = {
    ...(workspace.finder.assignments || {}),
    ...Object.fromEntries(results.map((lead) => [lead.id, now + 12 * 60 * 60 * 1000]))
  };
  saveWorkspace();
  renderAll();
  setFeedback(
    "#leadsFeedback",
    results.length ? `${results.length} lead trovati e classificati.` : "Nessun lead compatibile nel database importato."
  );
}

function leadBelongsToTab(lead, tab) {
  const config = workspace.finder.lastSearch || {};
  if (tab === "engaged") return lead.engagement >= 4;
  if (tab === "competitor") {
    const competitor = String(config.competitor || "").toLowerCase().replace("@", "");
    return competitor ? leadText(lead).includes(competitor) : lead.origin || lead.platform === "Telegram";
  }
  if (tab === "lookalike") {
    const hits = (workspace.finder.expandedKeywords || []).filter((keyword) => leadText(lead).includes(keyword.toLowerCase()));
    return hits.length >= 2;
  }
  if (tab === "fresh") return Number(lead.activeDays || 999) <= 7;
  return true;
}

function getCurrentResultLeads() {
  const ids = workspace.finder.resultIds || [];
  const pool = ids.length ? ids.map((id) => workspace.leads.find((lead) => lead.id === id)).filter(Boolean) : [];
  return pool.filter((lead) => leadBelongsToTab(lead, activeLeadTab));
}

function syncLeadSourceFilter() {
  const select = document.querySelector("#leadSourceFilter");
  if (!select) return;
  const current = select.value || "all";
  const sources = [...new Set(workspace.leads.map((lead) => lead.platform || lead.source).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "it")
  );
  select.innerHTML = `<option value="all">Tutte piattaforme</option>${sources
    .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
    .join("")}`;
  select.value = sources.includes(current) ? current : "all";
}

function filteredLeads() {
  const search = document.querySelector("#leadSearch")?.value?.toLowerCase().trim() ?? "";
  const quality = document.querySelector("#leadStatusFilter")?.value ?? "all";
  const source = document.querySelector("#leadSourceFilter")?.value ?? "all";
  const sort = document.querySelector("#leadSort")?.value ?? "score";
  const leads = getCurrentResultLeads().filter((lead) => {
    const matchesQuality = quality === "all" || lead.quality === quality;
    const matchesSource = source === "all" || lead.platform === source;
    return matchesQuality && matchesSource && (!search || leadText(lead).includes(search));
  });
  return leads.sort((a, b) => {
    if (sort === "freshness") return Number(a.activeDays || 999) - Number(b.activeDays || 999);
    if (sort === "engagement") return Number(b.engagement || 0) - Number(a.engagement || 0);
    if (sort === "followers") return Number(b.followers || 0) - Number(a.followers || 0);
    return Number(b.score || 0) - Number(a.score || 0);
  });
}

function renderTargetExpansion() {
  const form = document.querySelector("#leadFinderForm");
  const title = document.querySelector("#targetExpansionTitle");
  const list = document.querySelector("#targetExpansion");
  if (!form || !title || !list) return;
  const niche = form.elements.namedItem("niche")?.value || "finanza";
  const keywords = workspace.finder.expandedKeywords?.length ? workspace.finder.expandedKeywords : expandTarget(niche);
  title.textContent = niche;
  list.innerHTML = keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("");
}

function renderFinderStats() {
  const stats = document.querySelector("#finderStats");
  const count = document.querySelector("#savedLeadCount");
  if (count) count.textContent = `${workspace.leads.length} lead`;
  if (!stats) return;
  const results = (workspace.finder.resultIds || []).map((id) => workspace.leads.find((lead) => lead.id === id)).filter(Boolean);
  const hot = results.filter((lead) => lead.quality === "hot").length;
  const fresh = results.filter((lead) => Number(lead.activeDays || 999) <= 7).length;
  const avgScore = results.length ? Math.round(results.reduce((sum, lead) => sum + Number(lead.score || 0), 0) / results.length) : 0;
  stats.innerHTML = [
    ["Database", workspace.leads.length],
    ["Risultati", results.length],
    ["Hot", hot],
    ["Fresh", fresh],
    ["Score medio", avgScore]
  ]
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
}

function renderLeads() {
  const table = document.querySelector("#leadTable");
  if (!table) return;
  syncLeadSourceFilter();
  renderTargetExpansion();
  renderFinderStats();
  document.querySelectorAll("[data-lead-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.leadTab === activeLeadTab);
  });
  const leads = filteredLeads();
  table.innerHTML = leads.length
    ? leads
        .map(
          (lead) => `
            <div class="lead-row finder-lead-row" data-lead-id="${lead.id}">
              <div>
                <strong>${escapeHtml(lead.username || lead.company)}</strong>
                <p>${escapeHtml(lead.platform)} · ${escapeHtml(lead.country || "Paese n/d")} · ${escapeHtml(lead.language || "lingua n/d")} · ${lead.followers} follower</p>
                <p>${escapeHtml(lead.bio || lead.interests || "Bio non disponibile")}</p>
              </div>
              <span class="lead-score ${lead.quality}">${lead.score}</span>
              <div class="lead-meta">
                <strong>${escapeHtml(lead.temperature)}</strong>
                <span>${lead.engagement}% engagement</span>
                <span>${lead.activeDays >= 999 ? "attività n/d" : `${lead.activeDays}g fa`}</span>
              </div>
              <div class="lead-actions">
                <button type="button" data-select-lead="${lead.id}">Dettagli</button>
                <button type="button" data-discard-lead="${lead.id}">Escludi</button>
              </div>
            </div>
          `
        )
        .join("")
    : `<div class="system-list-item"><div><strong>Nessun risultato</strong><p>Importa un dataset reale o allarga filtri, nicchia e piattaforme.</p></div></div>`;
}

function renderLeadDetail() {
  const detail = document.querySelector("#leadDetail");
  if (!detail) return;
  const lead = getLeadById();
  if (!lead) {
    detail.innerHTML = `<div class="empty-state"><strong>Nessun lead selezionato</strong><p>Apri un risultato per vedere provenienza, qualità e segnali.</p></div>`;
    return;
  }
  detail.innerHTML = `
    <div class="detail-grid">
      <div><span>Username</span><strong>${escapeHtml(lead.username || "n/d")}</strong></div>
      <div><span>Piattaforma</span><strong>${escapeHtml(lead.platform || "n/d")}</strong></div>
      <div><span>Qualità</span><strong>${escapeHtml(lead.temperature)} · ${lead.score}/100</strong></div>
      <div><span>Engagement</span><strong>${lead.engagement}%</strong></div>
      <div><span>Follower</span><strong>${formatMetric(lead.followers || 0)}</strong></div>
      <div><span>Following</span><strong>${formatMetric(lead.following || 0)}</strong></div>
      <div><span>Lingua</span><strong>${escapeHtml(lead.language || "n/d")}</strong></div>
      <div><span>Paese</span><strong>${escapeHtml(lead.country || "n/d")}</strong></div>
    </div>
    <div class="detail-note">
      <span>Bio e interessi</span>
      <strong>${escapeHtml(lead.interests || "Interessi non definiti")}</strong>
      <p>${escapeHtml(lead.bio || "Bio non disponibile.")}</p>
    </div>
    <div class="detail-grid compact-detail-grid">
      <div><span>Ultima attività</span><strong>${lead.activeDays >= 999 ? "n/d" : `${lead.activeDays} giorni fa`}</strong></div>
      <div><span>Provenienza</span><strong>${escapeHtml(lead.origin || "Import manuale")}</strong></div>
      <div><span>Privato</span><strong>${lead.private ? "Si" : "No"}</strong></div>
      <div><span>Bot risk</span><strong>${lead.botRisk || 0}/100</strong></div>
    </div>
  `;
}

function renderLeadSelect() {
  const options = workspace.leads.length
    ? workspace.leads
        .map((lead) => `<option value="${lead.id}">${escapeHtml(lead.username || lead.company)} - ${escapeHtml(lead.platform || lead.source)}</option>`)
        .join("")
    : `<option value="">Nessun lead disponibile</option>`;
  ["#messageLeadSelect", "#replyLeadSelect"].forEach((selector) => {
    const select = document.querySelector(selector);
    if (select) select.innerHTML = options;
  });
}

function importLeadsFromText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean);
  const leads = rows
    .map(parseCsvLine)
    .filter((cells) => cells[0])
    .map((cells) =>
      normalizeLead({
        username: cells[0],
        platform: cells[1] || "Manuale",
        bio: cells[2],
        followers: cells[3],
        following: cells[4],
        engagement: cells[5],
        language: cells[6] || "it",
        country: cells[7] || "Italia",
        interests: cells[8],
        lastActivity: cells[9],
        activeDays: deriveActiveDays(cells[9]),
        origin: cells[10] || "Import manuale",
        private: cells[11],
        botRisk: cells[12],
        contact: cells[13]
      })
    );
  const knownKeys = new Set(workspace.leads.map((lead) => `${lead.platform}|${lead.username}`.toLowerCase()));
  const freshLeads = leads.filter((lead) => {
    const key = `${lead.platform}|${lead.username}`.toLowerCase();
    if (knownKeys.has(key)) return false;
    knownKeys.add(key);
    return true;
  });
  workspace.leads.unshift(...freshLeads);
  selectedLeadId = freshLeads[0]?.id || selectedLeadId;
  saveWorkspace();
  renderAll();
  setFeedback("#leadsFeedback", `${freshLeads.length} lead importati nel database.`);
}

function countryToRegion(country = "") {
  const value = country.toLowerCase().trim();
  const regions = {
    italia: "IT",
    italy: "IT",
    "regno unito": "GB",
    uk: "GB",
    inghilterra: "GB",
    usa: "US",
    "stati uniti": "US",
    spagna: "ES",
    francia: "FR",
    germania: "DE"
  };
  return regions[value] || (country.length === 2 ? country.toUpperCase() : "");
}

async function fetchYouTubeJson(endpoint, params) {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  const response = await fetch(url.toString());
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || `Errore YouTube API ${response.status}`;
    throw new Error(message);
  }
  return payload;
}

function youtubeBotRisk(text = "") {
  const lower = text.toLowerCase();
  let risk = 10;
  if (lower.includes("guaranteed") || lower.includes("profit garant") || lower.includes("pump")) risk += 45;
  if (lower.includes("free signal") || lower.includes("segnali gratis")) risk += 25;
  if (lower.includes("whatsapp") || lower.includes("telegram")) risk += 8;
  return Math.min(95, risk);
}

function youtubeLeadKey(lead) {
  return `${lead.platform}|${lead.username}`.toLowerCase();
}

async function runYouTubeLeadSearch() {
  const apiKey = document.querySelector("#youtubeApiKey")?.value?.trim();
  const status = document.querySelector("#youtubeConnectorStatus");
  if (!apiKey) {
    setFeedback("#youtubeConnectorStatus", "Inserisci una YouTube Data API key per cercare lead veri.");
    return;
  }

  const form = document.querySelector("#leadFinderForm");
  const youtubeCheckbox = form?.querySelector('input[name="platforms"][value="YouTube"]');
  if (youtubeCheckbox) youtubeCheckbox.checked = true;
  const config = getFinderConfig(form);
  const keywords = expandTarget(config.niche);
  const queryParts = [config.niche, ...keywords.slice(0, 4)];
  if (config.competitor) queryParts.push(config.competitor);
  const query = queryParts.join(" ");
  const maxVideos = Math.max(1, Math.min(20, Number(document.querySelector("#youtubeVideoLimit")?.value || 6)));
  const maxComments = Math.max(1, Math.min(50, Number(document.querySelector("#youtubeCommentLimit")?.value || 12)));

  if (status) status.textContent = "Ricerca YouTube reale in corso...";

  const searchPayload = await fetchYouTubeJson("search", {
    part: "snippet",
    type: "video",
    q: query,
    maxResults: maxVideos,
    order: config.mode === "fresh" ? "date" : "relevance",
    relevanceLanguage: config.language === "any" ? "" : config.language,
    regionCode: countryToRegion(config.country),
    key: apiKey
  });

  const videos = (searchPayload.items || []).filter((item) => item.id?.videoId);
  const commentPayloads = await Promise.all(
    videos.map((video) =>
      fetchYouTubeJson("commentThreads", {
        part: "snippet",
        videoId: video.id.videoId,
        maxResults: maxComments,
        order: "relevance",
        textFormat: "plainText",
        key: apiKey
      }).catch(() => ({ items: [], videoId: video.id.videoId }))
    )
  );

  const channelIds = new Set();
  videos.forEach((video) => channelIds.add(video.snippet.channelId));
  commentPayloads.forEach((payload) => {
    (payload.items || []).forEach((thread) => {
      const comment = thread.snippet?.topLevelComment?.snippet;
      const channelId = comment?.authorChannelId?.value;
      if (channelId) channelIds.add(channelId);
    });
  });

  const channelMap = new Map();
  const batches = [...channelIds].reduce((chunks, id, index) => {
    const bucket = Math.floor(index / 50);
    chunks[bucket] = chunks[bucket] || [];
    chunks[bucket].push(id);
    return chunks;
  }, []);
  for (const batch of batches) {
    const channelPayload = await fetchYouTubeJson("channels", {
      part: "snippet,statistics",
      id: batch.join(","),
      key: apiKey
    });
    (channelPayload.items || []).forEach((channel) => channelMap.set(channel.id, channel));
  }

  const imported = [];
  videos.forEach((video) => {
    const channel = channelMap.get(video.snippet.channelId);
    imported.push(
      normalizeLead({
        username: video.snippet.channelTitle,
        platform: "YouTube",
        bio: channel?.snippet?.description || video.snippet.description || video.snippet.title,
        followers: Number(channel?.statistics?.subscriberCount || 0),
        following: 0,
        engagement: 3.2,
        language: config.language === "any" ? "n/d" : config.language,
        country: config.country || "n/d",
        interests: keywords.join(" "),
        activeDays: deriveActiveDays(video.snippet.publishedAt),
        lastActivity: video.snippet.publishedAt,
        origin: `Video: ${video.snippet.title}`,
        private: false,
        botRisk: youtubeBotRisk(`${video.snippet.title} ${video.snippet.description}`)
      })
    );
  });

  videos.forEach((video, videoIndex) => {
    const comments = commentPayloads[videoIndex]?.items || [];
    comments.forEach((thread) => {
      const comment = thread.snippet?.topLevelComment?.snippet;
      if (!comment?.authorDisplayName) return;
      const channelId = comment.authorChannelId?.value;
      const channel = channelId ? channelMap.get(channelId) : null;
      const commentText = comment.textOriginal || comment.textDisplay || "";
      imported.push(
        normalizeLead({
          username: comment.authorDisplayName,
          platform: "YouTube",
          bio: commentText,
          followers: Number(channel?.statistics?.subscriberCount || 0),
          following: 0,
          engagement: Math.min(9.8, 4 + Number(comment.likeCount || 0) / 3),
          language: config.language === "any" ? "n/d" : config.language,
          country: config.country || "n/d",
          interests: keywords.join(" "),
          activeDays: deriveActiveDays(comment.publishedAt),
          lastActivity: comment.publishedAt,
          origin: `Commento su: ${video.snippet.title}`,
          private: false,
          botRisk: youtubeBotRisk(commentText),
          contact: comment.authorChannelUrl || ""
        })
      );
    });
  });

  const knownKeys = new Set(workspace.leads.map(youtubeLeadKey));
  const freshLeads = imported.filter((lead) => {
    const key = youtubeLeadKey(lead);
    if (!lead.username || knownKeys.has(key)) return false;
    knownKeys.add(key);
    return true;
  });
  workspace.leads.unshift(...freshLeads);
  selectedLeadId = freshLeads[0]?.id || selectedLeadId;
  saveWorkspace();
  executeLeadSearch(getFinderConfig(form));
  setFeedback(
    "#youtubeConnectorStatus",
    `${freshLeads.length} lead veri importati da YouTube. ${videos.length} video analizzati.`
  );
}

const radarSourceAliases = {
  web: ["Website", "Blog", "Directory", "Reviews", "Google", "Forum"],
  forum: ["Forum", "Reddit"],
  local: ["Directory", "Reviews", "Website", "Google"],
  social: [...radarSocialPlatforms],
  import: ["CRM/Import"]
};

const radarCapabilityRows = [
  ["Instagram", "manual_assist", false, "apri profilo, copia messaggio, segna stato"],
  ["Facebook", "manual_assist", false, "apri profilo/pagina, copia messaggio"],
  ["TikTok", "manual_assist", false, "apri profilo, copia messaggio"],
  ["LinkedIn", "manual_assist", false, "apri profilo, copia messaggio"],
  ["Twitter/X", "manual_assist", false, "apri profilo, copia messaggio"],
  ["YouTube", "manual_assist", false, "apri canale o commento fonte, copia messaggio"],
  ["Reddit", "manual_assist", false, "apri thread/profilo, copia messaggio"],
  ["Telegram", "manual_assist", false, "apri username/gruppo, copia messaggio"],
  ["Forum", "manual_assist", false, "apri thread/profilo, copia messaggio"],
  ["Website", "automated_possible", true, "email business, form pubblico, pagina contatti"],
  ["Directory", "automated_possible", true, "dati business pubblici e tracciabili"],
  ["CRM/Import", "automated_possible", true, "solo opt-in, cliente importato o autorizzato"]
];

const allRadarSourceValues = [
  "Instagram",
  "Facebook",
  "TikTok",
  "LinkedIn",
  "Twitter/X",
  "YouTube",
  "Reddit",
  "Telegram",
  "Forum",
  "Website",
  "Blog",
  "Directory",
  "Reviews",
  "CRM/Import"
];

const radarGuidedPresets = {
  programming: {
    title: "Audience per programmazione, AI e automazioni",
    summary: "Cerca pagine, creator, community e utenti attivi compatibili con siti web, app, gestionali, bot, chatbot, automazioni AI e software.",
    fields: {
      niche: "sviluppo software automazioni AI siti web app bot",
      sector: "PMI creator ecommerce aziende locali startup",
      country: "Italia",
      city: "",
      language: "it",
      keywords:
        "sviluppo software, automazioni AI, no-code, app business, SaaS Italia, ecommerce, software gestionale, creator tech, startup Italia, tool AI, chatbot, CRM, integrazione API",
      hashtags: "#startupitalia, #businessitalia, #ecommerceitalia, #ai, #automazioni",
      competitors: "web agency, software house, no-code agency, automazioni AI",
      monitorUrls: "",
      intentPhrases:
        "info, consigli, come funziona, tutorial, community, strumenti, confronto tool, automazioni, no-code, AI business, ecommerce, startup, commenti recenti",
      recencyMonths: "12",
      minScore: "45",
      limit: "60",
      workspaceSeed: "programmazione-ai-italia",
      cooldownHours: "24",
      distributionMode: "balanced"
    },
    checks: { businessOnly: false, excludeBots: true, automationGuard: true },
    sources: allRadarSourceValues
  },
  localBusiness: {
    title: "Aziende locali che cercano clienti",
    summary: "Trova attività locali, pagine contatto e directory utili per vendere siti, automazioni, CRM e acquisizione clienti.",
    fields: {
      niche: "attività locali acquisizione clienti sito web automazioni",
      sector: "ristoranti centri estetici palestre studi professionali negozi",
      country: "Italia",
      city: "",
      language: "it",
      keywords: "sito vecchio, prenotazioni online, recensioni, gestione clienti, marketing locale, nuovi clienti, form contatto",
      hashtags: "#businesslocale, #pmi, #marketinglocale, #imprenditori",
      competitors: "agenzia marketing locale, web agency locale, consulente digital",
      monitorUrls: "",
      intentPhrases: "cerco clienti, vorrei più clienti, sito da rifare, gestione prenotazioni, preventivo sito, marketing locale",
      recencyMonths: "12",
      minScore: "50",
      limit: "80",
      workspaceSeed: "local-business-italia",
      cooldownHours: "24",
      distributionMode: "balanced"
    },
    checks: { businessOnly: true, excludeBots: true, automationGuard: true },
    sources: ["Website", "Directory", "Reviews", "Facebook", "Instagram", "LinkedIn", "CRM/Import"]
  },
  networkers: {
    title: "Networker che vogliono contatti",
    summary: "Cerca networker, creator e venditori interessati a una piattaforma che trova prospect e organizza contatti.",
    fields: {
      niche: "network marketing lead generation prospect clienti contatti",
      sector: "networker creator sales team consulenti",
      country: "Italia",
      city: "",
      language: "it",
      keywords: "cerco contatti, lead generation, prospect, network marketing, trovare clienti, automatizzare contatti, DM strategy",
      hashtags: "#networkmarketing, #leadgeneration, #vendite, #businessonline",
      competitors: "network marketing Italia, closer, lead generation tool",
      monitorUrls: "",
      intentPhrases: "cerco contatti, come trovare clienti, non riesco a trovare prospect, voglio automatizzare, mi servono lead",
      recencyMonths: "12",
      minScore: "45",
      limit: "60",
      workspaceSeed: "networker-italia",
      cooldownHours: "24",
      distributionMode: "freshness"
    },
    checks: { businessOnly: false, excludeBots: true, automationGuard: true },
    sources: ["Instagram", "TikTok", "LinkedIn", "YouTube", "Reddit", "Telegram", "Forum", "CRM/Import"]
  },
  tradingEducation: {
    title: "Trading / finanza educational",
    summary: "Cerca segnali pubblici di interesse su formazione, prop firm, gestione community e strumenti trading senza promesse finanziarie.",
    fields: {
      niche: "trading educazione finanziaria prop firm community strumenti",
      sector: "creator trader community educational",
      country: "Italia",
      city: "",
      language: "it",
      keywords: "come iniziare trading, prop firm, corso trading, community trading, XAUUSD, gestione rischio, backtest",
      hashtags: "#tradingitalia, #propfirm, #forexitalia, #educazionefinanziaria",
      competitors: "trading community, prop firm Italia, creator trading",
      monitorUrls: "",
      intentPhrases: "come iniziare, quale prop firm, cerco corso, non so da dove partire, consigli trading, community seria",
      recencyMonths: "12",
      minScore: "45",
      limit: "60",
      workspaceSeed: "trading-education-italia",
      cooldownHours: "24",
      distributionMode: "freshness"
    },
    checks: { businessOnly: false, excludeBots: true, automationGuard: true },
    sources: ["YouTube", "Reddit", "Telegram", "Forum", "Instagram", "TikTok", "Twitter/X", "CRM/Import"]
  }
};

function splitList(value = "") {
  return String(value)
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanHashtag(value = "") {
  return String(value).replace(/^#/, "").toLowerCase().trim();
}

function calculateRadarInternalTarget(visibleLeads = 50, mode = "balanced") {
  const count = Math.max(5, Math.min(250, Number(visibleLeads || 50)));
  const multiplier = mode === "aggressive" ? 4 : mode === "economy" ? 2 : 3;
  return Math.min(2500, Math.max(count, count * multiplier));
}

function normalizeRadarSource(value = "") {
  const source = String(value || "").trim();
  const lower = source.toLowerCase();
  if (lower === "x" || lower === "twitter") return "Twitter/X";
  if (lower.includes("insta")) return "Instagram";
  if (lower.includes("tiktok")) return "TikTok";
  if (lower.includes("linkedin")) return "LinkedIn";
  if (lower.includes("youtube")) return "YouTube";
  if (lower.includes("reddit")) return "Reddit";
  if (lower.includes("telegram")) return "Telegram";
  if (lower.includes("facebook") || lower === "fb") return "Facebook";
  if (lower.includes("directory")) return "Directory";
  if (lower.includes("review") || lower.includes("recension")) return "Reviews";
  if (lower.includes("forum")) return "Forum";
  if (lower.includes("blog")) return "Blog";
  if (lower.includes("crm") || lower.includes("import")) return "CRM/Import";
  if (lower.includes("site") || lower.includes("sito") || lower.includes("web")) return "Website";
  return source || "CRM/Import";
}

function normalizeIsoDate(value = "") {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function monthsSince(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, (Date.now() - date.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

function daysSince(value = "") {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 999;
  return Math.max(0, Math.round((Date.now() - date.getTime()) / 86400000));
}

function isBusinessEmail(email = "") {
  const value = String(email).toLowerCase().trim();
  if (!value || !value.includes("@")) return false;
  return !/(gmail|hotmail|outlook|icloud|yahoo|libero|virgilio|proton|mail\.com)\./.test(value);
}

function cleanFirstName(value = "") {
  const first = String(value).trim().split(/\s+/)[0] || "";
  if (!first || first.length < 2) return "";
  if (/[@_\d]/.test(first)) return "";
  if (!/^[a-zà-ÿ'-]+$/i.test(first)) return "";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

function getRadarCapability(prospect = {}) {
  const platform = normalizeRadarSource(prospect.platform);
  const sourceType = String(prospect.source_type || "").toLowerCase();
  const hasBusinessEmail = isBusinessEmail(prospect.email_business_public);
  const hasPublicForm = Boolean(prospect.contact_form_url || sourceType.includes("form") || sourceType.includes("contact"));
  const isOptIn = sourceType.includes("opt") || sourceType.includes("crm") || sourceType.includes("authorized");
  const isBusinessWeb =
    ["Website", "Directory", "Reviews", "CRM/Import"].includes(platform) ||
    sourceType.includes("directory") ||
    sourceType.includes("business") ||
    sourceType.includes("website");

  if (radarSocialPlatforms.has(platform) && !(platform === "Telegram" && sourceType.includes("authorized"))) {
    return {
      contact_mode: "manual_assist",
      auto_send_allowed: false,
      contact_actions: "apri profilo/fonte, copia messaggio, invio manuale"
    };
  }

  if ((isBusinessWeb || isOptIn) && (hasBusinessEmail || hasPublicForm || isOptIn)) {
    return {
      contact_mode: "automated_possible",
      auto_send_allowed: true,
      contact_actions: "anteprima, conferma, email/form con log"
    };
  }

  return {
    contact_mode: "manual_assist",
    auto_send_allowed: false,
    contact_actions: "apri fonte, copia messaggio, invio manuale"
  };
}

function radarText(prospect = {}) {
  return [
    prospect.platform,
    prospect.source_type,
    prospect.username_public,
    prospect.public_name,
    prospect.business_name,
    prospect.website,
    prospect.bio_public,
    prospect.city,
    prospect.country,
    prospect.source_url,
    prospect.source_page,
    prospect.source_item,
    prospect.relevant_text,
    prospect.keyword_match,
    prospect.hashtag_match,
    prospect.detected_intent,
    prospect.provider_source,
    prospect.score_reason
  ]
    .join(" ")
    .toLowerCase();
}

function radarIsSellerOrAdNoise(prospect = {}) {
  const text = radarText(prospect);
  const blockedOpportunitySignal =
    /offert[ae] di lavoro|annuncio di lavoro|posizione aperta|lavora con noi|assumiamo|assunzione|curriculum|cv\b|recruiter|stage|tirocinio|full[-\s]?time|part[-\s]?time|freelance job|servizi freelance|network di freelance|cerco (un |una |)(programmatore|sviluppatore|freelance)|sto cercando (un |una |)(programmatore|sviluppatore)|assumi (un |uno |una |)(freelance|sviluppatore|programmatore)/i.test(text);
  const sellerSignal =
    /realizzazione siti|creazione siti|siti web ottimizzati|web agency|agenzia web|software house|branding, strategia|servizio di web design|social media manager|seo per aziende|consulenza gratuita|prenota (una |)consulenza|fissa (una |)call|richiedi preventivo gratis|scopri come|guarda il webinar|iscriviti al webinar|scarica la guida|link in bio|vuoi creare|vuoi sviluppare|ti serve (un |una |)(sito|app|piattaforma|software)|creo\/personalizzo|creo per te|creiamo per te|realizziamo per te|sviluppiamo per te|costruiamo per te|ti aiutiamo a|guadagna online|soldi facili|metodo garantito|risultati garantiti|i migliori \d+|migliori (sviluppatori|programmatori|freelance|web designer)|trova (un |uno |una |i |)(freelance|sviluppatore|programmatore|professionista)|assumi (un |uno |una |)(freelance|sviluppatore|programmatore)|network di freelance|professionisti esperti|ricevi preventivi|confronta preventivi/i.test(text);
  const sourceType = String(prospect.source_type || "").toLowerCase();
  if (/audience_source/.test(sourceType)) return true;
  if (/^sviluppatori? .*freelance:|^programmatori? .*freelance:|i migliori \d+|migliori (sviluppatori|programmatori|freelance|web designer)/i.test(text)) return true;
  return blockedOpportunitySignal || sellerSignal;
}

function detectRadarIntent(text = "", customPhrases = []) {
  const lower = String(text).toLowerCase();
  const hits = [];
  let strength = 0;
  for (const item of radarIntentPatterns) {
    const matched = item.patterns.filter((pattern) => lower.includes(pattern));
    if (matched.length) {
      hits.push(item.label);
      strength += item.weight + Math.min(10, matched.length * 3);
    }
  }

  splitList(customPhrases).forEach((phrase) => {
    const clean = phrase.toLowerCase();
    if (clean && lower.includes(clean)) {
      hits.push(clean);
      strength += 12;
    }
  });

  const uniqueHits = [...new Set(hits)];
  return {
    label: uniqueHits[0] || "interesse debole",
    hits: uniqueHits,
    strength: Math.min(45, strength)
  };
}

function getRadarConfig(form = document.querySelector("#radarForm")) {
  const data = new FormData(form);
  const requestedVisibleLeads = Math.max(
    5,
    Math.min(250, Number(document.querySelector("#radarQuickQuantity")?.value || data.get("limit") || 60))
  );
  return {
    niche: String(data.get("niche") || "").trim(),
    sector: String(data.get("sector") || "").trim(),
    country: String(data.get("country") || "").trim(),
    city: String(data.get("city") || "").trim(),
    language: String(data.get("language") || "any"),
    keywords: splitList(data.get("keywords")),
    hashtags: splitList(data.get("hashtags")).map(cleanHashtag).filter(Boolean),
    competitors: splitList(data.get("competitors")),
    monitorUrls: splitList(data.get("monitorUrls")),
    intentPhrases: splitList(data.get("intentPhrases")),
    sources: [...form.querySelectorAll('input[name="sources"]:checked')].map((input) => input.value),
    recencyMonths: Math.max(1, Math.min(60, Number(data.get("recencyMonths") || 12))),
    minScore: Math.max(0, Math.min(100, Number(data.get("minScore") || 0))),
    limit: requestedVisibleLeads,
    requestedVisibleLeads,
    internalTargetLeads: calculateRadarInternalTarget(requestedVisibleLeads, String(data.get("operationMode") || workspace.radar.operationMode || "balanced")),
    radarMode: String(document.querySelector("#radarQuickMode")?.value || data.get("radarMode") || "auto"),
    audienceType: String(document.querySelector("#radarQuickAudienceType")?.value || data.get("audienceType") || "mix"),
    workspaceSeed: String(data.get("workspaceSeed") || "internal-alpha").trim(),
    cooldownHours: Math.max(1, Math.min(168, Number(data.get("cooldownHours") || 24))),
    distributionMode: String(data.get("distributionMode") || "balanced"),
    operationMode: String(data.get("operationMode") || workspace.radar.operationMode || workspace.credits.mode || "balanced"),
    businessOnly: data.get("businessOnly") === "on",
    excludeBots: data.get("excludeBots") === "on",
    automationGuard: data.get("automationGuard") === "on"
  };
}

function setRadarField(form, name, value) {
  const field = form?.elements.namedItem(name);
  if (!field) return;
  field.value = value ?? "";
}

function renderRadarPresetSummary(key = document.querySelector("#radarPresetSelect")?.value || "programming") {
  const summary = document.querySelector("#radarPresetSummary");
  const preset = radarGuidedPresets[key] || radarGuidedPresets.programming;
  if (!summary) return;
  summary.innerHTML = `
    <strong>${escapeHtml(preset.title)}</strong>
    <p>${escapeHtml(preset.summary)}</p>
    <span>Contatto social: manuale assistito · Web/email business: possibile solo con conferma e fonte tracciabile.</span>
  `;
}

function applyRadarPreset(key = "programming", shouldRun = false) {
  const form = document.querySelector("#radarForm");
  const preset = radarGuidedPresets[key] || radarGuidedPresets.programming;
  if (!form) return;
  Object.entries(preset.fields).forEach(([name, value]) => setRadarField(form, name, value));
  form.querySelectorAll('input[name="sources"]').forEach((input) => {
    input.checked = preset.sources.includes(input.value);
  });
  Object.entries(preset.checks).forEach(([name, value]) => {
    const field = form.elements.namedItem(name);
    if (field) field.checked = Boolean(value);
  });
  renderRadarPresetSummary(key);
  if (shouldRun) {
    executeRadarSearch(getRadarConfig(form));
    return;
  }
  setFeedback("#radarFeedback", `Preset "${preset.title}" applicato. Ora importa segnali reali o lancia il Radar.`);
}

function getQuickRadarSources() {
  const selected = [...document.querySelectorAll("[data-quick-source]:checked")].map((input) => input.dataset.quickSource || input.value);
  return selected.length ? selected : allRadarSourceValues;
}

function syncQuickRadarFlow() {
  const form = document.querySelector("#radarForm");
  if (!form) return getRadarConfig();
  const goal =
    document.querySelector("#radarGoalInput")?.value?.trim() ||
    "audience interessata a programmazione, app, siti, bot e automazioni AI";
  const requestedVisible = Math.max(5, Math.min(250, Number(document.querySelector("#radarQuickQuantity")?.value || 50)));
  const geoMode = document.querySelector('input[name="radarQuickGeo"]:checked')?.value || "italy";
  const city = document.querySelector("#radarQuickCity")?.value?.trim() || "";
  const selectedSources = getQuickRadarSources();
  const goalLower = goal.toLowerCase();
  const isTradingGoal = /trading|forex|crypto|prop firm|mt5|metatrader|segnali|bot trading|xauusd/.test(goalLower);
  const isProgrammingGoal = /programmatore|sviluppatore|sito|app|bot|automazioni|software|gestionale|ecommerce|ai|intelligenza artificiale/.test(goalLower);
  const profile = isTradingGoal
    ? {
        sector: "trading, prop firm, forex, crypto, MT5, community trading, formazione",
        keywords:
          "come iniziare trading, prop firm consigli, quale broker, bot trading MT5, segnali trading, copy trading, non so da dove partire, voglio iniziare, info trading, corso trading",
        hashtags: "#tradingitalia, #forexitalia, #propfirm, #mt5, #cryptoitalia",
        competitors: "creator trading, canali prop firm, pagine forex, community trading, broker education",
        intent: "come iniziare trading, prop firm consigli, quale broker, bot trading MT5, segnali trading, voglio iniziare, mi interessa, info, non so da dove partire"
      }
    : isProgrammingGoal
      ? {
          sector: "programmazione, AI, automazioni, siti web, app, bot, software",
          keywords:
            "sviluppo software, automazioni AI, no-code, app business, SaaS Italia, ecommerce, software gestionale, creator tech, startup Italia, tool AI, chatbot, CRM, integrazione API",
          hashtags: "#startupitalia, #businessitalia, #ecommerceitalia, #ai, #automazioni",
          competitors: "web agency, software house, no-code agency, automazioni AI",
          intent:
            "info, consigli, come funziona, tutorial, community, strumenti, confronto tool, automazioni, no-code, AI business, ecommerce, startup, commenti recenti"
        }
      : {
          sector: "business, creator, aziende locali, servizi, community",
          keywords: `${goal}, info, consigli, opinioni, recensioni, community, creator, pagina, canale, gruppo, zona`,
          hashtags: "#businessitalia, #imprenditoria, #marketingitalia",
          competitors: "creator di settore, pagine competitor, community pubbliche",
          intent: "info, consigli, opinioni, recensioni, community, creator, commenti recenti, zona"
        };

  setRadarField(form, "niche", goal);
  setRadarField(form, "sector", profile.sector);
  setRadarField(form, "keywords", `${goal}, ${profile.keywords}`);
  setRadarField(form, "hashtags", profile.hashtags);
  setRadarField(form, "competitors", profile.competitors);
  setRadarField(form, "intentPhrases", profile.intent);
  setRadarField(form, "recencyMonths", "12");
  setRadarField(form, "minScore", "45");
  setRadarField(form, "limit", String(requestedVisible));
  setRadarField(form, "workspaceSeed", goal.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 48) || "radar-clienti");
  setRadarField(form, "cooldownHours", "24");
  setRadarField(form, "distributionMode", "balanced");
  setRadarField(form, "language", geoMode === "any" ? "any" : "it");
  setRadarField(form, "country", geoMode === "any" ? "" : "Italia");
  setRadarField(form, "city", geoMode === "city" ? city : "");

  form.querySelectorAll('input[name="sources"]').forEach((input) => {
    input.checked = selectedSources.includes(input.value);
  });
  const excludeBots = form.elements.namedItem("excludeBots");
  const automationGuard = form.elements.namedItem("automationGuard");
  if (excludeBots) excludeBots.checked = true;
  if (automationGuard) automationGuard.checked = true;
  return getRadarConfig(form);
}

function expandRadarKeywords(config = {}) {
  const expanded = new Set();
  [config.niche, config.sector].filter(Boolean).forEach((value) => {
    splitList(value).forEach((token) => expanded.add(token.toLowerCase()));
    expandTarget(value).forEach((token) => expanded.add(token.toLowerCase()));
  });
  (config.keywords || []).forEach((keyword) => expanded.add(keyword.toLowerCase()));
  (config.hashtags || []).forEach((hashtag) => expanded.add(hashtag.toLowerCase()));
  (config.competitors || []).forEach((competitor) => expanded.add(competitor.toLowerCase().replace("@", "")));
  (config.intentPhrases || []).forEach((phrase) => expanded.add(phrase.toLowerCase()));
  return [...expanded].filter(Boolean).slice(0, 80);
}

function radarIsSourceOnly(prospect = {}) {
  const sourceType = String(prospect.source_type || "").toLowerCase();
  return /audience_source|video_source|post_source|profile_source|social_search|social_hashtag|ad_source|source_to_mine/.test(sourceType) && !/comment|follower|business|directory|crm/.test(sourceType);
}

function radarAudienceTags(prospect = {}, config = {}) {
  const text = radarText(prospect);
  const tags = new Set();
  [...(config.hashtags || []), ...(config.keywords || []), ...(config.competitors || [])].forEach((item) => {
    const token = String(item || "").replace(/^#/, "").trim().toLowerCase();
    if (token && text.includes(token)) tags.add(token);
  });
  const patterns = {
    trading: /trading|forex|prop firm|mt5|metatrader|xauusd|copy trading|segnali/i,
    crypto: /crypto|bitcoin|ethereum|blockchain/i,
    "bot trading": /bot trading|expert advisor|mql5|ea\b/i,
    programmazione: /programmatore|sviluppatore|software|app|sito|web developer/i,
    automazioni: /automazione|ai|chatbot|workflow|api|no-code|nocode/i,
    ecommerce: /ecommerce|shopify|woocommerce|store|negozio online/i,
    fitness: /fitness|palestra|personal trainer|nutrizione|dimagrimento|bodybuilding/i,
    estetica: /estetica|centro estetico|epilazione|laser|laminazione|viso|beauty/i,
    creator: /creator|contenuti|reel|tiktok|youtube|influencer/i,
    business: /business|azienda|startup|pmi|lead generation|clienti/i
  };
  Object.entries(patterns).forEach(([tag, pattern]) => {
    if (pattern.test(text)) tags.add(tag);
  });
  const sourceType = String(prospect.source_type || "").toLowerCase();
  if (/comment/.test(sourceType)) tags.add("commentatore attivo");
  if (/follower/.test(sourceType)) tags.add("follower disponibile");
  if (/profile/.test(sourceType)) tags.add("profilo pubblico");
  if (/business|directory/.test(sourceType)) tags.add("possibile business");
  return [...tags].slice(0, 12);
}

function radarAudienceSegment(prospect = {}, tags = []) {
  const sourceType = String(prospect.source_type || "").toLowerCase();
  const text = `${radarText(prospect)} ${tags.join(" ")}`;
  if (/follower/.test(sourceType)) return "follower disponibili";
  if (/comment/.test(sourceType)) return "commentatori attivi";
  if (/profile|creator|channel|page/.test(sourceType) || /creator|influencer/i.test(text)) return "creator / pagine";
  if (/telegram|reddit|forum|community/i.test(text)) return "community users";
  if (/business|azienda|pmi|email|link in bio|contatti/i.test(text)) return "possibile business";
  if (/principiante|come iniziare|non so da dove/i.test(text)) return "aspiranti / beginner";
  return "audience compatibile";
}

function scoreRadarProspect(prospect, config = {}) {
  const text = radarText(prospect);
  const keywords = expandRadarKeywords(config);
  const keywordMatches = keywords.filter((keyword) => keyword && text.includes(keyword.toLowerCase())).slice(0, 12);
  const hashtags = (config.hashtags || []).filter((hashtag) => text.includes(hashtag.toLowerCase()));
  const intent = detectRadarIntent(text, config.intentPhrases);
  const recency = monthsSince(prospect.last_interaction || prospect.collected_at);
  const interactions = Number(prospect.interactions_detected || 0);
  const reliability = Math.max(0, Math.min(100, Number(prospect.source_reliability || 60)));
  const hasBusinessContact = isBusinessEmail(prospect.email_business_public) || Boolean(prospect.contact_form_url);
  const sourceType = String(prospect.source_type || "").toLowerCase();
  const tags = radarAudienceTags(prospect, config);
  const locationOk =
    (!config.city || text.includes(config.city.toLowerCase())) &&
    (!config.country || text.includes(config.country.toLowerCase()));

  let relevanceScore = 18 + Math.min(52, keywordMatches.length * 8 + hashtags.length * 5 + tags.length * 4);
  if (/comment|follower|profile|business/.test(sourceType)) relevanceScore += 8;
  if (locationOk && (config.city || config.country)) relevanceScore += 8;

  let engagementScore = 20;
  if (/comment/.test(sourceType)) engagementScore += 24;
  if (/follower/.test(sourceType)) engagementScore += 12;
  if (interactions >= 1) engagementScore += 8;
  if (interactions >= 5) engagementScore += 10;
  if (interactions >= 20) engagementScore += 8;
  if (recency <= 1) engagementScore += 22;
  else if (recency <= 3) engagementScore += 16;
  else if (recency <= 6) engagementScore += 10;
  else if (recency <= 12) engagementScore += 6;

  let qualityScore = 35 + Math.round((reliability - 50) / 3);
  if (prospect.username_public || prospect.public_name || prospect.business_name) qualityScore += 12;
  if (prospect.bio_public || prospect.relevant_text) qualityScore += 10;
  if (prospect.profile_link || prospect.website || prospect.source_url) qualityScore += 8;
  if (/private|privato/i.test(text)) qualityScore -= 18;

  let commercialFitScore = 25;
  if (hasBusinessContact) commercialFitScore += 22;
  if (/business|company|creator|profile|bio|link|website|telegram|channel/.test(sourceType)) commercialFitScore += 12;
  if (/creator|business|azienda|startup|ecommerce|coach|trader|community|link in bio|email/i.test(text)) commercialFitScore += 12;
  if (intent.strength >= 12) commercialFitScore += 8;

  const fakeSignals = /free money|guaranteed|100%|follow4follow|promo|spam|bot|casino|airdrop|pump/i.test(text);
  if (fakeSignals) {
    qualityScore -= 28;
    commercialFitScore -= 18;
  }
  if (!prospect.relevant_text && !prospect.bio_public && !prospect.business_name && !prospect.username_public) qualityScore -= 18;
  if (config.businessOnly && !prospect.business_name && !hasBusinessContact) commercialFitScore -= 30;

  relevanceScore = Math.max(0, Math.min(100, Math.round(relevanceScore)));
  engagementScore = Math.max(0, Math.min(100, Math.round(engagementScore)));
  qualityScore = Math.max(0, Math.min(100, Math.round(qualityScore)));
  commercialFitScore = Math.max(0, Math.min(100, Math.round(commercialFitScore)));
  const finalScore = Math.max(
    0,
    Math.min(100, Math.round(relevanceScore * 0.4 + engagementScore * 0.25 + qualityScore * 0.2 + commercialFitScore * 0.15))
  );
  const temperature = finalScore >= 72 ? "hot" : finalScore >= 45 ? "warm" : "cold";
  const reasons = [];
  if (keywordMatches.length) reasons.push(`${keywordMatches.length} match nicchia`);
  if (tags.length) reasons.push(`tag: ${tags.slice(0, 4).join(", ")}`);
  if (/comment/.test(sourceType)) reasons.push("ha interagito/commentato su una fonte rilevante");
  if (/follower/.test(sourceType)) reasons.push("follower pubblico disponibile di una fonte rilevante");
  if (recency <= 12) reasons.push(`attività recente (${Math.round(recency * 30)}g)`);
  if (hasBusinessContact) reasons.push("contatto business pubblico");
  if (locationOk && (config.city || config.country)) reasons.push("area coerente");
  if (!reasons.length) reasons.push("compatibilità audience da verificare");

  return {
    score_ai: finalScore,
    temperature,
    relevance_score: relevanceScore,
    engagement_score: engagementScore,
    quality_score: qualityScore,
    commercial_fit_score: commercialFitScore,
    total_score: finalScore,
    audience_segment: radarAudienceSegment(prospect, tags),
    tags,
    score_reason: `Prospect compatibile: ${reasons.join(", ")}.`,
    keyword_match: keywordMatches.join(", "),
    hashtag_match: hashtags.join(", "),
    detected_intent: intent.hits.length ? intent.label : radarAudienceSegment(prospect, tags),
    intent_strength: intent.strength
  };
}

function prospectLooksItalian(prospect = {}) {
  const text = radarText(prospect);
  return /[àèéìòù]|\b(cerco|serve|servirebbe|vorrei|qualcuno|preventivo|prezzo|quanto costa|sito|sviluppatore|programmatore|gestionale|azienda|attività|italia|roma|milano|napoli|torino|bologna|veneto|lombardia|lazio|non|che|per|con|una|della)\b/i.test(
    text
  );
}

function extractMessageSignal(prospect = {}) {
  const raw = String(prospect.relevant_text || prospect.source_item || prospect.bio_public || "").replace(/\s+/g, " ").trim();
  if (!raw) return "";
  const sentences = raw
    .split(/(?<=[.!?])\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
  const intentSentence =
    sentences.find((sentence) => /cerco|serve|servirebbe|quanto|prezzo|preventivo|problema|non riesco|sito|app|software|gestionale|chatbot|automazione/i.test(sentence)) ||
    sentences[0] ||
    raw;
  return intentSentence.length > 170 ? `${intentSentence.slice(0, 167)}...` : intentSentence;
}

function detectRequestedSolution(prospect = {}) {
  const text = radarText(prospect);
  if (/ecommerce|shopify|woocommerce|shop online|negozio online/i.test(text)) return "ecommerce";
  if (/\bapp\b|applicazione|mobile/i.test(text)) return "app mobile";
  if (/gestionale|crm|database|dashboard/i.test(text)) return "gestionale/CRM";
  if (/chatbot|bot\b|whatsapp/i.test(text)) return "chatbot o automazione";
  if (/automazione|automatizzare|workflow|integrazione api|api\b/i.test(text)) return "automazione";
  if (/landing|funnel/i.test(text)) return "landing/funnel";
  if (/sito|wordpress|web agency|website/i.test(text)) return "sito web";
  return "progetto digitale";
}

function buildRadarMessage(prospect = {}) {
  const firstName = cleanFirstName(prospect.public_name);
  const isAutomated = prospect.contact_mode === "automated_possible";
  const greeting = firstName ? `Ciao ${firstName},` : isAutomated ? "Buongiorno," : "Ciao, piacere,";
  const signal = extractMessageSignal(prospect);
  const solution = detectRequestedSolution(prospect);
  const place = prospect.city ? ` a ${prospect.city}` : prospect.country ? ` in ${prospect.country}` : "";
  const target = prospect.business_name || prospect.public_name || prospect.username_public || "la tua attività";
  const source = prospect.source_page || prospect.platform || "una fonte pubblica";
  const hasPriceIntent = /prezzo|preventivo|costo|quanto costa|budget/i.test(`${prospect.detected_intent || ""} ${prospect.relevant_text || ""}`);
  const hasProblemIntent = /problema|non riesco|bloccato|aiuto|non funziona/i.test(`${prospect.detected_intent || ""} ${prospect.relevant_text || ""}`);
  const hasTradingIntent = /trading|forex|crypto|prop firm|broker|mt5|metatrader|segnali|copy trading|bot trading|xauusd|come iniziare/i.test(
    radarText(prospect)
  );
  const context = signal
    ? `ho visto questo tuo commento/segnale su ${source}: "${signal}"`
    : `ho visto ${target}${place} e mi sembra collegato a un possibile bisogno su ${solution}`;
  const usefulAngle = hasTradingIntent
    ? "posso mandarti due spunti pratici su strumenti, automazioni o organizzazione del percorso, senza promesse strane e senza segnali miracolosi"
    : hasPriceIntent
      ? `posso aiutarti a capire quali parti incidono davvero sul costo di un ${solution}, così non parti alla cieca`
      : hasProblemIntent
        ? "posso darti un parere pratico su cosa controllerei prima e quali opzioni avresti"
        : `posso mandarti un'idea concreta su come imposterei un progetto di tipo ${solution}`;
  const optOut =
    isAutomated
      ? "\n\nSe non vuoi ricevere altri messaggi, dimmelo pure e non ti ricontatto."
      : "";

  if (isAutomated) {
    return `${greeting}

${context}.

Mi occupo di siti, app, bot e automazioni AI. Da quello che ho letto, il punto sembra abbastanza concreto.

${usefulAngle}.

Se ha senso, ti mando una sintesi breve con cosa farei, cosa eviterei e una stima realistica dei prossimi passi.

${workspace.settings.signature}${optOut}`;
  }

  return `${greeting}

${context}.

Mi occupo di siti, app, bot e automazioni AI.

${usefulAngle}.

Se vuoi, ti mando 2-3 idee pratiche su come lo imposterei e cosa eviterei per non buttare soldi o tempo.

${workspace.settings.signature}${optOut}`;
}

function buildConversationStarters(prospect = {}, objective = "aprire conversazione") {
  const name = cleanFirstName(prospect.public_name || prospect.name);
  const greeting = name ? `Ciao ${name},` : "Ciao, piacere,";
  const rawSignal = prospect.relevant_text || prospect.bio_public || prospect.note || prospect.interests || "";
  const context = rawSignal
    ? rawSignal.length > 160 ? `${rawSignal.slice(0, 157)}...` : rawSignal
    : "ho visto un segnale pubblico collegato al tuo bisogno";
  const business = prospect.business_name || prospect.company || prospect.username_public || prospect.username || "la tua attività";
  const city = prospect.city ? ` a ${prospect.city}` : "";
  const scoreReason = prospect.score_reason || `sembra coerente con ${prospect.detected_intent || "il target"}`;
  const baseOffer =
    prospect.contact_mode === "automated_possible"
      ? "posso mandarti due idee concrete su acquisizione clienti e automazioni, con esempi pratici"
      : "posso mandarti due idee pratiche e dritte al punto, senza farti perdere tempo";

  const variants = {
    breve: `${greeting} ho visto questo: "${context}". Se ti va, posso mandarti 2 idee concrete per ${business}${city}.`,
    naturale: `${greeting}

ho visto questo segnale pubblico: "${context}".

Te lo scrivo in modo semplice: ${baseOffer}.

Se ha senso, ti mando un esempio concreto in base alla tua situazione.

${workspace.settings.signature}`,
    professionale: `${greeting}

ho notato ${business}${city} e il contesto mi sembra interessante: ${scoreReason}.

Lavoriamo su siti, automazioni AI, CRM e sistemi per trovare/gestire clienti. L'obiettivo non è venderti qualcosa a caso, ma capire se c'è un punto pratico dove puoi risparmiare tempo o generare più opportunità.

${objective}. Possiamo partire da una breve analisi e poi valutare se ha senso sentirci.

${workspace.settings.signature}`
  };

  const objections = {
    "quanto costa": "Dipende da cosa vuoi ottenere. Prima capisco obiettivo, urgenza e situazione attuale, poi ti do una fascia realistica senza impegno.",
    "mandami info": "Certo. Ti mando una sintesi concreta: problema, soluzione possibile, tempi indicativi e cosa mi servirebbe per valutare bene.",
    "ci penso": "Va benissimo. Ti lascio un criterio semplice: se oggi questa cosa ti fa perdere tempo o opportunità, ha senso almeno fare una mini analisi.",
    "non mi interessa": "Tranquillo, nessun problema. Non ti ricontatto su questo tema.",
    "chi sei": `Sono ${workspace.settings.signature}. Sto costruendo Interstellar per aiutare business e professionisti a trovare opportunità e trasformarle in contatti/appuntamenti in modo ordinato.`,
    "come funziona": "Funziona così: capiamo il tuo obiettivo, troviamo dove ci sono segnali reali di domanda, prepariamo messaggi e follow-up, poi organizziamo tutto in CRM."
  };

  const antiSpamScore = Math.max(
    0,
    100 -
      (variants.naturale.length > 900 ? 12 : 0) -
      (/garantito|soldi facili|risultati sicuri/i.test(variants.naturale) ? 35 : 0) -
      (context.length < 20 ? 18 : 0)
  );

  return {
    variants,
    objections,
    suggestedTone: prospect.temperature === "hot" ? "diretto consulenziale" : "naturale soft",
    objective,
    antiSpamScore
  };
}

function analyzeManualReply(reply = "", target = {}) {
  const text = String(reply || "").trim();
  const lower = text.toLowerCase();
  const hasPrice = /prezzo|costo|quanto|preventivo|tariffa|budget/.test(lower);
  const hasInfo = /info|informazioni|manda|mandami|dettagli|capire|spiega/.test(lower);
  const hasPositive = /interessa|ok|va bene|sentiamoci|call|telefono|quando|disponibile|sì|si /.test(lower);
  const hasObjection = /ci penso|non ora|troppo|non mi interessa|non posso|magari più avanti|gia|già/.test(lower);
  const hasUrgency = /subito|urgente|oggi|domani|questa settimana|asap|prima possibile/.test(lower);
  const appointmentReady = hasPositive || /appuntamento|riunione|meet|zoom|chiamata/.test(lower);
  const interestScore = Math.max(
    5,
    Math.min(100, 30 + (hasPositive ? 28 : 0) + (hasPrice ? 18 : 0) + (hasInfo ? 12 : 0) + (hasUrgency ? 18 : 0) - (hasObjection ? 18 : 0))
  );
  const label = appointmentReady ? "pronto per appuntamento" : hasPrice ? "richiesta prezzo" : hasInfo ? "richiesta informazioni" : hasObjection ? "obiezione" : "interesse da qualificare";
  const firstName = cleanFirstName(target.name || target.public_name);
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  const suggested =
    appointmentReady
      ? `${greeting} perfetto. Ti propongo una call veloce di 15/20 minuti: posso mostrarti cosa farei nel tuo caso e capire se ha senso procedere. Ti va bene domani mattina o preferisci pomeriggio?`
      : hasPrice
        ? `${greeting} certo. Il costo dipende da obiettivo, complessità e tempi. Per non spararti una cifra a caso, ti faccio prima 3 domande veloci e poi ti do una fascia realistica.`
        : hasInfo
          ? `${greeting} ti mando volentieri le info. Ti sintetizzo tutto in modo pratico: cosa possiamo fare, tempi indicativi e cosa mi serve da te per valutare bene.`
          : hasObjection
            ? `${greeting} ci sta, nessun problema. Ti lascio solo un punto pratico: se questa cosa oggi ti fa perdere tempo/clienti, anche una mini analisi può chiarire se vale la pena.`
            : `${greeting} grazie per la risposta. Per capire se posso aiutarti davvero, ti chiedo una cosa: qual è il risultato principale che vuoi ottenere nei prossimi 30 giorni?`;
  return {
    label,
    interestScore,
    urgency: hasUrgency ? "alta" : interestScore >= 65 ? "media" : "bassa",
    appointmentReady,
    nextAction: appointmentReady ? "proporre appuntamento" : hasObjection ? "follow-up leggero o archiviare" : "rispondere e qualificare",
    suggested
  };
}

function formatReplyAssistantOutput(lead, reply) {
  const analysis = analyzeManualReply(reply, lead || {});
  return `ANALISI RISPOSTA
Intent rilevato: ${analysis.label}
Interesse: ${analysis.interestScore}/100
Urgenza: ${analysis.urgency}
Prossima azione: ${analysis.nextAction}
Appuntamento: ${analysis.appointmentReady ? "consigliato" : "non ancora"}

RISPOSTA SUGGERITA
${analysis.suggested}

NOTA OPERATIVA
${analysis.appointmentReady ? "Se accetta, crea appuntamento dal CRM e poi conferma manualmente il link/call." : "Mantieni tono naturale. Non forzare vendita se l'interesse è basso."}`;
}

function normalizeRadarProspect(input = {}) {
  const platform = normalizeRadarSource(input.platform || input.piattaforma || input.source || input.source_type);
  const sourceType = String(input.source_type || input.tipo_fonte || platform).trim();
  const collectedAt = normalizeIsoDate(input.collected_at || input.data_raccolta) || new Date().toISOString();
  const lastInteraction =
    normalizeIsoDate(input.last_interaction || input.ultima_interazione || input.lastActivity || input.createdAt) ||
    collectedAt;
  const base = {
    lead_id: input.lead_id || input.id || uid("radar"),
    platform,
    source_type: sourceType,
    username_public: String(input.username_public || input.username || input.handle || "").trim(),
    public_name: String(input.public_name || input.name || input.nome_pubblico || "").trim(),
    business_name: String(input.business_name || input.company || input.nome_azienda || "").trim(),
    profile_link: String(input.profile_link || input.profile_url || input.url || "").trim(),
    website: String(input.website || input.sito || "").trim(),
    bio_public: String(input.bio_public || input.bio || input.description || "").trim(),
    email_business_public: String(input.email_business_public || input.business_email || input.email || "").trim(),
    phone_business_public: String(input.phone_business_public || input.business_phone || input.phone || "").trim(),
    contact_form_url: String(input.contact_form_url || input.form_url || "").trim(),
    city: String(input.city || input.citta || input.area || "").trim(),
    country: String(input.country || input.paese || "").trim(),
    estimated_language: String(input.estimated_language || input.language || input.lang || "it").trim(),
    source_url: String(input.source_url || input.sourceUrl || input.thread_url || input.post_url || "").trim(),
    source_page: String(input.source_page || input.page || input.pagina_fonte || "").trim(),
    source_item: String(input.source_item || input.post_video_thread || input.item || "").trim(),
    relevant_text: String(input.relevant_text || input.comment || input.text || input.note || "").trim(),
    keyword_match: String(input.keyword_match || input.keywords || "").trim(),
    hashtag_match: String(input.hashtag_match || input.hashtags || "").trim(),
    detected_intent: String(input.detected_intent || input.intent || "").trim(),
    interactions_detected: Number(input.interactions_detected || input.interactions || input.likeCount || 0),
    last_interaction: lastInteraction,
    provider_source: String(input.provider_source || input.provider || "Import manuale").trim(),
    source_reliability: Number(input.source_reliability || input.reliability || 60),
    contact_state: String(input.contact_state || input.status || "new").trim(),
    internal_notes: String(input.internal_notes || input.notes || "").trim(),
    collected_at: collectedAt,
    updated_at: input.updated_at || collectedAt
  };
  const capability = getRadarCapability(base);
  const scored = scoreRadarProspect({ ...base, ...capability }, {});
  const prospect = {
    ...base,
    ...capability,
    ...scored
  };
  prospect.suggested_message = String(input.suggested_message || input.message || buildRadarMessage(prospect)).trim();
  return prospect;
}

function radarProspectFromLead(lead) {
  const source = normalizeRadarSource(lead.platform || lead.source);
  return normalizeRadarProspect({
    id: `lead_${lead.id}`,
    platform: source,
    source_type: radarSocialPlatforms.has(source) ? "social_public_signal" : "CRM/Import",
    username: lead.username || lead.name,
    public_name: lead.name,
    business_name: lead.company,
    profile_url: lead.url || lead.contact,
    website: lead.url,
    bio: lead.bio || lead.note,
    business_email: lead.email,
    business_phone: lead.phone,
    city: lead.city,
    country: lead.country,
    language: lead.language,
    source_url: lead.url || lead.contact,
    source_page: lead.origin,
    relevant_text: lead.bio || lead.note || lead.interests,
    keywords: lead.interests || lead.target,
    interactions: lead.engagement,
    last_interaction: lead.lastActivity || lead.createdAt,
    provider: "Lead Finder",
    reliability: 62,
    status: lead.status
  });
}

function allRadarProspects() {
  const merged = [...(workspace.radarProspects || []), ...workspace.leads.map(radarProspectFromLead)];
  const known = new Set();
  return merged
    .filter((prospect) => !radarIsSellerOrAdNoise(prospect))
    .filter((prospect) => !radarIsSourceOnly(prospect))
    .filter((prospect) => {
      const key = [
        prospect.platform,
        prospect.username_public,
        prospect.business_name,
        prospect.source_url,
        prospect.relevant_text.slice(0, 60)
      ]
        .join("|")
        .toLowerCase();
      if (known.has(key)) return false;
      known.add(key);
      return true;
    });
}

function getRadarProspectById(id = selectedRadarId) {
  return allRadarProspects().find((prospect) => prospect.lead_id === id) || null;
}

function ensureLeadFromRadarProspect(prospect) {
  if (!prospect) return null;
  const existing = workspace.leads.find(
    (lead) =>
      lead.sourceRadarId === prospect.lead_id ||
      (prospect.source_url && lead.url === prospect.source_url) ||
      (prospect.email_business_public && lead.email === prospect.email_business_public)
  );
  if (existing) return existing;
  const lead = normalizeLead({
    company: prospect.business_name || prospect.public_name || prospect.username_public || "Prospect Radar",
    name: prospect.public_name || prospect.username_public || prospect.business_name || "",
    username: prospect.username_public || prospect.public_name || prospect.business_name || "",
    platform: prospect.platform,
    source: `Radar 360 · ${prospect.platform}`,
    city: prospect.city,
    country: prospect.country,
    language: prospect.estimated_language,
    target: workspace.radar.lastSearch?.niche || "Servizi digitali",
    offer: "Sito web, app, bot o automazioni AI",
    email: prospect.email_business_public,
    phone: prospect.phone_business_public,
    url: prospect.profile_link || prospect.website || prospect.source_url,
    score: prospect.score_ai,
    status: prospect.contact_state === "appointment_proposed" ? "interested" : prospect.contact_state === "contact_started" ? "contacted" : "qualified",
    note: `${prospect.score_reason || ""}\n\nSegnale: ${prospect.relevant_text || prospect.bio_public || ""}`.trim(),
    interests: prospect.keyword_match || prospect.detected_intent,
    activeDays: daysSince(prospect.last_interaction),
    origin: prospect.source_url || prospect.source_page || "Radar 360",
    sourceRadarId: prospect.lead_id,
    nextAction:
      prospect.temperature === "hot"
        ? "Contattare oggi o proporre appuntamento"
        : prospect.temperature === "warm"
          ? "Preparare messaggio personalizzato"
          : "Valutare manualmente"
  });
  workspace.leads.unshift(lead);
  selectedLeadId = lead.id;
  return lead;
}

function updateStoredRadarProspect(id, patch) {
  const index = workspace.radarProspects.findIndex((prospect) => prospect.lead_id === id);
  if (index >= 0) {
    workspace.radarProspects[index] = normalizeRadarProspect({
      ...workspace.radarProspects[index],
      ...patch,
      updated_at: new Date().toISOString()
    });
    return;
  }
  const leadId = id.startsWith("lead_") ? id.replace("lead_", "") : "";
  const lead = workspace.leads.find((item) => item.id === leadId);
  if (lead && patch.contact_state) {
    lead.status = patch.contact_state === "contact_started" ? "contacted" : lead.status;
    lead.updatedAt = new Date().toISOString();
  }
}

function radarModeProfile(config = {}) {
  const key = String(config.operationMode || workspace.radar.operationMode || workspace.credits.mode || "balanced").toLowerCase();
  return radarModeProfiles[key] || radarModeProfiles.balanced;
}

function radarNoiseDetected(prospect = {}) {
  const text = radarText(prospect);
  return /free money|guaranteed|100%|follow4follow|promo|spam|bot|casino|airdrop|pump/i.test(text);
}

function radarHasUsefulText(prospect = {}) {
  const text = radarText(prospect).replace(/\s+/g, " ").trim();
  return text.length >= 24 || Boolean(prospect.business_name || prospect.email_business_public || prospect.contact_form_url);
}

function radarHasBuyingSignal(prospect = {}, config = {}) {
  const text = radarText(prospect);
  const keywords = expandRadarKeywords(config);
  const intent = detectRadarIntent(text, config.intentPhrases);
  const hasQuestion = /\?|\bcome\b|\bquanto\b|\bcerco\b|\bserve\b|\bconsigli/i.test(text);
  const hasKeyword = keywords.some((keyword) => keyword && text.includes(keyword.toLowerCase()));
  const hasUrlFocus =
    config.monitorUrls?.length &&
    config.monitorUrls.some((url) => prospect.source_url.includes(url) || prospect.website.includes(url));
  return intent.strength >= 10 || hasQuestion || hasKeyword || hasUrlFocus || isBusinessEmail(prospect.email_business_public);
}

function radarSemanticFit(prospect = {}, config = {}) {
  const text = radarText(prospect);
  const keywords = expandRadarKeywords(config);
  const keywordHits = keywords.filter((keyword) => keyword && text.includes(keyword.toLowerCase())).length;
  const intent = detectRadarIntent(text, config.intentPhrases);
  const locationHit = Boolean((config.city && text.includes(config.city.toLowerCase())) || (config.country && text.includes(config.country.toLowerCase())));
  return keywordHits >= 1 || intent.strength >= 14 || locationHit || prospect.contact_mode === "automated_possible";
}

function radarAudienceFit(prospect = {}, config = {}) {
  if (radarIsSourceOnly(prospect)) return false;
  const text = radarText(prospect);
  const keywords = expandRadarKeywords(config);
  const sourceType = String(prospect.source_type || "").toLowerCase();
  const keywordHit = !keywords.length || keywords.some((keyword) => keyword && text.includes(keyword.toLowerCase()));
  const platformHit = !config.sources?.length || config.sources.includes(prospect.platform);
  const sourceHit =
    /comment|follower|profile|creator|business|directory|community|crm|youtube|tiktok|instagram|telegram|reddit|linkedin/i.test(sourceType) ||
    Boolean(prospect.profile_link || prospect.username_public || prospect.business_name || prospect.email_business_public);
  const urlHit =
    config.monitorUrls?.length &&
    config.monitorUrls.some((url) =>
      String(prospect.source_url || "").includes(url) ||
      String(prospect.website || "").includes(url) ||
      String(prospect.profile_link || "").includes(url)
    );
  return platformHit && (keywordHit || sourceHit || urlHit || isBusinessEmail(prospect.email_business_public));
}

function createRadarScoredProspect(prospect, config = {}) {
  const capability = getRadarCapability(prospect);
  const scored = scoreRadarProspect({ ...prospect, ...capability }, config);
  return {
    ...prospect,
    ...capability,
    ...scored,
    suggested_message: buildRadarMessage({ ...prospect, ...capability, ...scored })
  };
}

function estimateRadarCreditsFromFunnel(funnel = {}, config = {}) {
  const profile = radarModeProfile(config);
  const visibleLeads = Math.min(
    Number(config.requestedVisibleLeads || config.limit || funnel.finalLeads || 0),
    Number(funnel.finalLeads || 0)
  );
  const modeMultiplier = config.radarMode === "pool" ? 0.35 : 1;
  const total = visibleLeads ? Math.max(1, Math.ceil(visibleLeads * 0.08 * profile.creditMultiplier * modeMultiplier)) : 0;
  const phaseCredits = {
    reveal: total,
    pool: config.radarMode === "pool" ? total : 0,
    discovery: config.radarMode === "pool" ? 0 : total
  };
  return {
    mode: profile.label,
    total,
    phaseCredits,
    costPerFinalLead: funnel.finalLeads ? Number((total / funnel.finalLeads).toFixed(2)) : 0
  };
}

function buildRadarPipeline(config = getRadarConfig(), candidateIds) {
  const profile = radarModeProfile(config);
  const candidateSet = Array.isArray(candidateIds) ? new Set(candidateIds) : null;
  const sourceProspects = candidateSet ? allRadarProspects().filter((prospect) => candidateSet.has(prospect.lead_id)) : allRadarProspects();
  const raw = sourceProspects.map((prospect) => createRadarScoredProspect(prospect, config));
  const cleaned = raw.filter((prospect) => radarHasUsefulText(prospect) && !radarIsSellerOrAdNoise(prospect) && (!config.excludeBots || !radarNoiseDetected(prospect)));
  const preFiltered = cleaned.filter((prospect) => radarAudienceFit(prospect, config));
  const semantic = preFiltered.filter((prospect) => radarSemanticFit(prospect, config) || Number(prospect.total_score || prospect.score_ai || 0) >= 35);
  const aiBase = semantic.filter(
    (prospect) => prospect.score_ai >= Math.max(12, Number(config.minScore || 0) - 20) || Number(prospect.relevance_score || 0) >= 35
  );
  const requestedVisible = Number(config.requestedVisibleLeads || config.limit || 60);
  const advancedLimit = Math.max(requestedVisible, Math.ceil(requestedVisible * profile.advancedMultiplier));
  const aiAdvanced = [...aiBase]
    .sort((a, b) => b.score_ai - a.score_ai || Number(b.engagement_score || 0) - Number(a.engagement_score || 0))
    .slice(0, advancedLimit);

  const finalCandidates = aiAdvanced
    .filter((prospect) => passesRadarConfig(prospect, config, prospect))
    .map((prospect) => ({
      ...prospect,
      distribution_rank: radarDistributionRank(prospect, config),
      cooldown_until: workspace.radar.assignments?.[prospect.lead_id] || 0
    }))
    .sort((a, b) => {
      const aRecency = monthsSince(a.last_interaction || a.collected_at);
      const bRecency = monthsSince(b.last_interaction || b.collected_at);
      return b.distribution_rank - a.distribution_rank || b.score_ai - a.score_ai || aRecency - bRecency;
    })
    .slice(0, requestedVisible);

  const funnel = {
    rawCollected: raw.length,
    afterCleaning: cleaned.length,
    afterPreFilter: preFiltered.length,
    afterSemantic: semantic.length,
    afterAiBase: aiBase.length,
    afterAiAdvanced: aiAdvanced.length,
    finalLeads: finalCandidates.length,
    hot: finalCandidates.filter((prospect) => prospect.temperature === "hot").length,
    warm: finalCandidates.filter((prospect) => prospect.temperature === "warm").length,
    cold: finalCandidates.filter((prospect) => prospect.temperature === "cold").length,
    automatedPossible: finalCandidates.filter((prospect) => prospect.contact_mode === "automated_possible").length,
    manualAssist: finalCandidates.filter((prospect) => prospect.contact_mode === "manual_assist").length
  };

  const estimate = estimateRadarCreditsFromFunnel(funnel, config);
  return { results: finalCandidates, funnel, estimate };
}

function recordRadarSearchUsage(config, results, funnel, estimate) {
  const now = new Date().toISOString();
  const searchId = uid("radarsearch");
  const amount = Number(estimate.total || 0);
  if (amount > 0) {
    workspace.credits.balance = Math.max(0, Number(workspace.credits.balance || 0) - amount);
    workspace.credits.spent = Number(workspace.credits.spent || 0) + amount;
    workspace.creditsLedger.unshift({
      id: uid("credit"),
      type: "debit",
      amount,
      balance_after: workspace.credits.balance,
      reason: "radar_funnel_search",
      search_id: searchId,
      created_at: now
    });
  }
  workspace.radar.searches.unshift({
    id: searchId,
    created_at: now,
    query: config.niche,
    city: config.city,
    country: config.country,
    mode: estimate.mode,
    status: "completed",
    funnel,
    credits_spent: amount,
    cost_per_final_lead: estimate.costPerFinalLead,
    result_ids: results.map((prospect) => prospect.lead_id)
  });
  recordUsage("radar_search", "radar", funnel.rawCollected, amount, {
    final_leads: funnel.finalLeads,
    mode: estimate.mode,
    phaseCredits: estimate.phaseCredits
  });
  workspace.radar.searches = workspace.radar.searches.slice(0, 50);
  workspace.usageLogs = workspace.usageLogs.slice(0, 120);
  workspace.creditsLedger = workspace.creditsLedger.slice(0, 120);
  workspace.radar.lastFunnel = funnel;
  workspace.radar.lastCreditEstimate = estimate;
  workspace.radar.lastSearchId = searchId;
  workspace.opportunities = buildOpportunityClusters(results, config);
  return searchId;
}

function makeOpportunityCluster(id, title, prospects, actionToday, messageSeed = "") {
  const uniqueSources = [...new Set(prospects.map((prospect) => prospect.platform).filter(Boolean))];
  const hotCount = prospects.filter((prospect) => prospect.temperature === "hot").length;
  const automated = prospects.filter((prospect) => prospect.contact_mode === "automated_possible").length;
  const avgScore = prospects.length
    ? Math.round(prospects.reduce((sum, prospect) => sum + Number(prospect.score_ai || 0), 0) / prospects.length)
    : 0;
  const urgency = hotCount ? "alta" : avgScore >= 55 ? "media" : "bassa";
  const valueEstimate = prospects.reduce((sum, prospect) => {
    const base = prospect.temperature === "hot" ? 1400 : prospect.temperature === "warm" ? 650 : 220;
    return sum + base + (prospect.contact_mode === "automated_possible" ? 180 : 0);
  }, 0);
  const best = [...prospects].sort((a, b) => b.score_ai - a.score_ai)[0] || null;
  return {
    id,
    title,
    count: prospects.length,
    lead_ids: prospects.map((prospect) => prospect.lead_id),
    sources: uniqueSources,
    urgency,
    value_estimate: valueEstimate,
    avg_score: avgScore,
    automated,
    best_lead_id: best?.lead_id || "",
    action_today: actionToday,
    recommended_message:
      messageSeed ||
      (best
        ? buildConversationStarters(best, actionToday).variants.breve
        : "Lavora i lead migliori del cluster con un messaggio breve e contestuale."),
    created_at: new Date().toISOString()
  };
}

function buildOpportunityClusters(results = [], config = {}) {
  const pool = [...results].filter((prospect) => prospect.contact_state !== "archived");
  const clusters = [];
  const addCluster = (id, title, filter, action, messageSeed = "") => {
    const prospects = pool.filter(filter);
    if (prospects.length) clusters.push(makeOpportunityCluster(id, title, prospects, action, messageSeed));
  };

  addCluster(
    "price_requests",
    "Richieste prezzo",
    (prospect) => /prezzo|preventivo|costo|tariffa|pricing/i.test(`${prospect.detected_intent} ${prospect.relevant_text}`),
    "Rispondi con fascia di prezzo e proponi mini analisi"
  );
  addCluster(
    "service_search",
    "Ricerca servizio",
    (prospect) => /ricerca|cerco|mi serve|qualcuno|consigli/i.test(`${prospect.detected_intent} ${prospect.relevant_text}`),
    "Apri conversazione e fai una domanda sul bisogno"
  );
  addCluster(
    "urgent_problem",
    "Problema urgente",
    (prospect) => /urgenza|problema|non riesco|bloccato|aiuto|subito|asap/i.test(`${prospect.detected_intent} ${prospect.relevant_text}`),
    "Contatta oggi con tono diretto e orientato alla soluzione"
  );
  addCluster(
    "local_demand",
    "Domanda locale",
    (prospect) => Boolean(prospect.city || (config.city && radarText(prospect).includes(config.city.toLowerCase()))),
    "Personalizza il messaggio sulla città o zona"
  );
  addCluster(
    "business_contact",
    "Aziende con contatto business",
    (prospect) => prospect.contact_mode === "automated_possible" || isBusinessEmail(prospect.email_business_public),
    "Prepara email/form con conferma e log compliance"
  );
  addCluster(
    "appointment_ready",
    "Pronti per appuntamento",
    (prospect) => prospect.score_ai >= 70 || (prospect.intent_strength >= 22 && prospect.temperature !== "cold"),
    "Proponi call breve con 2 orari"
  );

  return clusters
    .sort((a, b) => b.value_estimate - a.value_estimate || b.count - a.count || b.avg_score - a.avg_score)
    .slice(0, 8);
}

function currentOpportunityClusters() {
  if (workspace.opportunities?.length) return workspace.opportunities;
  const prospects = getCurrentRadarResults();
  return buildOpportunityClusters(prospects, workspace.radar.lastSearch || {});
}

function passesRadarConfig(prospect, config, scored) {
  const sourceOk = !config.sources.length || config.sources.includes(prospect.platform);
  const languageOk = config.language === "any" || prospect.estimated_language === config.language || (config.language === "it" && prospectLooksItalian(prospect));
  const countryOk = !config.country || prospect.country === config.country || radarText(prospect).includes(config.country.toLowerCase()) || !prospect.country;
  const cityOk = !config.city || prospect.city === config.city || radarText(prospect).includes(config.city.toLowerCase()) || !prospect.city;
  const recencyOk = monthsSince(prospect.last_interaction || prospect.collected_at) <= config.recencyMonths;
  const botOk =
    !config.excludeBots ||
    !/free money|guaranteed|100%|follow4follow|promo|spam|bot|casino|airdrop|pump/i.test(radarText(prospect));
  const businessOk = !config.businessOnly || prospect.business_name || isBusinessEmail(prospect.email_business_public);
  const text = radarText(prospect);
  const keywords = expandRadarKeywords(config);
  const keywordOk = !keywords.length || keywords.some((keyword) => text.includes(keyword.toLowerCase()));
  const urlOk =
    !config.monitorUrls.length ||
    config.monitorUrls.some((url) => String(prospect.source_url || "").includes(url) || String(prospect.website || "").includes(url));
  const audienceOk = radarAudienceFit(prospect, config);
  return (
    sourceOk &&
    languageOk &&
    countryOk &&
    cityOk &&
    recencyOk &&
    botOk &&
    businessOk &&
    (keywordOk || urlOk || audienceOk) &&
    scored.score_ai >= config.minScore
  );
}

function radarDistributionRank(prospect, config = {}) {
  const now = Date.now();
  const assignments = workspace.radar.assignments || {};
  const cooldownUntil = Number(assignments[prospect.lead_id] || 0);
  const isCoolingDown = cooldownUntil > now;
  const seed = [
    config.workspaceSeed || "internal-alpha",
    config.niche || "",
    config.city || "",
    config.country || "",
    prospect.lead_id,
    prospect.platform
  ].join(":");
  const randomOffset = hashString(seed) % 31;
  const recencyDays = daysSince(prospect.last_interaction || prospect.collected_at);
  const recencyBoost = Math.max(0, 18 - Math.min(18, recencyDays / 2));
  const automationBalance = prospect.contact_mode === "automated_possible" ? 4 : 0;
  const cooldownPenalty = isCoolingDown ? 34 : 0;

  if (config.distributionMode === "score") {
    return prospect.score_ai + Math.round(randomOffset * 0.15) - cooldownPenalty;
  }

  if (config.distributionMode === "freshness") {
    return prospect.score_ai + Math.round(recencyBoost * 1.25) + randomOffset - cooldownPenalty;
  }

  return prospect.score_ai + randomOffset + Math.round(recencyBoost) + automationBalance - cooldownPenalty;
}

function executeRadarSearch(config = getRadarConfig(), candidateIds) {
  if (!canUsePlanFeature("radar_search", "#radarFeedback")) return;
  const now = Date.now();
  const pool = ensureRadarPool(config);
  syncRadarPoolCounts(pool.id);
  const requestedVisible = Number(config.requestedVisibleLeads || config.limit || 50);
  const selectionIds =
    Array.isArray(candidateIds) && candidateIds.length
      ? candidateIds.slice(0, requestedVisible)
      : selectRadarPoolLeadIds(pool, config, requestedVisible);
  const pipelineConfig = {
    ...config,
    limit: requestedVisible,
    requestedVisibleLeads: requestedVisible,
    radarMode: selectionIds.length >= requestedVisible ? "pool" : config.radarMode
  };
  const { results, funnel, estimate } = buildRadarPipeline(pipelineConfig, selectionIds);
  if (estimate.total > Number(workspace.credits.balance || 0)) {
    workspace.radar.lastFunnel = funnel;
    workspace.radar.lastCreditEstimate = estimate;
    saveWorkspace();
    renderAll();
    setFeedback(
      "#radarFeedback",
      `Ricerca bloccata: servono ${estimate.total} crediti ma il workspace ne ha ${workspace.credits.balance}.`
    );
    return;
  }

  workspace.radar.resultIds = results.map((prospect) => prospect.lead_id);
  workspace.radar.lastSearch = pipelineConfig;
  workspace.radar.activeTab = activeRadarTab;
  workspace.radar.operationMode = pipelineConfig.operationMode || "balanced";
  workspace.credits.mode = pipelineConfig.operationMode || workspace.credits.mode || "balanced";
  workspace.radar.assignments = {
    ...(workspace.radar.assignments || {}),
    ...Object.fromEntries(results.map((prospect) => [prospect.lead_id, now + pipelineConfig.cooldownHours * 60 * 60 * 1000]))
  };
  const searchId = recordRadarSearchUsage(pipelineConfig, results, funnel, estimate);
  registerRadarReveals(pool, results, pipelineConfig, searchId);
  syncRadarPoolCounts(pool.id);
  selectedRadarId = results[0]?.lead_id || selectedRadarId;
  saveWorkspace();
  renderAll();
  setFeedback(
    "#radarFeedback",
    results.length
      ? `${results.length} prospect rivelati per questa audience. Crediti usati: ${estimate.total}.`
      : `Nessun prospect rivelabile con questi filtri. Allarga nicchia/fonti o avvia discovery live per alimentare la pool.`
  );
}

function radarBelongsToTab(prospect, tab) {
  if (tab === "hot") return prospect.temperature === "hot";
  if (tab === "warm") return prospect.temperature === "warm";
  if (tab === "cold") return prospect.temperature === "cold";
  if (tab === "social") return radarSocialPlatforms.has(prospect.platform);
  if (tab === "web") return radarSourceAliases.web.includes(prospect.platform);
  if (tab === "forum") return radarSourceAliases.forum.includes(prospect.platform) || /forum|thread/i.test(prospect.source_type);
  if (tab === "commenters") return /comment/i.test(prospect.source_type);
  if (tab === "followers") return /follower/i.test(prospect.source_type);
  if (tab === "local") return Boolean(prospect.city) || radarSourceAliases.local.includes(prospect.platform);
  if (tab === "automated") return prospect.contact_mode === "automated_possible";
  if (tab === "manual") return prospect.contact_mode === "manual_assist";
  return true;
}

function getCurrentRadarResults() {
  const ids = workspace.radar.resultIds || [];
  const pool = ids.length ? ids.map((id) => getRadarProspectById(id)).filter(Boolean) : allRadarProspects();
  const config = workspace.radar.lastSearch || {};
  return pool
    .map((prospect) => {
      const capability = getRadarCapability(prospect);
      const scored = scoreRadarProspect({ ...prospect, ...capability }, config);
      return {
        ...prospect,
        ...capability,
        ...scored,
        suggested_message: buildRadarMessage({ ...prospect, ...capability, ...scored })
      };
    })
    .filter((prospect) => radarBelongsToTab(prospect, activeRadarTab));
}

function filteredRadarProspects() {
  const search = document.querySelector("#radarSearch")?.value?.toLowerCase().trim() ?? "";
  const source = document.querySelector("#radarSourceFilter")?.value ?? "all";
  const contactMode = document.querySelector("#radarContactModeFilter")?.value ?? "all";
  const sort = document.querySelector("#radarSort")?.value ?? "score";
  const prospects = getCurrentRadarResults().filter((prospect) => {
    const sourceOk = source === "all" || prospect.platform === source;
    const modeOk = contactMode === "all" || prospect.contact_mode === contactMode;
    const searchOk = !search || radarText(prospect).includes(search);
    return sourceOk && modeOk && searchOk;
  });

  return prospects.sort((a, b) => {
    if (sort === "recency") return monthsSince(a.last_interaction) - monthsSince(b.last_interaction);
    if (sort === "intent") return Number(b.intent_strength || 0) - Number(a.intent_strength || 0);
    if (sort === "automation") return Number(b.auto_send_allowed) - Number(a.auto_send_allowed) || b.score_ai - a.score_ai;
    return b.score_ai - a.score_ai;
  });
}

function syncRadarSourceFilter() {
  const select = document.querySelector("#radarSourceFilter");
  if (!select) return;
  const current = select.value || "all";
  const visiblePool = (workspace.radar.resultIds || []).map((id) => getRadarProspectById(id)).filter(Boolean);
  const countPool = visiblePool.length ? visiblePool : allRadarProspects();
  const counts = countPool.reduce((map, prospect) => {
    if (!prospect.platform) return map;
    map.set(prospect.platform, (map.get(prospect.platform) || 0) + 1);
    return map;
  }, new Map());
  const configured = Array.isArray(workspace.radar.lastSearch?.sources) ? workspace.radar.lastSearch.sources : getQuickRadarSources();
  const discovered = allRadarProspects().map((prospect) => prospect.platform).filter(Boolean);
  const sources = [...new Set([...allRadarSourceValues, ...configured, ...discovered].filter(Boolean))];
  select.innerHTML = `<option value="all">Tutte fonti</option>${sources
    .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)} (${counts.get(source) || 0} rivelati)</option>`)
    .join("")}`;
  select.value = sources.includes(current) ? current : "all";
}

function radarEmptyGuideMarkup() {
  const selectedSource = document.querySelector("#radarSourceFilter")?.value ?? "all";
  const selectedMode = document.querySelector("#radarContactModeFilter")?.value ?? "all";
  const hasRun = Boolean(
    workspace.radar.lastSearch?.createdAt ||
      workspace.radar.lastRunAt ||
      workspace.radar.resultIds?.length ||
      workspace.radar.lastProviderStatus?.length
  );
  const sourceNote =
    selectedSource !== "all"
      ? `<p><b>${escapeHtml(selectedSource)}</b> è attiva, ma ora ha 0 prospect rivelabili con questi filtri. Il Radar conserva le fonti utili e scarta contenuti venditori, profili deboli e dati fuori target.</p>`
      : "";
  const modeNote =
    selectedMode !== "all"
      ? `<p>Il filtro contatto è su <b>${selectedMode === "manual_assist" ? "Manual assist" : "Automated possible"}</b>. Passa a <b>Tutti contatti</b> se vuoi vedere anche gli altri canali.</p>`
      : "";
  return `<div class="radar-empty-guide">
    <strong>${hasRun ? "0 prospect rivelabili in questa vista" : "Nessuna audience ancora"}</strong>
    ${sourceNote}
    ${modeNote}
    <p>Il Radar non cerca “clienti pronti”: crea una pool di utenti, pagine e audience compatibili con la nicchia, poi rivela solo i prospect richiesti.</p>
    <ol>
      <li>Scrivi la nicchia o audience che vuoi raggiungere.</li>
      <li>Scegli dove cercare: Instagram, YouTube, TikTok, forum, web o fonti specifiche.</li>
      <li>Premi <b>Avvia Radar</b>: se la pool è vuota, la piattaforma scopre fonti e la alimenta.</li>
    </ol>
  </div>`;
}

function providerVisibleCount(providerName = "", prospects = []) {
  if (/youtube/i.test(providerName)) return prospects.filter((prospect) => prospect.platform === "YouTube").length;
  if (/apify/i.test(providerName)) return prospects.filter((prospect) => /apify/i.test(prospect.provider_source || "")).length;
  if (/serper/i.test(providerName)) return prospects.filter((prospect) => /serper/i.test(prospect.provider_source || "")).length;
  if (/wordpress/i.test(providerName)) return prospects.filter((prospect) => /wordpress/i.test(prospect.provider_source || "")).length;
  if (/reddit/i.test(providerName)) return prospects.filter((prospect) => prospect.platform === "Reddit").length;
  return 0;
}

function providerDisplayName(name = "") {
  if (/youtube/i.test(name)) return "YouTube";
  if (/apify/i.test(name)) return "Apify social";
  if (/serper/i.test(name)) return "Google/Serper";
  if (/open web/i.test(name)) return "Web IT";
  return name;
}

function renderRadarStats() {
  const stats = document.querySelector("#radarStats");
  const count = document.querySelector("#radarProspectCount");
  const revealedCount = workspace.radar.resultIds?.length || 0;
  if (count) count.textContent = `${revealedCount} rivelati`;
  if (!stats) return;
  const all = allRadarProspects();
  const results = (workspace.radar.resultIds || []).map((id) => getRadarProspectById(id)).filter(Boolean);
  const base = results.length ? results : all;
  const saved = workspace.radar.savedLeadIds?.length || 0;
  const avg = base.length ? Math.round(base.reduce((sum, prospect) => sum + Number(prospect.score_ai || 0), 0) / base.length) : 0;
  const funnel = workspace.radar.lastFunnel || {};
  const estimate = workspace.radar.lastCreditEstimate || {};
  const providerStatus = workspace.radar.lastProviderStatus || [];
  const requested = Number(workspace.radar.lastSearch?.requestedVisibleLeads || workspace.radar.lastSearch?.limit || 0);
  const userCards = [
    ["Lead richiesti", requested || "-"],
    ["Lead rivelati", results.length],
    ["Crediti usati", estimate.total ?? 0],
    ["Score medio", avg],
    ["Salvati CRM", saved],
    ["Modalità", radarModeLabel(workspace.radar.lastSearch?.radarMode || "auto")]
  ];
  const adminCards = [
    ["Pool totali", workspace.radar.leadPools?.length || 0],
    ["Lead database", all.length],
    ["Fonti", workspace.radar.leadSources?.length || 0],
    ["Raw interno", funnel.rawCollected ?? 0],
    ["Pool membri", workspace.radar.leadPoolMembers?.length || 0],
    ["Reveal log", workspace.radar.leadReveals?.length || 0],
    ["Crediti rimasti", workspace.credits.balance ?? 0],
    ["Costo ricerca", estimate.total ?? 0]
  ];
  const statCards = (activeRadarView === "admin" ? adminCards : userCards)
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
  const providerStrip = activeRadarView === "admin" && providerStatus.length
    ? `
      <div class="radar-provider-strip">
        ${providerStatus
          .map((provider) => {
            const raw = Number(provider.count || 0);
            const finalCount = providerVisibleCount(provider.name, base);
            const state = raw && !finalCount ? "filtered" : raw ? "ok" : "empty";
            const label = raw && !finalCount ? `${raw} trovati · 0 finali` : `${raw} trovati · ${finalCount} finali`;
            return `<span class="${state}"><b>${escapeHtml(providerDisplayName(provider.name))}</b>${escapeHtml(label)}</span>`;
          })
          .join("")}
      </div>
    `
    : "";
  stats.innerHTML = `${statCards}${providerStrip}`;
}

function radarModeLabel(mode = "auto") {
  const labels = {
    auto: "Auto Radar",
    source: "Fonte specifica",
    competitor: "Competitor",
    pool: "Pool Search"
  };
  return labels[mode] || "Auto Radar";
}

function radarTagsMarkup(prospect = {}) {
  const tags = prospect.tags?.length ? prospect.tags : radarAudienceTags(prospect, workspace.radar.lastSearch || {});
  if (!tags.length) return "";
  return `<div class="radar-tag-row">${tags
    .slice(0, 5)
    .map((tag) => `<span>${escapeHtml(tag)}</span>`)
    .join("")}</div>`;
}

function radarRowsMarkup(results = []) {
  if (!results.length) return radarEmptyGuideMarkup();
  return results
    .map((prospect) => {
      const profileLink = prospect.profile_link || prospect.source_url || prospect.website;
      const scoreLabel = prospect.temperature === "hot" ? "top fit" : prospect.temperature === "warm" ? "buono" : "da nutrire";
      return `
        <div class="radar-row ${prospect.lead_id === selectedRadarId ? "selected" : ""}" data-radar-id="${prospect.lead_id}">
          <div class="radar-row-main">
            <div class="radar-row-kicker">
              <span>${escapeHtml(radarSignalTypeLabel(prospect))}</span>
              <span>${escapeHtml(prospect.platform)}</span>
              <span>${escapeHtml(prospect.audience_segment || prospect.detected_intent || "audience")}</span>
            </div>
            <strong>${escapeHtml(prospect.business_name || prospect.public_name || prospect.username_public || "Prospect pubblico")}</strong>
            <p>${escapeHtml(prospect.city || prospect.country || "area n/d")} · ${escapeHtml(prospect.source_page || prospect.provider_source || "fonte pubblica")}</p>
            <p>${escapeHtml(prospect.relevant_text || prospect.bio_public || "Profilo pubblico compatibile con la nicchia.")}</p>
            ${radarTagsMarkup(prospect)}
          </div>
          <span class="lead-score ${prospect.temperature}">${prospect.score_ai}<small>${escapeHtml(scoreLabel)}</small></span>
          <div class="radar-row-meta">
            <span class="mode-pill ${prospect.contact_mode}">${prospect.contact_mode === "manual_assist" ? "Manuale" : "Business"}</span>
            <span>${daysSince(prospect.last_interaction) >= 999 ? "data n/d" : `${daysSince(prospect.last_interaction)}g fa`}</span>
            <span>${escapeHtml(prospect.source_reliability || 60)}% fonte</span>
          </div>
          <div class="lead-actions">
            <button type="button" data-radar-select="${prospect.lead_id}">Dettagli</button>
            <button type="button" data-radar-save="${prospect.lead_id}">Salva CRM</button>
            <button type="button" data-radar-enrich="${prospect.lead_id}">Arricchisci</button>
            <button type="button" class="ghost-button" data-radar-hide="${prospect.lead_id}">Nascondi</button>
            ${profileLink ? `<a href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">Apri</a>` : ""}
          </div>
        </div>
      `;
    })
    .join("");
}

function renderRadarPoolsView() {
  const pools = [...(workspace.radar.leadPools || [])].sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0));
  if (!pools.length) return `<div class="radar-empty-guide"><strong>Nessuna pool ancora</strong><p>Avvia Auto Radar o importa una fonte: la piattaforma creerà una pool per nicchia, piattaforma e paese.</p></div>`;
  return pools
    .map(
      (pool) => `
        <div class="radar-row">
          <div class="radar-row-main">
            <div class="radar-row-kicker">
              <span>${escapeHtml(pool.platform || "Multi")}</span>
              <span>${escapeHtml(pool.country || "Global")}</span>
              <span>${escapeHtml(pool.source_type || "mix")}</span>
            </div>
            <strong>${escapeHtml(pool.name)}</strong>
            <p>Segmento: ${escapeHtml(pool.niche || "audience")} · lingua ${escapeHtml(pool.language || "any")} · stato ${escapeHtml(pool.status || "active")}</p>
          </div>
          <div class="radar-row-meta">
            <span>${pool.available_leads_count || 0} disponibili</span>
            <span>${pool.revealed_leads_count || 0} rivelati</span>
            <span>${pool.last_scraped_at ? formatDate(pool.last_scraped_at) : "mai aggiornata"}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderRadarSourcesView() {
  const sources = [...(workspace.radar.leadSources || [])].slice(0, 120);
  if (!sources.length) return `<div class="radar-empty-guide"><strong>Nessuna fonte salvata</strong><p>Serper scopre pagine, creator, canali e community. Apify estrae audience pubbliche da quelle fonti quando configurato.</p></div>`;
  return sources
    .map(
      (source) => `
        <div class="radar-row">
          <div class="radar-row-main">
            <div class="radar-row-kicker">
              <span>${escapeHtml(source.platform || "Fonte")}</span>
              <span>${escapeHtml(source.source_type || "source")}</span>
              <span>${escapeHtml(source.status || "ready")}</span>
            </div>
            <strong>${escapeHtml(source.source_value || source.source_url || "Fonte pubblica")}</strong>
            <p>${escapeHtml(source.niche || "audience")} · ${escapeHtml(source.country || "Global")} · score fonte ${Number(source.source_score || 0)}</p>
          </div>
          <div class="lead-actions">
            ${source.source_url ? `<a href="${escapeHtml(source.source_url)}" target="_blank" rel="noopener">Apri fonte</a>` : ""}
          </div>
        </div>
      `
    )
    .join("");
}

function renderRadarSavedView() {
  const savedIds = new Set(workspace.radar.savedLeadIds || []);
  const saved = allRadarProspects().filter((prospect) => savedIds.has(prospect.lead_id));
  return saved.length
    ? radarRowsMarkup(saved.map((prospect) => createRadarScoredProspect(prospect, workspace.radar.lastSearch || {})))
    : `<div class="radar-empty-guide"><strong>Nessun lead salvato</strong><p>Quando un prospect ti interessa, premi “Salva CRM”. Qui vedrai solo quelli scelti da te.</p></div>`;
}

function renderRadarHistoryView() {
  const searches = workspace.radar.searches || [];
  if (!searches.length) return `<div class="radar-empty-guide"><strong>Nessuna ricerca nello storico</strong><p>Le prossime run del Radar finiranno qui con lead rivelati, crediti e stato.</p></div>`;
  return searches
    .slice(0, 80)
    .map(
      (search) => `
        <div class="radar-row">
          <div class="radar-row-main">
            <div class="radar-row-kicker">
              <span>${escapeHtml(search.status || "completed")}</span>
              <span>${escapeHtml(search.mode || "Radar")}</span>
              <span>${formatDate(search.created_at)}</span>
            </div>
            <strong>${escapeHtml(search.query || "Audience search")}</strong>
            <p>${escapeHtml(search.country || "Global")} ${search.city ? `· ${escapeHtml(search.city)}` : ""}</p>
          </div>
          <div class="radar-row-meta">
            <span>${search.result_ids?.length || 0} rivelati</span>
            <span>${search.credits_spent || 0} crediti</span>
          </div>
        </div>
      `
    )
    .join("");
}

function renderRadarAdminView() {
  const backend = workspace.radar.backend || {};
  return `
    <div class="radar-empty-guide">
      <strong>Admin Radar</strong>
      <p>Vista interna: pool, overfetch, provider, costi e qualità fonti. Questi dati non sono mostrati all'utente finale.</p>
      <p>Backend DB: ${backend.db_enabled ? "attivo" : "non configurato"}${backend.pool_first ? " · ultima ricerca servita dalla pool" : ""}${backend.database_error ? ` · errore: ${escapeHtml(backend.database_error)}` : ""}</p>
    </div>
    ${renderRadarPoolsView()}
  `;
}

function renderRadarMatrix() {
  const matrix = document.querySelector("#radarMatrix");
  if (!matrix) return;
  matrix.innerHTML = `
    <div class="panel-head compact-head">
      <div>
        <span>Contact capability</span>
        <h2>Matrice canali</h2>
      </div>
    </div>
    <div class="radar-matrix-grid">
      ${radarCapabilityRows
        .map(
          ([platform, mode, allowed, actions]) => `
            <div class="radar-matrix-row">
              <strong>${escapeHtml(platform)}</strong>
              <span>${mode === "manual_assist" ? "Manuale assistito" : "Automatizzabile"}</span>
              <em class="${allowed ? "ok" : ""}">${allowed ? "con controlli" : "no auto DM"}</em>
              <small>${escapeHtml(actions)}</small>
            </div>
          `
        )
        .join("")}
    </div>
  `;
}

function renderRadarSafetyPanel() {
  const panel = document.querySelector("#radarSafetyPanel");
  if (!panel) return;
  const funnel = workspace.radar.lastFunnel;
  const estimate = workspace.radar.lastCreditEstimate;
  const opportunities = currentOpportunityClusters().slice(0, 4);
  panel.innerHTML = `
    <div class="panel-head compact-head">
      <div>
        <span>Automation safety</span>
        <h2>Controlli prima dell'invio</h2>
      </div>
    </div>
    <div class="safety-check-grid">
      ${[
        "source_url obbligatoria",
        "contatto pubblico/business",
        "canale consentito",
        "no doppio contatto recente",
        "limite giornaliero",
        "messaggio personalizzato",
        "opt-out presente",
        "log compliance"
      ]
        .map((item) => `<span>${escapeHtml(item)}</span>`)
        .join("")}
    </div>
    ${activeRadarView === "admin" && funnel ? `
      <div class="radar-funnel-summary">
        <strong>Imbuto ultima ricerca</strong>
        ${Object.entries(radarPhaseLabels)
          .map(([key, label]) => `<span><b>${escapeHtml(label)}</b><em>${funnel[key] ?? 0}</em></span>`)
          .join("")}
        <p>Crediti: ${estimate?.total ?? 0} · costo/lead: ${estimate?.costPerFinalLead ?? 0} · modo: ${escapeHtml(estimate?.mode || "Balanced")}</p>
      </div>
    ` : ""}
    ${activeRadarView === "admin" && opportunities.length ? `
      <div class="radar-funnel-summary">
        <strong>Opportunity Radar</strong>
        ${opportunities
          .map(
            (cluster) => `
              <span><b>${escapeHtml(cluster.title)}</b><em>${cluster.count} · ${escapeHtml(cluster.urgency)}</em></span>
            `
          )
          .join("")}
        <p>${escapeHtml(opportunities[0].action_today)} · valore stimato ${formatMetric(opportunities[0].value_estimate)}.</p>
      </div>
    ` : ""}
  `;
}

function buildRadarCrmNote(prospect = {}) {
  const tags = prospect.tags?.length ? prospect.tags : radarAudienceTags(prospect, workspace.radar.lastSearch || {});
  return [
    `Prospect audience: ${prospect.public_name || prospect.username_public || prospect.business_name || "profilo pubblico"}`,
    `Segmento: ${prospect.audience_segment || prospect.detected_intent || "audience compatibile"}`,
    `Fonte: ${prospect.platform || "n/d"} · ${prospect.source_page || prospect.source_url || "fonte pubblica"}`,
    `Perché interessa: ${prospect.score_reason || "compatibile con la nicchia cercata"}`,
    tags.length ? `Tag: ${tags.join(", ")}` : "",
    prospect.relevant_text ? `Testo/bio rilevante: ${prospect.relevant_text}` : ""
  ]
    .filter(Boolean)
    .join("\n");
}

function renderRadarDetail() {
  const detail = document.querySelector("#radarDetail");
  if (!detail) return;
  const prospect = getRadarProspectById();
  if (!prospect) {
    detail.innerHTML = `<div class="empty-state"><strong>Nessun prospect selezionato</strong><p>Importa segnali reali o lancia il radar.</p></div>`;
    return;
  }
  const profileLink = prospect.profile_link || prospect.source_url || prospect.website;
  detail.innerHTML = `
    <div class="detail-grid">
      <div><span>Nome</span><strong>${escapeHtml(prospect.public_name || prospect.username_public || prospect.business_name || "n/d")}</strong></div>
      <div><span>Fonte</span><strong>${escapeHtml(prospect.platform)} · ${escapeHtml(prospect.source_type)}</strong></div>
      <div><span>Fit audience</span><strong>${prospect.score_ai}/100 · ${escapeHtml(prospect.temperature === "hot" ? "top fit" : prospect.temperature === "warm" ? "buono" : "da nutrire")}</strong></div>
      <div><span>Segmento</span><strong>${escapeHtml(prospect.audience_segment || prospect.detected_intent || "n/d")}</strong></div>
      <div><span>Contatto futuro</span><strong>${prospect.contact_mode === "manual_assist" ? "Manuale assistito" : "Business contact"}</strong></div>
      <div><span>Stato</span><strong>${escapeHtml(prospect.contact_state || "new")}</strong></div>
      <div><span>Città</span><strong>${escapeHtml(prospect.city || "n/d")}</strong></div>
      <div><span>Ultimo segnale</span><strong>${daysSince(prospect.last_interaction) >= 999 ? "n/d" : `${daysSince(prospect.last_interaction)}g fa`}</strong></div>
    </div>
    <div class="detail-note">
      <span>Perché è interessante</span>
      <strong>${escapeHtml(prospect.score_reason)}</strong>
      <p>${escapeHtml(prospect.relevant_text || prospect.bio_public || "Nessun testo rilevante salvato.")}</p>
    </div>
    <div class="detail-grid compact-detail-grid">
      <div><span>Email business</span><strong>${escapeHtml(prospect.email_business_public || "n/d")}</strong></div>
      <div><span>Telefono business</span><strong>${escapeHtml(prospect.phone_business_public || "n/d")}</strong></div>
      <div><span>Source URL</span><strong>${profileLink ? `<a href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">Apri fonte</a>` : "n/d"}</strong></div>
      <div><span>Provider</span><strong>${escapeHtml(prospect.provider_source || "n/d")}</strong></div>
    </div>
    <div class="radar-message-preview">
      <span>Nota per CRM</span>
      <textarea readonly>${escapeHtml(buildRadarCrmNote(prospect))}</textarea>
      <div class="detail-actions">
        <button type="button" data-radar-save="${prospect.lead_id}">Salva CRM</button>
        <button type="button" class="ghost-button" data-radar-archive="${prospect.lead_id}">Archivia</button>
        <button type="button" data-copy-radar-message="${prospect.lead_id}">Copia nota</button>
      </div>
    </div>
  `;
}

function radarSignalTypeLabel(prospect = {}) {
  const sourceType = String(prospect.source_type || "").toLowerCase();
  if (/comment/.test(sourceType)) return "Commentatore attivo";
  if (/follower/.test(sourceType)) return "Follower disponibile";
  if (/profile|creator|channel|page/.test(sourceType)) return "Profilo / creator";
  if (/marketplace|buyer_request/.test(sourceType)) return "Segnale diretto";
  if (/business|contact|directory/.test(sourceType)) return "Contatto business";
  if (/forum|thread|q_and_a|community/.test(sourceType)) return "Community user";
  if (/audience/.test(sourceType)) return "Fonte da minare";
  return "Prospect pubblico";
}

function renderRadar() {
  const root = document.querySelector('[data-page="radar"]');
  if (!root) return;
  renderRadarPresetSummary();
  syncRadarSourceFilter();
  renderRadarStats();
  renderRadarMatrix();
  renderRadarSafetyPanel();
  document.querySelectorAll("[data-radar-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.radarTab === activeRadarTab);
  });
  document.querySelectorAll("[data-radar-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.radarView === activeRadarView);
  });

  const results = filteredRadarProspects();
  const list = document.querySelector("#radarResults");
  if (list) {
    if (activeRadarView === "pools") list.innerHTML = renderRadarPoolsView();
    else if (activeRadarView === "sources") list.innerHTML = renderRadarSourcesView();
    else if (activeRadarView === "saved") list.innerHTML = renderRadarSavedView();
    else if (activeRadarView === "history") list.innerHTML = renderRadarHistoryView();
    else if (activeRadarView === "admin") list.innerHTML = renderRadarAdminView();
    else list.innerHTML = radarRowsMarkup(results);
  }

  renderRadarDetail();
}

function getRadarSafetyFailures(prospect) {
  const failures = [];
  if (!prospect.source_url && !prospect.website) failures.push("manca source_url o sito tracciabile");
  if (!prospect.auto_send_allowed) failures.push("il canale non permette automazione");
  if (!isBusinessEmail(prospect.email_business_public) && !prospect.contact_form_url) {
    failures.push("non c'e email business pubblica o form contatto");
  }
  if (prospect.contact_state === "contacted" || prospect.contact_state === "contact_started") {
    failures.push("lead gia contattato o avviato");
  }
  if (!prospect.suggested_message || prospect.suggested_message.length < 80) failures.push("messaggio troppo generico");
  if (!/non vuoi|non ti ricontatto|opt-out|cancell/i.test(prospect.suggested_message)) failures.push("manca opt-out");
  return failures;
}

async function runRadarContact(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  selectedRadarId = prospect.lead_id;
  const message = prospect.suggested_message || buildRadarMessage(prospect);
  await copyText(message);
  const link = prospect.profile_link || prospect.contact_form_url || prospect.website || prospect.source_url;

  if (prospect.contact_mode === "manual_assist") {
    updateStoredRadarProspect(prospect.lead_id, { contact_state: "contact_started" });
    workspace.radar.contactLogs.push({
      id: uid("radarlog"),
      lead_id: prospect.lead_id,
      action: "manual_contact_started",
      channel: prospect.platform,
      source_url: prospect.source_url,
      message,
      created_at: new Date().toISOString()
    });
    scheduleFollowUpsForProspect(prospect);
    saveWorkspace();
    if (link) window.open(link, "_blank", "noopener");
    renderAll();
    setFeedback("#radarFeedback", "Messaggio copiato. Apri la piattaforma, invialo manualmente e lavora i follow-up già creati.");
    return;
  }

  const failures = getRadarSafetyFailures(prospect);
  if (failures.length) {
    updateStoredRadarProspect(prospect.lead_id, { contact_state: "manual_review" });
    saveWorkspace();
    if (link) window.open(link, "_blank", "noopener");
    renderAll();
    setFeedback("#radarFeedback", `Automazione bloccata: ${failures.join(", ")}. Messaggio copiato per contatto manuale.`);
    return;
  }

  const confirmed = window.confirm(`Anteprima messaggio per ${prospect.business_name || prospect.email_business_public}:\n\n${message}`);
  if (!confirmed) return;

  updateStoredRadarProspect(prospect.lead_id, { contact_state: "contact_started" });
  workspace.radar.contactLogs.push({
    id: uid("radarlog"),
    lead_id: prospect.lead_id,
    action: "automation_preview_confirmed",
    channel: prospect.email_business_public ? "email_business" : "contact_form",
    source_url: prospect.source_url || prospect.website,
    message,
    created_at: new Date().toISOString()
  });
  scheduleFollowUpsForProspect(prospect);
  saveWorkspace();

  if (isBusinessEmail(prospect.email_business_public)) {
    const subject = encodeURIComponent("Idea pratica per la vostra acquisizione clienti");
    const body = encodeURIComponent(message);
    window.open(`mailto:${encodeURIComponent(prospect.email_business_public)}?subject=${subject}&body=${body}`, "_blank", "noopener");
  } else if (link) {
    window.open(link, "_blank", "noopener");
  }
  renderAll();
  setFeedback("#radarFeedback", "Anteprima approvata, messaggio copiato e canale aperto. Invio reale solo tramite conferma/strumento esterno.");
}

function radarProspectLabel(prospect = {}) {
  return prospect.business_name || prospect.public_name || prospect.username_public || "Prospect";
}

function createTaskForProspect(prospect, type, title, dueAt) {
  const existing = workspace.tasks.find(
    (task) => task.lead_id === prospect.lead_id && task.type === type && task.status !== "done" && task.title === title
  );
  if (existing) return existing;
  const task = {
    id: uid("task"),
    lead_id: prospect.lead_id,
    type,
    title,
    status: "open",
    due_at: dueAt,
    created_at: new Date().toISOString()
  };
  workspace.tasks.unshift(task);
  workspace.tasks = workspace.tasks.slice(0, 200);
  return task;
}

function followUpScheduleForTemperature(temperature = "warm") {
  if (temperature === "hot") return [1, 2];
  if (temperature === "warm") return [3, 7];
  return [5];
}

function scheduleFollowUpsForProspect(prospect) {
  const schedule = followUpScheduleForTemperature(prospect.temperature);
  schedule.forEach((days, index) => {
    const due = new Date(Date.now() + days * 86400000).toISOString();
    createTaskForProspect(
      prospect,
      "follow_up",
      `${index + 1}/${schedule.length} follow-up ${radarProspectLabel(prospect)}`,
      due
    );
  });
  return schedule.length;
}

function postponeRadarProspect(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  const delayDays = prospect.temperature === "hot" ? 2 : prospect.temperature === "warm" ? 4 : 7;
  const due = new Date(Date.now() + delayDays * 86400000).toISOString();
  createTaskForProspect(prospect, "follow_up", `Follow-up ${radarProspectLabel(prospect)}`, due);
  updateStoredRadarProspect(prospect.lead_id, { contact_state: "followup_scheduled" });
  workspace.radar.contactLogs.push({
    id: uid("radarlog"),
    lead_id: prospect.lead_id,
    action: "followup_scheduled",
    channel: prospect.platform,
    source_url: prospect.source_url,
    message: `Follow-up programmato tra ${delayDays} giorni.`,
    created_at: new Date().toISOString()
  });
  saveWorkspace();
  renderAll();
  setFeedback("#radarFeedback", `Follow-up creato tra ${delayDays} giorni.`);
}

function leadAsTaskTarget(lead) {
  return {
    lead_id: lead.sourceRadarId || `lead_${lead.id}`,
    temperature: lead.score >= 80 ? "hot" : lead.score >= 58 ? "warm" : "cold",
    public_name: lead.name,
    business_name: lead.company,
    platform: lead.platform || lead.source,
    source_url: lead.url,
    contact_state: lead.status
  };
}

function scheduleLeadFollowups(leadId) {
  const lead = workspace.leads.find((item) => item.id === leadId);
  if (!lead) return 0;
  const target = leadAsTaskTarget(lead);
  const count = scheduleFollowUpsForProspect(target);
  lead.nextAction = "Follow-up programmato";
  lead.nextDue = workspace.tasks.find((task) => task.lead_id === target.lead_id && task.status !== "done")?.due_at || lead.nextDue;
  lead.updatedAt = new Date().toISOString();
  saveWorkspace();
  renderAll();
  return count;
}

function offerDeliverables(packageName = "") {
  const key = String(packageName || "").toLowerCase();
  if (key.includes("radar")) {
    return [
      "configurazione Radar 360 sulla nicchia del cliente",
      "pipeline CRM con stati e follow-up",
      "messaggi manual assist pronti per ogni fonte",
      "report iniziale con opportunità e priorità"
    ];
  }
  if (key.includes("bot") || key.includes("automazione")) {
    return [
      "mappatura del processo da automatizzare",
      "sviluppo bot o workflow su misura",
      "dashboard di controllo e log operativi",
      "test, consegna e mini formazione"
    ];
  }
  if (key.includes("app") || key.includes("gestionale")) {
    return [
      "analisi funzionale della piattaforma",
      "interfaccia web responsive",
      "database e gestione utenti",
      "rilascio MVP testabile e iterazioni"
    ];
  }
  return [
    "landing o sito premium orientato alla conversione",
    "modulo contatti e tracciamento richieste",
    "automazioni AI per risposte e follow-up",
    "mini CRM per non perdere opportunità"
  ];
}

function buildOfferMessage(lead, packageName, priceRange, goal) {
  const firstName = cleanFirstName(lead.name);
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao,";
  const deliverables = offerDeliverables(packageName);
  return `${greeting}

ti preparo una proposta concreta per ${lead.company}.

OBIETTIVO
${goal || lead.target || "Capire dove possiamo creare più clienti, ordine e automazioni utili."}

PACCHETTO CONSIGLIATO
${packageName}

COSA INCLUDE
${deliverables.map((item) => `- ${item}`).join("\n")}

FASCIA PREZZO
${priceRange}

COME PROCEDEREI
1. mini analisi della situazione attuale
2. definizione priorità e risultato desiderato
3. prototipo o setup iniziale
4. test, correzioni e consegna operativa

Se ha senso, facciamo prima una call veloce di 15/20 minuti così non ti mando una proposta generica.

${workspace.settings.signature}`;
}

function createOfferForLead(lead, packageName, priceRange, goal) {
  if (!lead) return null;
  if (!canUsePlanFeature("offer", "#settingsFeedback")) return null;
  const packageLabel = String(packageName || "Sito + automazioni AI");
  const priceLabel = String(priceRange || "Da definire dopo mini analisi");
  const goalLabel = String(goal || lead.target || "Generare piu clienti e gestire follow-up");
  const offer = {
    id: uid("offer"),
    lead_id: lead.id,
    source_radar_id: lead.sourceRadarId || "",
    title: `${packageLabel} per ${lead.company}`,
    package_name: packageLabel,
    price_range: priceLabel,
    goal: goalLabel,
    deliverables: offerDeliverables(packageLabel),
    status: "draft",
    message: buildOfferMessage(lead, packageLabel, priceLabel, goalLabel),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  workspace.offers.unshift(offer);
  workspace.offers = workspace.offers.slice(0, 120);
  recordUsage("offer", "campaigns", 1, 0, { lead_id: lead.id, package: packageLabel });
  lead.offer = packageLabel;
  lead.status = lead.status === "new" ? "qualified" : lead.status;
  lead.nextAction = "Inviare offerta o proporre call";
  lead.updatedAt = new Date().toISOString();
  saveWorkspace();
  renderAll();
  return offer;
}

function formatCampaignPlan(campaign) {
  const steps = campaign.plan?.length
    ? campaign.plan
    : [
        "prepara lista lead filtrata dal Radar",
        "genera messaggio personalizzato",
        "avvia contatto manuale o email con conferma",
        "programma follow-up e appuntamento"
      ];
  return `PIANO CAMPAGNA
Nome: ${campaign.name}
Obiettivo: ${campaign.goal}
Canale: ${campaign.channel}
Stato: ${campaign.status}

STEP OPERATIVI
${steps.map((step, index) => `${index + 1}. ${step}`).join("\n")}

NOTE
${campaign.offer_title ? `Collegata all'offerta: ${campaign.offer_title}` : "Campagna manuale: nessun invio automatico sui social."}`;
}

function createCampaignFromOffer(offerId) {
  if (!canUsePlanFeature("campaign", "#settingsFeedback")) return null;
  const offer = workspace.offers.find((item) => item.id === offerId);
  if (!offer) return null;
  const lead = workspace.leads.find((item) => item.id === offer.lead_id);
  const channel = lead?.email ? "Email con conferma" : /instagram|tiktok|linkedin|reddit|youtube/i.test(lead?.source || "") ? "Manual social assist" : "Contatto manuale";
  const campaign = {
    id: uid("campaign"),
    name: `${offer.package_name} · ${lead?.company || "Lead"}`,
    goal: offer.goal || "Portare il lead a una call",
    channel,
    status: "Bozza pronta",
    sent: 0,
    lead_id: offer.lead_id,
    offer_id: offer.id,
    offer_title: offer.title,
    plan: [
      "copia offerta e messaggio personalizzato",
      channel === "Email con conferma" ? "apri mailto e invia solo dopo revisione" : "apri piattaforma e invia manualmente",
      "segna risposta nel Reply Assistant",
      "se interessato, crea appuntamento e follow-up"
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  workspace.campaigns.unshift(campaign);
  recordUsage("campaign", "campaigns", 1, 0, { offer_id: offer.id, lead_id: offer.lead_id });
  offer.status = "linked_campaign";
  offer.updated_at = new Date().toISOString();
  if (lead) {
    lead.nextAction = "Eseguire campagna collegata all'offerta";
    lead.updatedAt = new Date().toISOString();
  }
  saveWorkspace();
  renderAll();
  return campaign;
}

function nextAppointmentSlot(days = 1) {
  const scheduledAt = new Date(Date.now() + days * 86400000);
  scheduledAt.setHours(10, 0, 0, 0);
  return scheduledAt;
}

function appointmentConfirmationMessage(appointment) {
  return `Perfetto, ti propongo questa call:

${appointment.title}
Quando: ${formatDate(appointment.scheduled_at)}
Durata: ${appointment.duration_minutes || 30} minuti

Ti confermo io il link appena fissiamo l'orario definitivo.`;
}

function buildGoogleCalendarUrl(appointment) {
  const start = new Date(appointment.scheduled_at);
  const end = new Date(start.getTime() + (appointment.duration_minutes || 30) * 60000);
  const format = (date) => date.toISOString().replaceAll("-", "").replaceAll(":", "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: appointment.title,
    dates: `${format(start)}/${format(end)}`,
    details: appointment.confirmation_message || appointmentConfirmationMessage(appointment)
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function createAppointmentFromLead(leadId) {
  const lead = workspace.leads.find((item) => item.id === leadId);
  if (!lead) return null;
  if (!canUsePlanFeature("appointment", "#settingsFeedback")) return null;
  const scheduledAt = nextAppointmentSlot(1);
  const appointment = {
    id: uid("appointment"),
    lead_id: lead.sourceRadarId || `lead_${lead.id}`,
    crm_lead_id: lead.id,
    title: `Call con ${lead.company}`,
    status: "proposed",
    scheduled_at: scheduledAt.toISOString(),
    duration_minutes: 30,
    meeting_url: "",
    calendar_url: "",
    value_estimate: lead.score >= 80 ? 1500 : 600,
    created_at: new Date().toISOString()
  };
  appointment.confirmation_message = appointmentConfirmationMessage(appointment);
  workspace.appointments.unshift(appointment);
  recordUsage("appointment", "automations", 1, 0, { lead_id: lead.id });
  lead.status = "interested";
  lead.nextAction = "Confermare appuntamento";
  lead.nextDue = appointment.scheduled_at;
  lead.updatedAt = new Date().toISOString();
  saveWorkspace();
  renderAll();
  return appointment;
}

function archiveRadarProspect(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  updateStoredRadarProspect(prospect.lead_id, { contact_state: "archived" });
  workspace.radar.contactLogs.push({
    id: uid("radarlog"),
    lead_id: prospect.lead_id,
    action: "archived",
    channel: prospect.platform,
    source_url: prospect.source_url,
    message: "Prospect archiviato manualmente.",
    created_at: new Date().toISOString()
  });
  saveWorkspace();
  renderAll();
  setFeedback("#radarFeedback", "Prospect archiviato. Resta tracciato nei log, ma non viene lavorato ora.");
}

async function proposeRadarAppointment(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  if (!canUsePlanFeature("appointment", "#radarFeedback")) return;
  const suggestedAt = nextAppointmentSlot(prospect.temperature === "hot" ? 1 : 2);
  const appointment = {
    id: uid("appointment"),
    lead_id: prospect.lead_id,
    title: `Call con ${radarProspectLabel(prospect)}`,
    status: "proposed",
    scheduled_at: suggestedAt.toISOString(),
    duration_minutes: 30,
    meeting_url: "",
    calendar_url: "",
    value_estimate: prospect.temperature === "hot" ? 1500 : 600,
    created_at: new Date().toISOString()
  };
  appointment.confirmation_message = appointmentConfirmationMessage(appointment);
  workspace.appointments.unshift(appointment);
  recordUsage("appointment", "radar", 1, 0, { lead_id: prospect.lead_id });
  updateStoredRadarProspect(prospect.lead_id, { contact_state: "appointment_proposed" });
  const message = `Ciao${cleanFirstName(prospect.public_name) ? ` ${cleanFirstName(prospect.public_name)}` : ""}, ti propongo una call veloce di 30 minuti per capire meglio la situazione. Potrebbe andar bene domani alle 10:00 oppure preferisci un altro orario?`;
  await copyText(message);
  workspace.radar.contactLogs.push({
    id: uid("radarlog"),
    lead_id: prospect.lead_id,
    action: "appointment_proposed",
    channel: prospect.platform,
    source_url: prospect.source_url,
    message,
    created_at: new Date().toISOString()
  });
  saveWorkspace();
  renderAll();
  setFeedback("#radarFeedback", "Appuntamento proposto: messaggio copiato e task salvato nel motore.");
}

function openRadarProspectInContent(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  const lead = ensureLeadFromRadarProspect(prospect);
  if (!lead) return;
  const starter = formatConversationStarterOutput(prospect, "Professionale diretto", "aprire conversazione e proporre una mini call");
  lead.draft = starter;
  lead.updatedAt = new Date().toISOString();
  saveWorkspace();
  renderAll();
  const select = document.querySelector("#messageLeadSelect");
  const output = document.querySelector("#messageOutput");
  if (select) select.value = lead.id;
  if (output) output.value = starter;
  navigateTo("content");
}

function sendRadarProspectToCrm(prospectId) {
  const prospect = getRadarProspectById(prospectId);
  if (!prospect) return;
  const lead = ensureLeadFromRadarProspect(prospect);
  if (!lead) return;
  lead.status = lead.status === "new" ? "qualified" : lead.status;
  lead.updatedAt = new Date().toISOString();
  updateStoredRadarProspect(prospect.lead_id, { contact_state: "qualified" });
  saveWorkspace();
  renderAll();
  navigateTo("crm");
}

function importRadarSignalsFromText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => (row.includes("|") ? row.split("|").map((cell) => cell.trim()) : parseCsvLine(row)));
  if (!rows.length) return 0;

  const firstRow = rows[0].map((cell) => cell.toLowerCase());
  const hasHeader = firstRow.includes("platform") || firstRow.includes("source_type") || firstRow.includes("source_url");
  const headers = hasHeader ? firstRow : [];
  const dataRows = hasHeader ? rows.slice(1) : rows;
  const headerValue = (cells, names, fallbackIndex = -1) => {
    for (const name of names) {
      const index = headers.indexOf(name);
      if (index >= 0) return cells[index];
    }
    return fallbackIndex >= 0 ? cells[fallbackIndex] : "";
  };

  const prospects = dataRows
    .filter((cells) => cells.some(Boolean))
    .map((cells) => {
      if (cells.length === 1 && /^https?:\/\//i.test(cells[0])) {
        return normalizeRadarProspect({
          platform: "Website",
          source_type: "url_import",
          website: cells[0],
          source_url: cells[0],
          relevant_text: cells[0],
          provider: "URL import"
        });
      }
      if (!hasHeader && cells.length <= 6 && cells[2] && cells[3]) {
        const maybeEmail = cells.find((cell) => /@/.test(cell) && !/^@/.test(cell)) || "";
        return normalizeRadarProspect({
          platform: cells[0] || "Website",
          source_type: radarSocialPlatforms.has(normalizeRadarSource(cells[0])) ? "social_public_signal" : "manual_real_signal",
          username: /^@/.test(cells[1] || "") ? cells[1] : "",
          public_name: /^@/.test(cells[1] || "") ? "" : cells[1],
          business_name: radarSocialPlatforms.has(normalizeRadarSource(cells[0])) ? "" : cells[1],
          profile_url: cells[2],
          website: normalizeRadarSource(cells[0]) === "Website" ? cells[2] : "",
          source_url: cells[2],
          relevant_text: cells[3],
          city: cells[4],
          business_email: maybeEmail,
          country: "Italia",
          language: "it",
          intent: detectRadarIntent(String(cells[3] || "")).label,
          provider: "Import formato semplice",
          reliability: 68
        });
      }
      return normalizeRadarProspect({
        platform: headerValue(cells, ["platform", "piattaforma"], 0),
        source_type: headerValue(cells, ["source_type", "tipo_fonte"], 1),
        username: headerValue(cells, ["username", "username_public"], 2),
        public_name: headerValue(cells, ["public_name", "nome_pubblico"], 3),
        business_name: headerValue(cells, ["business_name", "company", "nome_azienda"], 4),
        profile_url: headerValue(cells, ["profile_url", "profile_link"], 5),
        website: headerValue(cells, ["website", "sito"], 6),
        bio: headerValue(cells, ["bio", "bio_public"], 7),
        business_email: headerValue(cells, ["business_email", "email_business_public", "email"], 8),
        business_phone: headerValue(cells, ["business_phone", "phone_business_public", "phone"], 9),
        city: headerValue(cells, ["city", "citta"], 10),
        country: headerValue(cells, ["country", "paese"], 11),
        language: headerValue(cells, ["language", "estimated_language", "lang"], 12),
        source_url: headerValue(cells, ["source_url"], 13),
        source_page: headerValue(cells, ["source_page", "pagina_fonte"], 14),
        source_item: headerValue(cells, ["source_item", "post_video_thread"], 15),
        relevant_text: headerValue(cells, ["relevant_text", "comment", "text"], 16),
        keywords: headerValue(cells, ["keywords", "keyword_match"], 17),
        hashtags: headerValue(cells, ["hashtags", "hashtag_match"], 18),
        intent: headerValue(cells, ["intent", "detected_intent"], 19),
        interactions: headerValue(cells, ["interactions", "interactions_detected"], 20),
        last_interaction: headerValue(cells, ["last_interaction", "ultima_interazione"], 21),
        provider: headerValue(cells, ["provider", "provider_source"], 22),
        reliability: headerValue(cells, ["reliability", "source_reliability"], 23)
      });
    });

  const fresh = addRadarProspects(prospects, getRadarConfig());
  return fresh.length;
}

function radarProspectIdentity(prospect = {}) {
  const username = String(prospect.username_public || prospect.username || "").toLowerCase().replace(/^@/, "").replace(/\/$/, "");
  const profile = String(prospect.profile_link || prospect.profile_url || prospect.source_url || "")
    .toLowerCase()
    .replace(/[?#].*$/, "")
    .replace(/\/$/, "");
  return [prospect.platform, username, profile, prospect.business_name, String(prospect.relevant_text || "").slice(0, 60)]
    .join("|")
    .toLowerCase();
}

function normalizeRadarFingerprintPart(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function radarSearchFingerprint(config = {}) {
  const platforms = (config.sources?.length ? config.sources : allRadarSourceValues)
    .filter((source) => source !== "CRM/Import")
    .sort()
    .join(".");
  return [
    normalizeRadarFingerprintPart(config.niche || config.q || "audience"),
    normalizeRadarFingerprintPart(platforms || "mixed"),
    normalizeRadarFingerprintPart(config.country || "any"),
    normalizeRadarFingerprintPart(config.language || "any"),
    normalizeRadarFingerprintPart(config.audienceType || "mix")
  ].join("|");
}

function radarWorkspaceId() {
  return workspace.settings?.workspace || "interstellar-internal";
}

function ensureRadarPool(config = {}) {
  const fingerprint = radarSearchFingerprint(config);
  let pool = workspace.radar.leadPools.find((item) => item.search_fingerprint === fingerprint);
  if (pool) return pool;
  const platformLabel = config.sources?.length === 1 ? config.sources[0] : config.sources?.length ? "Multi-platform" : "Tutte fonti";
  pool = {
    id: uid("pool"),
    name: `${config.niche || "Audience"} · ${platformLabel} · ${config.country || "Global"}`,
    niche: config.niche || "",
    platform: platformLabel,
    country: config.country || "",
    language: config.language || "any",
    source_type: config.audienceType || "mix",
    search_fingerprint: fingerprint,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    total_leads_count: 0,
    available_leads_count: 0,
    revealed_leads_count: 0,
    last_scraped_at: "",
    status: "active"
  };
  workspace.radar.leadPools.unshift(pool);
  return pool;
}

function radarSourceKey(source = {}) {
  return [source.platform, source.source_type, source.source_url || source.source_value].join("|").toLowerCase();
}

function upsertRadarSourceFromProspect(prospect = {}, config = {}, discoveredBy = "radar") {
  const sourceUrl = prospect.source_url || prospect.website || prospect.profile_link;
  if (!sourceUrl && !prospect.source_page) return null;
  const source = {
    id: "",
    platform: prospect.platform,
    source_type: prospect.source_type || "audience_source",
    source_value: prospect.source_item || prospect.public_name || prospect.business_name || sourceUrl || "",
    source_url: sourceUrl,
    niche: config.niche || "",
    country: config.country || "",
    language: config.language || "any",
    discovered_by: discoveredBy,
    discovered_at: new Date().toISOString(),
    last_scraped_at: radarIsSourceOnly(prospect) ? "" : new Date().toISOString(),
    source_score: prospect.source_reliability || prospect.score_ai || 60,
    status: radarIsSourceOnly(prospect) ? "ready_to_mine" : "used"
  };
  const key = radarSourceKey(source);
  const existing = workspace.radar.leadSources.find((item) => radarSourceKey(item) === key);
  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...source,
      id: existing.id,
      last_scraped_at: source.last_scraped_at || existing.last_scraped_at,
      source_score: Math.max(Number(existing.source_score || 0), Number(source.source_score || 0)),
      status: source.status === "used" ? "used" : existing.status
    });
    return existing;
  }
  source.id = uid("source");
  workspace.radar.leadSources.unshift(source);
  return source;
}

function upsertRadarProspect(prospect) {
  const key = radarProspectIdentity(prospect);
  const existing = workspace.radarProspects.find((stored) => radarProspectIdentity(stored) === key);
  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...prospect,
      lead_id: existing.lead_id,
      tags: [...new Set([...(existing.tags || []), ...(prospect.tags || [])])],
      updated_at: new Date().toISOString()
    });
    return { prospect: existing, fresh: false };
  }
  workspace.radarProspects.unshift(prospect);
  return { prospect, fresh: true };
}

function radarPoolMemberKey(poolId, leadId) {
  return `${poolId}|${leadId}`;
}

function upsertRadarPoolMember(pool, prospect, source, config = {}) {
  const scored = scoreRadarProspect(prospect, config);
  const key = radarPoolMemberKey(pool.id, prospect.lead_id);
  const existing = workspace.radar.leadPoolMembers.find((member) => radarPoolMemberKey(member.pool_id, member.lead_id) === key);
  const memberPatch = {
    pool_id: pool.id,
    lead_id: prospect.lead_id,
    source_id: source?.id || "",
    source_type: prospect.source_type,
    source_value: source?.source_value || prospect.source_page || prospect.source_item || "",
    relevance_score: scored.relevance_score,
    engagement_score: scored.engagement_score,
    quality_score: scored.quality_score,
    commercial_fit_score: scored.commercial_fit_score,
    total_score: scored.total_score,
    tags: scored.tags || [],
    reasons: [scored.score_reason],
    extracted_at: prospect.collected_at || new Date().toISOString(),
    last_scored_at: new Date().toISOString()
  };
  if (existing) {
    Object.assign(existing, {
      ...existing,
      ...memberPatch,
      id: existing.id,
      tags: [...new Set([...(existing.tags || []), ...(memberPatch.tags || [])])],
      reasons: [...new Set([...(existing.reasons || []), ...(memberPatch.reasons || [])])].slice(0, 8)
    });
    return existing;
  }
  const member = { id: uid("member"), ...memberPatch };
  workspace.radar.leadPoolMembers.unshift(member);
  return member;
}

function syncRadarPoolCounts(poolId = "") {
  const now = Date.now();
  const pools = poolId ? workspace.radar.leadPools.filter((pool) => pool.id === poolId) : workspace.radar.leadPools;
  pools.forEach((pool) => {
    const members = workspace.radar.leadPoolMembers.filter((member) => member.pool_id === pool.id);
    const revealedIds = new Set(workspace.radar.leadReveals.filter((reveal) => reveal.pool_id === pool.id).map((reveal) => reveal.lead_id));
    const coolingIds = new Set(
      workspace.radar.leadReveals
        .filter((reveal) => reveal.pool_id === pool.id && Number(reveal.cooldown_until || 0) > now)
        .map((reveal) => reveal.lead_id)
    );
    pool.total_leads_count = members.length;
    pool.revealed_leads_count = revealedIds.size;
    pool.available_leads_count = members.filter((member) => !revealedIds.has(member.lead_id) && !coolingIds.has(member.lead_id)).length;
    pool.updated_at = new Date().toISOString();
  });
}

function availableRadarPoolMembers(pool, config = {}) {
  const now = Date.now();
  const workspaceId = radarWorkspaceId();
  const minScore = Math.max(0, Number(config.minScore || 0));
  return workspace.radar.leadPoolMembers
    .filter((member) => member.pool_id === pool.id && Number(member.total_score || 0) >= minScore)
    .filter((member) => {
      const sameWorkspaceReveal = workspace.radar.leadReveals.some((reveal) => reveal.workspace_id === workspaceId && reveal.lead_id === member.lead_id);
      if (sameWorkspaceReveal) return false;
      const globalCooldown = workspace.radar.leadReveals.some(
        (reveal) => reveal.lead_id === member.lead_id && Number(reveal.cooldown_until || 0) > now
      );
      return !globalCooldown;
    });
}

function radarSelectionWeight(member, prospect, config = {}, usedSources = new Set()) {
  const recency = Math.max(0, 100 - daysSince(prospect.last_interaction || prospect.collected_at) * 2);
  const revealCount = workspace.radar.leadReveals.filter((reveal) => reveal.lead_id === member.lead_id).length;
  const underexposed = Math.max(0, 100 - revealCount * 25);
  const sourceKey = member.source_id || member.source_value || prospect.source_page || prospect.platform;
  const diversity = usedSources.has(sourceKey) ? 35 : 100;
  const random = hashString(`${config.workspaceSeed || ""}:${member.lead_id}:${Date.now().toString().slice(0, -4)}`) % 100;
  return Number(member.total_score || prospect.score_ai || 0) * 0.45 + recency * 0.15 + underexposed * 0.2 + diversity * 0.1 + random * 0.1;
}

function selectRadarPoolLeadIds(pool, config = {}, requested = config.limit || 50) {
  const members = availableRadarPoolMembers(pool, config);
  const selected = [];
  const usedSources = new Set();
  const candidates = [...members];
  while (selected.length < requested && candidates.length) {
    candidates.sort((a, b) => {
      const prospectA = getRadarProspectById(a.lead_id) || {};
      const prospectB = getRadarProspectById(b.lead_id) || {};
      return radarSelectionWeight(b, prospectB, config, usedSources) - radarSelectionWeight(a, prospectA, config, usedSources);
    });
    const member = candidates.shift();
    if (!member) break;
    selected.push(member.lead_id);
    usedSources.add(member.source_id || member.source_value || getRadarProspectById(member.lead_id)?.source_page || "");
  }
  return selected;
}

function registerRadarReveals(pool, results = [], config = {}, searchId = uid("radarsearch")) {
  const workspaceId = radarWorkspaceId();
  const now = new Date();
  const cooldownDays = config.operationMode === "aggressive" ? 30 : config.operationMode === "balanced" ? 14 : 7;
  const cooldownUntil = now.getTime() + cooldownDays * 86400000;
  results.forEach((prospect) => {
    const already = workspace.radar.leadReveals.some((reveal) => reveal.workspace_id === workspaceId && reveal.lead_id === prospect.lead_id);
    if (already) return;
    workspace.radar.leadReveals.unshift({
      id: uid("reveal"),
      workspace_id: workspaceId,
      user_id: "local-user",
      pool_id: pool.id,
      lead_id: prospect.lead_id,
      revealed_at: now.toISOString(),
      cooldown_until: cooldownUntil,
      reveal_context: `${config.niche || ""} · ${config.audienceType || "mix"}`,
      search_id: searchId,
      credits_charged: 1
    });
  });
  workspace.radar.leadReveals = workspace.radar.leadReveals.slice(0, 5000);
}

function addRadarProspects(prospects = [], config = getRadarConfig()) {
  const pool = ensureRadarPool(config);
  const normalizedProspects = prospects.map((prospect) => normalizeRadarProspect(prospect)).filter((prospect) => !radarIsSellerOrAdNoise(prospect));
  const fresh = [];
  normalizedProspects.forEach((prospect) => {
    const source = upsertRadarSourceFromProspect(prospect, config, prospect.provider_source || "radar");
    if (radarIsSourceOnly(prospect)) return;
    const result = upsertRadarProspect(prospect);
    upsertRadarPoolMember(pool, result.prospect, source, config);
    if (result.fresh) fresh.push(result.prospect);
  });
  pool.last_scraped_at = new Date().toISOString();
  syncRadarPoolCounts(pool.id);
  if (fresh.length) workspace.opportunities = [];
  selectedRadarId = fresh[0]?.lead_id || selectedRadarId;
  saveWorkspace();
  renderAll();
  return fresh;
}

function radarIdsForImportedProspects(prospects = []) {
  const normalized = prospects.map((prospect) => normalizeRadarProspect(prospect));
  const ids = normalized
    .map((prospect) => {
      const key = radarProspectIdentity(prospect);
      return workspace.radarProspects.find((stored) => radarProspectIdentity(stored) === key)?.lead_id || "";
    })
    .filter(Boolean);
  return [...new Set(ids)];
}

function exportRadarCsv() {
  if (!canUsePlanFeature("export", "#radarFeedback")) return;
  const headers = [
    "lead_id",
    "platform",
    "source_type",
    "username_public",
    "public_name",
    "business_name",
    "profile_link",
    "website",
    "email_business_public",
    "phone_business_public",
    "city",
    "country",
    "estimated_language",
    "source_url",
    "relevant_text",
    "detected_intent",
    "score_ai",
    "temperature",
    "score_reason",
    "contact_mode",
    "auto_send_allowed",
    "contact_state"
  ];
  const rows = filteredRadarProspects().map((prospect) =>
    headers
      .map((key) => {
        const value = String(prospect[key] ?? "").replaceAll('"', '""');
        return `"${value}"`;
      })
      .join(",")
  );
  downloadTextFile("interstellar-radar-360-results.csv", [headers.join(","), ...rows].join("\n"), "text/csv");
  recordUsage("export", "radar", rows.length, 0, { format: "csv" });
  saveWorkspace();
}

function radarSearchQuery(kind) {
  const config = getRadarConfig();
  const country = config.country || "Italia";
  const city = config.city ? ` ${config.city}` : "";
  const queries = {
    programmingRequests: `site:instagram.com OR site:tiktok.com OR site:youtube.com/watch "programmazione" "app" "automazioni AI" ${country}${city}`,
    hotPagesRequests: `site:facebook.com/groups OR site:linkedin.com/posts "startup" "sviluppo app" "software" ${country}${city}`,
    marketplaceRequests: `(site:instagram.com OR site:tiktok.com OR site:youtube.com/watch) "sviluppo software" "automazioni AI" "startup" ${country}${city}`,
    forumRequests: `("programmazione" OR "sviluppo app" OR "automazioni") (forum OR reddit OR community) ${country}${city}`,
    businessWeb: `("software house" OR "web agency" OR "startup" OR "ecommerce") ${country}${city}`,
    italianForumRequests: `("programmazione" OR "software gestionale" OR "startup") ("forum italiano" OR forum OR community OR reddit) ${country}${city}`,
    blogRequests: `("automazioni AI" OR "software su misura" OR "app business" OR "creator AI") ${country}${city}`
  };
  return queries[kind] || queries.programmingRequests;
}

function openRadarSearch(kind) {
  const query = encodeURIComponent(radarSearchQuery(kind));
  window.open(`https://www.google.com/search?q=${query}`, "_blank", "noopener");
  setFeedback(
    "#radarFeedback",
    "Ricerca aperta. Quando trovi una fonte, creator o community utile, copia link e testo nel box 'Fonti importate' e poi premi Importa."
  );
}

async function copyRadarSimpleTemplate() {
  const template = [
    "Fonte | Nome o azienda | Link fonte/profilo | Testo reale trovato | Città | Email business opzionale",
    "Website | Nome azienda reale | https://sito-reale.it/contatti | Ho trovato una pagina contatti pubblica coerente con il target | Milano | info@sito-reale.it",
    "Reddit | @utente_reale | https://reddit.com/r/... | Sto cercando qualcuno che mi faccia un sito per la mia attività | Italia |"
  ].join("\n");
  const copied = await copyText(template);
  const textarea = document.querySelector("#radarImportText");
  if (textarea && !textarea.value.trim()) textarea.value = template;
  setFeedback("#radarFeedback", copied ? "Formato copiato. Sostituisci le righe esempio con dati reali trovati." : "Formato inserito nel box. Sostituiscilo con dati reali trovati.");
}

function radarApiBaseUrl() {
  const host = window.location.hostname;
  if (
    window.location.protocol === "file:" ||
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "::1"
  ) {
    return "https://interstellar-radar-360.vercel.app";
  }
  return window.location.origin;
}

async function runLiveOpenWebSearch() {
  const button = document.querySelector("#runLiveOpenWebSearch");
  const config = syncQuickRadarFlow();
  if (!canUsePlanFeature("live_search", "#radarFeedback")) return;
  const pool = ensureRadarPool(config);
  syncRadarPoolCounts(pool.id);
  const requestedVisible = Number(config.requestedVisibleLeads || config.limit || 50);
  const poolIds = selectRadarPoolLeadIds(pool, config, requestedVisible);
  if (poolIds.length >= requestedVisible || config.radarMode === "pool") {
    activeRadarTab = "all";
    executeRadarSearch({ ...config, radarMode: "pool" }, poolIds);
    setFeedback(
      "#radarFeedback",
      poolIds.length
        ? `${Math.min(poolIds.length, requestedVisible)} prospect rivelati dalla pool esistente. Nessun provider chiamato.`
        : "Pool vuota per questa audience: passa ad Auto Radar o aggiungi una fonte specifica per alimentarla."
    );
    return;
  }
  const params = new URLSearchParams({
    niche: config.niche,
    country: config.country,
    city: config.city,
    language: config.language,
    keywords: [...config.keywords, ...config.intentPhrases].join(", "),
    hashtags: config.hashtags.join(", "),
    competitors: config.competitors.join(", "),
    sources: config.sources.join(","),
    monitorUrls: config.monitorUrls.join(","),
    recencyMonths: String(config.recencyMonths || 12),
    audienceType: config.audienceType || "mix",
    radarMode: config.radarMode || "auto",
    workspaceId: radarWorkspaceId(),
    userId: "local-user",
    minScore: String(config.minScore || 0),
    operationMode: config.operationMode || "balanced",
    workspaceSeed: config.workspaceSeed || "",
    visibleLimit: String(requestedVisible),
    limit: String(config.internalTargetLeads || config.limit || 30)
  });
  const previousText = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = "Cerco fonti live...";
  }
  setFeedback("#radarFeedback", "Discovery live in corso: prima trovo fonti rilevanti, poi estraggo audience pubbliche e rivelo solo i prospect richiesti.");
  try {
    const response = await fetch(`${radarApiBaseUrl()}/api/radar-search?${params.toString()}`);
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(payload.error || "Ricerca live non disponibile.");
    }
    recordUsage("live_search", "radar-live", payload.prospects?.length || 0, 0, {
      providers: payload.providers || [],
      fallback_relaxed: Boolean(payload.fallback_relaxed)
    });
    workspace.radar.lastProviderStatus = payload.provider_status || [];
    workspace.radar.backend = {
      db_enabled: Boolean(payload.db_enabled),
      pool_first: Boolean(payload.pool_first),
      pool_id: payload.pool_id || "",
      database_error: payload.database_error || "",
      updated_at: new Date().toISOString()
    };
    const fresh = addRadarProspects(payload.prospects || [], config);
    const updatedPool = ensureRadarPool(config);
    syncRadarPoolCounts(updatedPool.id);
    const liveResultIds = selectRadarPoolLeadIds(updatedPool, config, requestedVisible);
    activeRadarTab = "all";
    executeRadarSearch(config, liveResultIds);
    const visibleLiveCount = workspace.radar.resultIds?.length || liveResultIds.length || 0;
    const providerSummary = (payload.provider_status || [])
      .filter((provider) => provider.status === "fulfilled")
      .map((provider) => `${provider.name} ${provider.count}`)
      .join(" · ");
    const providerErrors = (payload.provider_status || [])
      .filter((provider) => provider.status === "rejected")
      .map((provider) => `${provider.name}: ${provider.error}`)
      .join(" · ");
    const providerNote = providerErrors ? ` Provider da configurare/controllare: ${providerErrors}.` : "";
    const extractionNote = payload.extraction_note ? ` ${payload.extraction_note}` : "";
    const sourceNote = payload.sources_discovered && !visibleLiveCount
      ? ` Ho trovato ${payload.sources_discovered} fonti, ma non le mostro come prospect perché sarebbero solo annunci/post/pagine.`
      : "";
    setFeedback(
      "#radarFeedback",
      visibleLiveCount
        ? `${visibleLiveCount} prospect rivelati${fresh.length ? `, nuova audience salvata nella pool` : ""}${payload.fallback_relaxed ? " con filtro allargato" : ""}. Fonti: ${providerSummary || payload.providers?.join(", ") || "fonti pubbliche"}.${providerNote}`
        : `Discovery completata, ma non ci sono persone rivelabili con questi filtri.${sourceNote}${extractionNote}${providerNote}`
    );
  } catch (error) {
    setFeedback(
      "#radarFeedback",
      `Ricerca live non riuscita: ${error.message}. Usa i pulsanti di ricerca pubblica o configura il backend/API.`
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = previousText;
    }
  }
}

Object.assign(helpContent, {
  radarOverview: {
    title: "AI Social & Web Radar 360",
    intro: "Serve a costruire una pool di audience targetizzate: fonti, commentatori, follower disponibili e profili pubblici coerenti.",
    steps: ["Scrivi la nicchia.", "Scegli piattaforme e paese.", "Il Radar controlla prima la pool.", "Se serve, scopre fonti e alimenta il database.", "Mostra solo i prospect rivelati."],
    example: "Per programmazione cerca audience attive intorno a creator, video, community e pagine che parlano di app, siti, AI e automazioni."
  },
  radarNiche: {
    title: "Nicchia",
    intro: "Il tema centrale dell'audience o dei prospect compatibili che vuoi trovare.",
    steps: ["Scrivi parole naturali.", "Non serve una singola keyword perfetta.", "Il radar espande il target con termini correlati."],
    example: "sviluppo software, automazioni AI, siti web, app, bot"
  },
  radarSector: {
    title: "Settore",
    intro: "Aiuta il radar a capire il mercato e il tipo di prospect.",
    steps: ["Usa parole ampie.", "Esempi: local business, B2B, fitness, trading, creator.", "Serve a migliorare score e messaggi."],
    example: "PMI, creator, ecommerce, aziende locali, startup"
  },
  radarCountry: {
    title: "Paese",
    intro: "Filtro geografico principale.",
    steps: ["Metti Italia, UK, USA o altro.", "Se vuoto, non filtra per paese.", "Conta solo quando il dato è pubblico o importato."],
    example: "Italia"
  },
  radarCity: {
    title: "Città",
    intro: "Filtro per cercare lead coerenti con una zona.",
    steps: ["Metti Roma, Milano o la città target.", "Il radar guarda città, testo e source_url.", "Se vuoto, non filtra per città."],
    example: "Roma"
  },
  radarLanguage: {
    title: "Lingua",
    intro: "Serve a evitare risultati fuori lingua quando il dato è disponibile.",
    steps: ["Italiano per mercato italiano.", "Qualsiasi se vuoi più risultati.", "La lingua può essere stimata o importata."],
    example: "Italiano"
  },
  radarKeywords: {
    title: "Keyword e frasi",
    intro: "Sono segnali di nicchia per trovare fonti e audience compatibili.",
    steps: ["Inserisci termini di nicchia.", "Aggiungi community, creator, canali, strumenti e argomenti collegati.", "Non usare frasi da annuncio o lavoro."],
    example: "sviluppo software, automazioni AI, no-code, app business"
  },
  radarHashtags: {
    title: "Hashtag",
    intro: "Servono soprattutto per segnali social pubblici.",
    steps: ["Usa hashtag della nicchia.", "Il cancelletto è opzionale.", "Più hashtag coerenti migliorano il match."],
    example: "#startupitalia, #businessitalia, #automazioni"
  },
  radarCompetitors: {
    title: "Competitor / creator",
    intro: "Pagine o persone da usare come contesto di ricerca.",
    steps: ["Inserisci @username, brand o creator.", "Il radar li usa come segnali, non come login.", "Serve per lookalike e fonti."],
    example: "web agency, software house, creator AI"
  },
  radarUrls: {
    title: "URL da monitorare",
    intro: "Siti, thread, directory o forum da cui partire.",
    steps: ["Incolla un URL per riga.", "Sono fonti aperte o importate.", "Il radar non entra in aree private."],
    example: "thread forum, directory locali, pagina contatti"
  },
  radarIntent: {
    title: "Frasi di intento",
    intro: "Sono frasi che indicano interesse reale.",
    steps: ["Metti domande e bisogni.", "Esempi: quanto costa, mi serve, cerco qualcuno.", "Il radar assegna più score a chi le usa."],
    example: "quanto costa, info, zona Roma, urgente"
  },
  radarSources: {
    title: "Fonti",
    intro: "Decide dove cercare o filtrare i segnali importati.",
    steps: ["Social chiusi = contatto manuale assistito.", "Web/directory/email business = automazione possibile.", "CRM/import = automatizzabile se autorizzato."],
    example: "Instagram manuale, Website automatizzabile con form/email business"
  },
  radarRecency: {
    title: "Ultimi mesi",
    intro: "Evita commenti e discussioni vecchie.",
    steps: ["Default 12 mesi.", "Riduci a 1-3 mesi per lead freschi.", "Aumenta solo se hai pochi dati."],
    example: "12 mesi"
  },
  radarMinScore: {
    title: "Score minimo",
    intro: "Nasconde prospect deboli.",
    steps: ["0-39 cold.", "40-69 warm.", "70-100 hot.", "Alza lo score per lavorare solo lead forti."],
    example: "45 per partire, 70 per solo hot"
  },
  radarLimit: {
    title: "Risultati",
    intro: "Numero massimo di prospect mostrati.",
    steps: ["Usa 60 per analisi normale.", "Aumenta quando importi grandi liste.", "L'ordine resta per qualità."],
    example: "60"
  },
  radarRotationSeed: {
    title: "Seed rotazione",
    intro: "Serve a distribuire lead diversi tra workspace o clienti diversi.",
    steps: ["Ogni seed produce un ordine diverso.", "Usa un seed per ogni cliente o workspace.", "Riduce il rischio che tutti lavorino gli stessi contatti."],
    example: "cliente-roma-001"
  },
  radarCooldown: {
    title: "Cooldown ore",
    intro: "Per quanto tempo un prospect già mostrato viene penalizzato nel ranking.",
    steps: ["Default 24 ore.", "Aumenta per distribuire lead su più utenti.", "Non elimina il lead, lo spinge più in basso."],
    example: "24 ore per uso interno, 72 ore per più clienti"
  },
  radarDiversify: {
    title: "Distribuzione",
    intro: "Decide come bilanciare score, freschezza e rotazione.",
    steps: ["Bilanciata usa score, random weighted e freshness.", "Fresh first spinge segnali recenti.", "Solo score ordina quasi solo per qualità."],
    example: "Bilanciata è la scelta migliore per vendere la piattaforma a più utenti."
  },
  radarBusinessOnly: {
    title: "Solo business",
    intro: "Filtra prospect che sembrano aziende o hanno contatti business.",
    steps: ["Utile per B2B.", "Può nascondere persone private interessate.", "Non usare per creator o commenti social."],
    example: "Directory centri estetici"
  },
  radarFake: {
    title: "Fake/spam",
    intro: "Penalizza segnali sospetti.",
    steps: ["Riduce bot e commenti generici.", "Non elimina tutto automaticamente.", "Controlla sempre i prospect importanti."],
    example: "commenti spam o profili incoerenti"
  },
  radarSafety: {
    title: "Safety automation",
    intro: "Blocca automazioni senza fonte e consenso operativo chiaro.",
    steps: ["Richiede source_url.", "Richiede contatto business/form.", "Richiede opt-out e messaggio personalizzato."],
    example: "Email business pubblica su pagina contatti"
  },
  radarRun: {
    title: "Lancia Radar 360",
    intro: "Controlla prima la pool interna. Se non basta, usa provider live per scoprire fonti e audience pubbliche.",
    steps: ["Imposta nicchia, piattaforme e quantità.", "Il sistema evita scraping inutile se la pool ha già dati.", "I risultati mostrati sono solo i prospect rivelati."],
    example: "Trading + Instagram + Italia + 50 prospect"
  },
  radarImport: {
    title: "Import segnali reali",
    intro: "Qui incolli dati reali da CSV, provider, export autorizzati o ricerche manuali.",
    steps: ["Usa l'header suggerito.", "Ogni riga diventa un prospect.", "Il radar deduplica e assegna score."],
    example: "YouTube comment export, directory aziende, CRM opt-in"
  }
});

document.querySelectorAll("[data-nav]").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.nav));
});

document.querySelectorAll("[data-jump]").forEach((button) => {
  button.addEventListener("click", () => navigateTo(button.dataset.jump));
});

document.querySelector("#leadForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  saveLeadFromForm(event.currentTarget);
});

document.querySelector("#leadFinderForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  executeLeadSearch(getFinderConfig(event.currentTarget));
});

document.querySelector("#clearLeadForm")?.addEventListener("click", () => {
  setLeadForm();
  selectedLeadId = "";
  renderLeadDetail();
  setFeedback("#leadsFeedback", "Form pronto per un nuovo lead.");
});

document.querySelector("#importLeads")?.addEventListener("click", () => {
  const textarea = document.querySelector("#leadImportText");
  const text = textarea?.value?.trim() || "";
  if (!text) {
    setFeedback("#leadsFeedback", "Incolla almeno una riga da importare.");
    return;
  }
  importLeadsFromText(text);
  textarea.value = "";
});

document.querySelector("#loadTestDataset")?.addEventListener("click", () => {
  importLeadsFromText(testLeadDataset);
  executeLeadSearch(getFinderConfig());
  setFeedback("#leadsFeedback", "Dataset test caricato. Ora puoi cambiare filtri e premere TROVA LEAD.");
});

document.querySelector("#runYouTubeSearch")?.addEventListener("click", async () => {
  const button = document.querySelector("#runYouTubeSearch");
  button.disabled = true;
  try {
    await runYouTubeLeadSearch();
  } catch (error) {
    setFeedback("#youtubeConnectorStatus", error.message || "Errore durante la ricerca YouTube.");
  } finally {
    button.disabled = false;
  }
});

document.querySelector("#clearLeadDatabase")?.addEventListener("click", () => {
  workspace.leads = [];
  workspace.finder.resultIds = [];
  workspace.finder.assignments = {};
  selectedLeadId = "";
  saveWorkspace();
  renderAll();
  setFeedback("#leadsFeedback", "Database lead svuotato.");
});

document.querySelector("#openMapsSearch")?.addEventListener("click", () => {
  const form = document.querySelector("#leadForm");
  const target = form?.elements.namedItem("target")?.value || "attivita locali";
  const area = form?.elements.namedItem("area")?.value || "Milano";
  const query = encodeURIComponent(`${target} ${area}`);
  window.open(`https://www.google.com/maps/search/${query}`, "_blank", "noopener");
});

document.querySelector("#leadSearch")?.addEventListener("input", renderLeads);
document.querySelector("#leadStatusFilter")?.addEventListener("change", renderLeads);
document.querySelector("#leadSourceFilter")?.addEventListener("change", renderLeads);
document.querySelector("#leadSort")?.addEventListener("change", renderLeads);

document.querySelector("#radarForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  executeRadarSearch(syncQuickRadarFlow());
});

document.querySelector("#radarPresetSelect")?.addEventListener("change", (event) => {
  renderRadarPresetSummary(event.target.value);
});

document.querySelector("#applyRadarPreset")?.addEventListener("click", () => {
  syncQuickRadarFlow();
  setFeedback("#radarFeedback", "Ricerca preparata. Ora premi Avvia Radar oppure inserisci una fonte specifica per alimentare la pool.");
});

document.querySelector("#runRadarPreset")?.addEventListener("click", () => {
  syncQuickRadarFlow();
  executeRadarSearch(getRadarConfig());
});

document.querySelector("#runLiveOpenWebSearch")?.addEventListener("click", () => {
  runLiveOpenWebSearch();
});

[document.querySelector("#radarGoalInput"), document.querySelector("#radarQuickCity"), document.querySelector("#radarQuickQuantity")]
  .filter(Boolean)
  .forEach((input) => input.addEventListener("input", syncQuickRadarFlow));

document.querySelectorAll("[data-quick-source], input[name='radarQuickGeo'], #radarQuickMode, #radarQuickAudienceType").forEach((input) => {
  input.addEventListener("change", syncQuickRadarFlow);
});

document.querySelectorAll("[data-radar-open-search]").forEach((button) => {
  button.addEventListener("click", () => openRadarSearch(button.dataset.radarOpenSearch));
});

document.querySelector("#copyRadarSimpleTemplate")?.addEventListener("click", () => {
  copyRadarSimpleTemplate();
});

document.querySelector("#importRadarSignals")?.addEventListener("click", () => {
  const textarea = document.querySelector("#radarImportText");
  const text = textarea?.value?.trim() || "";
  if (!text) {
    setFeedback("#radarFeedback", "Incolla segnali reali, CSV o URL prima di importare.");
    return;
  }
  const count = importRadarSignalsFromText(text);
  textarea.value = "";
  setFeedback("#radarFeedback", `${count} prospect reali importati nel radar.`);
});

document.querySelector("#clearRadarDatabase")?.addEventListener("click", () => {
  workspace.radarProspects = [];
  workspace.radar.resultIds = [];
  workspace.radar.contactLogs = [];
  workspace.radar.assignments = {};
  workspace.radar.searches = [];
  workspace.radar.leadPools = [];
  workspace.radar.leadPoolMembers = [];
  workspace.radar.leadSources = [];
  workspace.radar.leadReveals = [];
  workspace.radar.savedLeadIds = [];
  workspace.radar.lastFunnel = null;
  workspace.radar.lastCreditEstimate = null;
  workspace.opportunities = [];
  selectedRadarId = "";
  saveWorkspace();
  renderAll();
  setFeedback("#radarFeedback", "Database Radar 360 svuotato.");
});

document.querySelector("#exportRadarCsv")?.addEventListener("click", () => {
  exportRadarCsv();
  setFeedback("#radarFeedback", "CSV Radar 360 esportato.");
});

document.querySelector("#radarSearch")?.addEventListener("input", renderRadar);
document.querySelector("#radarSourceFilter")?.addEventListener("change", renderRadar);
document.querySelector("#radarContactModeFilter")?.addEventListener("change", renderRadar);
document.querySelector("#radarSort")?.addEventListener("change", renderRadar);

document.addEventListener("change", (event) => {
  const leadId = event.target?.dataset?.leadStatus;
  if (!leadId) return;
  const lead = workspace.leads.find((item) => item.id === leadId);
  if (!lead) return;
  lead.status = event.target.value;
  lead.updatedAt = new Date().toISOString();
  selectedLeadId = lead.id;
  saveWorkspace();
  renderAll();
});

document.addEventListener("click", (event) => {
  const radarView = event.target?.dataset?.radarView;
  if (radarView) {
    activeRadarView = radarView;
    workspace.radar.activeView = radarView;
    saveWorkspace();
    renderRadar();
    return;
  }

  const radarTab = event.target?.dataset?.radarTab;
  if (radarTab) {
    activeRadarTab = radarTab;
    workspace.radar.activeTab = radarTab;
    saveWorkspace();
    renderRadar();
    return;
  }

  const radarSelectId = event.target?.dataset?.radarSelect;
  if (radarSelectId) {
    selectedRadarId = radarSelectId;
    renderRadarDetail();
    return;
  }

  const radarContactId = event.target?.dataset?.radarContact;
  if (radarContactId) {
    runRadarContact(radarContactId);
    return;
  }

  const radarContentId = event.target?.dataset?.radarContent;
  if (radarContentId) {
    openRadarProspectInContent(radarContentId);
    return;
  }

  const radarCrmId = event.target?.dataset?.radarCrm;
  if (radarCrmId) {
    sendRadarProspectToCrm(radarCrmId);
    return;
  }

  const radarSaveId = event.target?.dataset?.radarSave;
  if (radarSaveId) {
    const prospect = getRadarProspectById(radarSaveId);
    if (prospect) {
      ensureLeadFromRadarProspect(prospect);
      workspace.radar.savedLeadIds = [...new Set([...(workspace.radar.savedLeadIds || []), prospect.lead_id])];
      updateStoredRadarProspect(prospect.lead_id, { contact_state: "saved_to_crm" });
      saveWorkspace();
      renderAll();
      setFeedback("#radarFeedback", "Prospect salvato nel CRM. Nessun contatto automatico avviato.");
    }
    return;
  }

  const radarHideId = event.target?.dataset?.radarHide;
  if (radarHideId) {
    workspace.radar.resultIds = (workspace.radar.resultIds || []).filter((id) => id !== radarHideId);
    if (selectedRadarId === radarHideId) selectedRadarId = workspace.radar.resultIds[0] || "";
    updateStoredRadarProspect(radarHideId, { contact_state: "hidden" });
    saveWorkspace();
    renderAll();
    setFeedback("#radarFeedback", "Prospect nascosto da questa ricerca. Resta tracciato nel database interno.");
    return;
  }

  const radarEnrichId = event.target?.dataset?.radarEnrich;
  if (radarEnrichId) {
    updateStoredRadarProspect(radarEnrichId, { contact_state: "enrichment_requested" });
    saveWorkspace();
    renderAll();
    setFeedback("#radarFeedback", "Arricchimento segnato. Nel motore completo userà provider/API dedicati senza cambiare la lista rivelata.");
    return;
  }

  const radarPostponeId = event.target?.dataset?.radarPostpone;
  if (radarPostponeId) {
    postponeRadarProspect(radarPostponeId);
    return;
  }

  const radarArchiveId = event.target?.dataset?.radarArchive;
  if (radarArchiveId) {
    archiveRadarProspect(radarArchiveId);
    return;
  }

  const radarAppointmentId = event.target?.dataset?.radarAppointment;
  if (radarAppointmentId) {
    proposeRadarAppointment(radarAppointmentId);
    return;
  }

  const copyRadarMessageId = event.target?.dataset?.copyRadarMessage;
  if (copyRadarMessageId) {
    const prospect = getRadarProspectById(copyRadarMessageId);
    if (prospect) {
      copyText(buildRadarCrmNote(prospect)).then((copied) => {
        setFeedback("#radarFeedback", copied ? "Nota prospect copiata negli appunti." : "Permesso appunti negato.");
      });
    }
    return;
  }

  const leadTab = event.target?.dataset?.leadTab;
  if (leadTab) {
    activeLeadTab = leadTab;
    workspace.finder.activeTab = leadTab;
    saveWorkspace();
    renderLeads();
    return;
  }

  const selectLeadId = event.target?.dataset?.selectLead;
  if (selectLeadId) {
    selectedLeadId = selectLeadId;
    renderLeadDetail();
    return;
  }

  const editLeadId = event.target?.dataset?.editLead;
  if (editLeadId) {
    const lead = getLeadById(editLeadId);
    if (lead) {
      selectedLeadId = lead.id;
      setLeadForm(lead);
      renderLeadDetail();
      setFeedback("#leadsFeedback", "Lead caricato nel form.");
    }
    return;
  }

  const draftLeadId = event.target?.dataset?.draftLead;
  if (draftLeadId) {
    const select = document.querySelector("#messageLeadSelect");
    if (select) select.value = draftLeadId;
    selectedLeadId = draftLeadId;
    navigateTo("content");
    return;
  }

  const advanceLeadId = event.target?.dataset?.advanceLead;
  if (advanceLeadId) {
    const statuses = statusOrder.filter((status) => status !== "discarded");
    const lead = workspace.leads.find((item) => item.id === advanceLeadId);
    if (lead) {
      const nextIndex = Math.min(statuses.length - 1, statuses.indexOf(lead.status) + 1);
      lead.status = statuses[nextIndex];
      lead.updatedAt = new Date().toISOString();
      selectedLeadId = lead.id;
      saveWorkspace();
      renderAll();
    }
    return;
  }

  const deleteLeadId = event.target?.dataset?.deleteLead;
  if (deleteLeadId) {
    const lead = getLeadById(deleteLeadId);
    if (lead && window.confirm(`Eliminare ${lead.company}?`)) {
      workspace.leads = workspace.leads.filter((item) => item.id !== deleteLeadId);
      selectedLeadId = workspace.leads[0]?.id || "";
      saveWorkspace();
      renderAll();
      setFeedback("#leadsFeedback", "Lead eliminato.");
    }
    return;
  }

  const discardLeadId = event.target?.dataset?.discardLead;
  if (discardLeadId) {
    workspace.finder.resultIds = (workspace.finder.resultIds || []).filter((id) => id !== discardLeadId);
    if (selectedLeadId === discardLeadId) selectedLeadId = "";
    saveWorkspace();
    renderAll();
    setFeedback("#leadsFeedback", "Lead escluso dai risultati di questa ricerca.");
    return;
  }

  const automationId = event.target?.dataset?.toggleAuto;
  if (automationId) {
    const automation = workspace.automations.find((item) => item.id === automationId);
    if (automation) {
      automation.enabled = !automation.enabled;
      saveWorkspace();
      renderAll();
    }
    return;
  }

  const completeTaskId = event.target?.dataset?.completeTask;
  if (completeTaskId) {
    const task = workspace.tasks.find((item) => item.id === completeTaskId);
    if (task) {
      task.status = "done";
      task.completed_at = new Date().toISOString();
      saveWorkspace();
      renderAll();
    }
    return;
  }

  const crmReplyId = event.target?.dataset?.crmReply;
  if (crmReplyId) {
    const select = document.querySelector("#replyLeadSelect");
    if (select) select.value = crmReplyId;
    selectedLeadId = crmReplyId;
    navigateTo("content");
    return;
  }

  const crmFollowupId = event.target?.dataset?.crmFollowup;
  if (crmFollowupId) {
    const count = scheduleLeadFollowups(crmFollowupId);
    setFeedback("#settingsFeedback", "");
    if (count) navigateTo("automations");
    return;
  }

  const crmAppointmentId = event.target?.dataset?.crmAppointment;
  if (crmAppointmentId) {
    createAppointmentFromLead(crmAppointmentId);
    navigateTo("automations");
    return;
  }

  const crmOfferId = event.target?.dataset?.crmOffer;
  if (crmOfferId) {
    const lead = workspace.leads.find((item) => item.id === crmOfferId);
    if (lead) {
      selectedLeadId = lead.id;
      const offer = createOfferForLead(lead, lead.offer || "Sito + automazioni AI", "Da definire dopo mini analisi", lead.target || "Generare più clienti");
      const output = document.querySelector("#offerOutput");
      const select = document.querySelector("#offerLeadSelect");
      if (select) select.value = lead.id;
      if (output && offer) output.value = offer.message;
      navigateTo("campaigns");
    }
    return;
  }

  const crmLostId = event.target?.dataset?.crmLost;
  if (crmLostId) {
    const lead = workspace.leads.find((item) => item.id === crmLostId);
    if (lead) {
      lead.status = "discarded";
      lead.nextAction = "Archiviato come perso";
      lead.updatedAt = new Date().toISOString();
      saveWorkspace();
      renderAll();
    }
    return;
  }

  const copyCampaignId = event.target?.dataset?.copyCampaign;
  if (copyCampaignId) {
    const campaign = workspace.campaigns.find((item) => item.id === copyCampaignId);
    if (campaign) copyText(formatCampaignPlan(campaign));
    return;
  }

  const copyOfferId = event.target?.dataset?.copyOffer;
  if (copyOfferId) {
    const offer = workspace.offers.find((item) => item.id === copyOfferId);
    if (offer) {
      const output = document.querySelector("#offerOutput");
      if (output) output.value = offer.message;
      copyText(offer.message);
    }
    return;
  }

  const campaignFromOfferId = event.target?.dataset?.campaignFromOffer;
  if (campaignFromOfferId) {
    createCampaignFromOffer(campaignFromOfferId);
    return;
  }

  const appointmentFromOfferId = event.target?.dataset?.appointmentFromOffer;
  if (appointmentFromOfferId) {
    const offer = workspace.offers.find((item) => item.id === appointmentFromOfferId);
    if (offer) {
      createAppointmentFromLead(offer.lead_id);
      navigateTo("automations");
    }
    return;
  }

  const copyAppointmentId = event.target?.dataset?.copyAppointment;
  if (copyAppointmentId) {
    const appointment = workspace.appointments.find((item) => item.id === copyAppointmentId);
    if (appointment) copyText(appointment.confirmation_message || appointmentConfirmationMessage(appointment));
    return;
  }

  const calendarAppointmentId = event.target?.dataset?.calendarAppointment;
  if (calendarAppointmentId) {
    const appointment = workspace.appointments.find((item) => item.id === calendarAppointmentId);
    if (appointment) {
      appointment.calendar_url = buildGoogleCalendarUrl(appointment);
      appointment.meeting_url = appointment.calendar_url;
      appointment.status = "calendar_ready";
      appointment.updated_at = new Date().toISOString();
      saveWorkspace();
      renderAll();
      window.open(appointment.calendar_url, "_blank", "noopener");
    }
    return;
  }

  const completeAppointmentId = event.target?.dataset?.completeAppointment;
  if (completeAppointmentId) {
    const appointment = workspace.appointments.find((item) => item.id === completeAppointmentId);
    if (appointment) {
      appointment.status = "completed";
      appointment.completed_at = new Date().toISOString();
      const lead = workspace.leads.find((item) => item.id === appointment.crm_lead_id || `lead_${item.id}` === appointment.lead_id);
      if (lead) {
        lead.status = lead.status === "client" ? "client" : "interested";
        lead.nextAction = "Preparare proposta finale dopo la call";
        lead.updatedAt = new Date().toISOString();
      }
      saveWorkspace();
      renderAll();
    }
    return;
  }
});

document.querySelector("#generateLeadDraft")?.addEventListener("click", () => {
  const lead = getLeadById();
  if (!lead) {
    setFeedback("#leadsFeedback", "Seleziona prima un lead.");
    return;
  }
  const draft = buildMessage(lead, "Professionale diretto", "Ti propongo una call di 15 minuti");
  lead.draft = draft;
  lead.updatedAt = new Date().toISOString();
  document.querySelector("#leadDraftOutput").value = draft;
  saveWorkspace();
  renderAll();
  setFeedback("#leadsFeedback", "Bozza generata e salvata nel lead.");
});

document.querySelector("#copyLeadDraft")?.addEventListener("click", async () => {
  const lead = getLeadById();
  const draft = document.querySelector("#leadDraftOutput")?.value?.trim();
  if (!lead || !draft) {
    setFeedback("#leadsFeedback", "Genera una bozza prima di copiarla.");
    return;
  }
  lead.draft = draft;
  saveWorkspace();
  const copied = await copyText(draft);
  if (!copied) downloadTextFile(`${lead.company || "lead"}-bozza.txt`, draft, "text/plain");
  setFeedback("#leadsFeedback", copied ? "Bozza copiata negli appunti." : "Bozza scaricata come TXT.");
});

document.querySelector("#campaignForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canUsePlanFeature("campaign", "#settingsFeedback")) return;
  const data = new FormData(event.currentTarget);
  const lead = workspace.leads.find((item) => item.id === data.get("lead"));
  workspace.campaigns.unshift({
    id: uid("campaign"),
    name: data.get("name"),
    goal: data.get("goal"),
    channel: data.get("channel"),
    lead_id: lead?.id || "",
    offer_title: lead?.offer || "",
    plan: [
      lead ? `parti da ${lead.company}` : "scegli una lista lead dal Radar/CRM",
      data.get("channel") === "Email" ? "prepara anteprima email e conferma manualmente" : "usa contatto manual assist, nessun invio automatico social",
      "salva ogni risposta nel Reply Assistant",
      "crea follow-up o appuntamento dal CRM"
    ],
    status: "Attiva",
    sent: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  recordUsage("campaign", "campaigns", 1, 0, { lead_id: lead?.id || "" });
  saveWorkspace();
  renderAll();
});

document.querySelector("#offerForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lead = workspace.leads.find((item) => item.id === data.get("lead"));
  const output = document.querySelector("#offerOutput");
  if (!lead) {
    if (output) output.value = "Prima porta un prospect nel CRM, poi genera l'offerta.";
    return;
  }
  const offer = createOfferForLead(lead, data.get("package"), data.get("price"), data.get("goal"));
  if (output && offer) output.value = offer.message;
});

document.querySelector("#copyOfferOutput")?.addEventListener("click", async () => {
  const output = document.querySelector("#offerOutput")?.value?.trim();
  if (!output) return;
  const copied = await copyText(output);
  if (!copied) downloadTextFile("interstellar-offer.txt", output, "text/plain");
});

document.querySelector("#messageForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lead = workspace.leads.find((item) => item.id === data.get("lead"));
  if (!lead) {
    document.querySelector("#messageOutput").value = "Aggiungi o importa un lead prima di generare una bozza.";
    return;
  }
  document.querySelector("#messageOutput").value = formatConversationStarterOutput(lead, data.get("tone"), data.get("goal"));
});

document.querySelector("#saveDraftToLead")?.addEventListener("click", () => {
  const leadId = document.querySelector("#messageLeadSelect")?.value;
  const lead = workspace.leads.find((item) => item.id === leadId);
  const output = document.querySelector("#messageOutput")?.value?.trim();
  if (!lead || !output) return;
  lead.draft = output;
  lead.status = lead.status === "new" || lead.status === "qualified" ? "contacted" : lead.status;
  lead.updatedAt = new Date().toISOString();
  selectedLeadId = lead.id;
  saveWorkspace();
  renderAll();
});

document.querySelector("#replyAssistantForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lead = workspace.leads.find((item) => item.id === data.get("lead"));
  const reply = String(data.get("reply") || "").trim();
  const output = document.querySelector("#replyOutput");
  if (!lead || !reply) {
    if (output) output.value = "Seleziona un lead e incolla una risposta ricevuta.";
    return;
  }
  const analysis = analyzeManualReply(reply, lead);
  const suggestion = formatReplyAssistantOutput(lead, reply);
  if (output) output.value = suggestion;
  workspace.conversations.unshift({
    id: uid("conversation"),
    lead_id: lead.id,
    reply,
    analysis,
    suggested_response: analysis.suggested,
    created_at: new Date().toISOString()
  });
  if (analysis.appointmentReady) {
    lead.status = "interested";
    lead.nextAction = "Proporre appuntamento";
  } else if (analysis.interestScore >= 55) {
    lead.status = lead.status === "new" || lead.status === "qualified" ? "contacted" : lead.status;
    lead.nextAction = "Rispondere e qualificare";
  } else if (analysis.label === "obiezione") {
    lead.nextAction = "Follow-up leggero o archiviare";
  }
  lead.updatedAt = new Date().toISOString();
  saveWorkspace();
  renderAll();
});

document.querySelector("#copyReplySuggestion")?.addEventListener("click", async () => {
  const output = document.querySelector("#replyOutput")?.value?.trim();
  if (!output) return;
  const copied = await copyText(output);
  if (!copied) downloadTextFile("interstellar-reply-suggestion.txt", output, "text/plain");
});

document.querySelector("#automationForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!canUsePlanFeature("automation", "#settingsFeedback")) return;
  const data = new FormData(event.currentTarget);
  workspace.automations.unshift({
    id: uid("auto"),
    trigger: data.get("trigger"),
    action: data.get("action"),
    enabled: true
  });
  recordUsage("automation", "automations", 1, 0, { trigger: data.get("trigger") });
  saveWorkspace();
  renderAll();
});

document.querySelector("#workspaceSettings")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.settings.workspace = data.get("workspace");
  workspace.settings.signature = data.get("signature");
  saveWorkspace();
  document.querySelector("#settingsFeedback").textContent = "Impostazioni salvate.";
});

document.querySelector("#planSettings")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  applyPlanTier(data.get("tier"), data.get("interval"));
  saveWorkspace();
  renderAll();
  document.querySelector("#settingsFeedback").textContent = `Piano ${getPlanDefinition().name} applicato. Crediti e limiti mensili aggiornati.`;
});

document.querySelector("#exportLeads")?.addEventListener("click", async () => {
  if (!canUsePlanFeature("export", "#leadsFeedback")) return;
  const payload = JSON.stringify(filteredLeads(), null, 2);
  const copied = await copyText(payload);
  if (!copied) downloadTextFile("interstellar-lead-finder-results.json", payload);
  recordUsage("export", "lead-finder", filteredLeads().length, 0, { format: "json" });
  saveWorkspace();
  setFeedback("#leadsFeedback", copied ? "Risultati copiati negli appunti." : "Risultati scaricati come JSON.");
});

document.querySelector("#copyWorkspaceData")?.addEventListener("click", async () => {
  const payload = JSON.stringify(workspace, null, 2);
  const copied = await copyText(payload);
  if (!copied) downloadTextFile("interstellar-workspace-backup.json", payload);
  setFeedback(
    "#settingsFeedback",
    copied ? "Backup copiato negli appunti." : "Permesso appunti negato: backup scaricato come JSON."
  );
});

document.querySelector("#resetWorkspaceData")?.addEventListener("click", () => {
  workspace = defaultWorkspace();
  selectedLeadId = "";
  saveWorkspace();
  renderAll();
  document.querySelector("#settingsFeedback").textContent = "Workspace operativo svuotato.";
});

document.body.dataset.activePage = activePage;
document.querySelector(".radar-manual-fields")?.removeAttribute("open");
syncQuickRadarFlow();
renderAll();
