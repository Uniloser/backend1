import { getSupabaseAdmin } from '../config/supabase';

type Totals = { reads: number; likes: number; comments: number; bookmarks: number };

export async function getAuthorAnalytics(authorId: string) {
	const db = getSupabaseAdmin();
	const { data: stories, error: storiesError } = await db
		.from('stories')
		.select('id, title, status, view_count, genre, updated_at, chapters(id, title, chapter_order, status)')
		.eq('author_id', authorId)
		.order('updated_at', { ascending: false });

	if (storiesError) throw storiesError;

	const storyIds = (stories ?? []).map((story: { id: string }) => story.id);
	if (storyIds.length === 0) return { totals: { reads: 0, likes: 0, comments: 0, bookmarks: 0 }, stories: [] };

	const [views, likes, comments, bookmarks] = await Promise.all([
		db.from('story_views').select('story_id, chapter_id').in('story_id', storyIds),
		db.from('likes').select('story_id').in('story_id', storyIds),
		db.from('comments').select('chapter_id, chapters!comments_chapter_id_fkey(story_id)').in('chapters.story_id', storyIds),
		db.from('bookmarks').select('story_id').in('story_id', storyIds),
	]);
	for (const result of [views, likes, comments, bookmarks]) if (result.error) throw result.error;

	const viewRows = views.data ?? [];
	const likeRows = likes.data ?? [];
	const commentRows = comments.data ?? [];
	const bookmarkRows = bookmarks.data ?? [];
	const storyMetrics = (stories ?? []).map((story: any) => {
		const chapters = (story.chapters ?? []).filter((chapter: any) => chapter.status === 'published').sort((a: any, b: any) => a.chapter_order - b.chapter_order);
		const chapterViews = chapters.map((chapter: any) => viewRows.filter((view: any) => view.story_id === story.id && view.chapter_id === chapter.id).length);
		const firstChapterViews = chapterViews[0] ?? 0;
		return {
			id: story.id,
			title: story.title,
			status: story.status,
			genre: story.genre,
			updated_at: story.updated_at,
			reads: viewRows.filter((view: any) => view.story_id === story.id).length || story.view_count || 0,
			likes: likeRows.filter((like: any) => like.story_id === story.id).length,
			comments: commentRows.filter((comment: any) => comment.chapters?.story_id === story.id).length,
			bookmarks: bookmarkRows.filter((bookmark: any) => bookmark.story_id === story.id).length,
			retention: chapters.map((chapter: any, index: number) => ({ chapter: chapter.chapter_order, title: chapter.title, percentage: index === 0 ? 100 : firstChapterViews ? Math.round((chapterViews[index] / firstChapterViews) * 100) : 0 })),
		};
	});

	return {
		totals: storyMetrics.reduce((total: Totals, story: any) => ({ reads: total.reads + story.reads, likes: total.likes + story.likes, comments: total.comments + story.comments, bookmarks: total.bookmarks + story.bookmarks }), { reads: 0, likes: 0, comments: 0, bookmarks: 0 }),
		stories: storyMetrics,
	};
}