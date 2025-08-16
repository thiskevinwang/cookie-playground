import { Hono } from "hono";

import { setCookie, getCookie } from "hono/cookie";
import { html, raw } from "hono/html";

const app = new Hono();

const cookieMap = {
  a: "Domain=primary.local; SameSite=lax",
  b: "Domain=primary.local; SameSite=none",
  c: "Domain=primary.local; SameSite=strict", // won't get set unless secure is true
  d: "Domain=.primary.local; SameSite=lax",
  e: "Domain=.primary.local; SameSite=none",
  f: "Domain=.primary.local; SameSite=strict", // won't get set unless secure is true
} as const;

type SameSiteOpt = "lax" | "none" | "strict" | undefined;

const parseCookieDirectives = (
  value: string
): { domain?: string; sameSite?: SameSiteOpt } => {
  const domain = /Domain=([^;]+)/i.exec(value)?.[1]?.trim();
  const sameSite = /SameSite=([^;]+)/i
    .exec(value)?.[1]
    ?.trim()
    .toLowerCase() as SameSiteOpt;
  return { domain, sameSite };
};

// Proxyman-like key/value viewer: compact rows, fixed key column, subtle borders
const KVTable = (data: Record<string, string>) => html`
  <div
    class="border border-neutral-200 rounded-md overflow-hidden bg-white shadow-sm"
  >
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

app.get("/", (c) => {
  const reqHeaders = c.req.header();
  const reqCookies = getCookie(c);

  Object.entries(cookieMap).forEach(([key, value]) => {
    const { domain, sameSite } = parseCookieDirectives(value);
    setCookie(c, key, `(from primary.local) ${value}`, {
      domain,
      httpOnly: true,
      sameSite,
      secure: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });
  });

  // Build a simple preview of the Set-Cookie response header lines (for the UI only)
  const expireAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
  const setCookiePreview = Object.entries(cookieMap)
    .map(([name, directives]) => {
      const { domain, sameSite } = parseCookieDirectives(directives);
      const parts = [
        `${name}=${encodeURIComponent(`(from primary.local) ${directives}`)}`,
        domain ? `Domain=${domain}` : undefined,
        "Path=/",
        sameSite ? `SameSite=${sameSite}` : undefined,
        "HttpOnly",
        "Secure",
        `Expires=${expireAt.toUTCString()}`,
      ].filter(Boolean);
      return parts.join("; ");
    })
    .join("\n");

  return c.html(html`
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>

    <body class="bg-emerald-50 p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h1 class="text-emerald-600 text-2xl font-semibold">Primary</h1>
        <div class="flex gap-3 text-sm">
          <button
            onClick="location.reload()"
            class="bg-emerald-500 text-white px-3 py-1 rounded hover:bg-emerald-600 transition"
          >
            Reload
          </button>
          <a class="underline text-emerald-700" href="https://satellite.local"
            >satellite.local</a
          >
          <a class="underline text-emerald-700" href="https://api.primary.local"
            >api.primary.local</a
          >
        </div>
      </div>

      <!-- Split panes: Request (left) | Response (right) with draggable divider -->
      <div
        id="split"
        class="flex h-[70vh] min-h-[480px] border border-neutral-200 rounded-md overflow-hidden bg-white"
      >
        <!-- Left: Request -->
        <section
          id="paneL"
          class="basis-1/2 min-w-[260px] max-w-[80%] overflow-auto"
        >
          <header
            class="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-neutral-700 text-sm"
          >
            Request
          </header>
          <div class="p-3 space-y-3">
            <div>
              <div
                class="text-[11px] uppercase tracking-wide text-neutral-500 mb-1"
              >
                Headers
              </div>
              ${KVTable(reqHeaders)}
            </div>
            <div>
              <div
                class="text-[11px] uppercase tracking-wide text-neutral-500 mb-1"
              >
                Cookies
              </div>
              ${KVTable(reqCookies)}
            </div>
          </div>
        </section>

        <!-- Divider -->
        <div
          id="divider"
          class="w-[6px] bg-neutral-200 hover:bg-neutral-300 cursor-col-resize"
        ></div>

        <!-- Right: Response -->
        <section id="paneR" class="flex-1 overflow-auto">
          <header
            class="px-4 py-2 bg-neutral-50 border-b border-neutral-200 text-neutral-700 text-sm"
          >
            Response
          </header>
          <div class="p-3 space-y-3">
            <div>
              <div
                class="text-[11px] uppercase tracking-wide text-neutral-500 mb-1"
              >
                Headers
              </div>
              ${KVTable({ "Set-Cookie": setCookiePreview })}
            </div>
            <div
              class="relative before:content-['iframe'] before:absolute before:top-0 before:right-0 before:bg-neutral-100 before:text-neutral-500 before:px-2 before:py-1"
            >
              <iframe
                src="https://satellite.local"
                class="w-full h-72 border border-neutral-300 rounded-md"
              ></iframe>
            </div>
          </div>
        </section>
      </div>

      <script>
        // Simple drag-to-resize between left and right panes
        (function () {
          const split = document.getElementById("split");
          const left = document.getElementById("paneL");
          const divider = document.getElementById("divider");
          if (!split || !left || !divider) return;
          let dragging = false;

          const onMouseMove = (e) => {
            if (!dragging) return;
            const rect = split.getBoundingClientRect();
            const min = 220; // px
            const max = rect.width * 0.8; // 80%
            let newW = e.clientX - rect.left;
            if (newW < min) newW = min;
            if (newW > max) newW = max;
            left.style.flexBasis = newW + "px";
          };

          divider.addEventListener("mousedown", () => {
            dragging = true;
            document.body.classList.add("select-none");
          });
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", () => {
            dragging = false;
            document.body.classList.remove("select-none");
          });
        })();
      </script>
    </body>
  `);
});

export default app;
