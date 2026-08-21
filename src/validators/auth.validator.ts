const { z } = require('zod') as {
  z: any;
};

export const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  username: z.string().trim().min(3).max(30).regex(/^[a-z0-9_]+$/i),
});