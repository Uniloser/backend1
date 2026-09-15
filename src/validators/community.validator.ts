import { z } from 'zod';
const text = (max: number) => z.string().trim().min(1).max(max).refine(value => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value), 'Invalid control characters');
export const communityId = z.string().uuid();
export const communityQuery = z.object({ tab: z.enum(['for-you','following','discussions','saved']).default('for-you'), limit: z.coerce.number().int().min(1).max(30).default(15), offset: z.coerce.number().int().min(0).max(100000).default(0) });
export const communityPostInput = z.object({ content: text(4000), post_type: z.enum(['post','chapter','announcement','poll','discussion']).default('post'), story_id: communityId.nullable().optional(), chapter_id: communityId.nullable().optional(), contains_spoiler: z.boolean().default(false), image_url: z.string().url().max(2000).nullable().optional(), poll_options: z.array(text(100)).min(2).max(4).nullable().optional() }).superRefine((value, ctx) => {
 if(value.chapter_id && !value.story_id) ctx.addIssue({code:'custom',message:'Select a story for this chapter.'});
 if(value.post_type === 'chapter' && !value.chapter_id) ctx.addIssue({code:'custom',message:'Select a published chapter.'});
 if(value.post_type === 'poll' && (!value.poll_options || new Set(value.poll_options.map(x=>x.toLowerCase())).size !== value.poll_options.length)) ctx.addIssue({code:'custom',message:'Provide 2?4 distinct poll options.'});
 if(value.post_type !== 'poll' && value.poll_options) ctx.addIssue({code:'custom',message:'Only polls can have options.'});
});
export const communityCommentInput = z.object({content:text(2000),parent_comment_id:communityId.nullable().optional()});
export const communityEditInput = z.object({content:text(4000)});
export const communityVoteInput = z.object({option_index:z.number().int().min(0).max(3)});
