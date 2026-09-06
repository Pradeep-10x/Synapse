/**
 * Escapes a string so it can be used safely inside a MongoDB $regex query.
 * Prevents regex-injection / ReDoS from user-supplied search terms.
 */
export const escapeRegex = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
