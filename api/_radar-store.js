const crypto = require("node:crypto");

const DEFAULT_WORKSPACE_ID = "interstellar-internal";
const DEFAULT_USER_ID = "local-user";

function asText(value = "") {
  return String(value || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function hash(value = "") {
  return crypto.createHash("sha256").update(String(value || "")).digest("hex");
}

function normalizePart(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

function normalizeHandle(value = "") {
  return String(value || "").trim().replace(/^@/, "").replace(/\/+$/g, "").toLowerCase();
}

function normalizeUrl(value = "") {
  try {
    const url = new URL(value);
    url.hash = "";
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "fbclid", "igshid"].forEach((key) => {
      url.searchParams.delete(key);
    });
    return url.toString().replace(/\/$/, "");
  } catch {
    return String(value || "").trim();
  }
}

function firstBusinessEmail(value = "") {
  const emails = String(value || "").match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi) || [];
  return emails.find((email) => !/(gmail|hotmail|outlook|icloud|yahoo|libero|virgilio|proton|mail\.com)\./i.test(email)) || "";
}

function searchFingerprint(config = {}) {
  const platform = (Array.isArray(config.sources) && config.sources.length ? config.sources : ["mixed"])
    .filter((source) => source !== "CRM/Import")
    .sort()
    .join(".");
  return [
    normalizePart(config.niche || config.q || "audience"),
    normalizePart(platform || "mixed"),
    normalizePart(config.country || "any"),
    normalizePart(config.language || "any"),
    normalizePart(config.audienceType || "mix")
  ].join("|");
}

function sourceKey(prospect = {}) {
  const value = normalizeUrl(prospect.source_url || prospect.website || prospect.profile_link || prospect.source_page || prospect.source_item || "");
  return hash([prospect.platform || "unknown", prospect.source_type || "source", value].join("|"));
}

function leadCanonicalKey(prospect = {}) {
  const platform = String(prospect.platform || "Website");
  const username = normalizeHandle(prospect.username_public || prospect.public_name);
  if (username) return hash([platform, username].join("|"));
  const profileUrl = normalizeUrl(prospect.profile_link || "");
  const website = normalizeUrl(prospect.website || prospect.source_url || "");
  const email = firstBusinessEmail(`${prospect.email_business_public || ""} ${prospect.relevant_text || ""}`);
  return hash([platform, username, profileUrl, email, website].filter(Boolean).join("|"));
}

function daysSince(value = "") {
  const time = Date.parse(value || "");
  if (!Number.isFinite(time)) return 999;
  return Math.max(0, Math.round((Date.now() - time) / 86400000));
}

function scoreAudienceProspect(prospect = {}, config = {}) {
  const text = asText([
    prospect.platform,
    prospect.source_type,
    prospect.username_public,
    prospect.public_name,
    prospect.business_name,
    prospect.bio_public,
    prospect.source_item,
    prospect.relevant_text,
    prospect.source_page
  ].join(" ")).toLowerCase();
  const nicheTokens = asText(`${config.niche || ""} ${config.keywords || ""}`)
    .toLowerCase()
    .split(/[^a-z0-9à-ÿ]+/i)
    .filter((token) => token.length >= 4)
    .slice(0, 20);
  const nicheHits = nicheTokens.filter((token) => text.includes(token)).length;
  const sourceType = String(prospect.source_type || "").toLowerCase();
  const engagementRaw = Number(prospect.interactions_detected || 0);
  const recency = Math.max(0, 100 - daysSince(prospect.last_interaction || prospect.collected_at) * 2);
  const hasBio = Boolean(asText(prospect.bio_public || prospect.relevant_text).length > 35);
  const hasProfile = Boolean(prospect.profile_link || prospect.username_public);
  const hasBusinessContact = Boolean(prospect.email_business_public || prospect.phone_business_public || prospect.contact_form_url);
  const suspicious =
    /(casino|airdrop|bonus|giveaway|soldi facili|guadagno garantito|follow4follow|xxx|onlyfans|pump)/i.test(text) ||
    /^\d{6,}$/.test(normalizeHandle(prospect.username_public));
  const relevance = Math.max(25, Math.min(100, 45 + nicheHits * 12 + (/comment|like|follower|profile|creator|community/.test(sourceType) ? 18 : 0)));
  const engagement = Math.max(15, Math.min(100, 30 + Math.log10(Math.max(1, engagementRaw)) * 18 + recency * 0.32));
  const quality = Math.max(10, Math.min(100, 35 + (hasBio ? 18 : 0) + (hasProfile ? 18 : 0) + (suspicious ? -35 : 0)));
  const commercialFit = Math.max(
    10,
    Math.min(
      100,
      32 +
        (hasBusinessContact ? 18 : 0) +
        (/business|azienda|creator|startup|ecommerce|coach|trading|software|automazioni|crm|saas|palestra|centro estetico/i.test(text) ? 18 : 0)
    )
  );
  const total = Math.round(relevance * 0.4 + engagement * 0.25 + quality * 0.2 + commercialFit * 0.15);
  const tags = [
    ...nicheTokens.filter((token) => text.includes(token)).slice(0, 8),
    sourceType.includes("comment") ? "commentatore attivo" : "",
    sourceType.includes("follower") ? "follower disponibile" : "",
    sourceType.includes("like") ? "like disponibile" : "",
    hasBusinessContact ? "contatto business pubblico" : "",
    suspicious ? "rischio fake/spam" : ""
  ].filter(Boolean);
  const reasons = [
    nicheHits ? `${nicheHits} segnali coerenti con la nicchia` : "Coerenza stimata dalla fonte",
    recency > 60 ? "attività recente" : "recency debole o non disponibile",
    hasProfile ? "profilo pubblico tracciabile" : "profilo limitato",
    suspicious ? "penalizzato per pattern sospetti" : "nessun pattern spam evidente"
  ];
  return {
    relevance_score: Math.round(relevance),
    engagement_score: Math.round(engagement),
    quality_score: Math.round(quality),
    commercial_fit_score: Math.round(commercialFit),
    total_score: Math.max(0, Math.min(100, total)),
    temperature: total >= 70 ? "hot" : total >= 40 ? "warm" : "cold",
    tags,
    reasons
  };
}

function isAudienceSource(prospect = {}) {
  return /source_to_mine|audience_source|video_source|post_source|profile_source|social_search|social_hashtag|ad_source/i.test(
    prospect.source_type || ""
  );
}

class SupabaseRadarStore {
  constructor(env = process.env) {
    this.url = String(env.SUPABASE_URL || "").replace(/\/$/, "");
    this.key = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY || "";
    this.enabled = Boolean(this.url && this.key);
  }

  async request(path, options = {}) {
    if (!this.enabled) throw new Error("Supabase non configurato");
    const response = await fetch(`${this.url}/rest/v1${path}`, {
      method: options.method || "GET",
      headers: {
        apikey: this.key,
        Authorization: `Bearer ${this.key}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || "return=representation",
        ...(options.headers || {})
      },
      body: options.body ? JSON.stringify(options.body) : undefined
    });
    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;
    if (!response.ok) {
      throw new Error(payload?.message || payload?.error || `Supabase ${response.status}`);
    }
    return payload;
  }

  async upsert(table, rows, conflict) {
    const query = conflict ? `?on_conflict=${encodeURIComponent(conflict)}` : "";
    return this.request(`/${table}${query}`, {
      method: "POST",
      prefer: "resolution=merge-duplicates,return=representation",
      body: Array.isArray(rows) ? rows : [rows]
    });
  }

  async patch(table, filter, patch) {
    return this.request(`/${table}?${filter}`, {
      method: "PATCH",
      body: patch
    });
  }

  async ensurePool(config = {}) {
    const fingerprint = searchFingerprint(config);
    const platform = Array.isArray(config.sources) && config.sources.length === 1 ? config.sources[0] : "Multi-platform";
    const [pool] = await this.upsert(
      "lead_pools",
      {
        name: `${config.niche || "Audience"} · ${platform} · ${config.country || "Global"}`,
        niche: config.niche || "",
        platform,
        country: config.country || "",
        language: config.language || "any",
        source_type: config.audienceType || "mix",
        search_fingerprint: fingerprint,
        status: "active",
        updated_at: new Date().toISOString()
      },
      "search_fingerprint"
    );
    return pool;
  }

  async createSearch(config = {}, pool = {}) {
    const [search] = await this.request("/radar_searches", {
      method: "POST",
      body: [
        {
          workspace_id: config.workspaceId || DEFAULT_WORKSPACE_ID,
          user_id: config.userId || DEFAULT_USER_ID,
          niche: config.niche || "",
          platform: (config.sources || []).join(",") || "mixed",
          country: config.country || "",
          language: config.language || "any",
          requested_visible_leads: config.visibleLimit || config.limit || 30,
          internal_target_leads: config.limit || config.visibleLimit || 30,
          pool_id: pool.id,
          status: "running",
          created_at: new Date().toISOString()
        }
      ]
    });
    return search;
  }

  async completeSearch(searchId, patch = {}) {
    if (!searchId) return null;
    const [row] = await this.patch(`radar_searches`, `id=eq.${encodeURIComponent(searchId)}`, {
      ...patch,
      completed_at: new Date().toISOString()
    });
    return row;
  }

  async persistSources(prospects = [], config = {}) {
    const rows = prospects
      .map((prospect) => ({
        source_key: sourceKey(prospect),
        platform: prospect.platform || "Website",
        source_type: prospect.source_type || "audience_source",
        source_value: prospect.source_item || prospect.public_name || prospect.business_name || prospect.source_page || "",
        source_url: normalizeUrl(prospect.source_url || prospect.website || prospect.profile_link || ""),
        niche: config.niche || "",
        country: config.country || "",
        language: config.language || "any",
        discovered_by: prospect.provider_source || "radar",
        discovered_at: new Date().toISOString(),
        last_scraped_at: isAudienceSource(prospect) ? null : new Date().toISOString(),
        source_score: Number(prospect.source_reliability || prospect.score_ai || 60),
        status: isAudienceSource(prospect) ? "ready_to_mine" : "used"
      }))
      .filter((row) => row.source_url || row.source_value);
    if (!rows.length) return new Map();
    const saved = await this.upsert("lead_sources", rows, "source_key");
    return new Map(saved.map((row) => [row.source_key, row]));
  }

  prospectToLeadRow(prospect = {}) {
    const username = normalizeHandle(prospect.username_public || "");
    return {
      canonical_key: leadCanonicalKey(prospect),
      platform: prospect.platform || "Website",
      platform_user_id: prospect.platform_user_id || null,
      username: username || null,
      display_name: prospect.public_name || prospect.business_name || null,
      profile_url: normalizeUrl(prospect.profile_link || ""),
      bio: prospect.bio_public || prospect.relevant_text || null,
      avatar_url: prospect.avatar_url || null,
      followers_count: Number.isFinite(Number(prospect.followers_count)) ? Number(prospect.followers_count) : null,
      following_count: Number.isFinite(Number(prospect.following_count)) ? Number(prospect.following_count) : null,
      posts_count: Number.isFinite(Number(prospect.posts_count)) ? Number(prospect.posts_count) : null,
      engagement_estimate: Number.isFinite(Number(prospect.interactions_detected)) ? Number(prospect.interactions_detected) : null,
      country_estimate: prospect.country || null,
      language_estimate: prospect.estimated_language || null,
      is_private: typeof prospect.is_private === "boolean" ? prospect.is_private : null,
      is_verified: typeof prospect.is_verified === "boolean" ? prospect.is_verified : null,
      is_business_account: typeof prospect.is_business_account === "boolean" ? prospect.is_business_account : null,
      last_seen_at: prospect.last_interaction || new Date().toISOString(),
      raw_json: prospect,
      updated_at: new Date().toISOString()
    };
  }

  async persistAudience(prospects = [], pool = {}, config = {}, sourcesByKey = new Map()) {
    const audience = prospects.filter((prospect) => !isAudienceSource(prospect));
    if (!audience.length) return [];
    const leadRows = audience.map((prospect) => this.prospectToLeadRow(prospect));
    const savedLeads = await this.upsert("leads", leadRows, "canonical_key");
    const savedByKey = new Map(savedLeads.map((lead) => [lead.canonical_key, lead]));
    const memberRows = audience
      .map((prospect) => {
        const lead = savedByKey.get(leadCanonicalKey(prospect));
        if (!lead) return null;
        const score = scoreAudienceProspect(prospect, config);
        const source = sourcesByKey.get(sourceKey(prospect));
        return {
          member_key: `${pool.id}|${lead.id}`,
          pool_id: pool.id,
          lead_id: lead.id,
          source_id: source?.id || null,
          source_type: prospect.source_type || "",
          source_value: source?.source_value || prospect.source_page || prospect.source_item || "",
          relevance_score: score.relevance_score,
          engagement_score: score.engagement_score,
          quality_score: score.quality_score,
          commercial_fit_score: score.commercial_fit_score,
          total_score: score.total_score,
          tags: score.tags,
          reasons: score.reasons,
          extracted_at: prospect.collected_at || new Date().toISOString(),
          last_scored_at: new Date().toISOString()
        };
      })
      .filter(Boolean);
    if (!memberRows.length) return savedLeads;
    await this.upsert("lead_pool_members", memberRows, "member_key");
    await this.syncPoolCounts(pool.id);
    return savedLeads;
  }

  async poolMembers(poolId, config = {}) {
    const minScore = Math.max(0, Number(config.minScore || 0));
    return this.request(
      `/lead_pool_members?pool_id=eq.${encodeURIComponent(poolId)}&total_score=gte.${minScore}&select=*,leads(*)&limit=2000`
    );
  }

  async poolReveals(poolId) {
    return this.request(`/lead_reveals?pool_id=eq.${encodeURIComponent(poolId)}&select=lead_id,workspace_id,cooldown_until&limit=10000`);
  }

  weightedSelection(members = [], config = {}, requested = 50) {
    const selected = [];
    const usedSources = new Set();
    const candidates = [...members];
    while (selected.length < requested && candidates.length) {
      candidates.sort((a, b) => this.selectionWeight(b, config, usedSources) - this.selectionWeight(a, config, usedSources));
      const next = candidates.shift();
      if (!next) break;
      selected.push(next);
      usedSources.add(next.source_id || next.source_value || next.source_type);
    }
    return selected;
  }

  selectionWeight(member = {}, config = {}, usedSources = new Set()) {
    const lead = member.leads || {};
    const raw = lead.raw_json || {};
    const recency = Math.max(0, 100 - daysSince(raw.last_interaction || lead.last_seen_at) * 2);
    const revealCount = Number(member.reveal_count || 0);
    const underexposed = Math.max(0, 100 - revealCount * 25);
    const diversity = usedSources.has(member.source_id || member.source_value || member.source_type) ? 35 : 100;
    const random = Number.parseInt(hash(`${config.workspaceSeed || ""}:${member.lead_id}:${Date.now().toString().slice(0, -4)}`).slice(0, 6), 16) % 100;
    return Number(member.total_score || 0) * 0.45 + recency * 0.15 + underexposed * 0.2 + diversity * 0.1 + random * 0.1;
  }

  async selectFromPool(pool = {}, config = {}, requested = 30, options = {}) {
    const workspaceId = config.workspaceId || DEFAULT_WORKSPACE_ID;
    const userId = config.userId || DEFAULT_USER_ID;
    const now = Date.now();
    const [members, reveals] = await Promise.all([this.poolMembers(pool.id, config), this.poolReveals(pool.id)]);
    const revealCounts = new Map();
    reveals.forEach((reveal) => revealCounts.set(reveal.lead_id, (revealCounts.get(reveal.lead_id) || 0) + 1));
    const available = members
      .map((member) => ({ ...member, reveal_count: revealCounts.get(member.lead_id) || 0 }))
      .filter((member) => {
        const sameWorkspace = reveals.some((reveal) => reveal.workspace_id === workspaceId && reveal.lead_id === member.lead_id);
        if (sameWorkspace) return false;
        const cooling = reveals.some((reveal) => reveal.lead_id === member.lead_id && Number(reveal.cooldown_until || 0) > now);
        return !cooling;
      });
    const selected = this.weightedSelection(available, config, requested);
    if (options.commit && selected.length) {
      const cooldownDays = config.operationMode === "aggressive" ? 30 : config.operationMode === "balanced" ? 14 : 7;
      const cooldownUntil = new Date(Date.now() + cooldownDays * 86400000).getTime();
      await this.request("/lead_reveals", {
        method: "POST",
        body: selected.map((member) => ({
          workspace_id: workspaceId,
          user_id: userId,
          pool_id: pool.id,
          lead_id: member.lead_id,
          revealed_at: new Date().toISOString(),
          cooldown_until: cooldownUntil,
          reveal_context: `${config.niche || ""} · ${config.audienceType || "mix"}`,
          search_id: options.searchId || null,
          credits_charged: 1
        }))
      });
      await this.syncPoolCounts(pool.id);
    }
    return selected.map((member) => {
      const lead = member.leads || {};
      const raw = lead.raw_json || {};
      return {
        ...raw,
        lead_id: lead.id,
        db_lead_id: lead.id,
        score_ai: Number(member.total_score || raw.score_ai || 0),
        total_score: Number(member.total_score || 0),
        relevance_score: Number(member.relevance_score || 0),
        engagement_score: Number(member.engagement_score || 0),
        quality_score: Number(member.quality_score || 0),
        commercial_fit_score: Number(member.commercial_fit_score || 0),
        tags: Array.isArray(member.tags) ? member.tags : raw.tags || [],
        score_reason: Array.isArray(member.reasons) ? member.reasons.join(" · ") : raw.score_reason || ""
      };
    });
  }

  async syncPoolCounts(poolId) {
    const [members, reveals] = await Promise.all([
      this.request(`/lead_pool_members?pool_id=eq.${encodeURIComponent(poolId)}&select=lead_id&limit=10000`),
      this.request(`/lead_reveals?pool_id=eq.${encodeURIComponent(poolId)}&select=lead_id,cooldown_until&limit=10000`)
    ]);
    const now = Date.now();
    const revealedIds = new Set(reveals.map((reveal) => reveal.lead_id));
    const coolingIds = new Set(reveals.filter((reveal) => Number(reveal.cooldown_until || 0) > now).map((reveal) => reveal.lead_id));
    const available = members.filter((member) => !revealedIds.has(member.lead_id) && !coolingIds.has(member.lead_id)).length;
    await this.patch(`lead_pools`, `id=eq.${encodeURIComponent(poolId)}`, {
      total_leads_count: members.length,
      available_leads_count: available,
      revealed_leads_count: revealedIds.size,
      updated_at: new Date().toISOString()
    });
  }

  async adminSnapshot() {
    const [pools, searches, sources, reveals] = await Promise.all([
      this.request("/lead_pools?select=*&order=updated_at.desc&limit=50"),
      this.request("/radar_searches?select=*&order=created_at.desc&limit=50"),
      this.request("/lead_sources?select=platform,source_type,status,source_score,discovered_at&order=discovered_at.desc&limit=200"),
      this.request("/lead_reveals?select=workspace_id,pool_id,lead_id,revealed_at,cooldown_until,credits_charged&order=revealed_at.desc&limit=200")
    ]);
    const totalAvailable = pools.reduce((sum, pool) => sum + Number(pool.available_leads_count || 0), 0);
    const totalRevealed = pools.reduce((sum, pool) => sum + Number(pool.revealed_leads_count || 0), 0);
    const byPlatform = sources.reduce((acc, source) => {
      const key = source.platform || "unknown";
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    const providerErrors = searches.filter((search) => search.status === "failed" || search.error_message).slice(0, 20);
    return {
      generated_at: new Date().toISOString(),
      pools_count: pools.length,
      total_available: totalAvailable,
      total_revealed: totalRevealed,
      recent_searches: searches,
      pools,
      sources_by_platform: byPlatform,
      recent_reveals: reveals,
      provider_errors: providerErrors
    };
  }
}

function createRadarStore(env = process.env) {
  return new SupabaseRadarStore(env);
}

module.exports = {
  createRadarStore,
  scoreAudienceProspect,
  searchFingerprint,
  sourceKey,
  leadCanonicalKey,
  isAudienceSource
};
