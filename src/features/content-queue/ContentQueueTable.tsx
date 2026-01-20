import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

import type { Article } from "../../types/article";
import { useArticles } from "../../api/articles";
import { formatDateTime } from "../../utils/date";
import { ArticleDrawer } from "./ArticleDrawer";

/* -------------------- constants -------------------- */

const STATUS_OPTIONS = ["DRAFT", "IN_REVIEW", "SCHEDULED", "PUBLISHED"] as const;
const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH"] as const;

const REGION_OPTIONS = [
  "Gujarat",
  "Delhi NCR",
  "Maharashtra",
  "Rajasthan",
  "Madhya Pradesh",
  "Uttar Pradesh",
  "Punjab",
  "National",
] as const;

const CATEGORY_OPTIONS = [
  "Politics",
  "Business",
  "Sports",
  "Entertainment",
  "Technology",
  "Health",
  "World",
  "Regional",
] as const;

/* -------------------- UI helpers -------------------- */

function StatusBadge({ value }: { value: Article["status"] }) {
  const label =
    value === "IN_REVIEW"
      ? "In Review"
      : value === "SCHEDULED"
      ? "Scheduled"
      : value === "PUBLISHED"
      ? "Published"
      : "Draft";

  const cls =
    value === "PUBLISHED"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : value === "SCHEDULED"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : value === "IN_REVIEW"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {label}
    </span>
  );
}

function PriorityPill({ value }: { value: Article["priority"] }) {
  const cls =
    value === "HIGH"
      ? "bg-rose-50 text-rose-700 ring-rose-200"
      : value === "MEDIUM"
      ? "bg-violet-50 text-violet-700 ring-violet-200"
      : "bg-slate-50 text-slate-700 ring-slate-200";

  return (
    <span className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ring-1 ${cls}`}>
      {value}
    </span>
  );
}

/* -------------------- main table -------------------- */

export function ContentQueueTable() {
  const [page, setPage] = React.useState(1);
  const pageSize = 25;

  const [q, setQ] = React.useState("");
  const [query, setQuery] = React.useState("");

  const [status, setStatus] = React.useState<string[]>([]);
  const [region, setRegion] = React.useState<string[]>([]);
  const [category, setCategory] = React.useState<string[]>([]);
  const [priority, setPriority] = React.useState<string[]>([]);

  const [sort, setSort] = React.useState<"updatedAt" | "scheduledAt" | "priority">(
    "updatedAt"
  );
  const [order, setOrder] = React.useState<"asc" | "desc">("desc");

  const [selected, setSelected] = React.useState<Article | null>(null);

  const { data, isLoading, isError, error, isFetching } = useArticles({
    page,
    pageSize,
    q: query || undefined,
    status: status.length ? status : undefined,
    region: region.length ? region : undefined,
    category: category.length ? category : undefined,
    priority: priority.length ? priority : undefined,
    sort,
    order,
  });

  const columns = React.useMemo<ColumnDef<Article>[]>(
    () => [
      {
        header: "Status",
        accessorKey: "status",
        cell: ({ getValue }) => (
          <StatusBadge value={getValue() as Article["status"]} />
        ),
      },
      {
        header: "Headline",
        accessorKey: "headline",
        cell: ({ getValue }) => (
          <div className="max-w-[520px] truncate text-sm font-medium text-slate-900">
            {getValue() as string}
          </div>
        ),
      },
      {
        header: "Category",
        accessorKey: "category",
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-700">{getValue() as string}</span>
        ),
      },
      {
        header: "Region",
        accessorKey: "region",
        cell: ({ getValue }) => (
          <span className="text-sm text-slate-700">{getValue() as string}</span>
        ),
      },
      {
        header: "Priority",
        accessorKey: "priority",
        cell: ({ getValue }) => (
          <PriorityPill value={getValue() as Article["priority"]} />
        ),
      },
      {
        header: "Updated",
        accessorKey: "updatedAt",
        cell: ({ getValue }) => (
          <span className="text-xs text-slate-600">
            {formatDateTime(getValue() as string)}
          </span>
        ),
      },
      {
        header: "Scheduled",
        accessorKey: "scheduledAt",
        cell: ({ getValue }) => {
          const v = getValue() as string | undefined;
          return v ? (
            <span className="text-xs text-slate-600">{formatDateTime(v)}</span>
          ) : (
            <span className="text-xs text-slate-400">—</span>
          );
        },
      },
    ],
    []
  );

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function resetAll() {
    setQ("");
    setQuery("");
    setStatus([]);
    setRegion([]);
    setCategory([]);
    setPriority([]);
    setSort("updatedAt");
    setOrder("desc");
    setPage(1);
  }

  return (
    <>
      {/* Toolbar */}
      <div className="mb-3 grid gap-2 lg:grid-cols-12">
        <div className="lg:col-span-5 flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search headline, author, category, region…"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => {
              setPage(1);
              setQuery(q.trim());
            }}
          >
            Search
          </button>
          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={resetAll}
          >
            Reset
          </button>
        </div>

        <div className="lg:col-span-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select value={status[0] ?? ""} onChange={(e) => setStatus(e.target.value ? [e.target.value] : [])} className="rounded-md border px-2 py-2 text-sm">
            <option value="">Status</option>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select value={priority[0] ?? ""} onChange={(e) => setPriority(e.target.value ? [e.target.value] : [])} className="rounded-md border px-2 py-2 text-sm">
            <option value="">Priority</option>
            {PRIORITY_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>

          <select value={region[0] ?? ""} onChange={(e) => setRegion(e.target.value ? [e.target.value] : [])} className="rounded-md border px-2 py-2 text-sm">
            <option value="">Region</option>
            {REGION_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>

          <select value={category[0] ?? ""} onChange={(e) => setCategory(e.target.value ? [e.target.value] : [])} className="rounded-md border px-2 py-2 text-sm">
            <option value="">Category</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="lg:col-span-2 flex gap-2">
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
            className="w-full rounded-md border px-2 py-2 text-sm"
          >
            <option value="updatedAt">Updated</option>
            <option value="scheduledAt">Scheduled</option>
            <option value="priority">Priority</option>
          </select>

          <button
            className="rounded-md border px-3 py-2 text-sm"
            onClick={() => setOrder((o) => (o === "asc" ? "desc" : "asc"))}
          >
            {order === "asc" ? "Asc" : "Desc"}
          </button>
        </div>

        <div className="lg:col-span-12 text-xs text-slate-600">
          {isFetching ? "Updating…" : ""}
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="text-sm text-slate-600">Loading…</div>
      ) : isError ? (
        <div className="text-sm text-rose-700">
          {(error as Error).message}
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border">
            <table className="min-w-full border-separate border-spacing-0">
              <thead className="bg-slate-50">
                {table.getHeaderGroups().map((hg) => (
                  <tr key={hg.id}>
                    {hg.headers.map((h) => (
                      <th key={h.id} className="border-b px-3 py-2 text-left text-xs font-semibold">
                        {flexRender(h.column.columnDef.header, h.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="cursor-pointer hover:bg-slate-50"
                    onClick={() => setSelected(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="border-b px-3 py-2 text-sm">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex justify-between text-xs">
            <div>
              Page {page} of {totalPages} • {total} items
            </div>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
              <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          </div>
        </>
      )}

      {/* Drawer */}
      <ArticleDrawer
        open={Boolean(selected)}
        article={selected}
        onClose={() => setSelected(null)}
      />
    </>
  );
}