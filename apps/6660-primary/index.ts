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

const KVTable = (data: Record<string, string>) => html`
  <table class="table-auto">
    <thead>
      <tr>
        <th>Key</th>
        <th>Value</th>
      </tr>
    </thead>
    <tbody class="[&>tr]:border [&>tr:hover]:bg-neutral-100 text-xs font-mono">
      ${Object.entries(data).map(
        ([key, value]) => html`
          <tr class="[&>td]:px-1 [&>td]:border">
            <td class="whitespace-nowrap">${raw(key)}</td>
            <td>${raw(value)}</td>
          </tr>
        `
      )}
    </tbody>
  </table>
`;

app.get("/", (c) => {
  const reqHeaders = c.req.header();
  const reqCookies = getCookie(c);

  Object.entries(cookieMap).forEach(([key, value]) => {
    const domain = value.split(";")[0].split("=")[1].trim();
    const sameSite = value.split(";")[1]?.split("=")[1].trim();
    setCookie(c, key, `(from primary.local) ${value}`, {
      domain,
      httpOnly: true,
      sameSite,
      secure: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });
  });

  return c.html(html`
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>

    <body class="space-y-4 bg-emerald-50 p-4">
      <h1 class="text-emerald-500 text-3xl font-bold underline">Primary</h1>

      <button
        onClick="location.reload()"
        class="bg-emerald-500 text-white px-4 py-1 rounded hover:bg-emerald-600 transition"
      >
        Reload
      </button>

      <div class="grid grid-cols-1">
        <a href="https://satellite.local">https://satellite.local</a>
        <a href="https://api.primary.local">https://api.primary.local</a>

        <a href="https://api.primary.local?redirectUrl=https://satellite.local"
          >https://api.primary.local?redirectUrl=https://satellite.local</a
        >
        <a href="https://api.primary.local?redirectUrl=https://primary.local"
          >https://api.primary.local?redirectUrl=https://primary.local</a
        >
      </div>

      <details class="bg-emerald-100 p-1 rounded-lg">
        <summary class="cursor-pointer text-emerald-500">
          Request Headers
        </summary>
        ${KVTable(reqHeaders)}
      </details>

      <details open class="bg-emerald-100 p-1 rounded-lg">
        <summary class="cursor-pointer text-emerald-500">
          Request Cookies
        </summary>
        ${KVTable(reqCookies)}
      </details>

      <div
        class="relative before:content-['iframe'] before:absolute before:top-0 before:right-0 before:bg-neutral-100 before:text-neutral-500 before:p-2"
      >
        <iframe
          src="https://satellite.local"
          class="w-full h-96 border border-neutral-300 rounded-lg "
        ></iframe>
      </div>
    </body>
  `);
});

export default app;
