const SECRET_PARAM = /token|key|password|passwd|auth|sig|session|secret/i;

export function cleanUrl(raw: string | undefined): { url?: string; domain?: string } {
  if (!raw) return {};
  const trimmed = raw.trim();
  if (trimmed.length > 2000 || !/^https?:\/\//i.test(trimmed)) return {};
  try {
    const url = new URL(trimmed);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    if (!host) return {};
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (SECRET_PARAM.test(key)) url.searchParams.set(key, 'REDACTED');
    }
    if (url.pathname.length > 1 && url.pathname.endsWith('/')) {
      url.pathname = url.pathname.slice(0, -1);
    }
    const domain = url.port ? `${host}:${url.port}` : host;
    return { url: url.toString(), domain };
  } catch {
    return {};
  }
}
