import type { Article, ArticlePriority, ArticleStatus, AuditEvent } from "../types/article";

const CATEGORIES = ["Politics", "Business", "Sports", "Entertainment", "Technology", "Health", "World", "Regional"];
const REGIONS = ["Gujarat", "Delhi NCR", "Maharashtra", "Rajasthan", "Madhya Pradesh", "Uttar Pradesh", "Punjab", "National"];
const AUTHORS = ["Desk", "Newsroom Staff", "Reporter", "Regional Bureau", "Editorial Team"];
const TAGS = ["election", "market", "policy", "crime", "weather", "startup", "budget", "match", "breaking", "exclusive"];

function pick<T>(arr: readonly T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function chance(p: number) {
  return Math.random() < p;
}

function uid() {
  // browser-safe
  return (globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`);
}

function makeAudit(action: AuditEvent["action"], message: string, actor = "newsroom.ops"): AuditEvent {
  return {
    id: uid(),
    ts: new Date().toISOString(),
    actor,
    action,
    message,
  };
}

function randomHeadline(category: string, region: string) {
  const templates = [
    `${region}: Key developments in ${category.toLowerCase()} today`,
    `What to know: ${category} update from ${region}`,
    `${category} briefing: latest signals from ${region}`,
    `${region} roundup: top ${category.toLowerCase()} stories`,
    `Explainer: why ${region} matters in ${category.toLowerCase()} this week`,
  ];
  return pick(templates);
}

function randomPriority(): ArticlePriority {
  const r = Math.random();
  if (r < 0.15) return "HIGH";
  if (r < 0.55) return "MEDIUM";
  return "LOW";
}

function randomStatus(): ArticleStatus {
  const r = Math.random();
  if (r < 0.55) return "DRAFT";
  if (r < 0.75) return "IN_REVIEW";
  if (r < 0.9) return "SCHEDULED";
  return "PUBLISHED";
}

export function generateArticles(count = 200): Article[] {
  const now = Date.now();

  return Array.from({ length: count }, () => {
    const category = pick(CATEGORIES);
    const region = pick(REGIONS);
    const status = randomStatus();
    const priority = randomPriority();

    const updatedAt = new Date(now - Math.floor(Math.random() * 14) * 24 * 60 * 60 * 1000 - Math.floor(Math.random() * 8) * 60 * 60 * 1000).toISOString();

    const scheduledAt =
      status === "SCHEDULED"
        ? new Date(now + Math.floor(Math.random() * 72 + 1) * 60 * 60 * 1000).toISOString()
        : undefined;

    const auditLog: AuditEvent[] = [
      makeAudit("CREATED", "Article created"),
      makeAudit("UPDATED", "Initial metadata set"),
    ];

    if (status === "IN_REVIEW") auditLog.push(makeAudit("SENT_TO_REVIEW", "Sent to editorial review"));
    if (status === "SCHEDULED") auditLog.push(makeAudit("SCHEDULED", `Scheduled for ${new Date(scheduledAt!).toLocaleString()}`));
    if (status === "PUBLISHED") auditLog.push(makeAudit("PUBLISHED", "Published to site"));

    return {
      id: uid(),
      headline: randomHeadline(category, region),
      status,
      priority,
      category,
      region,
      author: pick(AUTHORS),

      updatedAt,
      scheduledAt,

      tags: Array.from({ length: chance(0.6) ? 2 : 3 }, () => pick(TAGS)),
      hasHeroImage: chance(0.75),
      hasCaption: chance(0.7),

      auditLog,
    };
  }).map((a, idx) => ({ ...a, headline: `${a.headline} #${idx + 1}` }));
}