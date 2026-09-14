export function appUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl && process.env.NODE_ENV === "production") throw new Error("NEXT_PUBLIC_APP_URL_NOT_CONFIGURED");
  return `${(baseUrl ?? "http://localhost:3000").replace(/\/$/, "")}${path}`;
}
