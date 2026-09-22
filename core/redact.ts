const TOKEN_PATTERNS = [
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{8,}\b/g,
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bgithub_pat_[A-Za-z0-9_]{10,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9_]{10,}\b/g,
  /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
  /\bBearer\s+[A-Za-z0-9\-._~+/]{8,}=*/g,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{6,}\b/g,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g,
];

const ASSIGNMENT =
  /\b(api[_-]?key|secret|token|password|passwd|pwd|authorization)\b(\s*[:=]\s*)(['"]?)([^\s'"]{4,})\3/gi;

export function redact(text: string): string {
  let out = text;
  for (const pattern of TOKEN_PATTERNS) out = out.replace(pattern, '[redacted]');
  out = out.replace(ASSIGNMENT, (_match, key: string, separator: string) => `${key}${separator}[redacted]`);
  return out;
}
