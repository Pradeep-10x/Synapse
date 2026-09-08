import { z } from 'zod';
import { ApiError } from '../utils/ApiError.js';

/**
 * Generic validation middleware factory.
 * Validates req.body against the provided Zod schema, replaces req.body with
 * the parsed (and coerced) data, and throws a 400 ApiError with field-level
 * details on failure.
 */
export const validate = (schema) => (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
        const errors = result.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
        }));
        throw new ApiError(400, 'Validation failed', errors);
    }
    req.body = result.data;
    next();
};

const usernameSchema = z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username must be at most 30 characters')
    .regex(/^[a-zA-Z0-9_.]+$/, 'Username may only contain letters, numbers, "_" and "."');

const passwordSchema = z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password is too long');

export const registerUserSchema = z.object({
    fullName: z.string().trim().min(1, 'Full name is required').max(100),
    email: z.string().trim().toLowerCase().email('Invalid email address'),
    password: passwordSchema,
    username: usernameSchema,
    bio: z.string().trim().max(160).optional(),
});

export const loginUserSchema = z
    .object({
        email: z.string().trim().toLowerCase().email().optional(),
        username: z.string().trim().min(1).optional(),
        password: z.string().min(1, 'Password is required'),
    })
    .refine((data) => data.email || data.username, {
        message: 'Email or username is required',
        path: ['username'],
    });

export const changePasswordSchema = z.object({
    oldPassword: z.string().min(1, 'Old password is required'),
    newPassword: passwordSchema,
});

export const updateDetailsSchema = z
    .object({
        fullName: z.string().trim().min(1).max(100).optional(),
        bio: z.string().trim().max(160).optional(),
        email: z.string().trim().toLowerCase().email().optional(),
        username: usernameSchema.optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: 'At least one field is required to update',
    });
