import * as React from "react";
import type { Article, AuditDiff, AuditEvent } from "../../types/article";
import { useScheduleArticle, useUpdateArticle } from "../../api/articleMutations";
import { SchedulePickerModal } from "./SchedulePickerModal";

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
      {children}
    </span>
  );
}

function formatAuditTime(ts: string) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function actionLabel(action: AuditEvent["action"]) {
  switch (action) {
    case "CREATED":
      return "Created";
    case "UPDATED":
      return "Updated";
    case "SENT_TO_REVIEW":
      return "Sent to review";
    case "SCHEDULED":
      return "Scheduled";
    case "PUBLISHED":
      return "Published";
    default:
      return action;
  }
}

function prettyField(field: string) {
  const map: Record<string, string> = {
    scheduledAt: "Scheduled time",
    status: "Status",
    priority: "Priority",
    category: "Category",
    region: "Region",
    author: "Author",
    headline: "Headline",
  };
  return map[field] ?? field;
}

function isISODateLike(v: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v);
}

function formatMaybeDate(v: string | null) {
  if (!v) return "—";
  if (isISODateLike(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d.toLocaleString();
  }
  return v;
}

function DiffView({ diff }: { diff?: AuditDiff }) {
  if (!diff || !Object.keys(diff).length) return null;

  const entries = Object.entries(diff);

  return (
    <div className="mt-2 rounded-lg border border-slate-200 bg-white px-3 py-2">
      <div className="text-[11px] font-semibold text-slate-600">Changes</div>

      <ul className="mt-2 space-y-1.5">
        {entries.map(([field, { from, to }]) => (
          <li key={field} className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
            <span className="font-mono text-[11px] text-slate-500">
              {prettyField(field)}
            </span>

            <span className="text-slate-400">:</span>

            <span className="rounded bg-slate-50 px-1.5 py-0.5 font-mono text-slate-600">
              {formatMaybeDate(from)}
            </span>

            <span className="text-slate-400">→</span>

            <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-mono text-emerald-700">
              {formatMaybeDate(to)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ArticleDrawer({
  open,
  article,
  onClose,
}: {
  open: boolean;
  article: Article | null;
  onClose: () => void;
}) {
  const update = useUpdateArticle();
  const schedule = useScheduleArticle();

  const [scheduleOpen, setScheduleOpen] = React.useState(false);

  const canAct = Boolean(article) && !update.isPending && !schedule.isPending;

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  React.useEffect(() => {
    if (!open) setScheduleOpen(false);
  }, [open]);

  const audit = (article?.auditLog ?? []).slice(0, 12);

  return (
    <div
      className={cx("fixed inset-0 z-50", open ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!open}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cx(
          "absolute inset-0 bg-slate-900/30 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
      />

      {/* Panel */}
      <aside
        className={cx(
          "absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-xl transition-transform",
          open ? "translate-x-0" : "translate-x-full"
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm text-slate-500">Article</div>
                <div className="mt-1 text-base font-semibold text-slate-900">
                  {article?.headline ?? "—"}
                </div>

                <div className="mt-2 flex flex-wrap gap-2">
                  {article ? (
                    <>
                      <Badge>Status: {article.status}</Badge>
                      <Badge>Priority: {article.priority}</Badge>
                      <Badge>ID: {article.id}</Badge>
                    </>
                  ) : null}
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto space-y-4 p-4">
            {/* Metadata */}
            <section className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">Metadata</div>
              <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-slate-500">Author</dt>
                  <dd className="mt-0.5 text-slate-800">{article?.author ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Category</dt>
                  <dd className="mt-0.5 text-slate-800">{article?.category ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Region</dt>
                  <dd className="mt-0.5 text-slate-800">{article?.region ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-xs text-slate-500">Updated</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {article?.updatedAt ? new Date(article.updatedAt).toLocaleString() : "—"}
                  </dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-xs text-slate-500">Scheduled</dt>
                  <dd className="mt-0.5 text-slate-800">
                    {article?.scheduledAt ? new Date(article.scheduledAt).toLocaleString() : "—"}
                  </dd>
                </div>
              </dl>
            </section>

            {/* Actions */}
            <section className="rounded-xl border border-slate-200 p-3">
              <div className="text-sm font-semibold text-slate-900">Actions</div>
              <p className="mt-1 text-xs text-slate-600">
                Updates are mocked with MSW and applied optimistically.
              </p>

              <div className="mt-3 grid grid-cols-3 gap-2">
                <button
                  disabled={!canAct || !article}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => {
                    if (!article) return;
                    update.mutate({ id: article.id, patch: { status: "IN_REVIEW" } });
                  }}
                >
                  Send to Review
                </button>

                <button
                  disabled={!canAct || !article}
                  className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  onClick={() => setScheduleOpen(true)}
                >
                  Schedule…
                </button>

                <button
                  disabled={!canAct || !article}
                  className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
                  onClick={() => {
                    if (!article) return;
                    update.mutate({
                      id: article.id,
                      patch: { status: "PUBLISHED", scheduledAt: undefined },
                    });
                  }}
                >
                  Publish
                </button>
              </div>

              {(update.isPending || schedule.isPending) && (
                <div className="mt-3 text-xs text-slate-600">Saving…</div>
              )}
            </section>

            {/* Audit Log */}
            <section className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-900">Audit log</div>
                <div className="text-xs text-slate-500">{article ? `${audit.length} events` : ""}</div>
              </div>

              {!article ? (
                <div className="mt-2 text-sm text-slate-600">—</div>
              ) : audit.length === 0 ? (
                <div className="mt-2 text-sm text-slate-600">No events yet.</div>
              ) : (
                <ol className="mt-3 space-y-2">
                  {audit.map((e) => (
                    <li
                      key={e.id}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-xs font-semibold text-slate-800">
                          {actionLabel(e.action)}
                        </div>
                        <div className="text-[11px] text-slate-600">{formatAuditTime(e.ts)}</div>
                      </div>

                      <div className="mt-1 text-xs text-slate-700">{e.message}</div>
                      <div className="mt-1 text-[11px] text-slate-500">Actor: {e.actor}</div>

                      <DiffView diff={e.diff} />
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
            Tip: Press <span className="font-mono">Esc</span> to close.
          </div>
        </div>
      </aside>

      {/* Schedule Modal */}
      <SchedulePickerModal
        open={scheduleOpen}
        isBusy={schedule.isPending}
        onCancel={() => setScheduleOpen(false)}
        onConfirm={(scheduledAtISO) => {
          if (!article) return;
          schedule.mutate(
            { id: article.id, scheduledAt: scheduledAtISO },
            { onSuccess: () => setScheduleOpen(false) }
          );
        }}
      />
    </div>
  );
}