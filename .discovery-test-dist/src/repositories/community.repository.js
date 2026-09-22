"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPost = getPost;
exports.hydrate = hydrate;
exports.rankPost = rankPost;
exports.feed = feed;
exports.createPost = createPost;
exports.removePost = removePost;
exports.editPost = editPost;
exports.reaction = reaction;
exports.comments = comments;
exports.addComment = addComment;
exports.mutateComment = mutateComment;
exports.vote = vote;
exports.sidebar = sidebar;
const supabase_1 = require("../config/supabase");
const env_1 = require("../config/env");
const ApiError_1 = require("../utils/ApiError");
const db = () => (0, supabase_1.getSupabaseAdmin)();
const profile = 'id,username,display_name,avatar_url';
const selection = `*,user:users!community_posts_user_id_fkey(${profile}),story:stories!community_posts_story_id_fkey(id,title,cover_url,author_id,status,author:users!stories_author_id_fkey(${profile})),chapter:chapters!community_posts_chapter_id_fkey(id,title,chapter_order,status)`;
async function rows(query) { const { data, error } = await query; if (error)
    throw error; return data ?? []; }
async function one(query) { const { data, error } = await query; if (error)
    throw error; return data; }
async function blockedIds(user) {
    if (!user)
        return [];
    return (await rows(db().from('user_blocks').select('blocker_id,blocked_id').or(`blocker_id.eq.${user},blocked_id.eq.${user}`))).map(x => x.blocker_id === user ? x.blocked_id : x.blocker_id);
}
async function getPost(id, user) {
    const post = await one(db().from('community_posts').select(selection).eq('id', id).maybeSingle());
    if (!post || (await blockedIds(user)).includes(post.user_id) || (post.story && post.story.status !== 'published') || (post.chapter && post.chapter.status !== 'published'))
        throw new ApiError_1.ApiError(404, 'Post is no longer available.');
    return post;
}
async function hydrateMany(posts, user) {
    if (!posts.length)
        return [];
    const stats = await rows(db().rpc('community_stats', { post_ids: posts.map(p => p.id), viewer: user ?? null }));
    const indexed = new Map(stats.map(s => [s.id, s]));
    return posts.map(p => ({ ...p, ...indexed.get(p.id) }));
}
async function hydrate(post, user) { return (await hydrateMany([post], user))[0]; }
// Rank only a bounded recent page; retain chronological offset pagination for predictable loading.
function rankPost(post, followed) { return (followed.has(post.user_id) ? 20 : 0) + Math.min(post.like_count, 20) + Math.min(post.comment_count * 2, 20); }
async function feed(user, tab, limit, offset) {
    const blocked = await blockedIds(user);
    const followed = user ? (await rows(db().from('follows').select('followed_id').eq('follower_id', user))).map(x => x.followed_id) : [];
    let query = db().from('community_posts').select(selection).order('created_at', { ascending: false }).order('id', { ascending: false });
    if (blocked.length)
        query = query.not('user_id', 'in', `(${blocked.join(',')})`);
    if (tab === 'following') {
        if (!followed.length)
            return { items: [], next_offset: null };
        query = query.in('user_id', followed);
    }
    if (tab === 'discussions')
        query = query.eq('post_type', 'discussion');
    if (tab === 'saved') {
        const saved = user ? await rows(db().from('community_post_saves').select('post_id').eq('user_id', user)) : [];
        if (!saved.length)
            return { items: [], next_offset: null };
        query = query.in('id', saved.map(x => x.post_id));
    }
    const raw = await rows(query.range(offset, offset + limit));
    const visible = raw.slice(0, limit).filter(p => (!p.story || p.story.status === 'published') && (!p.chapter || p.chapter.status === 'published'));
    const items = await hydrateMany(visible, user);
    if (tab === 'for-you')
        items.sort((a, b) => rankPost(b, new Set(followed)) - rankPost(a, new Set(followed)));
    return { items, next_offset: raw.length > limit ? offset + limit : null };
}
async function createPost(user, input) {
    if (input.story_id) {
        const story = await one(db().from('stories').select('id,author_id,status').eq('id', input.story_id).maybeSingle());
        if (!story || story.status !== 'published' || (await blockedIds(user)).includes(story.author_id))
            throw new ApiError_1.ApiError(400, 'Select an available published story.');
        if (['chapter', 'announcement'].includes(input.post_type) && story.author_id !== user)
            throw new ApiError_1.ApiError(403, 'Only the author can announce this story.');
        if (input.chapter_id) {
            const chapter = await one(db().from('chapters').select('id').eq('id', input.chapter_id).eq('story_id', story.id).eq('status', 'published').maybeSingle());
            if (!chapter)
                throw new ApiError_1.ApiError(400, 'Chapter must be published and belong to the selected story.');
        }
    }
    if (['chapter', 'announcement'].includes(input.post_type) && !input.story_id)
        throw new ApiError_1.ApiError(400, 'Attach your published story to this announcement.');
    if (input.image_url) {
        const prefix = db().storage.from(env_1.env.coverBucket).getPublicUrl(`${user}/`).data.publicUrl;
        if (!input.image_url.startsWith(prefix) || input.image_url.includes('..'))
            throw new ApiError_1.ApiError(400, 'Upload an image using ReadAgora.');
    }
    const post = await one(db().from('community_posts').insert({ ...input, user_id: user }).select(selection).single());
    return hydrate(post, user);
}
async function removePost(id, user) {
    const result = await one(db().from('community_posts').delete().eq('id', id).eq('user_id', user).select('id').maybeSingle());
    if (!result)
        throw new ApiError_1.ApiError(404, 'Your post was not found.');
    return { deleted: true };
}
async function editPost(id, user, content) {
    const result = await one(db().from('community_posts').update({ content, updated_at: new Date().toISOString() }).eq('id', id).eq('user_id', user).select(selection).maybeSingle());
    if (!result)
        throw new ApiError_1.ApiError(404, 'Your post was not found.');
    return hydrate(result, user);
}
async function reaction(id, user, kind, enabled) {
    await getPost(id, user);
    const table = kind === 'like' ? 'community_post_likes' : 'community_post_saves';
    await rows(enabled ? db().from(table).upsert({ post_id: id, user_id: user }, { onConflict: 'post_id,user_id' }) : db().from(table).delete().eq('post_id', id).eq('user_id', user));
    return hydrate(await getPost(id, user), user);
}
async function comments(id, user, limit, offset) {
    await getPost(id, user);
    const blocked = await blockedIds(user);
    let query = db().from('community_comments').select(`*,user:users!community_comments_user_id_fkey(${profile})`).eq('post_id', id).order('created_at').order('id');
    if (blocked.length)
        query = query.not('user_id', 'in', `(${blocked.join(',')})`);
    const data = await rows(query.range(offset, offset + limit));
    return { items: data.slice(0, limit), next_offset: data.length > limit ? offset + limit : null };
}
async function addComment(id, user, input) {
    await getPost(id, user);
    if (input.parent_comment_id) {
        const parent = await one(db().from('community_comments').select('id,user_id').eq('id', input.parent_comment_id).eq('post_id', id).maybeSingle());
        if (!parent || (await blockedIds(user)).includes(parent.user_id))
            throw new ApiError_1.ApiError(400, 'Reply target is unavailable.');
    }
    return one(db().from('community_comments').insert({ ...input, post_id: id, user_id: user }).select(`*,user:users!community_comments_user_id_fkey(${profile})`).single());
}
async function mutateComment(id, user, content) {
    const query = content ? db().from('community_comments').update({ content, updated_at: new Date().toISOString() }) : db().from('community_comments').delete();
    const result = await one(query.eq('id', id).eq('user_id', user).select('id').maybeSingle());
    if (!result)
        throw new ApiError_1.ApiError(404, 'Your comment was not found.');
    return { updated: !!content, deleted: !content };
}
async function vote(id, user, index) {
    const post = await getPost(id, user);
    if (!post.poll_options || index >= post.poll_options.length)
        throw new ApiError_1.ApiError(400, 'Invalid poll option.');
    await rows(db().from('community_poll_votes').upsert({ post_id: id, user_id: user, option_index: index }, { onConflict: 'post_id,user_id' }));
    return hydrate(post, user);
}
async function sidebar(user) {
    const discussions = (await feed(user, 'discussions', 30, 0)).items.sort((a, b) => b.comment_count - a.comment_count).slice(0, 4);
    const blocked = await blockedIds(user);
    const following = user ? await rows(db().from('follows').select('followed_id').eq('follower_id', user)) : [];
    const excluded = new Set([...blocked, ...following.map(x => x.followed_id), user]);
    const stories = await rows(db().from('stories').select(`author:users!stories_author_id_fkey(${profile})`).eq('status', 'published').order('created_at', { ascending: false }).limit(60));
    const writers = [];
    for (const story of stories)
        if (story.author && !excluded.has(story.author.id)) {
            writers.push(story.author);
            excluded.add(story.author.id);
            if (writers.length === 5)
                break;
        }
    return { discussions, writers };
}
