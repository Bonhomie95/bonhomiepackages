import { ApiError } from '../errors/ApiError.js';

/**
 * Check if user has at least one role
 * @param {{ role?: string; roles?: string[] }} user
 * @param {string[]} allowedRoles
 */
export function hasRole(user, allowedRoles = []) {
  if (!user) return false;
  const userRoles = new Set(
    [user.role, ...(Array.isArray(user.roles) ? user.roles : [])].filter(
      Boolean
    )
  );

  return allowedRoles.some((r) => userRoles.has(r));
}

/**
 * Check if user has required permission(s)
 * @param {{ permissions?: string[] }} user
 * @param {string | string[]} perms
 */
export function hasPermission(user, perms) {
  if (!user) return false;
  const userPerms = new Set(user.permissions || []);
  const list = Array.isArray(perms) ? perms : [perms];
  return list.every((p) => userPerms.has(p));
}

/**
 * Express middleware: require one of these roles
 * @param {string[]} roles
 */
export function requireRole(roles = []) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!hasRole(req.user, roles)) {
      return next(new ApiError(403, 'Access denied (role required)'));
    }
    next();
  };
}

/**
 * Express middleware: require permission(s)
 * @param {string | string[]} perms
 */
export function requirePermission(perms) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Authentication required'));
    }
    if (!hasPermission(req.user, perms)) {
      return next(new ApiError(403, 'Access denied (permission required)'));
    }
    next();
  };
}
