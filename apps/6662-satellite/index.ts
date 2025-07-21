import { Hono } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import { html, raw } from "hono/html";

const app = new Hono();

const cookieMap = {
  a: "Domain=satellite.local; SameSite=lax",
  b: "Domain=satellite.local; SameSite=none",
  c: "Domain=satellite.local; SameSite=strict", // won't get set unless secure is true
  d: "Domain=.satellite.local; SameSite=lax",
  e: "Domain=.satellite.local; SameSite=none",
  f: "Domain=.satellite.local; SameSite=strict", // won't get set unless secure is true
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
    setCookie(c, key, `(from satellite.local) ${value}`, {
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

    <body class="space-y-4 bg-sky-50 p-4">
      <h1 class="text-sky-500 text-3xl font-bold underline">Satellite</h1>

      <button
        onClick="location.reload()"
        class="bg-sky-500 text-white px-4 py-1 rounded hover:bg-sky-600 transition"
      >
        Reload
      </button>

      <div class="grid grid-cols-1">
        <a href="https://primary.local">https://primary.local</a>
        <a href="https://api.primary.local">https://api.primary.local</a>

        <a href="https://api.primary.local?redirectUrl=https://primary.local"
          >https://api.primary.local?redirectUrl=https://primary.local</a
        >
        <a href="https://api.primary.local?redirectUrl=https://satellite.local"
          >https://api.primary.local?redirectUrl=https://satellite.local</a
        >
      </div>

      <details class="bg-sky-100 p-1 rounded-lg">
        <summary class="cursor-pointer">Request Headers</summary>
        ${KVTable(reqHeaders)}
      </details>

      <details open class="bg-sky-100 p-1 rounded-lg">
        <summary class="cursor-pointer">Request Cookies</summary>
        ${KVTable(reqCookies)}
      </details>
    </body>
  `);
});

export default app;
