import * as React from "react";

function cx(...xs: Array<string | false | undefined>) {
  return xs.filter(Boolean).join(" ");
}

// Convert Date -> value for <input type="datetime-local">
function toLocalInputValue(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

// Convert local datetime-local string -> ISO
function localInputToISO(value: string) {
  // value format: YYYY-MM-DDTHH:mm (no timezone). JS Date interprets as local time.
  const dt = new Date(value);
  return dt.toISOString();
}

export function SchedulePickerModal({
  open,
  title = "Schedule publish",
  isBusy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title?: string;
  isBusy?: boolean;
  onCancel: () => void;
  onConfirm: (scheduledAtISO: string) => void;
}) {
  const [value, setValue] = React.useState(() => toLocalInputValue(new Date(Date.now() + 60 * 60 * 1000)));
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    // Default: +1 hour, rounded to nearest 5 minutes
    const d = new Date(Date.now() + 60 * 60 * 1000);
    d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
    d.setSeconds(0);
    d.setMilliseconds(0);
    setValue(toLocalInputValue(d));
    setError(null);
  }, [open]);

  React.useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  function validateAndConfirm() {
    if (!value) {
      setError("Pick a date and time.");
      return;
    }

    const selected = new Date(value); // interpreted as local time
    if (Number.isNaN(selected.getTime())) {
      setError("Invalid date/time.");
      return;
    }

    const now = new Date();
    if (selected.getTime() <= now.getTime() + 60 * 1000) {
      setError("Choose a time at least 1 minute in the future.");
      return;
    }

    setError(null);
    onConfirm(localInputToISO(value));
  }

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onCancel} />

      <div className="absolute inset-0 grid place-items-center p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-4">
            <div className="text-sm font-semibold text-slate-900">{title}</div>
            <div className="mt-1 text-xs text-slate-600">
              Time is in your local timezone.
            </div>
          </div>

          <div className="p-4 space-y-3">
            <label className="block">
              <div className="text-xs font-medium text-slate-700">Publish at</div>
              <input
                type="datetime-local"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className={cx(
                  "mt-1 w-full rounded-md border bg-white px-3 py-2 text-sm text-slate-900 outline-none",
                  "border-slate-200 focus:ring-2 focus:ring-slate-200"
                )}
              />
            </label>

            {error ? (
              <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
                {error}
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-slate-200 p-4">
            <button
              disabled={isBusy}
              onClick={onCancel}
              className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              disabled={isBusy}
              onClick={validateAndConfirm}
              className="rounded-md border border-slate-200 bg-slate-900 px-3 py-2 text-sm text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {isBusy ? "Scheduling…" : "Schedule"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}