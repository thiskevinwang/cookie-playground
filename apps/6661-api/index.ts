import { Hono } from "hono";
import { setCookie, getCookie } from "hono/cookie";
import { html, raw } from "hono/html";

import { cors } from "hono/cors";

const app = new Hono();
const cookieMap = {
  a: "Domain=api.primary.local; SameSite=lax",
  b: "Domain=api.primary.local; SameSite=none",
  c: "Domain=api.primary.local; SameSite=strict", // won't get set unless secure is true
  d: "Domain=.api.primary.local; SameSite=lax",
  e: "Domain=.api.primary.local; SameSite=none",
  f: "Domain=.api.primary.local; SameSite=strict", // won't get set unless secure is true
  g: "Domain=primary.local; SameSite=lax",
  h: "Domain=primary.local; SameSite=none",
  i: "Domain=primary.local; SameSite=strict", // won't get set unless secure is true
  j: "Domain=.primary.local; SameSite=lax",
  k: "Domain=.primary.local; SameSite=none",
  l: "Domain=.primary.local; SameSite=strict", // won't get set unless secure is true
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

app.use(cors());

app.get("/", (c) => {
  const redirectUrl = c.req.query("redirectUrl");
  const reqHeaders = c.req.header();
  const reqCookies = getCookie(c);

  Object.entries(cookieMap).forEach(([key, value]) => {
    const domain = value.split(";")[0].split("=")[1].trim();
    const sameSite = value.split(";")[1]?.split("=")[1].trim();
    setCookie(c, key, `(from api.primary.local) ${value}`, {
      domain,
      httpOnly: true,
      sameSite,
      secure: true,
      expires: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
    });
  });

  if (redirectUrl) {
    return c.redirect(redirectUrl);
  }
  return c.html(html`
    <head>
      <script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>
    </head>

    <body class="space-y-4 bg-violet-50 p-4">
      <h1 class="text-violet-500 text-3xl font-bold underline">API.Primary</h1>

      <button
        onClick="location.reload()"
        class="bg-violet-500 text-white px-4 py-1 rounded hover:bg-violet-600 transition"
      >
        Reload
      </button>

      <div class="grid grid-cols-1">
        <a href="https://primary.local">https://primary.local</a>
        <a href="https://satellite.local">https://satellite.local</a>

        <a href="https://api.primary.local?redirectUrl=https://satellite.local"
          >https://api.primary.local?redirectUrl=https://satellite.local</a
        >
        <a href="https://api.primary.local?redirectUrl=https://primary.local"
          >https://api.primary.local?redirectUrl=https://primary.local</a
        >
      </div>

      <details class="bg-violet-100 p-1 rounded-lg">
        <summary class="cursor-pointer text-violet-500">
          Request Headers
        </summary>
        ${KVTable(reqHeaders)}
      </details>

      <details open class="bg-violet-100 p-1 rounded-lg">
        <summary class="cursor-pointer text-violet-500">
          Request Cookies
        </summary>
        ${KVTable(reqCookies)}
      </details>
    </body>
  `);
});

export default app;
