const canvas = document.querySelector("#starCanvas");
const ctx = canvas.getContext("2d");
const stars = [];
const frameEl = document.querySelector(".stage-frame");
const shellEl = document.querySelector(".dashboard-shell");
const desktopWidth = 1180;
const svgNs = "http://www.w3.org/2000/svg";

const activityChartData = [
  { label: "8 Mag", leads: 420, email: 260, replies: 130 },
  { label: "9 Mag", leads: 610, email: 385, replies: 210 },
  { label: "10 Mag", leads: 455, email: 300, replies: 170 },
  { label: "11 Mag", leads: 590, email: 390, replies: 235 },
  { label: "12 Mag", leads: 820, email: 570, replies: 315 },
  { label: "13 Mag", leads: 915, email: 650, replies: 365 },
  { label: "14 Mag", leads: 880, email: 585, replies: 300 }
];

const chartSeriesByTheme = {
  stripe: [
    { key: "leads", label: "Leads", color: "#5b67d8", glow: "#8d96ff" },
    { key: "email", label: "Email", color: "#24a69a", glow: "#54d4ca" },
    { key: "replies", label: "Risposte", color: "#38a8c4", glow: "#7ed7ea", thin: true }
  ],
  interstellar: [
    { key: "leads", label: "Leads", color: "#7c4dff", glow: "#9b78ff" },
    { key: "email", label: "Email", color: "#1f8fff", glow: "#52b4ff" },
    { key: "replies", label: "Risposte", color: "#2ee9f0", glow: "#71ffff", thin: true }
  ]
};

const activityChartSeries = chartSeriesByTheme.stripe;

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
    const max = Math.ceil((maxValue * 1.18) / 100) * 100;
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

window.InterstellarCharts = {
  activity: createAreaChart(
    document.querySelector("#activityAreaChart"),
    activityChartData,
    activityChartSeries
  )
};

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
  window.InterstellarCharts.activity?.setSeries(chartSeriesByTheme[nextTheme]);
  if (persist) storeTheme(nextTheme);
}

if (themePicker) {
  themePicker.addEventListener("change", (event) => {
    applyTheme(event.target.value);
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
      activeTab: "hot",
      resultIds: [],
      lastSearch: null,
      contactLogs: [],
      dailyCount: 0,
      dailyDate: "",
      assignments: {}
    },
    campaigns: [],
    automations: []
  };
}

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
    assignedUntil: input.assignedUntil || ""
  };
}

function createLead(nameOrInput, company, source, city, target, offer, score = null) {
  if (typeof nameOrInput === "object" && nameOrInput !== null) {
    return normalizeLead(nameOrInput);
  }
  return normalizeLead({ name: nameOrInput, company, source, city, target, offer, score });
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
let activeRadarTab = workspace.radar?.activeTab || "hot";

workspace.finder = { ...defaultWorkspace().finder, ...(workspace.finder || {}) };
workspace.radar = { ...defaultWorkspace().radar, ...(workspace.radar || {}) };
workspace.leads = workspace.leads.map((lead) => normalizeLead(lead)).filter((lead) => lead.username || lead.company);
workspace.radarProspects = (workspace.radarProspects || [])
  .map((prospect) => normalizeRadarProspect(prospect))
  .filter((prospect) => prospect.username_public || prospect.business_name || prospect.source_url || prospect.relevant_text);
saveWorkspace();

function navigateTo(page) {
  activePage = page;
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
  const select = document.querySelector("#messageLeadSelect");
  if (!select) return;
  select.innerHTML = workspace.leads.length
    ? workspace.leads
        .map((lead) => `<option value="${lead.id}">${escapeHtml(lead.company)} - ${escapeHtml(lead.name || "Contatto")}</option>`)
        .join("")
    : `<option value="">Nessun lead disponibile</option>`;
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
            <p>${escapeHtml(campaign.goal)} · ${escapeHtml(campaign.channel)} · ${campaign.sent} contatti preparati</p>
          </div>
          <span class="status-pill">${escapeHtml(campaign.status)}</span>
        </div>
      `
    )
    .join("")
    : `<div class="system-list-item"><div><strong>Nessuna campagna</strong><p>Crea una campagna quando hai una lista lead pronta.</p></div></div>`;
}

function renderAutomations() {
  const list = document.querySelector("#automationList");
  if (!list) return;
  list.innerHTML = workspace.automations.length
    ? workspace.automations
    .map(
      (automation) => `
        <div class="system-list-item">
          <div>
            <strong>${escapeHtml(automation.trigger)}</strong>
            <p>${escapeHtml(automation.action)}</p>
          </div>
          <button type="button" data-toggle-auto="${automation.id}">${automation.enabled ? "Attiva" : "Pausa"}</button>
        </div>
      `
    )
    .join("")
    : `<div class="system-list-item"><div><strong>Nessuna automazione</strong><p>Aggiungi regole quando hai iniziato l'outreach.</p></div></div>`;
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
  analytics.innerHTML = [
    ["Lead totali", leads],
    ["Lead caldi", hot],
    ["Contattati", contacted],
    ["Clienti", clients],
    ["Campagne", workspace.campaigns.length],
    ["Automazioni", workspace.automations.filter((item) => item.enabled).length]
  ]
    .map(([label, value]) => `<div class="analytics-tile"><p>${label}</p><strong>${value}</strong></div>`)
    .join("");

  actions.innerHTML = [
    "Genera bozze per i lead con score sopra 80.",
    "Sposta in CRM i contatti che hanno una risposta positiva.",
    "Prima di collegare email/DM, mantieni approvazione manuale."
  ]
    .map((action) => `<div class="system-list-item"><div><strong>${action}</strong><p>Priorità operativa interna.</p></div></div>`)
    .join("");
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
  if (!form) return;
  const workspaceInput = form.elements.namedItem("workspace");
  const signatureInput = form.elements.namedItem("signature");
  if (workspaceInput) workspaceInput.value = workspace.settings?.workspace || "Interstellar Internal";
  if (signatureInput) signatureInput.value = workspace.settings?.signature || "Kevin - Interstellar";
}

function renderDashboardData() {
  const metricValues = document.querySelectorAll(".metric-card strong");
  const todayLeads = workspace.leads.length;
  const drafts = workspace.leads.filter((lead) => lead.draft).length;
  const interested = workspace.leads.filter((lead) => lead.status === "interested").length;
  const clients = workspace.leads.filter((lead) => lead.status === "client").length;
  [todayLeads, drafts, interested, clients].forEach((value, index) => {
    if (metricValues[index]) metricValues[index].textContent = formatMetric(value);
  });
}

function renderAll() {
  renderLeads();
  renderLeadSelect();
  renderLeadDetail();
  renderCampaigns();
  renderAutomations();
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
  const select = document.querySelector("#messageLeadSelect");
  if (!select) return;
  select.innerHTML = workspace.leads.length
    ? workspace.leads
        .map((lead) => `<option value="${lead.id}">${escapeHtml(lead.username || lead.company)} - ${escapeHtml(lead.platform)}</option>`)
        .join("")
    : `<option value="">Nessun lead disponibile</option>`;
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

const radarSourceAliases = {
  web: ["Website", "Blog", "Directory", "Reviews", "Google", "Forum"],
  forum: ["Forum", "Reddit"],
  local: ["Directory", "Reviews", "Website", "Google"],
  social: [...radarSocialPlatforms],
  import: ["CRM/Import"]
};

const radarIntentPatterns = [
  { label: "prezzo", weight: 22, patterns: ["quanto costa", "prezzo", "preventivo", "costo", "tariffa", "price", "pricing"] },
  { label: "richiesta info", weight: 18, patterns: ["info", "informazioni", "come funziona", "mi interessa", "vorrei capire", "details"] },
  { label: "ricerca servizio", weight: 24, patterns: ["cerco", "qualcuno conosce", "mi serve", "sto cercando", "dove posso trovare", "consigliate"] },
  { label: "problema espresso", weight: 18, patterns: ["non riesco", "problema", "aiuto", "bloccato", "non so da dove partire", "fallito"] },
  { label: "urgenza", weight: 16, patterns: ["urgente", "subito", "prima possibile", "asap", "entro", "oggi"] },
  { label: "località", weight: 10, patterns: ["zona", "roma", "milano", "torino", "napoli", "bologna", "vicino"] },
  { label: "valutazione acquisto", weight: 14, patterns: ["vale la pena", "alternative", "migliore", "recensioni", "opinioni", "conviene"] }
];

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

function splitList(value = "") {
  return String(value)
    .split(/[\n,;|]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanHashtag(value = "") {
  return String(value).replace(/^#/, "").toLowerCase().trim();
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
    limit: Math.max(5, Math.min(250, Number(data.get("limit") || 60))),
    workspaceSeed: String(data.get("workspaceSeed") || "internal-alpha").trim(),
    cooldownHours: Math.max(1, Math.min(168, Number(data.get("cooldownHours") || 24))),
    distributionMode: String(data.get("distributionMode") || "balanced"),
    businessOnly: data.get("businessOnly") === "on",
    excludeBots: data.get("excludeBots") === "on",
    automationGuard: data.get("automationGuard") === "on"
  };
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
  const locationOk =
    (!config.city || text.includes(config.city.toLowerCase())) &&
    (!config.country || text.includes(config.country.toLowerCase()));

  let score = 18;
  score += Math.min(28, keywordMatches.length * 5 + hashtags.length * 4);
  score += intent.strength;
  if (recency <= 1) score += 16;
  else if (recency <= 3) score += 12;
  else if (recency <= 6) score += 8;
  else if (recency <= 12) score += 4;
  if (interactions >= 3) score += 5;
  if (interactions >= 10) score += 5;
  if (hasBusinessContact) score += 10;
  if (locationOk && (config.city || config.country)) score += 8;
  score += Math.round((reliability - 50) / 8);

  const fakeSignals = /free money|guaranteed|100%|follow4follow|promo|spam|bot|casino|airdrop|pump/i.test(text);
  if (fakeSignals) score -= 22;
  if (!prospect.relevant_text && !prospect.bio_public && !prospect.business_name) score -= 18;
  if (config.businessOnly && !prospect.business_name && !hasBusinessContact) score -= 30;

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  const temperature = finalScore >= 70 ? "hot" : finalScore >= 40 ? "warm" : "cold";
  const reasons = [];
  if (intent.hits.length) reasons.push(`intent ${intent.hits.slice(0, 3).join(", ")}`);
  if (keywordMatches.length) reasons.push(`${keywordMatches.length} match target`);
  if (recency <= 12) reasons.push(`segnale recente (${Math.round(recency * 30)}g)`);
  if (hasBusinessContact) reasons.push("contatto business pubblico");
  if (locationOk && (config.city || config.country)) reasons.push("area coerente");
  if (!reasons.length) reasons.push("pochi segnali forti rilevati");

  return {
    score_ai: finalScore,
    temperature,
    score_reason: `Lead ${temperature} perché: ${reasons.join(", ")}.`,
    keyword_match: keywordMatches.join(", "),
    hashtag_match: hashtags.join(", "),
    detected_intent: intent.label,
    intent_strength: intent.strength
  };
}

function buildRadarMessage(prospect = {}) {
  const firstName = cleanFirstName(prospect.public_name);
  const greeting = firstName ? `Ciao ${firstName},` : "Ciao, piacere,";
  const context = prospect.relevant_text
    ? `ho visto questo tuo segnale pubblico: "${prospect.relevant_text.slice(0, 150)}"`
    : prospect.business_name
      ? `ho visto ${prospect.business_name}${prospect.city ? ` a ${prospect.city}` : ""}`
      : `ho visto il tuo profilo pubblico su ${prospect.platform || "questa piattaforma"}`;
  const offer = prospect.detected_intent?.includes("prezzo")
    ? "posso mandarti due indicazioni pratiche sui costi e su come valutare una soluzione seria"
    : "posso mandarti due idee pratiche per capire se ha senso parlarne";
  const optOut =
    prospect.contact_mode === "automated_possible"
      ? "\n\nSe non vuoi ricevere altri messaggi, dimmelo pure e non ti ricontatto."
      : "";

  return `${greeting}

${context}.

Te lo scrivo in modo diretto: ${offer}, senza promesse strane e senza farti perdere tempo.

Se ti va, ti mando un esempio concreto in base alla tua situazione.

${workspace.settings.signature}${optOut}`;
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
  return merged.filter((prospect) => {
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

function passesRadarConfig(prospect, config, scored) {
  const sourceOk = !config.sources.length || config.sources.includes(prospect.platform);
  const languageOk = config.language === "any" || prospect.estimated_language === config.language;
  const countryOk = !config.country || radarText(prospect).includes(config.country.toLowerCase());
  const cityOk = !config.city || radarText(prospect).includes(config.city.toLowerCase());
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
    config.monitorUrls.some((url) => prospect.source_url.includes(url) || prospect.website.includes(url));
  return (
    sourceOk &&
    languageOk &&
    countryOk &&
    cityOk &&
    recencyOk &&
    botOk &&
    businessOk &&
    (keywordOk || urlOk || scored.intent_strength >= 18) &&
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

function executeRadarSearch(config = getRadarConfig()) {
  const now = Date.now();
  const results = allRadarProspects()
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
    .slice(0, config.limit);

  workspace.radar.resultIds = results.map((prospect) => prospect.lead_id);
  workspace.radar.lastSearch = config;
  workspace.radar.activeTab = activeRadarTab;
  workspace.radar.assignments = {
    ...(workspace.radar.assignments || {}),
    ...Object.fromEntries(results.map((prospect) => [prospect.lead_id, now + config.cooldownHours * 60 * 60 * 1000]))
  };
  selectedRadarId = results[0]?.lead_id || selectedRadarId;
  saveWorkspace();
  renderAll();
  setFeedback(
    "#radarFeedback",
    results.length
      ? `${results.length} prospect trovati. Rotazione attiva: seed ${config.workspaceSeed}, cooldown ${config.cooldownHours}h.`
      : "Nessun prospect compatibile: importa segnali reali o allarga keyword/fonti."
  );
}

function radarBelongsToTab(prospect, tab) {
  if (tab === "hot") return prospect.temperature === "hot";
  if (tab === "warm") return prospect.temperature === "warm";
  if (tab === "cold") return prospect.temperature === "cold";
  if (tab === "social") return radarSocialPlatforms.has(prospect.platform);
  if (tab === "web") return radarSourceAliases.web.includes(prospect.platform);
  if (tab === "forum") return radarSourceAliases.forum.includes(prospect.platform) || /forum|thread/i.test(prospect.source_type);
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
  const sources = [...new Set(allRadarProspects().map((prospect) => prospect.platform).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "it")
  );
  select.innerHTML = `<option value="all">Tutte fonti</option>${sources
    .map((source) => `<option value="${escapeHtml(source)}">${escapeHtml(source)}</option>`)
    .join("")}`;
  select.value = sources.includes(current) ? current : "all";
}

function renderRadarStats() {
  const stats = document.querySelector("#radarStats");
  const count = document.querySelector("#radarProspectCount");
  if (count) count.textContent = `${workspace.radarProspects.length} prospect`;
  if (!stats) return;
  const all = allRadarProspects();
  const results = (workspace.radar.resultIds || []).map((id) => getRadarProspectById(id)).filter(Boolean);
  const base = results.length ? results : all;
  const hot = base.filter((prospect) => prospect.temperature === "hot").length;
  const automated = base.filter((prospect) => prospect.contact_mode === "automated_possible").length;
  const manual = base.filter((prospect) => prospect.contact_mode === "manual_assist").length;
  const knownIds = new Set(all.map((prospect) => prospect.lead_id));
  const cooldown = Object.entries(workspace.radar.assignments || {}).filter(
    ([id, until]) => knownIds.has(id) && Number(until) > Date.now()
  ).length;
  const avg = base.length ? Math.round(base.reduce((sum, prospect) => sum + Number(prospect.score_ai || 0), 0) / base.length) : 0;
  stats.innerHTML = [
    ["Database", all.length],
    ["Risultati", results.length || all.length],
    ["Hot", hot],
    ["Manual", manual],
    ["Automated", automated],
    ["Cooldown", cooldown],
    ["Score medio", avg]
  ]
    .map(([label, value]) => `<div><span>${label}</span><strong>${value}</strong></div>`)
    .join("");
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
  `;
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
      <div><span>Score AI</span><strong>${prospect.score_ai}/100 · ${escapeHtml(prospect.temperature)}</strong></div>
      <div><span>Intent</span><strong>${escapeHtml(prospect.detected_intent || "n/d")}</strong></div>
      <div><span>Contact mode</span><strong>${prospect.contact_mode === "manual_assist" ? "Manual assist" : "Automated possible"}</strong></div>
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
      <span>Messaggio suggerito</span>
      <textarea readonly>${escapeHtml(prospect.suggested_message || buildRadarMessage(prospect))}</textarea>
      <div class="detail-actions">
        <button type="button" data-radar-contact="${prospect.lead_id}">Contatta</button>
        <button type="button" data-copy-radar-message="${prospect.lead_id}">Copia messaggio</button>
      </div>
    </div>
  `;
}

function renderRadar() {
  const root = document.querySelector('[data-page="radar"]');
  if (!root) return;
  syncRadarSourceFilter();
  renderRadarStats();
  renderRadarMatrix();
  renderRadarSafetyPanel();
  document.querySelectorAll("[data-radar-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.radarTab === activeRadarTab);
  });

  const results = filteredRadarProspects();
  const list = document.querySelector("#radarResults");
  if (list) {
    list.innerHTML = results.length
      ? results
          .map((prospect) => {
            const profileLink = prospect.profile_link || prospect.source_url || prospect.website;
            return `
              <div class="radar-row" data-radar-id="${prospect.lead_id}">
                <div class="radar-row-main">
                  <strong>${escapeHtml(prospect.business_name || prospect.public_name || prospect.username_public || "Prospect pubblico")}</strong>
                  <p>${escapeHtml(prospect.platform)} · ${escapeHtml(prospect.city || prospect.country || "area n/d")} · ${escapeHtml(prospect.detected_intent || "intent n/d")}</p>
                  <p>${escapeHtml(prospect.relevant_text || prospect.bio_public || "Testo pubblico non disponibile")}</p>
                </div>
                <span class="lead-score ${prospect.temperature}">${prospect.score_ai}</span>
                <div class="radar-row-meta">
                  <span class="mode-pill ${prospect.contact_mode}">${prospect.contact_mode === "manual_assist" ? "Manual" : "Auto possible"}</span>
                  <span>${daysSince(prospect.last_interaction) >= 999 ? "data n/d" : `${daysSince(prospect.last_interaction)}g fa`}</span>
                  <span>${Number(workspace.radar.assignments?.[prospect.lead_id] || 0) > Date.now() ? "cooldown" : "libero"}</span>
                  <span>${escapeHtml(prospect.source_reliability || 60)}% fonte</span>
                </div>
                <div class="lead-actions">
                  <button type="button" data-radar-select="${prospect.lead_id}">Dettagli</button>
                  <button type="button" data-radar-contact="${prospect.lead_id}">Contatta</button>
                  ${profileLink ? `<a href="${escapeHtml(profileLink)}" target="_blank" rel="noopener">Apri</a>` : ""}
                </div>
              </div>
            `;
          })
          .join("")
      : `<div class="system-list-item"><div><strong>Nessun prospect nel radar</strong><p>Importa segnali reali, collega una fonte o riduci i filtri.</p></div></div>`;
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
    saveWorkspace();
    if (link) window.open(link, "_blank", "noopener");
    renderAll();
    setFeedback("#radarFeedback", "Messaggio copiato. Apri la piattaforma e invialo manualmente.");
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

function importRadarSignalsFromText(text) {
  const rows = text
    .split(/\r?\n/)
    .map((row) => row.trim())
    .filter(Boolean)
    .map(parseCsvLine);
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

  const knownKeys = new Set(
    workspace.radarProspects.map((prospect) =>
      [prospect.platform, prospect.username_public, prospect.business_name, prospect.source_url, prospect.relevant_text.slice(0, 60)]
        .join("|")
        .toLowerCase()
    )
  );
  const fresh = prospects.filter((prospect) => {
    const key = [prospect.platform, prospect.username_public, prospect.business_name, prospect.source_url, prospect.relevant_text.slice(0, 60)]
      .join("|")
      .toLowerCase();
    if (knownKeys.has(key)) return false;
    knownKeys.add(key);
    return true;
  });
  workspace.radarProspects.unshift(...fresh);
  selectedRadarId = fresh[0]?.lead_id || selectedRadarId;
  saveWorkspace();
  renderAll();
  return fresh.length;
}

function exportRadarCsv() {
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
}

Object.assign(helpContent, {
  radarOverview: {
    title: "AI Social & Web Radar 360",
    intro: "Serve a trasformare segnali pubblici in prospect ordinati per qualità, senza fare DM automatici sui social.",
    steps: ["Inserisci nicchia e area.", "Importa segnali reali o collega fonti.", "Lancia il radar.", "Usa Contatta in base al contact mode."],
    example: "Per estetica Roma trova commenti, forum, directory e pagine contatto, poi separa social manuali da email/form business."
  },
  radarNiche: {
    title: "Nicchia",
    intro: "Il tema centrale dei clienti che vuoi trovare.",
    steps: ["Scrivi parole naturali.", "Non serve una singola keyword perfetta.", "Il radar espande il target con termini correlati."],
    example: "centri estetici laser epilazione"
  },
  radarSector: {
    title: "Settore",
    intro: "Aiuta il radar a capire il mercato e il tipo di prospect.",
    steps: ["Usa parole ampie.", "Esempi: local business, B2B, fitness, trading, creator.", "Serve a migliorare score e messaggi."],
    example: "beauty local business"
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
    intro: "Sono segnali che il radar cerca nel testo pubblico.",
    steps: ["Inserisci termini di nicchia.", "Aggiungi frasi tipo prezzo/info/cerco.", "Non deve essere troppo stretto."],
    example: "laser diodo, quanto costa, centro estetico Roma"
  },
  radarHashtags: {
    title: "Hashtag",
    intro: "Servono soprattutto per segnali social pubblici.",
    steps: ["Usa hashtag della nicchia.", "Il cancelletto è opzionale.", "Più hashtag coerenti migliorano il match."],
    example: "#epilazionelaser, #roma"
  },
  radarCompetitors: {
    title: "Competitor / creator",
    intro: "Pagine o persone da usare come contesto di ricerca.",
    steps: ["Inserisci @username, brand o creator.", "Il radar li usa come segnali, non come login.", "Serve per lookalike e fonti."],
    example: "@centroestetico_roma"
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
    intro: "Esegue scoring e filtri sui segnali disponibili.",
    steps: ["Prima importa dati o collega fonti.", "Poi premi il pulsante.", "I risultati finiscono nei tab."],
    example: "Dopo import CSV, premi Lancia Radar 360"
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
  executeRadarSearch(getRadarConfig(event.currentTarget));
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

  const copyRadarMessageId = event.target?.dataset?.copyRadarMessage;
  if (copyRadarMessageId) {
    const prospect = getRadarProspectById(copyRadarMessageId);
    if (prospect) {
      copyText(prospect.suggested_message || buildRadarMessage(prospect)).then((copied) => {
        setFeedback("#radarFeedback", copied ? "Messaggio copiato negli appunti." : "Permesso appunti negato.");
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
  const data = new FormData(event.currentTarget);
  workspace.campaigns.unshift({
    id: uid("campaign"),
    name: data.get("name"),
    goal: data.get("goal"),
    channel: data.get("channel"),
    status: "Attiva",
    sent: 0
  });
  saveWorkspace();
  renderAll();
});

document.querySelector("#messageForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  const lead = workspace.leads.find((item) => item.id === data.get("lead"));
  if (!lead) {
    document.querySelector("#messageOutput").value = "Aggiungi o importa un lead prima di generare una bozza.";
    return;
  }
  document.querySelector("#messageOutput").value = buildMessage(lead, data.get("tone"), data.get("goal"));
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

document.querySelector("#automationForm")?.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(event.currentTarget);
  workspace.automations.unshift({
    id: uid("auto"),
    trigger: data.get("trigger"),
    action: data.get("action"),
    enabled: true
  });
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

document.querySelector("#exportLeads")?.addEventListener("click", async () => {
  const payload = JSON.stringify(filteredLeads(), null, 2);
  const copied = await copyText(payload);
  if (!copied) downloadTextFile("interstellar-lead-finder-results.json", payload);
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

renderAll();
