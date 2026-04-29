// SQL Injection patterns
export const SQLI_PATTERNS = [
  /(\b)(select|update|union|insert|delete|drop|alter|create|exec|sleep)(\b)/i,
  /(\%27)|(')|(--)|(\\%23)|(#)/i,
  /((\%3D)|(=))[^\n]*((\%27)|(')|(--))/i,
  /\bOR\s+1=1\b/i,
  /UNION\s+SELECT/i,
  /';--/i,
];

// XSS injection patterns
export const XSS_PATTERNS = [
  /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  /on\w+\s*=/i,
  /(javascript:)/i,
  /alert\s*\(/i,
  /document\.cookie/i,
  /<img[\s\S]*?onerror=/i,
];

// Path traversal
export const PATH_TRAVERSAL_PATTERNS = [
  /\.\.\//,
  /\.\.\\/,
  /%2e%2e%2f/i,
  /%2e%2e\\\//i,
];

// Suspicious encodings
// FIX (v2.1.1): /%00/ only matches the literal string "%00" (URL-encoded form).
// When Express URL-decodes query/body values, null bytes arrive as the actual
// \x00 character — which /%00/ would NOT catch. Added /\x00/ to cover both cases.
//
// %2f (encoded slash) intentionally excluded — it appears legitimately in OAuth
// redirect URIs, REST paths, etc. Path traversal via encoded slashes is already
// covered by PATH_TRAVERSAL_PATTERNS above.
export const ENCODING_ATTACKS = [
  /%00/,    // URL-encoded null byte (raw / not-yet-decoded strings)
  /\x00/,   // Actual null byte (URL-decoded strings from req.query/body)
  /%25/i,   // Double-encoded %
];
