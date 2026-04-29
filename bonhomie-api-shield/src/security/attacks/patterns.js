// SQL Injection patterns
export const SQLI_PATTERNS = [
  /(\b)(select|update|union|insert|delete|drop|alter|create|exec|sleep)(\b)/i,
  /(\%27)|(')|(--)|(\%23)|(#)/i,
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
// Note: %2f (encoded slash) has been intentionally removed — it appears
// legitimately in OAuth redirect URIs, REST paths, and many APIs, causing
// excessive false positives. Path traversal via encoded slashes is already
// caught by PATH_TRAVERSAL_PATTERNS above.
export const ENCODING_ATTACKS = [
  /%00/, // Null byte
  /%25/i, // Double-encoded %
];
