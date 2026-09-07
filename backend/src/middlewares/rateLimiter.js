import { rateLimit } from 'express-rate-limit';

// Baseline limit applied to the whole API.
const limiter = rateLimit({
	windowMs: 60 * 1000, // 1 minute
	limit: 100,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	ipv6Subnet: 56,
	message: { success: false, message: 'Too many requests, please try again later.', data: null },
});

// Stricter limit for authentication endpoints to slow credential brute-forcing.
export const authLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 10,
	standardHeaders: 'draft-8',
	legacyHeaders: false,
	ipv6Subnet: 56,
	skipSuccessfulRequests: true, // only failed attempts count toward the limit
	message: { success: false, message: 'Too many attempts, please try again later.', data: null },
});

export default limiter;
