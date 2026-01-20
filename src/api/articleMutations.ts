import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { Article, AuditDiff, AuditEvent } from "../types/article";
import type { ArticlesResponse } from "./articles";

function uid() {
  return globalThis.crypto?.randomUUID?.() ?? `id_${Math.random().toString(16).slice(2)}`;
}

function norm(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return String(v);
}

function computeOptimisticDiff(base: Article, patch: Partial<Article>): AuditDiff | undefined {
  const next = { ...base, ...patch } as Article;

  const keys: Array<keyof Article> = ["status", "priority", "scheduledAt", "category", "region", "author", "headline"];
  const diff: AuditDiff = {};

  for (const k of keys) {
    const from = norm(base[k]);
    const to = norm(next[k]);
    if (from !== to) diff[String(k)] = { from, to };
  }

  return Object.keys(diff).length ? diff : undefined;
}

function makeAudit(action: AuditEvent["action"], message: string, diff?: AuditDiff): AuditEvent {
  return {
    id: uid(),
    ts: new Date().toISOString(),
    actor: "newsroom.ops",
    action,
    message,
    diff,
  };
}

async function patchArticle(id: string, patch: Partial<Article>) {
  const res = await fetch(`/api/articles/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`PATCH failed (${res.status})`);
  return (await res.json()) as Article;
}

async function scheduleArticle(id: string, scheduledAt: string) {
  const res = await fetch(`/api/articles/${id}/schedule`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scheduledAt }),
  });
  if (!res.ok) throw new Error(`Schedule failed (${res.status})`);
  return (await res.json()) as Article;
}

function updateCachedLists(
  qc: ReturnType<typeof useQueryClient>,
  id: string,
  updater: (a: Article) => Article
) {
  const keys = qc.getQueryCache().findAll({ queryKey: ["articles"] }).map((q) => q.queryKey);

  for (const key of keys) {
    qc.setQueryData(key, (old: unknown) => {
      const data = old as ArticlesResponse | undefined;
      if (!data?.items) return old;

      return {
        ...data,
        items: data.items.map((a) => (a.id === id ? updater(a) : a)),
      };
    });
  }
}

export function useUpdateArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Article> }) => patchArticle(id, patch),

    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: ["articles"] });

      const snapshot = qc
        .getQueryCache()
        .findAll({ queryKey: ["articles"] })
        .map((q) => [q.queryKey, qc.getQueryData(q.queryKey)] as const);

      // optimistic update + optimistic audit diff
      updateCachedLists(qc, id, (a) => {
        const diff = computeOptimisticDiff(a, patch);

        let action: AuditEvent["action"] = "UPDATED";
        let message = "Article updated";

        if (patch.status === "IN_REVIEW") {
          action = "SENT_TO_REVIEW";
          message = "Sent to editorial review";
        } else if (patch.status === "PUBLISHED") {
          action = "PUBLISHED";
          message = "Published to site";
        }

        const evt = makeAudit(action, message, diff);

        return {
          ...a,
          ...patch,
          updatedAt: new Date().toISOString(),
          auditLog: [evt, ...(a.auditLog ?? [])],
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.snapshot?.forEach(([k, v]) => qc.setQueryData(k, v));
    },

    onSuccess: (updated) => {
      // server returns authoritative auditLog+diff
      updateCachedLists(qc, updated.id, () => updated);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}

export function useScheduleArticle() {
  const qc = useQueryClient();

  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) => scheduleArticle(id, scheduledAt),

    onMutate: async ({ id, scheduledAt }) => {
      await qc.cancelQueries({ queryKey: ["articles"] });

      const snapshot = qc
        .getQueryCache()
        .findAll({ queryKey: ["articles"] })
        .map((q) => [q.queryKey, qc.getQueryData(q.queryKey)] as const);

      updateCachedLists(qc, id, (a) => {
        const patch: Partial<Article> = {
          status: "SCHEDULED",
          scheduledAt,
          updatedAt: new Date().toISOString(),
        };

        const diff = computeOptimisticDiff(a, patch);
        const evt = makeAudit(
          "SCHEDULED",
          `Scheduled for ${new Date(scheduledAt).toLocaleString()}`,
          diff
        );

        return {
          ...a,
          ...patch,
          auditLog: [evt, ...(a.auditLog ?? [])],
        };
      });

      return { snapshot };
    },

    onError: (_err, _vars, ctx) => {
      ctx?.snapshot?.forEach(([k, v]) => qc.setQueryData(k, v));
    },

    onSuccess: (updated) => {
      updateCachedLists(qc, updated.id, () => updated);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["articles"] });
    },
  });
}