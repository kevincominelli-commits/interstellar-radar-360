const DEFAULT_LIMIT = 30;
const MAX_PROVIDER_RESULTS = 10;
const DEFAULT_RECENCY_MONTHS = 12;
const SERPER_MAX_QUERIES = 12;
const APIFY_MAX_RESULTS = envNumber("APIFY_MAX_RESULTS", 5, 1, 50);
const APIFY_MAX_RUNS = envNumber("APIFY_MAX_RUNS", 6, 1, 30);
const APIFY_TIMEOUT_SECONDS = envNumber("APIFY_TIMEOUT_SECONDS", 45, 8, 55);
const APIFY_MAX_CHARGE_USD = envNumber("APIFY_MAX_CHARGE_USD", 0.5, 0.5, 10);
const APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT = envNumber("APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT", 1, 1, 5);
const APIFY_YOUTUBE_COMMENTS_PER_VIDEO = envNumber("APIFY_YOUTUBE_COMMENTS_PER_VIDEO", 5, 3, 120);
const APIFY_COMMENTS_PER_SOURCE = envNumber("APIFY_COMMENTS_PER_SOURCE", 15, 5, 250);
const APIFY_FOLLOWERS_PER_SOURCE = envNumber("APIFY_FOLLOWERS_PER_SOURCE", 20, 5, 500);
const APIFY_LIKES_PER_SOURCE = envNumber("APIFY_LIKES_PER_SOURCE", 20, 5, 500);
const APIFY_PROFILES_PER_SOURCE = envNumber("APIFY_PROFILES_PER_SOURCE", 6, 1, 80);
const APIFY_INSTAGRAM_POSTS_PER_PROFILE = envNumber("APIFY_INSTAGRAM_POSTS_PER_PROFILE", 4, 1, 20);

const providerSourceMap = {
  reddit: ["Reddit", "Forum"],
  hackerNews: ["Forum", "Website", "Blog"],
  stackExchange: ["Forum", "Website", "Blog"],
  devTo: ["Blog", "Website", "Forum"],
  wordpress: ["Blog", "Website"],
  serper: ["Forum", "Website", "Blog", "Directory", "Reviews"],
  searchEngine: ["Forum", "Website", "Blog", "Directory", "Reviews"],
  youtubeAudience: ["YouTube"],
  apify: ["Instagram", "Facebook", "TikTok", "LinkedIn", "Twitter/X", "YouTube", "Reddit", "Telegram", "Forum", "Website", "Directory", "Reviews"],
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
  "italiapersonalfinance",
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

function envNumber(name, fallback, min = 0, max = Number.MAX_SAFE_INTEGER) {
  const value = Number(process.env[name]);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

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
  if (/come inizio|come iniziare|quale broker|prop firm|challenge|funded|segnali|copy trading|bot trading|expert advisor|metatrader|mt5|forex|crypto|xauusd/.test(lower)) return "interesse trading";
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

function isJobOrHiringNoise(text = "", link = "") {
  const host = hostnameOf(link);
  const haystack = `${host} ${link} ${text}`.toLowerCase();
  if (
    /indeed|infojobs|glassdoor|monster|jooble|jobrapido|talent\.com|adzuna|careerjet|helplavoro|lavoro\.|linkedin\.com\/jobs|\/jobs\//i.test(
      haystack
    )
  ) {
    return true;
  }
  if (/\/(jobs?|careers?|lavora-con-noi|posizioni-aperte|candidature|recruiting|work-with-us)(\/|$|\?)/i.test(haystack)) {
    return true;
  }
  return /\b(offert[ae] di lavoro|annuncio di lavoro|posizione aperta|posizioni aperte|lavora con noi|cerchiamo sviluppatore|cerchiamo programmatore|cerchiamo developer|assumiamo|assunzione|candidati|candidatura|curriculum|cv\b|recruiter|risorse umane|stage|tirocinio|junior developer|senior developer|full[-\s]?time|part[-\s]?time|contratto|ral\b|stipendio|vacancy|hiring|we are hiring|job offer|job opening|remote job)\b/i.test(
    haystack
  );
}

function isProgrammingSearch(config = {}) {
  return hasDevelopmentTerm(`${config.q} ${config.niche} ${config.keywords}`);
}

function isAudienceMiningSource(prospect = {}) {
  return /audience_source|apify_social_(video|post|profile)_source|apify_social_search_signal|apify_social_hashtag|ad_source|source_to_mine/i.test(
    prospect.source_type || ""
  );
}

function isTradingSearch(config = {}) {
  return /trading|forex|crypto|criptovalute|xauusd|gold|prop firm|funded|challenge|metatrader|mt5|expert advisor|segnali|copy trading|bot trading|investimenti/i.test(
    `${config.q || ""} ${config.niche || ""} ${config.keywords || ""} ${config.hashtags || ""}`
  );
}

function hasTradingSignal(text = "") {
  const lower = asText(text).toLowerCase();
  const tradingContext =
    /\b(trading|forex|crypto|criptovalute|bitcoin|prop firm|funded|challenge|xauusd|gold|oro|nasdaq|sp500|metatrader|mt4|mt5|expert advisor|ea\b|bot trading|copy trading|scalping|segnali|broker)\b/i.test(
      lower
    );
  const buyerOrNeed =
    /\b(come inizio|come iniziare|iniziare|principiante|non so|mi serve|cerco|vorrei|mi interessa|info|consigli|consigliate|quale broker|che broker|prop firm consigli|challenge|corso|mentorship|segnali|bot|automatizzare|perdo|non riesco|aiuto|funziona davvero|vale la pena|opinioni|recensioni)\b/i.test(
      lower
    );
  return tradingContext && buyerOrNeed;
}

function isUsefulProspectForSearch(prospect = {}, config = {}) {
  const sourceType = String(prospect.source_type || "");
  const noiseText = `${prospect.source_item || ""} ${prospect.relevant_text || ""} ${prospect.bio_public || ""} ${sourceType}`;
  if (isJobOrHiringNoise(noiseText, prospect.source_url || prospect.profile_link || prospect.website)) return false;
  if (isAudienceMiningSource(prospect) || /source_to_mine/i.test(sourceType)) return true;
  if (/comment|follower|like|reaction|profile|channel|group|community/i.test(sourceType)) {
    const text = noiseText;
    if (/garantito|100%|soldi facili|pump|casino|bonus|airdrop|follow4follow/i.test(text)) return false;
    if (isItalianMode(config) && prospect.estimated_language === "en" && !looksItalian(text)) {
      return /italia|italy|italiano|roma|milano|napoli|torino|bologna/i.test(`${prospect.source_url || ""} ${prospect.source_page || ""}`);
    }
    return true;
  }
  if (isTradingSearch(config)) {
    const text = `${prospect.source_item || ""} ${prospect.relevant_text || ""} ${prospect.bio_public || ""} ${prospect.source_type || ""}`;
    if (/garantito|100%|soldi facili|diventa ricco|pump|casino|bonus/i.test(text)) return false;
    if (prospect.platform === "YouTube" && !/comment/i.test(prospect.source_type || "")) return false;
    return hasTradingSignal(text) || (/comment/i.test(prospect.source_type || "") && /trading|forex|crypto|prop firm|mt5|xauusd/i.test(text));
  }
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

function firstValue(...values) {
  return values.find((value) => value !== undefined && value !== null && String(value).trim() !== "") || "";
}

function getPath(object = {}, path = "") {
  return String(path)
    .split(".")
    .reduce((value, key) => (value && typeof value === "object" ? value[key] : undefined), object);
}

function pickPath(object = {}, paths = []) {
  for (const path of paths) {
    const value = getPath(object, path);
    if (Array.isArray(value)) {
      const compacted = value.map((item) => (typeof item === "object" ? JSON.stringify(item) : String(item))).filter(Boolean).join(", ");
      if (compacted) return compacted;
    } else if (value !== undefined && value !== null && String(value).trim()) {
      return value;
    }
  }
  return "";
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
  if (/forum\.html\.it|html\.it|giorgiotave\.it|forumfree\.it|forumcommunity\.net|alfemminile\.com|finanzaonline\.com|investireoggi\.it|mql5\.com|hwupgrade\.it|inforge\.net/i.test(host)) return true;
  return looksItalian(text) && !/\b(looking for|need a|hire|developer wanted|busco|caut|desarrollador|programare)\b/i.test(text);
}

function hasExplicitHireRequest(text = "") {
  return /cerco (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance|web agency|software house)|cerco (sviluppatore|programmatore|freelance)|sto cercando (uno |una |un |qualcuno |)(sviluppatore|programmatore|freelance)|buongiorno cerco|solo a chi parla italiano.{0,80}cerco|cerco.{0,80}(sito ecommerce|app|bot|gestionale|software)|sistemare (gestionale|sito|app|software)|budget.{0,80}(sito|app|software|gestionale|sviluppatore|programmatore)|pubblicato da/i.test(
    text
  );
}

function isMarketplaceOrCommunityLead(link = "", text = "") {
  const host = hostnameOf(link);
  return /facebook\.com|linkedin\.com|freelancer\.|addlance\.com|techlance\.it|malt\.it|inforge\.net|forum\.|reddit\.com|italia\.it|iprogrammatori\.it|arduino\.cc/i.test(
    `${host} ${link} ${text}`
  );
}

function isMarketplaceSellerListing(link = "", text = "") {
  const haystack = `${hostnameOf(link)} ${link} ${text}`;
  if (/^sviluppatori? .*freelance:|^programmatori? .*freelance:|i migliori \d+|migliori (sviluppatori|programmatori|freelance|web designer)/i.test(text)) return true;
  if (hasExplicitHireRequest(text) || /budget|pubblicato da|sto cercando|mi serve|voglio creare|devo creare/i.test(text)) return false;
  return /i migliori \d+|migliori (sviluppatori|programmatori|freelance|web designer)|trova (un |uno |una |i |)(freelance|sviluppatore|programmatore|professionista|web designer)|assumi (un |uno |una |)(freelance|sviluppatore|programmatore)|network di freelance|professionisti esperti|ricevi preventivi|confronta preventivi|preventivi gratis|servizi freelance/i.test(
    haystack
  );
}

function isMarketingContentNoise(link = "", text = "") {
  const haystack = `${hostnameOf(link)} ${link} ${text}`;
  if (hasExplicitHireRequest(text)) return false;
  return /quanto costa (un |una |)(sito|app)|preventivo (gratis|per un sito|sito web|troppo alto)|realizzazione siti|creazione siti|web agency|agenzia web|sito web per aziende|migliori costruttori|consulenza gratuita|prenota consulenza|richiedi preventivo|servizio di web design|social media manager|seo|branding|marketing|modulo contatti|avere un sito|mi serve un sito se ho|vuoi creare|vuoi sviluppare|ti serve (un |una |)(sito|app|piattaforma)|creo\/personalizzo|creiamo per te|realizziamo|sviluppiamo|costruiamo|ti aiutiamo a|scopri come|guarda il webinar|iscriviti al webinar|fissa una call|scarica la guida|network di freelance|professionisti esperti|ricevi preventivi|confronta preventivi/i.test(
    haystack
  );
}

function isSellerOrAdSignal(text = "") {
  return /vuoi creare|vuoi sviluppare|ti serve (un |una |)(sito|app|piattaforma)|creo\/personalizzo|creo per te|creiamo per te|realizziamo|sviluppiamo|costruiamo|agenzia|web agency|software house|prenota|consulenza gratuita|fissa una call|scopri come|guarda il webinar|webinar gratuito|clicca qui|link in bio|scrivimi info|ti aiutiamo a|servizio di/i.test(
    text
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
  const hashtags = params.get("hashtags") || "";
  const competitors = (params.get("competitors") || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 16);
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
  const visibleLimit = Math.max(5, Math.min(250, Number(params.get("visibleLimit") || params.get("requestedVisibleLeads") || DEFAULT_LIMIT)));
  const limit = Math.max(5, Math.min(250, Number(params.get("limit") || DEFAULT_LIMIT)));
  const audienceType = params.get("audienceType") || "mix";
  const radarMode = params.get("radarMode") || "auto";
  const base = [niche, keywords, country, city].filter(Boolean).join(" ");
  return {
    q: compact(base, 180),
    niche,
    keywords,
    hashtags,
    competitors,
    country,
    city,
    language,
    sources,
    monitorUrls,
    recencyMonths,
    limit,
    visibleLimit,
    audienceType,
    radarMode
  };
}

function providerEnabled(config, providerKey) {
  const audienceProviderKeys = new Set(["serper", "youtubeAudience", "apify", "directUrls"]);
  if (!audienceProviderKeys.has(providerKey)) return false;
  if (providerKey === "apify" && config.sources.length && config.sources.every((source) => source === "YouTube")) return false;
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

function audienceSeedTerms(config = {}) {
  const raw = apifySplitList(`${config.niche || ""}, ${config.keywords || ""}, ${config.hashtags || ""}`)
    .map((item) => item.replace(/^#/, "").trim())
    .filter((item) => item.length >= 3);
  if (isTradingSearch(config)) {
    return [
      "trader italiani",
      "forex italia",
      "prop firm italia",
      "tradingitalia",
      "trading per principianti",
      "bot trading mt5",
      "crypto trading italia",
      "copy trading italia"
    ];
  }
  const programming = isProgrammingSearch(config)
    ? ["programmazione", "sviluppo app", "siti web", "automazioni AI", "software gestionale", "ecommerce", "startup Italia", "no-code"]
    : [];
  return [...new Set([...raw, ...programming])].slice(0, 8);
}

function isSourceDiscoveryNoise(text = "", link = "", config = {}) {
  const haystack = `${hostnameOf(link)} ${link} ${text}`.toLowerCase();
  if (isJobOrHiringNoise(text, link)) return true;
  if (isTradingSearch(config)) {
    if (!/(#trading|tradingitalia|trading online|trading automatico|trading per principianti|bot trading|copy trading|\bforex\b|prop firm|propfirm|mt4|mt5|metatrader|crypto|criptovalute|xauusd|scalping|analisi tecnica|mercati finanziari|investimenti|borsa)/i.test(haystack)) {
      return true;
    }
    return /italian trade agency|ice agenzia|trade agency|food trade|wine and food|aahar|bellavita|export|import|manufacturer|manufacturers|turkish-manufacturers|business forum|partner country|trading cards|trader joe|italian brainrot/i.test(
      haystack
    );
  }
  return false;
}

function sourceDiscoveryQueries(config) {
  const country = config.country || "Italia";
  const city = config.city ? ` ${config.city}` : "";
  const terms = audienceSeedTerms(config);
  const primary = terms[0] || config.niche || "business";
  const antiJob = "-jobs -job -lavoro -offerte -assunzioni -assunzione -careers -career -recruiting -cv";
  const sourceQueries = [];
  terms.slice(0, 4).forEach((term) => {
    sourceQueries.push(`site:instagram.com ${term} ${country}${city} creator community ${antiJob}`);
    sourceQueries.push(`site:instagram.com/reel ${term} ${country}${city} ${antiJob}`);
    sourceQueries.push(`site:tiktok.com ${term} ${country}${city} creator ${antiJob}`);
    sourceQueries.push(`site:youtube.com/watch ${term} ${country}${city} commenti community ${antiJob}`);
  });
  sourceQueries.push(`site:facebook.com/groups ${primary} ${country}${city} community ${antiJob}`);
  sourceQueries.push(`site:linkedin.com/posts ${primary} ${country}${city} creator community ${antiJob}`);
  sourceQueries.push(`site:reddit.com/r/ ${primary} ${country}${city} community -inurl:?tl= ${antiJob}`);
  sourceQueries.push(`${primary} community ${country}${city} ${antiJob}`);
  sourceQueries.push(`${primary} canale Telegram ${country}${city} ${antiJob}`);
  sourceQueries.push(`${primary} creator ${country}${city} ${antiJob}`);
  sourceQueries.push(`${primary} pagine Instagram ${country}${city} ${antiJob}`);
  return [...new Set(sourceQueries.map((query) => query.replace(/\s+/g, " ").trim()))].slice(0, SERPER_MAX_QUERIES);
}

function serperQueries(config) {
  return sourceDiscoveryQueries(config);
}

function prospectFromSearchResult(result = {}, config = {}, provider = "Serper Google Search") {
  const title = stripHtml(result.title || result.question || "");
  const link = result.link || result.url || "";
  const snippet = stripHtml(result.snippet || result.answer || "");
  const text = compact(`${title}. ${snippet}`);
  const haystack = `${link} ${title} ${snippet}`;
  const host = hostnameOf(link);
  const isSocialPage = /facebook\.com|linkedin\.com|instagram\.com|tiktok\.com|youtube\.com/i.test(host);
  const isMarketplace = /freelancer\.|addlance\.com|techlance\.it|malt\.it/i.test(host);
  const isForum = !isSocialPage && !isMarketplace && /forum|community|reddit|discussioni|thread|risposte|stackoverflow|quora/i.test(haystack);
  const isBusinessContact = /contatti|azienda|directory|paginegialle|scheda|maps|servizi|professionista|business/i.test(haystack);
  if (!link || !title) return null;
  if (!passesExplicitRecency(text, config)) return null;
  if (isSourceDiscoveryNoise(text, link, config)) return null;
  const platform = isSocialPage
    ? host.includes("facebook")
      ? "Facebook"
      : host.includes("linkedin")
        ? "LinkedIn"
        : host.includes("instagram")
          ? "Instagram"
          : host.includes("tiktok")
            ? "TikTok"
            : host.includes("youtube")
              ? "YouTube"
              : "Website"
    : isForum
      ? "Forum"
      : "Website";
  const sourceType =
    platform === "YouTube" && /watch|shorts|youtu\.be/i.test(link)
      ? "youtube_video_source_to_mine"
      : isSocialPage
        ? "social_source_to_mine"
        : isForum
          ? "community_source_to_mine"
          : isBusinessContact || isMarketplace
            ? "business_directory_source_to_mine"
            : "website_source_to_mine";
  return {
    platform,
    source_type: sourceType,
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
    detected_intent: "fonte audience rilevante",
    interactions_detected: 1,
    last_interaction: new Date().toISOString(),
    provider_source: provider,
    source_reliability: isMarketplace || isSocialPage ? 86 : isForum ? 74 : 68,
    internal_notes: "Fonte scoperta da Serper. Non è un lead finale: va usata per estrarre audience/commentatori/follower pubblici disponibili."
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

function sourceSelected(config = {}, source = "") {
  return !config.sources.length || config.sources.includes(source);
}

function apifyActorPath(actorId = "") {
  return encodeURIComponent(String(actorId || "").trim().replace(/\//g, "~"));
}

function apifySplitList(value = "") {
  return String(value || "")
    .split(/[\n,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function apifySearchTerms(config = {}) {
  const direct = apifySplitList(`${config.keywords || ""}, ${config.niche || ""}`)
    .map((item) => item.replace(/^#/, "").trim())
    .filter((item) => item.length >= 3)
    .slice(0, 8);
  const programming = isProgrammingSearch(config)
    ? [
        "programmazione",
        "sviluppo app",
        "sviluppo software",
        "creare app",
        "siti web",
        "automazioni AI",
        "software gestionale",
        "ecommerce Italia",
        "startup Italia",
        "imprenditori digitali"
      ]
    : [];
  const trading = isTradingSearch(config)
    ? [
        "trading",
        "trading Italia",
        "trading per principianti",
        "prop firm Italia",
        "forex trading Italia",
        "trading automatico",
        "bot trading MT5",
        "xauusd",
        "copy trading",
        "crypto trading Italia"
      ]
    : [];
  const city = config.city ? ` ${config.city}` : "";
  const country = config.country ? ` ${config.country}` : "";
  return [...new Set([...direct, ...programming, ...trading].map((term) => compact(`${term}${country}${city}`, 90)))]
    .filter(Boolean)
    .slice(0, 5);
}

function apifyHashtags(config = {}) {
  const fromInput = apifySplitList(config.hashtags).map((item) => item.replace(/^#/, ""));
  const fromKeywords = apifySplitList(config.keywords)
    .filter((item) => item.startsWith("#"))
    .map((item) => item.replace(/^#/, ""));
  const fallback = isProgrammingSearch(config)
    ? ["startupitalia", "businessitalia", "ecommerceitalia", "automazioni", "intelligenzaartificiale", "sviluppoapp"]
    : isTradingSearch(config)
      ? ["tradingitalia", "forexitalia", "propfirm", "tradingperprincipianti", "bottrading", "mt5"]
      : [];
  return [...new Set([...fromInput, ...fromKeywords, ...fallback].map((item) => item.replace(/[^\p{L}\p{N}_-]/gu, "").trim()).filter(Boolean))]
    .slice(0, 6);
}

function apifyMonitorUrls(config = {}, pattern) {
  return (config.monitorUrls || []).filter((url) => pattern.test(url)).slice(0, 6);
}

function apifyYouTubeCommentsActorId() {
  if (process.env.APIFY_YOUTUBE_COMMENTS_ACTOR_ID === "off") return "";
  return process.env.APIFY_YOUTUBE_COMMENTS_ACTOR_ID || "streamers/youtube-comments-scraper";
}

function apifyInstagramLikesActorId() {
  if (process.env.APIFY_INSTAGRAM_LIKES_ACTOR_ID === "off") return "";
  return process.env.APIFY_INSTAGRAM_LIKES_ACTOR_ID || "scrapapi/instagram-likes-scraper";
}

function apifyActorId(envName, fallback = "") {
  const value = process.env[envName];
  if (String(value || "").toLowerCase() === "off") return "";
  return String(value || fallback || "").trim();
}

function pushApifySpec(specs, envName, fallback, spec) {
  const actorId = apifyActorId(envName, fallback);
  if (!actorId) return;
  specs.push({ ...spec, actorId, envName });
}

function apifySinceDate(config = {}) {
  const months = Math.max(1, Math.min(60, Number(config.recencyMonths || DEFAULT_RECENCY_MONTHS)));
  return new Date(Date.now() - months * 30.44 * 86400000).toISOString().slice(0, 10);
}

function apifyRelativeRecency(config = {}) {
  return `${Math.max(1, Math.min(12, Number(config.recencyMonths || 12)))} months`;
}

function apifyCompetitorValues(config = {}) {
  return Array.isArray(config.competitors) ? config.competitors : apifySplitList(config.competitors);
}

function apifyTextTargets(config = {}) {
  return [...new Set([...apifyCompetitorValues(config), ...(config.monitorUrls || [])].map((item) => String(item || "").trim()).filter(Boolean))].slice(0, 12);
}

function singleTokenHandle(value = "") {
  const text = String(value || "").trim().replace(/^@/, "");
  if (!/^[a-z0-9._-]{2,80}$/i.test(text)) return "";
  if (/^(web|agency|software|house|creator|community|pagine|canali|gruppi|trading|business|marketing)$/i.test(text)) return "";
  return text;
}

function pathPartFromUrl(value = "", hostPattern, allowed = () => true) {
  try {
    const url = new URL(value);
    if (!hostPattern.test(url.hostname)) return "";
    const part = decodeURIComponent(url.pathname.split("/").filter(Boolean)[0] || "");
    return part && allowed(url, part) ? part : "";
  } catch {
    return "";
  }
}

function socialProfileTargets(config = {}, platform = "") {
  const raw = apifyTextTargets(config);
  const targets = [];
  raw.forEach((value) => {
    const text = String(value || "").trim();
    if (!text) return;
    if (/^https?:\/\//i.test(text)) {
      if (platform === "Instagram") {
        const handle = pathPartFromUrl(text, /instagram\.com$/i, (url, part) => !/^(p|reel|tv|stories|explore|tags)$/i.test(part));
        if (handle) targets.push(handle);
      }
      if (platform === "TikTok") {
        const handle = pathPartFromUrl(text, /tiktok\.com$/i, (url, part) => part.startsWith("@")).replace(/^@/, "");
        if (handle) targets.push(handle);
      }
      if (platform === "Twitter/X") {
        const handle = pathPartFromUrl(text, /(twitter\.com|x\.com)$/i, (url, part) => !/^(i|search|hashtag|home)$/i.test(part));
        if (handle) targets.push(handle);
      }
      if (platform === "Facebook" && /facebook\.com/i.test(text) && !/\/(groups|posts|videos|reel|watch|permalink|photo)(\/|$)/i.test(text)) targets.push(text);
      if (platform === "LinkedIn" && /linkedin\.com\/in\//i.test(text)) targets.push(text);
      if (platform === "LinkedInCompany" && /linkedin\.com\/company\//i.test(text)) targets.push(text);
      return;
    }
    const handle = singleTokenHandle(text);
    if (handle && ["Instagram", "TikTok", "Twitter/X"].includes(platform)) targets.push(handle);
  });
  return [...new Set(targets)].slice(0, APIFY_PROFILES_PER_SOURCE);
}

function socialUrls(config = {}, pattern, max = 8) {
  return uniqueUrls((config.monitorUrls || []).filter((url) => pattern.test(url))).slice(0, max);
}

function telegramChannelTargets(config = {}) {
  const targets = [];
  apifyTextTargets(config).forEach((value) => {
    const text = String(value || "").trim();
    if (/^https?:\/\//i.test(text)) {
      const channel = pathPartFromUrl(text.replace("t.me/s/", "t.me/"), /t\.me$/i, (url, part) => !/^(s|c)$/i.test(part));
      if (channel) targets.push(channel);
      return;
    }
    const handle = singleTokenHandle(text);
    if (handle) targets.push(handle);
  });
  return [...new Set(targets)].slice(0, APIFY_PROFILES_PER_SOURCE);
}

function apifyCountryCode(config = {}) {
  const country = String(config.country || "").toLowerCase();
  if (/italia|italy|it\b/.test(country)) return "IT";
  if (/united states|usa|us\b/.test(country)) return "US";
  if (/spain|espa/.test(country)) return "ES";
  if (/france|francia/.test(country)) return "FR";
  if (/germany|germania|deutschland/.test(country)) return "DE";
  return "";
}

function apifyRunSpecs(config = {}) {
  const terms = apifySearchTerms(config);
  const hashtags = apifyHashtags(config);
  const instagramPostUrls = socialUrls(config, /instagram\.com\/(p|reel|tv)\//i);
  const instagramProfiles = socialProfileTargets(config, "Instagram");
  const facebookGroupUrls = socialUrls(config, /facebook\.com\/groups/i);
  const facebookPostUrls = socialUrls(config, /facebook\.com\/.*\/(posts|permalink|photo|watch|reel|videos)|fb\.watch/i);
  const facebookPageUrls = socialProfileTargets(config, "Facebook");
  const tiktokVideoUrls = socialUrls(config, /tiktok\.com\/@[^/]+\/video\//i);
  const tiktokProfiles = socialProfileTargets(config, "TikTok");
  const linkedinProfileUrls = socialProfileTargets(config, "LinkedIn");
  const linkedinCompanyUrls = socialProfileTargets(config, "LinkedInCompany");
  const twitterProfiles = socialProfileTargets(config, "Twitter/X");
  const twitterUrls = socialUrls(config, /(twitter\.com|x\.com)\/[^/]+\/status\//i);
  const redditUrls = socialUrls(config, /reddit\.com\/r\/|reddit\.com\/user\/|reddit\.com\/.*\/comments\//i);
  const telegramChannels = telegramChannelTargets(config);
  const specs = [];

  if (process.env.APIFY_ENABLE_YOUTUBE_SEARCH_ACTOR === "true" && sourceSelected(config, "YouTube") && terms.length) {
    specs.push({
      name: "Apify YouTube Search",
      actorId: process.env.APIFY_YOUTUBE_ACTOR_ID || "streamers/youtube-scraper",
      platform: "YouTube",
      kind: "social_video_search",
      limit: isTradingSearch(config) || isProgrammingSearch(config) ? Math.min(APIFY_MAX_RESULTS, 3) : APIFY_MAX_RESULTS,
      input: {
        searchQueries: terms.slice(0, 3),
        maxResults: isTradingSearch(config) || isProgrammingSearch(config) ? Math.min(APIFY_MAX_RESULTS, 3) : Math.min(APIFY_MAX_RESULTS, 8),
        maxResultsShorts: 0,
        maxResultStreams: 0,
        sortingOrder: "date",
        dateFilter: config.recencyMonths <= 1 ? "month" : "year",
        videoType: "video"
      }
    });
  }

  if (sourceSelected(config, "Instagram") && terms.length) {
    pushApifySpec(specs, "APIFY_INSTAGRAM_SEARCH_ACTOR_ID", "apify/instagram-search-scraper", {
      name: "Apify Instagram Search",
      platform: "Instagram",
      kind: "social_search",
      limit: APIFY_MAX_RESULTS,
      input: {
        search: terms.slice(0, 3).join(", "),
        searchType: "user",
        searchLimit: APIFY_MAX_RESULTS,
        enhanceUserSearchWithFacebookPage: false
      }
    });
  }

  if (sourceSelected(config, "Instagram") && hashtags.length && process.env.APIFY_INSTAGRAM_HASHTAG_ACTOR_ID !== "off") {
    pushApifySpec(specs, "APIFY_INSTAGRAM_HASHTAG_ACTOR_ID", "apify/instagram-hashtag-scraper", {
      name: "Apify Instagram Hashtag",
      platform: "Instagram",
      kind: "social_hashtag",
      limit: APIFY_MAX_RESULTS,
      input: {
        hashtags: hashtags.slice(0, 4),
        resultsType: "posts",
        resultsLimit: Math.min(APIFY_MAX_RESULTS, 8),
        keywordSearch: false
      }
    });
  }

  if (sourceSelected(config, "Instagram") && instagramPostUrls.length) {
    pushApifySpec(specs, "APIFY_INSTAGRAM_COMMENTS_ACTOR_ID", "apify/instagram-comment-scraper", {
      name: "Apify Instagram Comments",
      platform: "Instagram",
      kind: "social_comment_signal",
      limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 6),
      input: {
        directUrls: instagramPostUrls,
        resultsLimit: APIFY_COMMENTS_PER_SOURCE,
        maxComments: APIFY_COMMENTS_PER_SOURCE,
        maxReplies: 0,
        includeNestedComments: false,
        isNewestComments: true,
        sessionId: process.env.APIFY_INSTAGRAM_SESSION_ID || undefined,
        proxyConfiguration: { useApifyProxy: true }
      }
    });
    pushApifySpec(specs, "APIFY_INSTAGRAM_LIKES_ACTOR_ID", "scrapapi/instagram-likes-scraper", {
      name: "Apify Instagram Likes",
      platform: "Instagram",
      kind: "social_like_signal",
      limit: Math.min(APIFY_LIKES_PER_SOURCE, APIFY_MAX_RESULTS * 8),
      input: {
        startUrls: instagramPostUrls,
        maxCount: APIFY_LIKES_PER_SOURCE,
        proxyConfiguration: { useApifyProxy: true }
      }
    });
  }

  if (sourceSelected(config, "Instagram") && instagramProfiles.length) {
    pushApifySpec(specs, "APIFY_INSTAGRAM_POSTS_ACTOR_ID", "apify/instagram-post-scraper", {
      name: "Apify Instagram Posts",
      platform: "Instagram",
      kind: "social_post_source",
      limit: Math.min(APIFY_INSTAGRAM_POSTS_PER_PROFILE * instagramProfiles.length, APIFY_MAX_RESULTS * 4),
      input: {
        usernames: instagramProfiles.map((username) => username.replace(/^@/, "")),
        resultsLimit: APIFY_INSTAGRAM_POSTS_PER_PROFILE,
        onlyPostsNewerThan: apifyRelativeRecency(config),
        addParentData: false
      }
    });
    pushApifySpec(specs, "APIFY_INSTAGRAM_PROFILE_ACTOR_ID", "apify/instagram-profile-scraper", {
      name: "Apify Instagram Source Profiles",
      platform: "Instagram",
      kind: "social_profile_source",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        usernames: instagramProfiles,
        resultsLimit: APIFY_PROFILES_PER_SOURCE,
        resultsType: "details",
        addParentData: false
      }
    });
    pushApifySpec(specs, "APIFY_INSTAGRAM_FOLLOWERS_ACTOR_ID", "scrapapi/instagram-followers-scraper", {
      name: "Apify Instagram Followers",
      platform: "Instagram",
      kind: "social_follower_extraction",
      limit: Math.min(APIFY_FOLLOWERS_PER_SOURCE, APIFY_MAX_RESULTS * 8),
      input: {
        startUrls: instagramProfiles.map((username) => `https://www.instagram.com/${username.replace(/^@/, "")}/`),
        maxData: APIFY_FOLLOWERS_PER_SOURCE,
        proxyConfiguration: { useApifyProxy: true }
      }
    });
  }

  if (sourceSelected(config, "TikTok") && terms.length) {
    pushApifySpec(specs, "APIFY_TIKTOK_ACTOR_ID", "clockworks/tiktok-scraper", {
      name: "Apify TikTok Search",
      platform: "TikTok",
      kind: "social_video_search",
      limit: APIFY_MAX_RESULTS,
      input: {
        searchQueries: terms.slice(0, 3),
        searchSection: "/video",
        resultsPerPage: Math.min(APIFY_MAX_RESULTS, 8)
      }
    });
  }

  if (sourceSelected(config, "TikTok") && tiktokVideoUrls.length) {
    pushApifySpec(specs, "APIFY_TIKTOK_COMMENTS_ACTOR_ID", "dltik/tiktok-scraper", {
      name: "Apify TikTok Comments",
      platform: "TikTok",
      kind: "social_comment_signal",
      limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 6),
      input: {
        mode: "comments",
        urls: tiktokVideoUrls,
        maxResults: APIFY_COMMENTS_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "TikTok") && tiktokProfiles.length) {
    pushApifySpec(specs, "APIFY_TIKTOK_PROFILE_ACTOR_ID", "dltik/tiktok-scraper", {
      name: "Apify TikTok Profiles",
      platform: "TikTok",
      kind: "social_profile_extraction",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        mode: "profiles",
        profiles: tiktokProfiles.map((username) => username.replace(/^@/, "")),
        maxResults: APIFY_PROFILES_PER_SOURCE
      }
    });
    pushApifySpec(specs, "APIFY_TIKTOK_FOLLOWERS_ACTOR_ID", "dltik/tiktok-scraper", {
      name: "Apify TikTok Followers",
      platform: "TikTok",
      kind: "social_follower_extraction",
      limit: Math.min(APIFY_FOLLOWERS_PER_SOURCE, APIFY_MAX_RESULTS * 8),
      input: {
        mode: "followers",
        profiles: tiktokProfiles.map((username) => username.replace(/^@/, "")),
        maxResults: APIFY_FOLLOWERS_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "Facebook") && facebookGroupUrls.length) {
    pushApifySpec(specs, "APIFY_FACEBOOK_GROUPS_ACTOR_ID", "apify/facebook-groups-scraper", {
      name: "Apify Facebook Groups",
      platform: "Facebook",
      kind: "social_group_posts",
      limit: APIFY_MAX_RESULTS,
      input: {
        startUrls: facebookGroupUrls.map((url) => ({ url })),
        resultsLimit: Math.min(APIFY_MAX_RESULTS, 10),
        onlyPostsNewerThan: apifyRelativeRecency(config)
      }
    });
  }

  if (sourceSelected(config, "Facebook") && facebookPostUrls.length) {
    pushApifySpec(specs, "APIFY_FACEBOOK_COMMENTS_ACTOR_ID", "apify/facebook-comments-scraper", {
      name: "Apify Facebook Comments",
      platform: "Facebook",
      kind: "social_comment_signal",
      limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 6),
      input: {
        startUrls: facebookPostUrls.map((url) => ({ url })),
        resultsLimit: APIFY_COMMENTS_PER_SOURCE,
        includeReplies: true
      }
    });
  }

  if (sourceSelected(config, "Facebook") && facebookPageUrls.length) {
    pushApifySpec(specs, "APIFY_FACEBOOK_PAGES_ACTOR_ID", "apify/facebook-pages-scraper", {
      name: "Apify Facebook Pages",
      platform: "Facebook",
      kind: "social_profile_extraction",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        startUrls: facebookPageUrls.map((url) => ({ url })),
        resultsLimit: APIFY_PROFILES_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "Facebook") && terms.length && process.env.APIFY_ENABLE_FACEBOOK_SEARCH === "true") {
    pushApifySpec(specs, "APIFY_FACEBOOK_SEARCH_ACTOR_ID", "apify/facebook-search-scraper", {
      name: "Apify Facebook Search",
      platform: "Facebook",
      kind: "social_search",
      limit: APIFY_MAX_RESULTS,
      input: {
        search: terms.slice(0, 3).join(", "),
        location: config.city || config.country || "",
        resultsLimit: APIFY_MAX_RESULTS
      }
    });
  }

  if (sourceSelected(config, "Facebook") && terms.length && process.env.APIFY_ENABLE_FACEBOOK_ADS === "true") {
    pushApifySpec(specs, "APIFY_FACEBOOK_ADS_ACTOR_ID", "apify/facebook-ads-scraper", {
      name: "Apify Facebook Ads Library",
      platform: "Facebook",
      kind: "social_ad_source",
      limit: APIFY_MAX_RESULTS,
      input: {
        searchTerms: terms.slice(0, 4),
        country: apifyCountryCode(config) || "IT",
        activeStatus: "ACTIVE",
        maxItems: APIFY_MAX_RESULTS
      }
    });
  }

  const youtubeUrls = apifyMonitorUrls(config, /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i);
  const youtubeCommentsActorId = apifyYouTubeCommentsActorId();
  if (sourceSelected(config, "YouTube") && youtubeUrls.length && youtubeCommentsActorId) {
    specs.push({
      name: "Apify YouTube Comments",
      actorId: youtubeCommentsActorId,
      platform: "YouTube",
      kind: "social_comment_signal",
      limit: APIFY_MAX_RESULTS,
      input: {
        startUrls: youtubeUrls.slice(0, APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT).map((url) => ({ url })),
        videoUrls: youtubeUrls.slice(0, APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT),
        maxComments: APIFY_YOUTUBE_COMMENTS_PER_VIDEO,
        maxCommentsPerVideo: APIFY_YOUTUBE_COMMENTS_PER_VIDEO,
        maxCommentPagesPerVideo: 2,
        includeReplies: false,
        fallbackToYtDlpComments: true,
        timeoutSec: Math.min(25, APIFY_TIMEOUT_SECONDS),
        sortBy: "newest",
        proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
      }
    });
  }

  if (sourceSelected(config, "LinkedIn") && terms.length) {
    pushApifySpec(specs, "APIFY_LINKEDIN_POSTS_ACTOR_ID", "apimaestro/linkedin-posts-search-scraper-no-cookies", {
      name: "Apify LinkedIn Posts",
      platform: "LinkedIn",
      kind: "social_post_search",
      limit: APIFY_MAX_RESULTS,
      input: {
        keyword: terms.slice(0, 3).join(" OR "),
        keywords: terms.slice(0, 3),
        totalPosts: APIFY_MAX_RESULTS,
        sortBy: "date"
      }
    });
  }

  if (sourceSelected(config, "LinkedIn") && linkedinProfileUrls.length) {
    pushApifySpec(specs, "APIFY_LINKEDIN_PROFILE_ACTOR_ID", "automation-lab/linkedin-profile-scraper", {
      name: "Apify LinkedIn Profiles",
      platform: "LinkedIn",
      kind: "social_profile_extraction",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        profileUrls: linkedinProfileUrls,
        maxProfiles: APIFY_PROFILES_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "LinkedIn") && linkedinCompanyUrls.length) {
    pushApifySpec(specs, "APIFY_LINKEDIN_COMPANY_ACTOR_ID", "automation-lab/linkedin-company-scraper", {
      name: "Apify LinkedIn Companies",
      platform: "LinkedIn",
      kind: "social_business_extraction",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        companyUrls: linkedinCompanyUrls,
        maxCompanies: APIFY_PROFILES_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "Twitter/X") && terms.length && (process.env.APIFY_TWITTER_COOKIES || process.env.APIFY_ENABLE_TWITTER_SEARCH === "true")) {
    pushApifySpec(specs, "APIFY_TWITTER_SEARCH_ACTOR_ID", "automation-lab/twitter-scraper", {
      name: "Apify X Search",
      platform: "Twitter/X",
      kind: "social_post_search",
      limit: APIFY_MAX_RESULTS,
      input: {
        mode: "search",
        queries: terms.slice(0, 3),
        maxResults: APIFY_MAX_RESULTS,
        cookies: process.env.APIFY_TWITTER_COOKIES || undefined
      }
    });
  }

  if (sourceSelected(config, "Twitter/X") && (twitterProfiles.length || twitterUrls.length)) {
    pushApifySpec(specs, "APIFY_TWITTER_PROFILE_ACTOR_ID", "automation-lab/twitter-scraper", {
      name: "Apify X Profiles",
      platform: "Twitter/X",
      kind: "social_profile_extraction",
      limit: APIFY_PROFILES_PER_SOURCE,
      input: {
        mode: "profiles",
        usernames: twitterProfiles,
        urls: twitterUrls,
        maxResults: APIFY_PROFILES_PER_SOURCE,
        cookies: process.env.APIFY_TWITTER_COOKIES || undefined
      }
    });
  }

  if (sourceSelected(config, "Twitter/X") && twitterProfiles.length && (process.env.APIFY_TWITTER_COOKIES || process.env.APIFY_ENABLE_COOKIE_ACTORS === "true")) {
    pushApifySpec(specs, "APIFY_TWITTER_FOLLOWERS_ACTOR_ID", "automation-lab/twitter-scraper", {
      name: "Apify X Followers",
      platform: "Twitter/X",
      kind: "social_follower_extraction",
      limit: Math.min(APIFY_FOLLOWERS_PER_SOURCE, APIFY_MAX_RESULTS * 8),
      input: {
        mode: "followers",
        usernames: twitterProfiles,
        maxResults: APIFY_FOLLOWERS_PER_SOURCE,
        cookies: process.env.APIFY_TWITTER_COOKIES || undefined
      }
    });
  }

  if (sourceSelected(config, "Reddit") && (terms.length || redditUrls.length)) {
    pushApifySpec(specs, "APIFY_REDDIT_ACTOR_ID", "prodiger/reddit-scraper", {
      name: "Apify Reddit Posts & Comments",
      platform: "Reddit",
      kind: "social_comment_signal",
      limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 6),
      input: {
        urls: redditUrls,
        searchQuery: terms[0] || config.q || "",
        sort: "new",
        timeFilter: config.recencyMonths <= 1 ? "month" : "year",
        includeComments: true,
        maxPostsPerSource: Math.min(APIFY_MAX_RESULTS, 12),
        maxCommentsPerPost: APIFY_COMMENTS_PER_SOURCE
      }
    });
  }

  if (sourceSelected(config, "Telegram") && telegramChannels.length) {
    pushApifySpec(specs, "APIFY_TELEGRAM_ACTOR_ID", "viralanalyzer/telegram-channel-scraper", {
      name: "Apify Telegram Channels",
      platform: "Telegram",
      kind: "social_channel_extraction",
      limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 6),
      input: {
        channels: telegramChannels,
        searchQuery: terms[0] || "",
        since: apifySinceDate(config),
        maxPostsPerChannel: Math.min(APIFY_COMMENTS_PER_SOURCE, 100),
        includeChannelMeta: true
      }
    });
  }

  return specs.filter((spec) => spec.actorId && spec.actorId !== "off").slice(0, APIFY_MAX_RUNS);
}

async function runApifyActor(spec) {
  const params = new URLSearchParams({
    timeout: String(APIFY_TIMEOUT_SECONDS),
    clean: "true",
    format: "json",
    limit: String(spec.limit || APIFY_MAX_RESULTS),
    maxItems: String(spec.limit || APIFY_MAX_RESULTS),
    maxTotalChargeUsd: String(APIFY_MAX_CHARGE_USD)
  });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), (APIFY_TIMEOUT_SECONDS + 5) * 1000);
  try {
    const response = await fetch(`https://api.apify.com/v2/acts/${apifyActorPath(spec.actorId)}/run-sync-get-dataset-items?${params.toString()}`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${process.env.APIFY_TOKEN}`,
        "Content-Type": "application/json",
        "User-Agent": "InterstellarRadar360/1.0"
      },
      body: JSON.stringify(spec.input || {})
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message = payload?.error?.message || payload?.message || `${response.status} ${response.statusText}`;
      throw new Error(`${spec.name}: ${message}`);
    }
    return Array.isArray(payload) ? payload : [];
  } finally {
    clearTimeout(timer);
  }
}

function normalizeApifyTimestamp(value = "") {
  if (!value) return "";
  if (typeof value === "number") {
    const milliseconds = value > 10_000_000_000 ? value : value * 1000;
    return new Date(milliseconds).toISOString();
  }
  const text = String(value);
  if (/^\d+$/.test(text)) return normalizeApifyTimestamp(Number(text));
  const date = new Date(text);
  if (!Number.isNaN(date.getTime())) return date.toISOString();
  const months = text.match(/(\d+)\s+months?\s+ago/i);
  if (months) {
    const dateFromRelative = new Date();
    dateFromRelative.setMonth(dateFromRelative.getMonth() - Number(months[1]));
    return dateFromRelative.toISOString();
  }
  const days = text.match(/(\d+)\s+days?\s+ago/i);
  if (days) {
    const dateFromRelative = new Date(Date.now() - Number(days[1]) * 86400000);
    return dateFromRelative.toISOString();
  }
  return "";
}

function apifyItemUrl(item = {}) {
  return String(
    firstValue(
      pickPath(item, [
        "url",
        "postUrl",
        "postURL",
        "post_url",
        "videoUrl",
        "webVideoUrl",
        "inputUrl",
        "profileUrl",
        "profileURL",
        "profile_url",
        "linkedinUrl",
        "twitterUrl",
        "tweetUrl",
        "commentUrl",
        "likedPostUrl",
        "likedPost.url",
        "post.url",
        "permalink",
        "link",
        "sourceUrl",
        "pageUrl",
        "facebookUrl",
        "channelUrl"
      ]),
      item.shortCode ? `https://www.instagram.com/p/${item.shortCode}/` : "",
      item.code ? `https://www.instagram.com/p/${item.code}/` : "",
      item.videoId ? `https://www.youtube.com/watch?v=${item.videoId}` : ""
    )
  ).trim();
}

function looksLikeFakeSocialProfile(username = "", text = "", item = {}) {
  const handle = String(username || "").replace(/^@/, "").toLowerCase();
  const haystack = `${handle} ${text} ${JSON.stringify(item).slice(0, 1000)}`.toLowerCase();
  if (!handle || handle.length < 3) return true;
  if (/^\d{6,}$/.test(handle)) return true;
  if (/^[a-z]{1,4}\d{6,}$/.test(handle)) return true;
  if (/(airdrop|casino|bonus|giveaway|free money|pump|follow4follow|onlyfans|sex|xxx|loan|crypto giveaway|guaranteed profit)/i.test(haystack)) return true;
  const followers = Number(firstValue(pickPath(item, ["followersCount", "followers", "followerCount"]), NaN));
  const posts = Number(firstValue(pickPath(item, ["postsCount", "posts", "mediaCount"]), NaN));
  const isPrivate = String(firstValue(pickPath(item, ["isPrivate", "private"]), "")).toLowerCase() === "true";
  if (Number.isFinite(followers) && followers <= 1 && Number.isFinite(posts) && posts <= 0) return true;
  if (isPrivate && !text) return true;
  return false;
}

function prospectFromApifyItem(item = {}, config = {}, spec = {}) {
  const sourceUrl = apifyItemUrl(item);
  const username = String(
    firstValue(
      pickPath(item, [
        "username",
        "userName",
        "screenName",
        "handle",
        "ownerUsername",
        "ownerUserName",
        "owner.username",
        "owner.userName",
        "author",
        "authorName",
        "authorUsername",
        "author_handle",
        "authorHandle",
        "author_name",
        "author.name",
        "author.username",
        "user.username",
        "authorMeta.name",
        "channelName",
        "channelUsername",
        "channelUsername",
        "channelUsername",
        "pageName",
        "from.name",
        "commenterName",
        "displayName"
      ])
    )
  ).trim();
  const publicName = String(
    firstValue(
      pickPath(item, [
        "fullName",
        "full_name",
        "ownerFullName",
        "owner.fullName",
        "owner.name",
        "authorFullName",
        "authorName",
        "author_name",
        "authorMeta.nickName",
        "name",
        "title",
        "channelName",
        "from.name",
        "commenterName",
        "headline"
      ])
    )
  ).trim();
  const text = compact(
    firstValue(
      pickPath(item, [
        "text",
        "comment",
        "commentText",
        "caption",
        "postText",
        "description",
        "title",
        "body",
        "selfText",
        "tweet",
        "content",
        "message",
        "headline",
        "about",
        "videoDescription",
        "biography",
        "bio",
        "about",
        "snippet"
      ]),
      publicName
    ),
    620
  );
  const profileLink = String(
    firstValue(
      pickPath(item, [
        "profileUrl",
        "profileURL",
        "profile_url",
        "ownerProfileUrl",
        "owner.profileUrl",
        "authorChannelUrl",
        "channelUrl",
        "authorUrl",
        "authorMeta.profileUrl",
        "user.profileUrl",
        "linkedinUrl",
        "twitterUrl"
      ]),
      spec.platform === "Instagram" && username ? `https://www.instagram.com/${username.replace(/^@/, "")}/` : "",
      spec.platform === "TikTok" && username ? `https://www.tiktok.com/@${username.replace(/^@/, "")}` : "",
      spec.platform === "Twitter/X" && username ? `https://x.com/${username.replace(/^@/, "")}` : "",
      spec.platform === "YouTube" && username ? `https://www.youtube.com/@${username.replace(/^@/, "")}` : ""
    )
  ).trim();
  const businessEmail = firstBusinessEmail(`${JSON.stringify(item).slice(0, 3000)} ${text}`);
  const engagement = Number(
    firstValue(
      pickPath(item, ["commentsCount", "commentCount", "likesCount", "likeCount", "likes", "diggCount", "playCount", "viewCount", "views", "shares", "replyCount"]),
      1
    )
  );
  const lastInteraction =
    normalizeApifyTimestamp(
      firstValue(
        pickPath(item, [
          "timestamp",
          "createdAt",
          "takenAt",
          "taken_at",
          "date",
          "published_at",
          "publishedTimeText",
          "publishedAt",
          "uploadDate",
          "scrapedAt",
          "createTimeISO"
        ])
      )
    ) || new Date().toISOString();

  if (!sourceUrl && !profileLink) return null;
  if (!text && !username && !publicName) return null;

  const isComment = /comment/i.test(spec.kind) || Boolean(pickPath(item, ["comment", "commentText"]));
  const isLike = /like|reaction/i.test(spec.kind);
  const isFollower = /follower|following/i.test(spec.kind);
  const isProfile = /profile|channel/i.test(spec.kind);
  const isSourceProfile = /profile_source/i.test(spec.kind);
  const isBusinessSearch = Boolean(
    /business|company/i.test(spec.kind || "") || businessEmail || pickPath(item, ["externalUrl", "website", "businessAddress", "category", "businessCategoryName", "companySize"])
  );
  const sourceType = isComment
    ? "apify_social_comment_signal"
    : isLike
      ? "apify_social_like_signal"
      : isFollower
      ? "apify_social_follower_extraction"
      : isSourceProfile
        ? "apify_social_profile_source"
        : isProfile
          ? "apify_social_profile_extraction"
    : isBusinessSearch
      ? "apify_social_business_signal"
      : spec.kind === "social_video_search"
        ? "apify_social_video_source"
      : spec.kind === "social_group_posts"
        ? "apify_social_group_post_signal"
        : "apify_social_search_signal";

  if ((isComment || isLike || isFollower) && looksLikeFakeSocialProfile(username || publicName, text, item)) return null;

  if (isProgrammingSearch(config) && !isComment && !isLike && !isFollower && !isProfile && !isSourceProfile) {
    const explicitBuyer = hasServiceBuyingIntent(text) || hasExplicitHireRequest(text) || (hasOwnedProjectProblem(text) && hasDevelopmentTerm(text));
    if (!explicitBuyer) return null;
    if (isSellerOrAdSignal(text) && !explicitBuyer) return null;
  }

  if (isTradingSearch(config) && !isComment && !isLike && !isFollower && !isProfile && !isSourceProfile && !hasTradingSignal(text)) {
    return null;
  }

  return {
    platform: spec.platform || "Website",
    source_type: sourceType,
    username_public: username ? (username.startsWith("@") ? username : `@${username}`) : "",
    public_name: publicName,
    business_name: isBusinessSearch ? publicName : "",
    profile_link: profileLink,
    website: String(firstValue(pickPath(item, ["externalUrl", "website", "site", "businessWebsite"]), sourceUrl)).trim(),
    bio_public: compact(firstValue(pickPath(item, ["biography", "bio", "about", "description"]), ""), 260),
    email_business_public: businessEmail,
    phone_business_public: String(firstValue(pickPath(item, ["phone", "phoneNumber", "businessPhone"]), "")).trim(),
    source_url: sourceUrl || profileLink,
    source_page: spec.name,
    source_item: compact(firstValue(pickPath(item, ["title", "video_title", "videoTitle", "caption", "postText", "text", "commentText"]), publicName || username), 180),
    relevant_text: text,
    city: config.city,
    country: config.country,
    estimated_language: inferLanguage(text, config.language),
    detected_intent: inferIntent(text),
    interactions_detected: Number.isFinite(engagement) ? engagement : 1,
    last_interaction: lastInteraction,
    provider_source: `${spec.name} · ${spec.actorId}`,
    source_reliability: isComment ? 82 : isBusinessSearch ? 78 : 66,
    internal_notes: `Dato pubblico importato da Apify. Actor: ${spec.actorId}. Contatto social sempre manual assist.`
  };
}

function uniqueUrls(urls = []) {
  const seen = new Set();
  return urls
    .map((url) => String(url || "").trim())
    .filter(Boolean)
    .filter((url) => {
      const key = url.toLowerCase().replace(/[?&]feature=[^&]+/g, "");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function youtubeVideoIdFromUrl(value = "") {
  try {
    const url = new URL(value);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace(/^\//, "").split("/")[0] || "";
    if (url.searchParams.get("v")) return url.searchParams.get("v") || "";
    const shortMatch = url.pathname.match(/\/shorts\/([^/?#]+)/i);
    return shortMatch ? shortMatch[1] : "";
  } catch {
    const match = String(value || "").match(/(?:v=|youtu\.be\/|shorts\/)([a-zA-Z0-9_-]{8,})/);
    return match ? match[1] : "";
  }
}

function youtubeUrlsFromApifyResults(results = [], config = {}) {
  const fromMonitor = apifyMonitorUrls(config, /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i);
  const fromSearch = results.flatMap((result) => {
    if (result.status !== "fulfilled" || result.value.spec.platform !== "YouTube") return [];
    return result.value.items
      .map((item) => apifyItemUrl(item))
      .filter((url) => /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i.test(url));
  });
  return uniqueUrls([...fromMonitor, ...fromSearch]).slice(0, APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT);
}

function instagramPostUrlFromItem(item = {}) {
  const direct = apifyItemUrl(item);
  if (/instagram\.com\/(p|reel|tv)\//i.test(direct)) return direct;
  const shortcode = firstValue(pickPath(item, ["shortCode", "shortcode", "code", "postShortcode", "node.shortcode"]));
  return shortcode ? `https://www.instagram.com/p/${String(shortcode).replace(/^\/+|\/+$/g, "")}/` : "";
}

function instagramPostUrlsFromApifyResults(results = [], config = {}) {
  const fromMonitor = apifyMonitorUrls(config, /instagram\.com\/(p|reel|tv)\//i, 12);
  const fromItems = results.flatMap((result) => {
    if (result.status !== "fulfilled" || result.value.spec.platform !== "Instagram") return [];
    return result.value.items.flatMap((item) => {
      const nestedPosts = [
        ...(Array.isArray(item.latestPosts) ? item.latestPosts : []),
        ...(Array.isArray(item.posts) ? item.posts : []),
        ...(Array.isArray(item.edge_owner_to_timeline_media?.edges) ? item.edge_owner_to_timeline_media.edges.map((edge) => edge.node || edge) : [])
      ];
      return [instagramPostUrlFromItem(item), ...nestedPosts.map((post) => instagramPostUrlFromItem(post))];
    });
  });
  return uniqueUrls([...fromMonitor, ...fromItems])
    .filter((url) => /instagram\.com\/(p|reel|tv)\//i.test(url))
    .slice(0, Math.min(12, APIFY_INSTAGRAM_POSTS_PER_PROFILE * APIFY_PROFILES_PER_SOURCE));
}

function attachInstagramSourceContext(prospect = {}, postUrl = "") {
  if (!prospect || prospect.platform !== "Instagram") return prospect;
  if (!/comment|like|follower/i.test(prospect.source_type || "")) return prospect;
  return {
    ...prospect,
    source_page: /like/i.test(prospect.source_type) ? "Instagram like pubblici" : "Instagram commenti/follower pubblici",
    source_item: prospect.source_item || "Interazione pubblica Instagram",
    relevant_text: compact(`${prospect.relevant_text || "Utente pubblico trovato su fonte Instagram coerente con la nicchia."} Fonte: ${postUrl}`, 700),
    internal_notes: compact(`${prospect.internal_notes || ""} Audience estratta da post/fonte Instagram scoperta automaticamente.`, 420)
  };
}

function attachYouTubeSourceContext(prospect = {}, item = {}, contextByUrl = {}) {
  if (!prospect || prospect.platform !== "YouTube" || !/comment/i.test(prospect.source_type || "")) return prospect;
  const itemUrl = apifyItemUrl(item);
  const videoId = item.videoId || youtubeVideoIdFromUrl(itemUrl || prospect.source_url);
  const context = contextByUrl[itemUrl] || contextByUrl[prospect.source_url] || contextByUrl[videoId] || null;
  if (!context) return prospect;
  const sourceTitle = compact(context.title || prospect.source_item || "Video YouTube", 180);
  const sourceSnippet = compact(context.snippet || "", 220);
  return {
    ...prospect,
    source_page: "YouTube commenti recenti",
    source_item: sourceTitle,
    relevant_text: compact(`${prospect.relevant_text}. Fonte video: ${sourceTitle}. ${sourceSnippet}`, 700),
    keyword_match: compact(`${prospect.keyword_match || ""}, ${sourceTitle}`, 180),
    internal_notes: compact(`${prospect.internal_notes || ""} Video sorgente scoperto via Serper prima del comment mining.`, 400)
  };
}

async function searchYouTubeCommentsFromVideos(videoUrls = [], config = {}, contextByUrl = {}) {
  const actorId = apifyYouTubeCommentsActorId();
  if (!actorId || !videoUrls.length || !sourceSelected(config, "YouTube")) return [];
  const spec = {
    name: "Apify YouTube Comments",
    actorId,
    platform: "YouTube",
    kind: "social_comment_signal",
    limit: APIFY_MAX_RESULTS,
    input: {
      startUrls: videoUrls.map((url) => ({ url })),
      videoUrls,
      maxComments: APIFY_YOUTUBE_COMMENTS_PER_VIDEO,
      maxCommentsPerVideo: APIFY_YOUTUBE_COMMENTS_PER_VIDEO,
      maxCommentPagesPerVideo: 2,
      includeReplies: false,
      fallbackToYtDlpComments: true,
      timeoutSec: Math.min(25, APIFY_TIMEOUT_SECONDS),
      sortBy: "newest",
      proxyConfiguration: { useApifyProxy: true, apifyProxyGroups: ["RESIDENTIAL"] }
    }
  };
  const items = await runApifyActor(spec);
  return items
    .map((item) => prospectFromApifyItem(item, config, spec))
    .map((prospect, index) => attachYouTubeSourceContext(prospect, items[index], contextByUrl))
    .filter(Boolean);
}

async function searchInstagramCommentsFromPosts(postUrls = [], config = {}) {
  if (!postUrls.length || !sourceSelected(config, "Instagram")) return [];
  const actorId = apifyActorId("APIFY_INSTAGRAM_COMMENTS_ACTOR_ID", "apify/instagram-comment-scraper");
  if (!actorId) return [];
  const spec = {
    name: "Apify Instagram Comments",
    actorId,
    platform: "Instagram",
    kind: "social_comment_signal",
    limit: Math.min(APIFY_COMMENTS_PER_SOURCE, APIFY_MAX_RESULTS * 8),
    input: {
      directUrls: postUrls,
      resultsLimit: APIFY_COMMENTS_PER_SOURCE,
      maxComments: APIFY_COMMENTS_PER_SOURCE,
      maxReplies: 0,
      includeNestedComments: false,
      isNewestComments: true,
      sessionId: process.env.APIFY_INSTAGRAM_SESSION_ID || undefined,
      proxyConfiguration: { useApifyProxy: true }
    }
  };
  const items = await runApifyActor(spec);
  return items
    .map((item) => prospectFromApifyItem(item, config, spec))
    .map((prospect, index) => attachInstagramSourceContext(prospect, postUrls[index % postUrls.length]))
    .filter(Boolean);
}

async function searchInstagramLikesFromPosts(postUrls = [], config = {}) {
  if (!postUrls.length || !sourceSelected(config, "Instagram")) return [];
  const actorId = apifyInstagramLikesActorId();
  if (!actorId) return [];
  const spec = {
    name: "Apify Instagram Likes",
    actorId,
    platform: "Instagram",
    kind: "social_like_signal",
    limit: Math.min(APIFY_LIKES_PER_SOURCE, APIFY_MAX_RESULTS * 8),
    input: {
      startUrls: postUrls,
      maxCount: APIFY_LIKES_PER_SOURCE,
      proxyConfiguration: { useApifyProxy: true }
    }
  };
  const items = await runApifyActor(spec);
  return items
    .map((item) => prospectFromApifyItem(item, config, spec))
    .map((prospect, index) => attachInstagramSourceContext(prospect, postUrls[index % postUrls.length]))
    .filter(Boolean);
}

function youtubeVideoQueries(config = {}) {
  const baseTerms = apifySearchTerms(config).slice(0, 4);
  const target = baseTerms.length ? baseTerms : [config.q || config.niche || "business"];
  const intentTerms = isTradingSearch(config)
    ? [
        "commenti italiani trading principianti",
        "prop firm Italia commenti",
        "come iniziare trading Italia",
        "bot trading MT5 Italia"
      ]
    : isProgrammingSearch(config)
      ? [
          "creare sito app automazioni AI Italia commenti",
          "come creare un app business Italia",
          "automazioni AI aziende Italia",
          "sito ecommerce startup Italia"
        ]
      : [];
  return [...new Set([...target, ...intentTerms])]
    .map((term) => `site:youtube.com/watch ${term} ${config.country || ""} ${config.city || ""}`.replace(/\s+/g, " ").trim())
    .slice(0, 3);
}

async function searchYouTubeAudience(config) {
  if (!sourceSelected(config, "YouTube")) return [];
  if (!process.env.APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN non configurata su Vercel");
  }
  if (!process.env.SERPER_API_KEY) {
    throw new Error("SERPER_API_KEY richiesta per scoprire video YouTube da analizzare");
  }
  const settled = await Promise.allSettled(youtubeVideoQueries(config).map((query) => fetchSerper(query, config)));
  const candidates = settled.flatMap((result) => {
      if (result.status !== "fulfilled") return [];
      return (result.value.organic || [])
        .map((item) => ({
          url: item.link || item.url || "",
          title: stripHtml(item.title || ""),
          snippet: stripHtml(item.snippet || "")
        }))
        .filter((item) => /(youtube\.com\/watch|youtu\.be\/|youtube\.com\/shorts)/i.test(item.url));
    });
  const urls = uniqueUrls(candidates.map((item) => item.url)).slice(0, APIFY_YOUTUBE_COMMENT_VIDEO_LIMIT);
  const contextByUrl = {};
  candidates.forEach((item) => {
    if (!item.url) return;
    contextByUrl[item.url] = item;
    const videoId = youtubeVideoIdFromUrl(item.url);
    if (videoId) contextByUrl[videoId] = item;
  });
  if (!urls.length) return [];
  return searchYouTubeCommentsFromVideos(urls, config, contextByUrl);
}

async function searchApify(config) {
  if (!process.env.APIFY_TOKEN) {
    throw new Error("APIFY_TOKEN non configurata su Vercel");
  }
  const discoveredSources = process.env.SERPER_API_KEY
    ? await searchSerper(config).catch(() => [])
    : [];
  const selectedDiscoveredSources = discoveredSources.filter((source) => sourceSelected(config, source.platform));
  const enrichedConfig = {
    ...config,
    monitorUrls: uniqueUrls([
      ...(config.monitorUrls || []),
      ...selectedDiscoveredSources
        .map((source) => source.source_url)
        .filter((url) => /^https?:\/\//i.test(url))
    ]).slice(0, 24)
  };
  const specs = apifyRunSpecs(enrichedConfig);
  if (!specs.length) {
    throw new Error("APIFY_TOKEN presente, ma nessun Actor Apify attivo per le fonti selezionate");
  }
  const settled = await Promise.allSettled(specs.map((spec) => runApifyActor(spec).then((items) => ({ spec, items }))));
  const prospects = settled.flatMap((result) =>
    result.status === "fulfilled"
      ? result.value.items.map((item) => prospectFromApifyItem(item, enrichedConfig, result.value.spec)).filter(Boolean)
      : []
  );
  const youtubeUrls = youtubeUrlsFromApifyResults(settled, enrichedConfig);
  const alreadyScrapedComments = prospects.some((prospect) => prospect.platform === "YouTube" && /comment/i.test(prospect.source_type));
  if (youtubeUrls.length && !alreadyScrapedComments) {
    const commentProspects = await searchYouTubeCommentsFromVideos(youtubeUrls, enrichedConfig).catch(() => []);
    prospects.push(...commentProspects);
  }
  const instagramPostUrls = instagramPostUrlsFromApifyResults(settled, enrichedConfig);
  const alreadyScrapedInstagramComments = prospects.some((prospect) => prospect.platform === "Instagram" && /comment/i.test(prospect.source_type));
  const alreadyScrapedInstagramLikes = prospects.some((prospect) => prospect.platform === "Instagram" && /like/i.test(prospect.source_type));
  if (instagramPostUrls.length && !alreadyScrapedInstagramComments) {
    const commentProspects = await searchInstagramCommentsFromPosts(instagramPostUrls, enrichedConfig).catch(() => []);
    prospects.push(...commentProspects);
  }
  if (instagramPostUrls.length && !alreadyScrapedInstagramLikes && process.env.APIFY_ENABLE_INSTAGRAM_LIKES !== "false") {
    const likeProspects = await searchInstagramLikesFromPosts(instagramPostUrls, enrichedConfig).catch(() => []);
    prospects.push(...likeProspects);
  }
  if (!prospects.length && settled.every((result) => result.status === "rejected")) {
    throw new Error(settled.map((result) => result.reason?.message || "Actor Apify non riuscito").join(" | "));
  }
  return [...selectedDiscoveredSources, ...prospects];
}

const SerperProvider = {
  name: "SerperProvider",
  searchSources: searchSerper
};

const ApifyProvider = {
  name: "ApifyProvider",
  searchSources: async (config) => (process.env.SERPER_API_KEY ? searchSerper(config) : []),
  extractProfiles: searchApify,
  extractPosts: searchApify,
  extractComments: searchApify,
  extractFollowers: searchApify,
  extractSimilarAccounts: searchApify,
  extractTelegramMessages: searchApify,
  extractYouTubeComments: searchYouTubeAudience,
  extractTikTokData: searchApify
};

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
    ["YouTube Audience", "youtubeAudience", searchYouTubeAudience],
    ["Apify", "apify", searchApify],
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
    .filter((prospect) => {
      const sourceType = String(prospect.source_type || "");
      const context = `${prospect.source_url || ""} ${prospect.source_page || ""} ${prospect.source_item || ""}`;
      if (/source_to_mine|follower|profile/i.test(sourceType) && /italia|italy|italiano|roma|milano|napoli|torino|bologna/i.test(context)) return true;
      return languageMatchesConfig(prospect, config);
    })
    .filter((prospect) => monthsSince(prospect.last_interaction) <= config.recencyMonths);

  const strictProspects = prospects.filter((prospect) => isUsefulProspectForSearch(prospect, config));
  const relaxedProspects =
    strictProspects.length || isProgrammingSearch(config) || isTradingSearch(config)
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
  const uniqueAll = relaxedProspects
    .filter((prospect) => {
      const key = `${prospect.platform}|${prospect.username_public || ""}|${prospect.profile_link || ""}|${prospect.source_url}|${prospect.relevant_text.slice(0, 80)}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  const audienceLeads = uniqueAll.filter((prospect) => !isAudienceMiningSource(prospect));
  const sourceOnly = uniqueAll.filter((prospect) => isAudienceMiningSource(prospect));
  const unique = [...audienceLeads.slice(0, config.limit), ...sourceOnly.slice(0, Math.max(20, Math.min(80, config.limit)))];

  return json(res, 200, {
    generated_at: new Date().toISOString(),
    query: config.q,
    providers,
    provider_status,
    fallback_relaxed: !strictProspects.length && relaxedProspects.length > 0,
    prospects: unique
  });
};
