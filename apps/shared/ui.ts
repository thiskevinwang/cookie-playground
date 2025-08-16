import { html, raw } from "hono/html";

// Proxyman-like key/value viewer: compact rows, fixed key column, subtle borders
export const KVTable = (data: Record<string, string>) => html`
  <div class="border border-neutral-200 overflow-hidden bg-white shadow-sm">
    <div
      class="grid grid-cols-[220px_1fr] items-center gap-3 px-3 py-2 bg-neutral-50 text-neutral-500 text-[11px] uppercase tracking-wide"
    >
      <div>Key</div>
      <div>Value</div>
    </div>

    <div class="divide-y divide-neutral-200 text-xs font-mono leading-relaxed">
      ${Object.entries(data).map(
        ([key, value]) => html`
          <div
            class="grid grid-cols-[220px_1fr] items-start gap-3 px-3 py-2 hover:bg-neutral-50"
          >
            <div class="text-neutral-600 whitespace-nowrap">${raw(key)}</div>
            <div class="text-neutral-900 break-words whitespace-pre-wrap">
              ${raw(value)}
            </div>
          </div>
        `
      )}
    </div>
  </div>
`;
