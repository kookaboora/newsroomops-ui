import { http, HttpResponse } from "msw";
import type {
  Article,
  ArticlePriority,
  ArticleStatus,
  AuditAction,
  AuditDiff,
  AuditEvent,
} from "../types/article";
import { generateArticles } from "../mock/generateArticles";

type ArticlesResponse = {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
};

const DB: { articles: Article[] } = {
  articles: generateArticles(1200),
};

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
}

function parseMulti(sp: URLSearchParams, key: string): string[] {
  return sp
    .getAll(key)
    .flatMap((v) => v.split(","))
    .map((s) => s.trim())
    .filter(Boolean);
}

function matchesSearch(a: Article, q: string) {
  const s = q.trim().toLowerCase();
  if (!s) return true;
  return (
    a.headline.toLowerCase().includes(s) ||
    a.author.toLowerCase().includes(s) ||
    a.category.toLowerCase().includes(s) ||
    a.region.toLowerCase().includes(s)
  );
}

function priorityRank(p: ArticlePriority) {
  return p === "HIGH" ? 3 : p === "MEDIUM" ? 2 : 1;
}

function findArticle(id: string) {
  const idx = DB.articles.findIndex((a) => a.id === id);
  return { idx, item: idx >= 0 ? DB.articles[idx] : null };
}

function norm(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

function computeDiff(prev: Article, next: Article): AuditDiff | undefined {
  const keys: Array<keyof Article> = ["status", "priority", "scheduledAt", "category", "region", "author", "headline"];

  const diff: AuditDiff = {};
  for (const k of keys) {
    const from = norm(prev[k]);
    const to = norm(next[k]);

    if (from !== to) {
      diff[String(k)] = { from, to };
    }
  }

  return Object.keys(diff).length ? diff : undefined;
}

function addAudit(next: Article, action: AuditAction, message: string, diff?: AuditDiff, actor = "newsroom.ops") {
  const evt: AuditEvent = {
    id: uid(),
    ts: new Date().toISOString(),
    actor,
    action,
    message,
    diff,
  };

  // newest first
  return { ...next, auditLog: [evt, ...(next.auditLog ?? [])] };
}

export const handlers = [
  http.get("/api/health", () => HttpResponse.json({ ok: true })),

  http.get("/api/articles", ({ request }) => {
    const url = new URL(request.url);
    const sp = url.searchParams;

    const q = sp.get("q") ?? "";
    const page = Math.max(1, Number(sp.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(5, Number(sp.get("pageSize") ?? "25")));
    const sort = (sp.get("sort") ?? "updatedAt") as "updatedAt" | "scheduledAt" | "priority";
    const order = (sp.get("order") ?? "desc") as "asc" | "desc";

    const statuses = parseMulti(sp, "status") as ArticleStatus[];
    const regions = parseMulti(sp, "region");
    const categories = parseMulti(sp, "category");
    const priorities = parseMulti(sp, "priority") as ArticlePriority[];

    let filtered = DB.articles.filter((a) => matchesSearch(a, q));
    if (statuses.length) filtered = filtered.filter((a) => statuses.includes(a.status));
    if (regions.length) filtered = filtered.filter((a) => regions.includes(a.region));
    if (categories.length) filtered = filtered.filter((a) => categories.includes(a.category));
    if (priorities.length) filtered = filtered.filter((a) => priorities.includes(a.priority));

    filtered.sort((a, b) => {
      let cmp = 0;
      if (sort === "priority") cmp = priorityRank(a.priority) - priorityRank(b.priority);
      else if (sort === "scheduledAt") cmp = (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "");
      else cmp = a.updatedAt.localeCompare(b.updatedAt);

      return order === "asc" ? cmp : -cmp;
    });

    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const items = filtered.slice(start, start + pageSize);

    const resp: ArticlesResponse = { items, total, page, pageSize };
    return HttpResponse.json(resp);
  }),

  http.patch("/api/articles/:id", async ({ params, request }) => {
    const id = String(params.id);
    const patch = (await request.json()) as Partial<Article>;

    const { idx, item } = findArticle(id);
    if (!item) return HttpResponse.json({ message: "Not found" }, { status: 404 });

    const prev = item;

    let next: Article = {
      ...prev,
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    const diff = computeDiff(prev, next);

    let action: AuditAction = "UPDATED";
    let message = "Article updated";

    if (patch.status === "IN_REVIEW") {
      action = "SENT_TO_REVIEW";
      message = "Sent to editorial review";
    } else if (patch.status === "PUBLISHED") {
      action = "PUBLISHED";
      message = "Published to site";
    }

    next = addAudit(next, action, message, diff);

    DB.articles[idx] = next;
    return HttpResponse.json(next);
  }),

  http.post("/api/articles/:id/schedule", async ({ params, request }) => {
    const id = String(params.id);
    const body = (await request.json()) as { scheduledAt: string };

    const { idx, item } = findArticle(id);
    if (!item) return HttpResponse.json({ message: "Not found" }, { status: 404 });

    const prev = item;

    let next: Article = {
      ...prev,
      status: "SCHEDULED",
      scheduledAt: body.scheduledAt,
      updatedAt: new Date().toISOString(),
    };

    const diff = computeDiff(prev, next);
    next = addAudit(next, "SCHEDULED", `Scheduled for ${new Date(body.scheduledAt).toLocaleString()}`, diff);

    DB.articles[idx] = next;
    return HttpResponse.json(next);
  }),
];