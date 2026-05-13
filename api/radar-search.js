const DEFAULT_LIMIT = 30;
const MAX_PROVIDER_RESULTS = 10;
const DEFAULT_RECENCY_MONTHS = 12;
const SERPER_MAX_QUERIES = 6;

const providerSourceMap = {
  reddit: ["Reddit", "Forum"],
  hackerNews: ["Forum", "Website", "Blog"],
  stackExchange: ["Forum", "Website", "Blog"],
  devTo: ["Blog", "Website", "Forum"],
  wordpress: ["Blog", "Website"],
  serper: ["Forum", "Website", "Blog", "Directory", "Reviews"],
  searchEngine: ["Forum", "Website", "Blog", "Directory", "Reviews"],
  github: ["Forum", "Website"],
  directUrls: ["Website", "Blog", "Directory", "Reviews", "CRM/Import"]
};

const italianSignals = [
  "cerco sviluppatore",
  "mi serve un sito",
  "quanto costa un sito",
  "preventivo sito",
  "voglio creare un'app",
  "mi serve un gestionale",
  "voglio automatizzare",
  "cerco qualcuno che mi faccia",
  "aiuto sito wordpress",
  "problema sito ecommerce",
  "non funziona il mio sito",
  "software gestionale azienda",
  "chatbot per azienda",
  "software su misura"
];

const englishSignals = [
  "looking for a developer",
  "need a website developer",
  "hire web developer",
  "need app developer",
  "build a custom software",
  "automation developer",
  "chatbot for my business",
  "website quote",
  "software for my business"
];

const italianModeDisabledProviders = new Set(["hackerNews", "stackExchange", "devTo", "github"]);

const italianRedditCommunities = [
  "Italia",
  "italy",
  "italyinformatica",
  "imprenditoria"
];

const italianAllowedRedditCommunities = new Set([
  "italia",
  "italy",
  "italyinformatica",
  "italiacareeradvice",
  "imprenditoria",
  "commercialisti"
]);

const italianProgrammingSignals = [
  "cerco programmatore",
  "cerco freelance sito web",
  "cerco web agency",
  "devo creare un sito",
  "devo fare un ecommerce",
  "rifare sito aziendale",
  "preventivo app",
  "preventivo gestionale",
  "automazione processi aziendali",
  "integrare api",
  "sito per la mia attività",
  "crm per azienda",
  "software per azienda"
];

function asText(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function compact(value = "", max = 520) {
  const text = asText(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function inferIntent(text = "") {
  const lower = text.toLowerCase();
  if (/quanto costa|prezzo|preventivo|budget|costo|quote|pricing|price/.test(lower)) return "prezzo / preventivo";
  if (/cerco|mi serve|sto cercando|looking for|need (a|an)|hire|someone to build|developer needed|freelancer/.test(lower)) return "ricerca servizio";
  if (/non riesco|problema|aiuto|bloccato|help|issue|stuck|can't/.test(lower)) return "problema espresso";
  if (/app|sito|website|software|automazione|automation|chatbot|gestionale|bot|crm|landing|ecommerce|shopify|wordpress/.test(lower)) return "sviluppo / automazione";
  return "interesse potenziale";
}

function hasClientIntent(text = "") {
  return /quanto costa|prezzo|preventivo|budget|cerco|mi serve|sto cercando|looking for|need (a|an)|hire|someone to build|developer needed|freelancer|for my business|my website|my app|non riesco|problema|aiuto|bloccato|stuck|can't|help/i.test(
    text
  );
}

function hasDevelopmentTerm(text = "") {
  return /sviluppatore|programmatore|sito|app\b|applicazione|software|automazione|chatbot|gestionale|bot\b|crm\b|landing|ecommerce|shopify|wordpress|api\b|web developer|website|app developer|custom software|automation|developer|freelancer/i.test(
    text
  );
}

function hasServiceBuyingIntent(text = "") {
  return /cerco (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelancer|web agency|software house)|mi serve (un |una |)(sito|app|applicazione|gestionale|software|bot|chatbot|automazione)|voglio creare (un |una |)(sito|app|software|bot|chatbot|gestionale)|quanto costa (un |una |)(sito|app|software|bot|chatbot|gestionale)|preventivo (sito|app|software|bot|chatbot|gestionale)|qualcuno che (mi |)(faccia|sviluppi|crei).*(sito|app|software|bot|chatbot|gestionale)|looking for (a |an |)(developer|freelancer|agency)|need (a |an |)(website|app|developer|software|automation|chatbot)|hire (a |an |)(developer|freelancer|agency)|someone to build/i.test(
    text
  );
}

function hasOwnedProjectProblem(text = "") {
  return /(il mio|la mia|per la mia|per il mio|my|for my).{0,30}(sito|app|website|software|store|ecommerce|shop|crm|bot|chatbot|gestionale|business|azienda)|errore.{0,40}(sito|app|website|wordpress|shopify)|non funziona.{0,40}(sito|app|website|wordpress|shopify)/i.test(
    text
  );
}

function isCareerOrNoise(text = "") {
  return /junior|senior|carriera|stipendio|ral\b|colloquio|assunzione|apprendistato|contratto|datore di lavoro|dichiarazione dei redditi|commercialista|iva|lavoro come|lavorare come|laurea|stage|curriculum|\bcv\b|portfolio personale|amici|conoscere qualcuno|dating|revshare|revenue share|cerca tester|cerco tester/i.test(
    text
  );
}

function isProgrammingSearch(config = {}) {
  return hasDevelopmentTerm(`${config.q} ${config.niche} ${config.keywords}`);
}

function isUsefulProspectForSearch(prospect = {}, config = {}) {
  if (!isProgrammingSearch(config)) return true;
  const text = `${prospect.source_item || ""} ${prospect.relevant_text || ""} ${prospect.bio_public || ""} ${prospect.source_type || ""}`;
  if (/revshare|revenue share/i.test(text)) return false;
  if ((prospect.email_business_public || prospect.contact_form_url) && /business|website|directory|contact|direct_url/i.test(prospect.source_type || "")) {
    return true;
  }
  const strongBuyingIntent = hasServiceBuyingIntent(text) || (hasOwnedProjectProblem(text) && hasDevelopmentTerm(text));
  if (isCareerOrNoise(text) && !strongBuyingIntent) return false;
  return strongBuyingIntent || (hasClientIntent(text) && hasDevelopmentTerm(text) && /azienda|business|progetto|project|cliente|client|shop|store|ecommerce|startup/i.test(text));
}

function isItalianMode(config = {}) {
  const language = String(config.language || "").toLowerCase();
  const country = String(config.country || "").toLowerCase();
  return language === "it" || /\bitalia\b|\bitaly\b/.test(country);
}

function italianTextScore(text = "") {
  const lower = asText(text).toLowerCase();
  let score = 0;
  if (/[àèéìòù]/.test(lower)) score += 2;
  if (
    /\b(cerco|serve|servirebbe|vorrei|qualcuno|consigli|preventivo|prezzo|costo|quanto costa|sito|sviluppatore|programmatore|gestionale|automazione|azienda|attività|italia|roma|milano|napoli|torino|bologna|veneto|lombardia|lazio)\b/.test(
      lower
    )
  ) {
    score += 3;
  }
  const commonWords =
    lower.match(/\b(il|lo|la|gli|le|un|una|che|per|con|non|sono|ho|mi|di|da|nel|della|delle|dei|del|come|dove|quando|qualcuno|vorrei)\b/g) ||
    [];
  score += Math.min(4, Math.floor(commonWords.length / 2));
  return score;
}

function looksItalian(text = "") {
  return italianTextScore(text) >= 3;
}

function languageMatchesConfig(prospect = {}, config = {}) {
  if (!isItalianMode(config)) return true;
  const text = `${prospect.source_page || ""} ${prospect.source_item || ""} ${prospect.relevant_text || ""} ${prospect.bio_public || ""} ${
    prospect.source_url || ""
  }`;
  const lower = text.toLowerCase();
  if (prospect.estimated_language === "en" && !looksItalian(text)) return false;
  if (/\b(looking for|need a|need an|hire|website quote|custom software|developer needed|for my business|hacker news|stack exchange|dev community|github issues)\b/.test(lower)) {
    return looksItalian(text);
  }
  return looksItalian(text);
}

function inferLanguage(text = "", fallback = "it") {
  const lower = text.toLowerCase();
  if (/[àèéìòù]|\b(cerco|quanto|sito|sviluppatore|preventivo|azienda|gestionale)\b/.test(lower)) return "it";
  if (/\b(need|looking|hire|website|developer|business|software|automation)\b/.test(lower)) return "en";
  if (fallback === "it") return looksItalian(lower) ? "it" : "unknown";
  return fallback === "any" ? "en" : fallback;
}

function isoFromUnix(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function monthsSince(value) {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return 0;
  return Math.max(0, (Date.now() - time) / (1000 * 60 * 60 * 24 * 30.44));
}

function decodeHtml(value = "") {
  return String(value || "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value = "") {
  return asText(decodeHtml(value));
}

function normalizeDuckDuckGoUrl(href = "") {
  const raw = decodeHtml(href || "");
  if (!raw) return "";
  const absolute = raw.startsWith("//") ? `https:${raw}` : raw;
  try {
    const url = new URL(absolute);
    const nested = url.searchParams.get("uddg");
    return nested ? decodeURIComponent(nested) : absolute;
  } catch {
    return absolute;
  }
}

function hostnameOf(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return "";
  }
}

function redditCommunityFromUrl(value = "") {
  const match = String(value || "").match(/reddit\.com\/r\/([^/?#]+)/i);
  return match ? decodeURIComponent(match[1]).toLowerCase() : "";
}

function isTranslatedRedditUrl(value = "") {
  try {
    const url = new URL(value);
    return url.hostname.includes("reddit.com") && url.searchParams.has("tl");
  } catch {
    return /reddit\.com\/.*[?&]tl=/i.test(value);
  }
}

function isItalianWebResult(link = "", text = "") {
  const host = hostnameOf(link);
  const subreddit = redditCommunityFromUrl(link);
  if (isTranslatedRedditUrl(link)) return false;
  if (subreddit && !italianAllowedRedditCommunities.has(subreddit)) return false;
  if (/freelancer\./i.test(host) && !/(freelancer\.co\.it|freelancer\.com)$/i.test(host)) return false;
  if (/instagram\.com/i.test(host) && !hasExplicitHireRequest(text)) return false;
  if (host.endsWith(".it")) return true;
  if (/reddit\.com$/i.test(host) && italianAllowedRedditCommunities.has(subreddit)) return true;
  if (/forum\.html\.it|html\.it|giorgiotave\.it|forumfree\.it|forumcommunity\.net|alfemminile\.com|finanzaonline\.com|hwupgrade\.it/i.test(host)) return true;
  return looksItalian(text) && !/\b(looking for|need a|hire|developer wanted|busco|caut|desarrollador|programare)\b/i.test(text);
}

function hasExplicitHireRequest(text = "") {
  return /cerco (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance|web agency|software house)|cerco (sviluppatore|programmatore|freelance)|sto cercando (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance)|buongiorno cerco|solo a chi parla italiano.{0,80}cerco|cerco.{0,80}(sito ecommerce|app|bot|gestionale|software)|sistemare (gestionale|sito|app|software)|budget.{0,80}(sito|app|software|gestionale|sviluppatore|programmatore)|pubblicato da/i.test(
    text
  );
}

function hasDirectProgrammingRequest(text = "") {
  return /cerco (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance|web agency|software house)|cerco (sviluppatore|programmatore|freelance)|sto cercando (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance)|mi serve (un |una |)(sito|app|applicazione|gestionale|software|bot|chatbot|automazione)|devo (fare|creare|sviluppare|sistemare|rifare) (un |una |)(sito|app|applicazione|gestionale|software|bot|chatbot|ecommerce)|voglio creare (un |una |)(sito|app|software|bot|chatbot|gestionale)|sistemare (gestionale|sito|app|software)|richiedo preventivo.{0,60}(sito|app|software|gestionale|chatbot)|budget.{0,80}(sito|app|software|gestionale|sviluppatore|programmatore)/i.test(
    text
  );
}

function isMarketplaceOrCommunityLead(link = "", text = "") {
  const host = hostnameOf(link);
  return /facebook\.com|freelancer\.|addlance\.com|techlance\.it|inforge\.net|forum\.|reddit\.com|italia\.it|iprogrammatori\.it|arduino\.cc/i.test(
    `${host} ${link} ${text}`
  );
}

function isMarketingContentNoise(link = "", text = "") {
  const haystack = `${hostnameOf(link)} ${link} ${text}`;
  if (hasExplicitHireRequest(text)) return false;
  return /quanto costa (un |una |)(sito|app)|preventivo (gratis|per un sito|sito web|troppo alto)|realizzazione siti|creazione siti|web agency|agenzia web|sito web per aziende|migliori costruttori|consulenza gratuita|prenota consulenza|richiedi preventivo|servizio di web design|social media manager|seo|branding|marketing|modulo contatti|avere un sito|mi serve un sito se ho/i.test(
    haystack
  );
}

function explicitDateFromText(text = "") {
  const value = String(text || "");
  const numeric = value.match(/\b(\d{1,2})[/-](\d{1,2})[/-](20\d{2})\b/);
  if (numeric) {
    const [, day, month, year] = numeric;
    const date = new Date(Number(year), Number(month) - 1, Number(day));
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const year = value.match(/\b(20\d{2})\b/);
  if (year) return new Date(Number(year[1]), 0, 1);
  return null;
}

function passesExplicitRecency(text = "", config = {}) {
  const date = explicitDateFromText(text);
  if (!date) return true;
  const months = Math.max(1, Math.min(60, Number(config.recencyMonths || DEFAULT_RECENCY_MONTHS)));
  return monthsSince(date.toISOString()) <= months;
}

function extractEmails(text = "") {
  const emails = String(text || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return [...new Set(emails)].slice(0, 5);
}

function firstBusinessEmail(text = "") {
  return (
    extractEmails(text).find(
      (email) =>
        !/(gmail|hotmail|outlook|icloud|yahoo|libero|virgilio|proton|mail\.com)\./i.test(email) &&
        !/@(example|test|invalid|localhost|mare\.aperto)\./i.test(email) &&
        !/\.(blabla|local)$/i.test(email)
    ) ||
    ""
  );
}

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

function getQuery(req) {
  const url = new URL(req.url, "https://interstellar.local");
  const params = url.searchParams;
  const niche = params.get("niche") || "sviluppo software automazioni AI siti web app bot";
  const keywords = params.get("keywords") || "";
  const country = params.get("country") || "Italia";
  const city = params.get("city") || "";
  const language = params.get("language") || "it";
  const sources = (params.get("sources") || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const monitorUrls = (params.get("monitorUrls") || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter((item) => /^https?:\/\//i.test(item))
    .slice(0, 12);
  const recencyMonths = Math.max(1, Math.min(60, Number(params.get("recencyMonths") || DEFAULT_RECENCY_MONTHS)));
  const limit = Math.max(5, Math.min(80, Number(params.get("limit") || DEFAULT_LIMIT)));
  const base = [niche, keywords, country, city].filter(Boolean).join(" ");
  return {
    q: compact(base, 180),
    niche,
    keywords,
    country,
    city,
    language,
    sources,
    monitorUrls,
    recencyMonths,
    limit
  };
}

function providerEnabled(config, providerKey) {
  if (isItalianMode(config) && italianModeDisabledProviders.has(providerKey)) return false;
  if (!config.sources.length) return true;
  const values = providerSourceMap[providerKey] || [];
  return values.some((value) => config.sources.includes(value));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "User-Agent": "InterstellarRadar360/1.0",
      Accept: "application/json",
      ...(options.headers || {})
    }
  });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
  return response.json();
}

function serperTimeFilter(config = {}) {
  const months = Math.max(1, Math.min(60, Number(config.recencyMonths || DEFAULT_RECENCY_MONTHS)));
  if (months <= 1) return "qdr:m";
  if (months <= 12) return "qdr:y";
  return undefined;
}

async function fetchSerper(query, config = {}) {
  if (!process.env.SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY non configurata su Vercel");
  }
  const response = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: {
      "X-API-KEY": process.env.SERPER_API_KEY,
      "Content-Type": "application/json",
      "User-Agent": "InterstellarRadar360/1.0"
    },
    body: JSON.stringify({
      q: query,
      gl: isItalianMode(config) ? "it" : undefined,
      hl: config.language === "en" ? "en" : "it",
      tbs: serperTimeFilter(config),
      num: Math.min(MAX_PROVIDER_RESULTS, 10)
    })
  });
  if (!response.ok) throw new Error(`Serper ${response.status} ${response.statusText}`);
  return response.json();
}

function liveQueries(config) {
  const city = config.city ? ` ${config.city}` : "";
  const country = config.country ? ` ${config.country}` : "";
  const signals = isItalianMode(config)
    ? [...italianSignals, ...italianProgrammingSignals]
    : config.language === "en"
      ? englishSignals
      : config.language === "any"
        ? [...italianSignals, ...englishSignals]
        : italianSignals;
  const custom = String(config.keywords || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8);
  return [...new Set([config.q, ...custom, ...signals.map((signal) => `${signal}${country}${city}`)])].filter(Boolean).slice(0, isItalianMode(config) ? 18 : 16);
}

function serperQueries(config) {
  const country = config.country || "Italia";
  const city = config.city ? ` ${config.city}` : "";
  if (isItalianMode(config) && isProgrammingSearch(config)) {
    return [
      `("cerco sviluppatore" OR "cerco programmatore") (forum OR community OR discussione) ${country}${city} -site:reddit.com`,
      `("mi serve un sito" OR "devo fare un sito") ("preventivo" OR "consigli") ${country}${city} -site:reddit.com`,
      `("preventivo sito" OR "quanto costa un sito") (forum OR community OR discussione) ${country}${city} -site:reddit.com`,
      `("voglio creare un'app" OR "preventivo app") (forum OR community OR discussione) ${country}${city} -site:reddit.com`,
      `("software gestionale" OR "crm") ("preventivo" OR "cerco") "azienda" ${country}${city}`,
      `("voglio automatizzare" OR "automazione processi") "azienda" ${country}${city}`,
      `site:reddit.com/r/ItalyInformatica ("cerco" OR "serve" OR "preventivo") (sito OR app OR software OR gestionale) -inurl:?tl=`,
      `site:forum.html.it ("cerco" OR "serve" OR "preventivo") (sito OR app OR software)`,
      `site:forumfree.it ("cerco" OR "serve" OR "preventivo") (sito OR app OR software)`,
      `site:forumcommunity.net ("cerco" OR "serve" OR "preventivo") (sito OR app OR software)`
    ];
  }
  return liveQueries(config).slice(0, SERPER_MAX_QUERIES);
}

function prospectFromSearchResult(result = {}, config = {}, provider = "Serper Google Search") {
  const title = stripHtml(result.title || result.question || "");
  const link = result.link || result.url || "";
  const snippet = stripHtml(result.snippet || result.answer || "");
  const text = compact(`${title}. ${snippet}`);
  const haystack = `${link} ${title} ${snippet}`;
  const isForum = /forum|community|reddit|discussioni|thread|risposte|stackoverflow|quora/i.test(haystack);
  const isBusinessContact = /contatti|preventivo|richiedi|azienda|agenzia|servizi|software house|web agency|professionista|freelance/i.test(haystack);
  const hasContactIntent = hasServiceBuyingIntent(text) || (hasClientIntent(text) && hasDevelopmentTerm(text));
  if (!link || !title) return null;
  if (isItalianMode(config) && !isItalianWebResult(link, text)) return null;
  if (!passesExplicitRecency(text, config)) return null;
  if (isProgrammingSearch(config) && isMarketingContentNoise(link, text)) return null;
  if (isProgrammingSearch(config) && !hasDirectProgrammingRequest(text) && !isMarketplaceOrCommunityLead(link, text)) return null;
  if (isProgrammingSearch(config) && !hasContactIntent && !hasOwnedProjectProblem(text) && !/forum|reddit|community|discussione/i.test(haystack)) {
    return null;
  }
  return {
    platform: isForum ? "Forum" : "Website",
    source_type: isBusinessContact ? "serper_business_or_intent_signal" : "serper_public_signal",
    username_public: "",
    public_name: "",
    business_name: isBusinessContact && !isForum ? title : "",
    website: link,
    email_business_public: firstBusinessEmail(`${title} ${snippet}`),
    source_url: link,
    source_page: provider,
    source_item: title,
    relevant_text: text,
    city: config.city,
    country: config.country,
    estimated_language: inferLanguage(text, config.language),
    detected_intent: inferIntent(text),
    interactions_detected: 1,
    last_interaction: new Date().toISOString(),
    provider_source: provider,
    source_reliability: isForum ? 78 : 70
  };
}

async function searchSerper(config) {
  if (!process.env.SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY non configurata su Vercel");
  }
  const queries = serperQueries(config)
    .map((query) => query.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, SERPER_MAX_QUERIES);
  const settled = await Promise.allSettled(queries.map((query) => fetchSerper(query, config)));
  return settled.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const organic = (result.value.organic || []).map((item) => prospectFromSearchResult(item, config));
    const peopleAlsoAsk = (result.value.peopleAlsoAsk || []).map((item) => prospectFromSearchResult(item, config, "Serper People Also Ask"));
    return [...organic, ...peopleAlsoAsk].filter(Boolean);
  });
}

async function searchReddit(config) {
  const queries = liveQueries(config).slice(0, isItalianMode(config) ? 7 : 16);
  const jobs = [];
  if (isItalianMode(config)) {
    for (const subreddit of italianRedditCommunities) {
      for (const query of queries) {
        jobs.push(
          fetchJson(
            `https://www.reddit.com/r/${encodeURIComponent(subreddit)}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&sort=new&t=year&limit=5`
          )
        );
      }
    }
    queries.slice(0, 6).forEach((query) => {
      jobs.push(fetchJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(`${query} Italia`)}&sort=new&t=year&limit=7`));
    });
  } else {
    queries.forEach((query) => {
      jobs.push(fetchJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=year&limit=${Math.min(config.limit, 10)}`));
    });
  }
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((result) =>
    result.status === "fulfilled" ? (result.value.data?.children || []).map(({ data }) => ({
    platform: "Reddit",
    source_type: "open_web_live",
    username_public: data.author ? `@${data.author}` : "",
    public_name: data.author || "",
    profile_link: data.author ? `https://www.reddit.com/user/${data.author}` : "",
    source_url: data.permalink ? `https://www.reddit.com${data.permalink}` : data.url,
    source_page: data.subreddit ? `r/${data.subreddit}` : "Reddit search",
    source_item: data.title || "",
    relevant_text: compact(`${data.title || ""}. ${data.selftext || ""}`),
    city: config.city,
    country: config.country,
    estimated_language: inferLanguage(`${data.title || ""} ${data.selftext || ""}`, config.language),
    detected_intent: inferIntent(`${data.title || ""} ${data.selftext || ""}`),
    interactions_detected: Number(data.num_comments || 0) + Number(data.score || 0),
    last_interaction: isoFromUnix(data.created_utc),
    provider_source: isItalianMode(config) ? "Reddit Italia public search" : "Reddit public search",
    source_reliability: isItalianMode(config) ? 76 : 72
  })) : []
  );
}

async function searchDuckDuckGo(config) {
  const focusedQueries = isItalianMode(config)
    ? [
        `"cerco sviluppatore" "sito" ${config.country || "Italia"} ${config.city || ""}`,
        `"mi serve un sito" "preventivo" ${config.country || "Italia"} ${config.city || ""}`,
        `"cerco programmatore" "app" ${config.country || "Italia"} ${config.city || ""}`,
        `"software gestionale" "preventivo" "azienda" ${config.country || "Italia"} ${config.city || ""}`,
        `"voglio automatizzare" "azienda" ${config.country || "Italia"} ${config.city || ""}`,
        `"rifare sito" "azienda" ${config.country || "Italia"} ${config.city || ""}`,
        `"cerco web agency" "preventivo" ${config.country || "Italia"} ${config.city || ""}`,
        `"chatbot" "azienda" "preventivo" ${config.country || "Italia"} ${config.city || ""}`
      ]
    : liveQueries(config).slice(0, 8);

  const settled = await Promise.allSettled(
    focusedQueries
      .map((query) => query.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .map(async (query) => {
        const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`, {
          headers: {
            "User-Agent": "InterstellarRadar360/1.0",
            Accept: "text/html,application/xhtml+xml"
          }
        });
        if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
        return { query, html: await response.text() };
      })
  );

  return settled.flatMap((result) => {
    if (result.status !== "fulfilled") return [];
    const blocks = result.value.html.split(/<div class="result results_links[\s\S]*?web-result[^>]*>/i).slice(1, 6);
    return blocks
      .map((block) => {
        const titleMatch = block.match(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
        const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) || block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/div>/i);
        const rawUrl = normalizeDuckDuckGoUrl(titleMatch?.[1] || "");
        const title = stripHtml(titleMatch?.[2] || "");
        const snippet = stripHtml(snippetMatch?.[1] || "");
        const text = compact(`${title}. ${snippet}`);
        const isForum = /forum|community|reddit|discussioni|thread|domanda|risposte/i.test(`${rawUrl} ${title} ${snippet}`);
        const hasContactIntent = hasServiceBuyingIntent(text) || (hasClientIntent(text) && hasDevelopmentTerm(text));
        const isBusinessContact = /contatti|preventivo|richiedi|azienda|agenzia|servizi|software house|web agency/i.test(`${rawUrl} ${title} ${snippet}`);
        if (!rawUrl || !title || (!hasContactIntent && !isBusinessContact)) return null;
        return {
          platform: isForum ? "Forum" : "Website",
          source_type: isBusinessContact ? "search_engine_business_signal" : "search_engine_public_signal",
          username_public: "",
          public_name: "",
          business_name: isBusinessContact ? title : "",
          website: rawUrl,
          source_url: rawUrl,
          source_page: "DuckDuckGo public search",
          source_item: title,
          relevant_text: text,
          city: config.city,
          country: config.country,
          estimated_language: inferLanguage(text, config.language),
          detected_intent: inferIntent(text),
          interactions_detected: 1,
          last_interaction: new Date().toISOString(),
          provider_source: "DuckDuckGo public search",
          source_reliability: isForum ? 62 : 55
        };
      })
      .filter(Boolean);
  });
}

async function searchHackerNews(config) {
  const settled = await Promise.allSettled(
    liveQueries(config).map((query) =>
      fetchJson(
        `https://hn.algolia.com/api/v1/search_by_date?query=${encodeURIComponent(`${query} website app automation`)}&tags=story,comment&hitsPerPage=${Math.min(config.limit, 8)}`
      )
    )
  );
  return settled.flatMap((result) =>
    result.status === "fulfilled" ? (result.value.hits || []).map((hit) => {
    const title = hit.title || hit.story_title || "Discussione";
    const text = compact(`${title}. ${hit.comment_text || hit.story_text || ""}`);
    const sourceUrl = hit.url || (hit.objectID ? `https://news.ycombinator.com/item?id=${hit.objectID}` : "");
    return {
      platform: "Forum",
      source_type: "open_web_live",
      username_public: hit.author ? `@${hit.author}` : "",
      public_name: hit.author || "",
      profile_link: hit.author ? `https://news.ycombinator.com/user?id=${encodeURIComponent(hit.author)}` : "",
      source_url: sourceUrl,
      source_page: "Hacker News",
      source_item: title,
      relevant_text: text,
      city: config.city,
      country: config.country,
      estimated_language: "en",
      detected_intent: inferIntent(text),
      interactions_detected: Number(hit.points || 0) + Number(hit.num_comments || 0),
      last_interaction: hit.created_at || new Date().toISOString(),
      provider_source: "Hacker News Algolia public API",
      source_reliability: 68
    };
  }) : []
  );
}

async function searchStackExchange(config) {
  const sites = ["stackoverflow", "webmasters", "wordpress", "webapps", "softwarerecs", "softwareengineering"];
  const queries = liveQueries(config).slice(0, 5);
  const jobs = [];
  for (const site of sites) {
    for (const query of queries) {
      jobs.push(
        fetchJson(
          `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=creation&q=${encodeURIComponent(query)}&site=${encodeURIComponent(site)}&pagesize=${Math.min(MAX_PROVIDER_RESULTS, 5)}&filter=default`
        )
      );
    }
  }
  const settled = await Promise.allSettled(jobs);
  return settled.flatMap((result) =>
    result.status === "fulfilled"
      ? (result.value.items || []).map((item) => {
          const text = decodeHtml(compact(`${item.title || ""}. ${(item.tags || []).join(", ")}`));
          return {
            platform: "Forum",
            source_type: "q_and_a_public_signal",
            username_public: item.owner?.display_name ? `@${asText(decodeHtml(item.owner.display_name)).replace(/\s+/g, "_")}` : "",
            public_name: asText(decodeHtml(item.owner?.display_name || "")),
            profile_link: item.owner?.link || "",
            source_url: item.link,
            source_page: "Stack Exchange",
            source_item: decodeHtml(item.title || ""),
            relevant_text: text,
            city: config.city,
            country: config.country,
            estimated_language: inferLanguage(text, config.language),
            detected_intent: inferIntent(text),
            interactions_detected: Number(item.answer_count || 0) + Number(item.view_count || 0) + Number(item.score || 0),
            last_interaction: isoFromUnix(item.creation_date || item.last_activity_date),
            provider_source: "Stack Exchange public API",
            source_reliability: 66
          };
        })
      : []
  );
}

async function searchDevTo(config) {
  const tags = ["help", "discuss", "webdev", "wordpress", "startup", "productivity"];
  const settled = await Promise.allSettled(
    tags.map((tag) => fetchJson(`https://dev.to/api/articles?tag=${encodeURIComponent(tag)}&per_page=${Math.min(MAX_PROVIDER_RESULTS, 8)}&top=7`))
  );
  const keywords = liveQueries(config).join(" ").toLowerCase();
  return settled.flatMap((result) =>
    result.status === "fulfilled"
      ? (result.value || [])
          .map((article) => {
            const text = compact(`${article.title || ""}. ${article.description || ""}`);
            return {
              platform: "Blog",
              source_type: "blog_public_signal",
              username_public: article.user?.username ? `@${article.user.username}` : "",
              public_name: article.user?.name || article.user?.username || "",
              profile_link: article.user?.username ? `https://dev.to/${article.user.username}` : "",
              source_url: article.url,
              source_page: "DEV Community",
              source_item: article.title || "",
              relevant_text: text,
              city: config.city,
              country: config.country,
              estimated_language: article.language || inferLanguage(text, config.language),
              detected_intent: inferIntent(text),
              interactions_detected: Number(article.comments_count || 0) + Number(article.public_reactions_count || 0),
              last_interaction: article.published_timestamp || new Date().toISOString(),
              provider_source: "DEV public API",
              source_reliability: keywords.split(/\s+/).some((word) => word.length > 4 && text.toLowerCase().includes(word)) ? 63 : 50
            };
          })
          .filter((prospect) => inferIntent(prospect.relevant_text) !== "interesse potenziale" || prospect.source_reliability >= 60)
          .filter((prospect) => hasClientIntent(prospect.relevant_text) || prospect.source_reliability >= 60)
      : []
  );
}

async function searchWordPress(config) {
  const settled = await Promise.allSettled(
    liveQueries(config)
      .slice(0, 8)
      .map((query) =>
        fetchJson(`https://public-api.wordpress.com/rest/v1.1/read/search?q=${encodeURIComponent(query)}&number=${Math.min(MAX_PROVIDER_RESULTS, 6)}`)
      )
  );
  return settled.flatMap((result) =>
    result.status === "fulfilled"
      ? (result.value.posts || []).map((post) => {
          const text = compact(`${post.title || ""}. ${post.excerpt || post.content || ""}`);
          return {
            platform: "Blog",
            source_type: "blog_public_signal",
            username_public: post.author?.login ? `@${post.author.login}` : "",
            public_name: post.author?.name || post.author?.login || "",
            profile_link: post.author?.profile_URL || "",
            website: post.site_URL || "",
            email_business_public: firstBusinessEmail(`${post.content || ""} ${post.excerpt || ""}`),
            source_url: post.URL || post.short_URL,
            source_page: post.site_name || "WordPress.com",
            source_item: asText(post.title || ""),
            relevant_text: text,
            city: config.city,
            country: config.country,
            estimated_language: inferLanguage(text, config.language),
            detected_intent: inferIntent(text),
            interactions_detected: Number(post.like_count || 0) + Number(post.comment_count || 0),
            last_interaction: post.date || post.modified || new Date().toISOString(),
            provider_source: "WordPress.com public search",
            source_reliability: 58
          };
        }).filter((prospect) => hasClientIntent(prospect.relevant_text) || prospect.email_business_public)
      : []
  );
}

async function searchGitHubIssues(config) {
  const settled = await Promise.allSettled(
    liveQueries(config).map((query) =>
      fetchJson(`https://api.github.com/search/issues?q=${encodeURIComponent(`${query} in:title,body is:issue`)}&sort=created&order=desc&per_page=${Math.min(config.limit, 8)}`, {
        headers: {
          Accept: "application/vnd.github+json"
        }
      })
    )
  );
  return settled.flatMap((result) =>
    result.status === "fulfilled" ? (result.value.items || []).map((item) => {
    const text = compact(`${item.title || ""}. ${item.body || ""}`);
    return {
      platform: "Forum",
      source_type: "open_web_live",
      username_public: item.user?.login ? `@${item.user.login}` : "",
      public_name: item.user?.login || "",
      profile_link: item.user?.html_url || "",
      source_url: item.html_url,
      source_page: "GitHub Issues",
      source_item: item.title || "",
      relevant_text: text,
      city: config.city,
      country: config.country,
      estimated_language: "en",
      detected_intent: inferIntent(text),
      interactions_detected: Number(item.comments || 0),
      last_interaction: item.created_at || new Date().toISOString(),
      provider_source: "GitHub public search API",
      source_reliability: 52
    };
  }) : []
  );
}

async function searchDirectUrls(config) {
  const settled = await Promise.allSettled(
    config.monitorUrls.map(async (url) => {
      const response = await fetch(url, {
        headers: {
          "User-Agent": "InterstellarRadar360/1.0",
          Accept: "text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5"
        }
      });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      const html = await response.text();
      const title = asText(decodeHtml((html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || url));
      const description = asText(
        decodeHtml(
          (html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) || [])[1] ||
            (html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i) || [])[1] ||
            ""
        )
      );
      const bodyText = compact(html, 700);
      const email = firstBusinessEmail(html);
      const hasForm = /<form[\s\S]+?(contact|email|message|richiesta|preventivo)/i.test(html) || /contatti|contact|preventivo/i.test(url);
      return {
        platform: "Website",
        source_type: hasForm || email ? "business_website_public_contact" : "direct_url_public_signal",
        business_name: title,
        website: url,
        email_business_public: email,
        contact_form_url: hasForm ? url : "",
        source_url: url,
        source_page: title,
        source_item: title,
        relevant_text: compact(`${title}. ${description}. ${bodyText}`, 520),
        city: config.city,
        country: config.country,
        estimated_language: inferLanguage(`${title} ${description} ${bodyText}`, config.language),
        detected_intent: email || hasForm ? "contatto business pubblico" : inferIntent(`${title} ${description}`),
        interactions_detected: email || hasForm ? 12 : 1,
        last_interaction: new Date().toISOString(),
        provider_source: "Direct URL analyzer",
        source_reliability: email || hasForm ? 76 : 62
      };
    })
  );
  return settled.flatMap((result) => (result.status === "fulfilled" ? [result.value] : []));
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const config = getQuery(req);
  const providerJobs = [
    ["Reddit", "reddit", searchReddit],
    ["Hacker News", "hackerNews", searchHackerNews],
    ["Stack Exchange", "stackExchange", searchStackExchange],
    ["DEV", "devTo", searchDevTo],
    ["WordPress", "wordpress", searchWordPress],
    ["Serper", "serper", searchSerper],
    ["Open Web IT", "searchEngine", searchDuckDuckGo],
    ["GitHub", "github", searchGitHubIssues],
    ["Direct URL", "directUrls", searchDirectUrls]
  ].filter(([, key]) => providerEnabled(config, key) && (key !== "directUrls" || config.monitorUrls.length));
  const settled = await Promise.allSettled(providerJobs.map(([, , fn]) => fn(config)));
  const providers = providerJobs.filter((_, index) => settled[index].status === "fulfilled").map(([name]) => name);
  const provider_status = providerJobs.map(([name], index) => ({
    name,
    status: settled[index].status,
    count: settled[index].status === "fulfilled" ? settled[index].value.length : 0,
    error: settled[index].status === "rejected" ? settled[index].reason?.message || "provider failed" : ""
  }));
  const prospects = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((prospect) => prospect.source_url && prospect.relevant_text)
    .filter((prospect) => languageMatchesConfig(prospect, config))
    .filter((prospect) => monthsSince(prospect.last_interaction) <= config.recencyMonths);

  const strictProspects = prospects.filter((prospect) => isUsefulProspectForSearch(prospect, config));
  const relaxedProspects =
    strictProspects.length || !isProgrammingSearch(config)
      ? strictProspects
      : prospects
          .filter((prospect) => {
            const text = `${prospect.source_item || ""} ${prospect.relevant_text || ""} ${prospect.source_type || ""}`;
            if (/revshare|revenue share|dating|conoscere qualcuno|amici/i.test(text)) return false;
            return hasDevelopmentTerm(text) || hasClientIntent(text);
          })
          .map((prospect) => ({
            ...prospect,
            source_reliability: Math.max(35, Number(prospect.source_reliability || 55) - 12),
            internal_notes: "Fallback qualità: segnale più largo perché i filtri stretti non hanno prodotto risultati."
          }));

  const seen = new Set();
  const unique = relaxedProspects
    .filter((prospect) => {
      const key = `${prospect.source_url}|${prospect.relevant_text.slice(0, 80)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, config.limit);

  return json(res, 200, {
    generated_at: new Date().toISOString(),
    query: config.q,
    providers,
    provider_status,
    fallback_relaxed: !strictProspects.length && relaxedProspects.length > 0,
    prospects: unique
  });
};
