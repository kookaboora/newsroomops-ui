import { useQuery } from "@tanstack/react-query";
import type { Article } from "../types/article";

export type ArticlesResponse = {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
};

export type ArticlesParams = {
  page: number;
  pageSize: number;

  q?: string;
  status?: string[];
  region?: string[];
  category?: string[];
  priority?: string[];

  sort?: "updatedAt" | "scheduledAt" | "priority";
  order?: "asc" | "desc";
};

function buildQuery(params: ArticlesParams) {
  const sp = new URLSearchParams();

  sp.set("page", String(params.page));
  sp.set("pageSize", String(params.pageSize));

  if (params.q) sp.set("q", params.q);
  if (params.sort) sp.set("sort", params.sort);
  if (params.order) sp.set("order", params.order);

  params.status?.forEach((v) => sp.append("status", v));
  params.region?.forEach((v) => sp.append("region", v));
  params.category?.forEach((v) => sp.append("category", v));
  params.priority?.forEach((v) => sp.append("priority", v));

  return sp.toString();
}

async function fetchArticles(params: ArticlesParams): Promise<ArticlesResponse> {
  const qs = buildQuery(params);

  // no-store avoids 304/cached HTML weirdness while mocking
  const res = await fetch(`/api/articles?${qs}`, { cache: "no-store" });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed (${res.status}): ${text.slice(0, 120)}`);
  }

  return res.json();
}

export function useArticles(params: ArticlesParams) {
  return useQuery({
    queryKey: ["articles", params],
    queryFn: () => fetchArticles(params),
    staleTime: 10_000,
  });
}