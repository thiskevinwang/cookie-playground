import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { html } from "hono/html";
import { KVTable } from "../shared/ui.ts";
import { setCookieMap, renderSetCookiePreview } from "../shared/cookies.ts";
import { getConfig, cookieHostsForApp } from "../shared/config.ts";

const app = new Hono();

function buildCookieMap(hosts: string[]) {
  const map: Record<string, string> = {};
  const labels: Array<"lax" | "none" | "strict"> = ["lax", "none", "strict"];
  let idx = 0;
  for (const host of hosts) {
    for (const dom of [host, `.${host}`]) {
      for (const ss of labels) {
        const key = String.fromCharCode(97 + idx);
        map[key] = `Domain=${dom}; SameSite=${ss}`;
        idx++;
      }
    }
  }
  return map;
}

app.get("/", (c) => {
  const cfg = getConfig(c, "satellite");
  const reqHeaders = c.req.header();
  const reqCookies = getCookie(c);

  const cookieMap = buildCookieMap(cookieHostsForApp(cfg));
  setCookieMap(c, cookieMap, cfg.cookie);
  const setCookiePreview = renderSetCookiePreview(cookieMap, cfg.cookie);

  return c.html(html`
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>

    <body class="${cfg.accent.pageBg} p-4 space-y-3">
      <div id="pageHeader" class="flex items-center justify-between">
        <h1 class="${cfg.accent.text} text-2xl font-semibold">
          ${cfg.currentHost}
        </h1>
        <div class="flex gap-3 text-sm">
          <button
            onClick="location.reload()"
            class="${cfg.accent.button} text-white px-3 py-1 rounded ${cfg
              .accent.buttonHover} transition"
          >
            Reload
          </button>
          <a
            class="underline ${cfg.accent.link}"
            href="https://${cfg.hosts.primary}"
            >${cfg.hosts.primary}</a
          >
          <a
            class="underline ${cfg.accent.link}"
            href="https://${cfg.hosts.api}"
            >${cfg.hosts.api}</a
          >
        </div>
      </div>

      <div
        id="split"
        class="relative flex min-h-[480px] border border-neutral-200 overflow-hidden bg-white"
      >
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
        <div
          id="divider"
          class="w-[6px] bg-neutral-200 hover:bg-neutral-300 cursor-col-resize"
        ></div>
        <section id="paneR" class="flex-1 flex flex-col min-w-[300px]">
          <div id="paneRTop" class="basis-2/3 min-h-[160px] overflow-auto">
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
            </div>
          </div>
          <div
            id="dividerY"
            class="h-[6px] bg-neutral-200 hover:bg-neutral-300 cursor-row-resize"
          ></div>
          <div
            id="paneRBottom"
            class="flex-1 min-h-[160px] overflow-hidden relative"
          >
            <span
              class="absolute top-0 right-0 m-2 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-orange-500 text-white"
              >Iframe</span
            >
            <iframe
              src="https://${cfg.hosts.primary}"
              class="w-full h-full border-2 border-orange-500 shadow-sm"
            ></iframe>
          </div>
        </section>
        <!-- Intersection handle: drag diagonally to resize both X and Y -->
        <div
          id="dividerXY"
          class="absolute w-3 h-3 -ml-1.5 -mt-1.5 bg-neutral-300 hover:bg-neutral-400 shadow cursor-nwse-resize z-10"
          style="left: 50%; top: 50%"
        ></div>
      </div>

      <script>
        (function () {
          const split = document.getElementById("split");
          const header = document.getElementById("pageHeader");
          const left = document.getElementById("paneL");
          const divider = document.getElementById("divider");
          const right = document.getElementById("paneR");
          const rTop = document.getElementById("paneRTop");
          const rBottom = document.getElementById("paneRBottom");
          const dividerY = document.getElementById("dividerY");
          const dividerXY = document.getElementById("dividerXY");
          if (
            !split ||
            !left ||
            !divider ||
            !right ||
            !rTop ||
            !rBottom ||
            !dividerY ||
            !dividerXY
          )
            return;
          let draggingX = false;
          let draggingY = false;
          const layout = () => {
            const headerH = header?.getBoundingClientRect().height ?? 0;
            const topPad = 16;
            const gapY = 12;
            const vertical = headerH + topPad + gapY + 2;
            const h = Math.max(320, window.innerHeight - vertical);
            split.style.height = h + "px";
            positionIntersection();
          };
          const positionIntersection = () => {
            const rectSplit = split.getBoundingClientRect();
            const rectLeft = left.getBoundingClientRect();
            const rectTop = rTop.getBoundingClientRect();
            const rectDivX = divider.getBoundingClientRect();
            const rectDivY = dividerY.getBoundingClientRect();
            const x = rectLeft.right - rectSplit.left + rectDivX.width / 2;
            const y = rectTop.bottom - rectSplit.top + rectDivY.height / 2;
            dividerXY.style.left = x + "px";
            dividerXY.style.top = y + "px";
          };
          const onMouseMove = (e) => {
            if (draggingX) {
              const rect = split.getBoundingClientRect();
              const min = 220;
              const max = rect.width * 0.8;
              let newW = e.clientX - rect.left;
              if (newW < min) newW = min;
              if (newW > max) newW = max;
              left.style.flexBasis = newW + "px";
            }
            if (draggingY) {
              const rectR = right.getBoundingClientRect();
              const minH = 120;
              let newTop = e.clientY - rectR.top;
              if (newTop < minH) newTop = minH;
              if (newTop > rectR.height - minH) newTop = rectR.height - minH;
              rTop.style.flexBasis = newTop + "px";
            }
            if (draggingX || draggingY) positionIntersection();
          };
          divider.addEventListener("mousedown", () => {
            draggingX = true;
            document.body.classList.add("select-none");
          });
          dividerY.addEventListener("mousedown", () => {
            draggingY = true;
            document.body.classList.add("select-none");
          });
          dividerXY.addEventListener("mousedown", () => {
            draggingX = true;
            draggingY = true;
            document.body.classList.add("select-none");
          });
          window.addEventListener("mousemove", onMouseMove);
          window.addEventListener("mouseup", () => {
            draggingX = false;
            draggingY = false;
            document.body.classList.remove("select-none");
            positionIntersection();
          });
          window.addEventListener("resize", layout);
          layout();
        })();
      </script>
    </body>
  `);
});

export default app;
