import { getSupabaseAdmin } from '../config/supabase';

export async function findStoryOwner(storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('stories')
		.select('author_id, content_type')
		.eq('id', storyId)
		.maybeSingle();

	if (error) throw error;
	return data as { author_id: string; content_type?: string } | null;
}

export async function findChapter(chapterId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.select('*')
		.eq('id', chapterId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function listChapters(storyId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.select('*')
		.eq('story_id', storyId)
		.order('chapter_order', { ascending: true });

	if (error) throw error;
	return data ?? [];
}

export async function createChapter(input: {
	story_id: string;
	title: string;
	content: string;
	content_type: 'text' | 'comic';
	status: 'draft' | 'published';
	chapter_order: number;
	published_at: string | null;
}) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.insert(input)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function findNextChapterOrder(storyId: string) {
	const chapters = await listChapters(storyId);
	return chapters.reduce((highestOrder: number, chapter: { chapter_order: number }) => (
		Math.max(highestOrder, chapter.chapter_order)
	), 0) + 1;
}

export async function updateChapter(chapterId: string, input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.update(input)
		.eq('id', chapterId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deleteChapter(chapterId: string) {
	const { error } = await getSupabaseAdmin()
		.from('chapters')
		.delete()
		.eq('id', chapterId);

	if (error) throw error;
}

export async function resequenceChapters(storyId: string) {
	const chapters = await listChapters(storyId);

	for (let index = 0; index < chapters.length; index += 1) {
		const chapter = chapters[index];

		if (chapter.chapter_order === index + 1) {
			continue;
		}

		const { error } = await getSupabaseAdmin()
			.from('chapters')
			.update({ chapter_order: index + 1 })
			.eq('id', chapter.id)
			.eq('story_id', storyId);

		if (error) throw error;
	}
}

export async function reorderChapters(storyId: string, chapters: Array<{ id: string; chapter_order: number }>) {
	for (const chapter of chapters) {
		const { error } = await getSupabaseAdmin()
			.from('chapters')
			.update({ chapter_order: chapter.chapter_order })
			.eq('id', chapter.id)
			.eq('story_id', storyId);

		if (error) throw error;
	}
}
export async function getAutosave(chapterId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.select('autosave_content, autosaved_at')
		.eq('id', chapterId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function saveAutosave(chapterId: string, content: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('chapters')
		.update({ autosave_content: content, autosaved_at: new Date().toISOString() })
		.eq('id', chapterId)
		.select('id, autosaved_at')
		.single();

	if (error) throw error;
	return data;
}

// Chapters-table repository stub.
// TODO: implement chapter CRUD, published/author-scoped reads, atomic next
// chapter_order allocation, batch reorder, and safe resequencing after delete.
