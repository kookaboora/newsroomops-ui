import { ContentQueueTable } from "./ContentQueueTable";

export function ContentQueuePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-slate-900">Content Queue</h1>
          <p className="mt-1 text-sm text-slate-600">
            Operational view for content status, review flow, and scheduled publishing.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <div className="text-sm font-medium text-slate-800">Queue</div>
          </div>
          <div className="p-4">
            <ContentQueueTable />
          </div>
        </div>
      </div>
    </div>
  );
}
