import { z } from 'zod';

const registerUserSchema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(1),
    bio: z.string().optional(),
});

const loginUserSchema = z.object({
    email: z.string().email(),
    username: z.string().min(1),
    password: z.string().min(8),
});

export { registerUserSchema, loginUserSchema };