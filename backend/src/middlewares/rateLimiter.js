import { rateLimit } from 'express-rate-limit'

const limiter = rateLimit({
	windowMs: 1 * 60 * 1000, // 1 min
	limit: 60, // 
	standardHeaders: 'draft-8', 
	legacyHeaders: false, 
	ipv6Subnet: 56, 
});

export default limiter;
