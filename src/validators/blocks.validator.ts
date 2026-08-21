const { z } = require('zod') as { z: any };

export const userIdSchema = z.string().uuid();
