const { z } = require('zod') as {
	z: any;
};

export const storyIdSchema = z.string().uuid();
// Like Zod schema stub.
// TODO: validate story route ids and optional viewer-state query parameters.
