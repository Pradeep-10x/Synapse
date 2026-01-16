import { z } from 'zod';

const registerUserSchema = z.object({
    fullName: z.string()
        .min(2, "Full name must be at least 2 characters")
        .max(50, "Full name must not exceed 50 characters"),
    email: z.string()
        .email("Invalid email address"),
    password: z.string()
        .min(8, "Password must be at least 8 characters")
        .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
        .regex(/[a-z]/, "Password must contain at least one lowercase letter")
        .regex(/[0-9]/, "Password must contain at least one number"),
    username: z.string()
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must not exceed 30 characters")
        .regex(/^[a-zA-Z0-9_]+$/, "Username can only contain letters, numbers, and underscores"),
    bio: z.string().max(150, "Bio must not exceed 150 characters").optional(),
});

const loginUserSchema = z.object({
    email: z.string().email("Invalid email address").optional(),
    username: z.string().min(1, "Username is required").optional(),
    password: z.string().min(1, "Password is required"),
}).refine((data) => data.email || data.username, {
    message: "Either email or username is required",
    path: ["email"],
});

//middleware
const validate = (schema) => (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((err) => ({
            field: err.path.join('.'),
            message: err.message,
        }));
        return res.status(400).json({
            success: false,
            message: "Validation failed",
            errors,
        });
    }
    req.body = result.data; // Use parsed/validated data
    next();
};

export { registerUserSchema, loginUserSchema, validate };