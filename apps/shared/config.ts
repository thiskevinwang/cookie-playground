import type { Context } from "hono";

export type AppId = "primary" | "api" | "satellite";

export type Accent = {
  pageBg: string; // e.g. 'bg-emerald-50'
  text: string; // e.g. 'text-emerald-600'
  button: string; // e.g. 'bg-emerald-500'
  buttonHover: string; // e.g. 'hover:bg-emerald-600'
  link: string; // e.g. 'text-emerald-700'
};

export type AppConfig = {
  appId: AppId;
  hosts: { primary: string; api: string; satellite: string };
  currentHost: string;
  cookie: { secure: boolean; httpOnly: boolean; ttlMs: number; prefix: string };
  accent: Accent;
};

const accents: Record<AppId, Accent> = {
  primary: {
    pageBg: "bg-emerald-50",
    text: "text-emerald-600",
    button: "bg-emerald-500",
    buttonHover: "hover:bg-emerald-600",
    link: "text-emerald-700",
  },
  api: {
    pageBg: "bg-violet-50",
    text: "text-violet-600",
    button: "bg-violet-500",
    buttonHover: "hover:bg-violet-600",
    link: "text-violet-700",
  },
  satellite: {
    pageBg: "bg-sky-50",
    text: "text-sky-600",
    button: "bg-sky-500",
    buttonHover: "hover:bg-sky-600",
    link: "text-sky-700",
  },
};

export function getConfig(c: Context, appId: AppId): AppConfig {
  const url = new URL(c.req.url);
  const env = (name: string, dflt: string) => process.env[name] ?? dflt;

  const hosts = {
    primary: env("PRIMARY_HOST", "primary.local"),
    api: env("API_HOST", "api.primary.local"),
    satellite: env("SATELLITE_HOST", "satellite.local"),
  } as const;

  const hostHeader = c.req.header("host") ?? url.hostname;
  const currentHost = hostHeader.split(":")[0] || hostHeader;

  const secure =
    (process.env.SECURE_COOKIES ?? "true").toLowerCase() !== "false";
  const httpOnly =
    (process.env.HTTP_ONLY_COOKIES ?? "true").toLowerCase() !== "false";
  const ttlMs = Number(process.env.COOKIE_TTL_MS ?? 24 * 60 * 60 * 1000);

  return {
    appId,
    hosts,
    currentHost,
    cookie: {
      secure,
      httpOnly,
      ttlMs,
      prefix: currentHost,
    },
    accent: accents[appId],
  };
}

export function cookieHostsForApp(cfg: AppConfig): string[] {
  switch (cfg.appId) {
    case "api":
      return [cfg.hosts.api, cfg.hosts.primary];
    case "primary":
      return [cfg.hosts.primary];
    case "satellite":
      return [cfg.hosts.satellite];
  }
}
