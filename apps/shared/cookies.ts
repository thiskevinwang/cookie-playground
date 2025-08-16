import type { Context } from "hono";
import { setCookie } from "hono/cookie";

export type SameSiteOpt = "lax" | "none" | "strict" | undefined;

export const parseCookieDirectives = (
  value: string
): { domain?: string; sameSite?: SameSiteOpt } => {
  const domain = /Domain=([^;]+)/i.exec(value)?.[1]?.trim();
  const sameSite = /SameSite=([^;]+)/i
    .exec(value)?.[1]
    ?.trim()
    .toLowerCase() as SameSiteOpt;
  return { domain, sameSite };
};

export type CookieBlueprint = Record<string, string>;

export function setCookieMap(
  c: Context,
  map: CookieBlueprint,
  options?: {
    prefix?: string;
    secure?: boolean;
    httpOnly?: boolean;
    ttlMs?: number;
  }
) {
  const now = Date.now();
  const expires = new Date(now + (options?.ttlMs ?? 1000 * 60 * 60 * 24));
  const prefix = options?.prefix ? `(${options.prefix}) ` : "";

  Object.entries(map).forEach(([key, directives]) => {
    const { domain, sameSite } = parseCookieDirectives(directives);
    setCookie(c, key, `${prefix}${directives}`, {
      domain,
      httpOnly: options?.httpOnly ?? true,
      sameSite,
      secure: options?.secure ?? true,
      expires,
    });
  });
}

export function renderSetCookiePreview(
  map: CookieBlueprint,
  options?: {
    prefix?: string;
    secure?: boolean;
    httpOnly?: boolean;
    ttlMs?: number;
  }
) {
  const now = Date.now();
  const expires = new Date(now + (options?.ttlMs ?? 1000 * 60 * 60 * 24));
  const prefix = options?.prefix ? `(${options.prefix}) ` : "";

  return Object.entries(map)
    .map(([name, directives]) => {
      const { domain, sameSite } = parseCookieDirectives(directives);
      const parts = [
        `${name}=${encodeURIComponent(`${prefix}${directives}`)}`,
        domain ? `Domain=${domain}` : undefined,
        "Path=/",
        sameSite ? `SameSite=${sameSite}` : undefined,
        options?.httpOnly !== false ? "HttpOnly" : undefined,
        options?.secure !== false ? "Secure" : undefined,
        `Expires=${expires.toUTCString()}`,
      ].filter(Boolean);
      return parts.join("; ");
    })
    .join("\n");
}
