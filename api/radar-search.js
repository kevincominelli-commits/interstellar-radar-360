const DEFAULT_LIMIT = 30;

function asText(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function compact(value = "", max = 520) {
  const text = asText(value);
  return text.length > max ? `${text.slice(0, max - 1)}...` : text;
}

function inferIntent(text = "") {
  const lower = text.toLowerCase();
  if (/quanto costa|prezzo|preventivo|budget|costo/.test(lower)) return "prezzo / preventivo";
  if (/cerco|mi serve|sto cercando|looking for|need (a|an)|hire/.test(lower)) return "ricerca servizio";
  if (/non riesco|problema|aiuto|bloccato|help/.test(lower)) return "problema espresso";
  if (/app|sito|website|software|automazione|chatbot|gestionale|bot/.test(lower)) return "sviluppo / automazione";
  return "interesse potenziale";
}

function isoFromUnix(seconds) {
  return seconds ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
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
  const limit = Math.max(5, Math.min(80, Number(params.get("limit") || DEFAULT_LIMIT)));
  const base = [niche, keywords, country, city].filter(Boolean).join(" ");
  return {
    q: compact(base, 180),
    country,
    city,
    limit
  };
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

function liveQueries(config) {
  return [
    config.q,
    "need a website developer",
    "looking for web developer",
    "hire developer website app",
    "need app developer",
    "automation chatbot developer"
  ].filter(Boolean);
}

async function searchReddit(config) {
  const settled = await Promise.allSettled(
    liveQueries(config).map((query) =>
      fetchJson(`https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&t=year&limit=${Math.min(config.limit, 10)}`)
    )
  );
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
    estimated_language: "it",
    detected_intent: inferIntent(`${data.title || ""} ${data.selftext || ""}`),
    interactions_detected: Number(data.num_comments || 0) + Number(data.score || 0),
    last_interaction: isoFromUnix(data.created_utc),
    provider_source: "Reddit public search",
    source_reliability: 72
  })) : []
  );
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
      source_reliability: 64
    };
  }) : []
  );
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") return json(res, 200, { ok: true });
  if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

  const config = getQuery(req);
  const settled = await Promise.allSettled([searchReddit(config), searchHackerNews(config), searchGitHubIssues(config)]);
  const providers = ["Reddit", "Hacker News", "GitHub"].filter((_, index) => settled[index].status === "fulfilled");
  const prospects = settled
    .flatMap((result) => (result.status === "fulfilled" ? result.value : []))
    .filter((prospect) => prospect.source_url && prospect.relevant_text);

  const seen = new Set();
  const unique = prospects
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
    prospects: unique
  });
};
