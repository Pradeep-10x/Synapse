/**
 * Strips MongoDB operator injection vectors ($-prefixed keys and dotted keys)
 * from incoming request payloads.
 *
 * Note: written to be Express 5 safe. In Express 5 `req.query` is a read-only
 * getter, so we mutate objects in place (deleting offending keys) instead of
 * reassigning them — which is what express-mongo-sanitize does and why it
 * crashes on Express 5.
 */
const sanitizeInPlace = (obj) => {
  if (!obj || typeof obj !== "object") return;

  for (const key of Object.keys(obj)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete obj[key];
      continue;
    }
    const value = obj[key];
    if (value && typeof value === "object") {
      sanitizeInPlace(value);
    }
  }
};

export const sanitizeRequest = (req, _res, next) => {
  sanitizeInPlace(req.body);
  sanitizeInPlace(req.params);
  // req.query is read-only in Express 5 — mutate its contents, not the ref.
  if (req.query) sanitizeInPlace(req.query);
  next();
};

export default sanitizeRequest;
