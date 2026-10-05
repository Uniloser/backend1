import { ApiError } from '../utils/ApiError';
import { getSupabaseAdmin } from '../config/supabase';
import { MINIMUM_FREE_CHAPTERS } from '../config/premium';
import { requireReadableStory } from '../discovery/access';
import * as chaptersRepository from '../repositories/chapters.repository';
import * as panelsRepository from '../repositories/panels.repository';
import { enqueueNotifyFollowers } from '../jobs/notifyFollowers.job';
import type {
	CreateChapterInput,
	ReorderChaptersInput,
	UpdateChapterInput,
} from '../validators/chapters.schema';

async function requireStoryAuthor(storyId: string, userId: string) {
	const story = await chaptersRepository.findStoryOwner(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	if (story.author_id !== userId) {
		throw new ApiError(403, 'Only the story author can manage chapters');
	}

	return story;
}

async function requireChapter(chapterId: string) {
	const chapter = await chaptersRepository.findChapter(chapterId);

	if (!chapter) {
		throw new ApiError(404, 'Chapter not found');
	}

	return chapter;
}

async function attachPanelMetadata(chapters: Array<Record<string, unknown>>) {
	const comicChapterIds = chapters
		.filter((chapter) => chapter.has_comic === true || (chapter.has_comic === undefined && chapter.content_type === 'comic'))
		.map((chapter) => chapter.id as string);

	if (comicChapterIds.length === 0) {
		return chapters;
	}

	const counts = await panelsRepository.countPanelsByChapterIds(comicChapterIds);

	return chapters.map((chapter) => (
		({ ...chapter,
		has_text: chapter.has_text ?? chapter.content_type !== 'comic',
		has_comic: chapter.has_comic ?? chapter.content_type === 'comic',
		panel_count: counts[chapter.id as string] ?? 0 })
	));
}

async function attachChapterPanels(chapter: Record<string, unknown>, userId?: string) {
	const hasComic = chapter.has_comic ?? chapter.content_type === 'comic';
	const normalized = { ...chapter, has_text: chapter.has_text ?? chapter.content_type !== 'comic', has_comic: hasComic };
	if (!hasComic) return normalized;

	if (chapter.status !== 'published') {
		const story = await chaptersRepository.findStoryOwner(chapter.story_id as string);

		if (!story || story.author_id !== userId) {
			return { ...normalized, panels: [] };
		}
	}

	const panels = await panelsRepository.listPanels(chapter.id as string);
	return { ...normalized, panels, panel_count: panels.length };
}

async function hasActiveSubscription(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('subscriptions')
		.select('id')
		.eq('user_id', userId)
		.in('status', ['ACTIVE', 'GRACE_PERIOD'])
		.or(`current_period_end.is.null,current_period_end.gt.${new Date().toISOString()}`)
		.limit(1);
	if (error) throw error;
	return Boolean(data?.length);
}

async function coinUnlocks(userId: string, chapterIds: string[]) {
	if (!chapterIds.length) return new Set<string>();
	const { data, error } = await getSupabaseAdmin().from('chapter_coin_unlocks')
		.select('chapter_id').eq('user_id', userId).in('chapter_id', chapterIds);
	if (error) throw error;
	return new Set<string>((data ?? []).map((row: { chapter_id: string }) => row.chapter_id));
}

export async function chapterAccess(chapterId: string, userId: string) {
	const chapter = await requireChapter(chapterId);
	const chapters = await listChapters(chapter.story_id, userId);
	const metadata = chapters.find(item => item.id === chapterId);
	if (!metadata || chapter.status !== 'published') throw new ApiError(404, 'Chapter not found');
	const { data: wallet, error } = await getSupabaseAdmin().from('coin_wallets').select('balance').eq('user_id', userId).maybeSingle();
	if (error) throw error;
	return { chapterId, accessible: (metadata as Record<string, unknown>).accessible === true, coinPrice: chapter.coin_price, balance: wallet?.balance ?? 0 };
}

export async function unlockChapter(chapterId: string, userId: string, expectedPrice: number) {
	const chapter = await requireChapter(chapterId);
	await requireReadableStory(chapter.story_id, userId);
	const { data, error } = await getSupabaseAdmin().rpc('unlock_chapter_with_coins', {
		p_user_id: userId, p_chapter_id: chapterId, p_expected_price: expectedPrice, p_minimum_free: MINIMUM_FREE_CHAPTERS,
	});
	if (error) {
		const failures: Record<string, [number, string]> = {
			INSUFFICIENT_COINS: [409, 'You do not have enough Agora Coins.'],
			COIN_PRICE_CHANGED: [409, 'The chapter price changed. Review the new price and try again.'],
			CHAPTER_NOT_FOUND: [404, 'Chapter not found'],
		};
		const failure = failures[error.message];
		if (failure) throw new ApiError(failure[0], failure[1], { code: error.message });
		throw error;
	}
	return data;
}

async function isApprovedCreator(userId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('creator_monetization_profiles')
		.select('user_id')
		.eq('user_id', userId)
		.eq('status', 'APPROVED')
		.limit(1);
	if (error) throw error;
	return Boolean(data?.length);
}

async function requirePremiumChapterAccess(chapter: Record<string, unknown>, userId?: string) {
	const story = await chaptersRepository.findStoryOwner(chapter.story_id as string);
	if (!story) throw new ApiError(404, 'Story not found');
	if (story.author_id === userId || story.access_type !== 'PREMIUM' || story.monetization_enabled !== true) return;

	const chapterOrder = chapter.chapter_order;
	if (typeof chapterOrder !== 'number') {
		throw new Error('Chapter order is missing while checking premium access');
	}
	const chapterIndex = await chaptersRepository.countPublishedChaptersBefore(
		chapter.story_id as string,
		chapterOrder,
	);
	const previewCount = Math.max(MINIMUM_FREE_CHAPTERS, story.free_chapter_count ?? MINIMUM_FREE_CHAPTERS);
	if (chapterIndex < previewCount) return;
	if (userId && await hasActiveSubscription(userId)) return;
	if (userId && (await coinUnlocks(userId, [chapter.id as string])).has(chapter.id as string)) return;
	throw new ApiError(403, 'This chapter is part of ReadAgora+.', {
		code: 'PREMIUM_CONTENT_REQUIRED', accessible: false, reason: 'PREMIUM_CONTENT_REQUIRED',
		storyId: chapter.story_id, chapterId: chapter.id, previewEndedAtChapter: previewCount,
	});
}

export async function assertPublishedChapterAccess(chapterId: string, userId?: string) {
	const chapter = await requireChapter(chapterId);
	await requireReadableStory(chapter.story_id as string, userId);
	if (chapter.status !== 'published') {
		const story = await chaptersRepository.findStoryOwner(chapter.story_id as string);
		if (!story || story.author_id !== userId) throw new ApiError(404, 'Chapter not found');
		return;
	}
	await requirePremiumChapterAccess(chapter, userId);
}

async function validateComicPublish(chapterId: string) {
	const panelCount = await panelsRepository.countPanels(chapterId);

	if (panelCount === 0) {
		throw new ApiError(400, 'Comic chapters must have at least one panel before publishing');
	}
}

async function validateChapterPublish(chapter: Record<string, any>) {
	const hasText = chapter.has_text ?? chapter.content_type !== 'comic';
	const hasComic = chapter.has_comic ?? chapter.content_type === 'comic';
	if (hasText && !String(chapter.content ?? '').trim()) throw new ApiError(400, 'Text chapters require content before publishing');
	if (hasComic) await validateComicPublish(chapter.id);
}

export async function listChapters(storyId: string, userId?: string) {
	await requireReadableStory(storyId,userId);
	const story = await chaptersRepository.findStoryOwner(storyId);

	if (!story) {
		throw new ApiError(404, 'Story not found');
	}

	const chapters = await chaptersRepository.listChapters(storyId);
	const visible = story.author_id === userId
		? chapters
		: chapters.filter((chapter: { status: string }) => chapter.status === 'published');

	const publishedChapters = chapters
		.filter((chapter: { status: string }) => chapter.status === 'published')
		.sort((first: { chapter_order: number }, second: { chapter_order: number }) => first.chapter_order - second.chapter_order);
	const chapterPositions = new Map<string, number>(publishedChapters.map(
		(chapter: { id: string }, index: number): [string, number] => [chapter.id, index],
	));
	const previewCount = Math.max(MINIMUM_FREE_CHAPTERS, story.free_chapter_count ?? MINIMUM_FREE_CHAPTERS);
	const isPremiumStory = story.access_type === 'PREMIUM' && story.monetization_enabled === true;
	const subscriber = Boolean(
		isPremiumStory && userId && story.author_id !== userId && await hasActiveSubscription(userId),
	);
	const unlocked = userId && isPremiumStory ? await coinUnlocks(userId, visible.map((chapter: { id: string }) => chapter.id)) : new Set<string>();
	return attachPanelMetadata(visible.map((chapter: Record<string, unknown>) => {
		const index = chapterPositions.get(chapter.id as string) ?? -1;
		const premium = isPremiumStory && index >= previewCount;
		const accessible = !premium || story.author_id === userId || subscriber || unlocked.has(chapter.id as string);
		const { content: _content, ...metadata } = chapter;
		return { ...metadata, access_type: premium ? 'PREMIUM' : 'FREE', accessible, coin_unlocked: unlocked.has(chapter.id as string),
			...(premium && !accessible ? { access_reason: 'PREMIUM_CONTENT_REQUIRED' } : {}) };
	}));
}

export async function getChapter(chapterId: string, userId?: string) {
	const chapter = await requireChapter(chapterId);
	await requireReadableStory(chapter.story_id,userId);

	if (chapter.status === 'published') {
		await requirePremiumChapterAccess(chapter, userId);
		const story = await chaptersRepository.findStoryOwner(chapter.story_id);
		const index = await chaptersRepository.countPublishedChaptersBefore(chapter.story_id, chapter.chapter_order);
		const premium = story?.access_type === 'PREMIUM' && story.monetization_enabled === true
			&& index >= Math.max(MINIMUM_FREE_CHAPTERS, story.free_chapter_count ?? MINIMUM_FREE_CHAPTERS);
		return attachChapterPanels({ ...chapter, access_type: premium ? 'PREMIUM' : 'FREE', accessible: true }, userId);
	}

	const story = await chaptersRepository.findStoryOwner(chapter.story_id);

	if (!story || story.author_id !== userId) {
		throw new ApiError(404, 'Chapter not found');
	}

	return attachChapterPanels(chapter, userId);
}

export async function createChapter(storyId: string, userId: string, input: CreateChapterInput) {
	const story = await requireStoryAuthor(storyId, userId);
	const status = input.status ?? 'draft';
	const contentType = input.content_type ?? (story.content_type === 'comic' ? 'comic' : 'text');
	const hasText = input.has_text ?? contentType === 'text';
	const hasComic = input.has_comic ?? contentType === 'comic';
	if (!hasText && !hasComic) throw new ApiError(400, 'A chapter needs text or comic panels');

	if (status === 'published' && hasComic) throw new ApiError(400, 'Create the chapter as a draft, add its comic panels, then publish it.');

	const chapter = await chaptersRepository.createChapter({
		story_id: storyId,
		title: input.title,
		content: hasText ? (input.content ?? '') : '',
		content_type: contentType,
		has_text: hasText,
		has_comic: hasComic,
		status,
		chapter_order: await chaptersRepository.findNextChapterOrder(storyId),
		published_at: status === 'published' ? new Date().toISOString() : null,
	});

	if (status === 'published') {
		enqueueNotifyFollowers({
			type: 'chapter_published',
			authorId: userId,
			storyId,
			chapterId: chapter.id,
			chapterTitle: chapter.title,
		});
	}

	return { ...chapter, panel_count: 0, panels: [] };
}

export async function updateChapter(chapterId: string, userId: string, input: UpdateChapterInput) {
	const chapter = await requireChapter(chapterId);
	const story = await requireStoryAuthor(chapter.story_id, userId);

	// Build a strict partial update – only include fields that were explicitly provided.
	// This prevents auto-saves that only send { title, content } from touching status.
	const update: Record<string, unknown> = {};

	if (input.title !== undefined) {
		update.title = input.title;
	}

	const contentType = (input.content_type ?? chapter.content_type ?? story.content_type ?? 'text') as 'text' | 'comic';
	const hasText = input.has_text ?? chapter.has_text ?? contentType === 'text';
	const hasComic = input.has_comic ?? chapter.has_comic ?? contentType === 'comic';

	if (input.content_type && input.content_type !== chapter.content_type) {
		throw new ApiError(400, 'Chapter content type cannot be changed after creation');
	}

	if (!hasText && !hasComic) throw new ApiError(400, 'A chapter needs text or comic panels');

	if (input.content !== undefined) {
		update.content = hasText ? input.content : '';
	}
	if (input.has_text !== undefined) update.has_text = input.has_text;
	if (input.has_comic !== undefined) update.has_comic = input.has_comic;

	// Only mutate status / published_at when status is explicitly provided AND changing.
	const statusChanging = input.status !== undefined && input.status !== chapter.status;
	const publishing = input.status === 'published' && chapter.status !== 'published';

	if (publishing) await validateChapterPublish({ ...chapter, ...update, content: input.content ?? chapter.content, has_text: hasText, has_comic: hasComic, id: chapterId });

	if (statusChanging) {
		update.status = input.status;
		if (input.status === 'published') {
			update.published_at = new Date().toISOString();
		} else if (input.status === 'draft') {
			update.published_at = null;
		}
	}

	const updated = await chaptersRepository.updateChapter(chapterId, update);

	if (publishing) {
		enqueueNotifyFollowers({
			type: 'chapter_published',
			authorId: userId,
			storyId: chapter.story_id,
			chapterId,
			chapterTitle: updated.title ?? chapter.title,
		});
	}

	return attachChapterPanels(updated, userId);
}

// Dedicated status-transition helper used by PATCH /chapters/:id/status.
export async function updateChapterStatus(chapterId: string, userId: string, input: { status: 'draft' | 'published' }) {
	return updateChapter(chapterId, userId, { status: input.status });
}

export async function deleteChapter(chapterId: string, userId: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	await chaptersRepository.deleteChapter(chapterId);
	await chaptersRepository.resequenceChapters(chapter.story_id);
}

export async function reorderChapters(storyId: string, userId: string, input: ReorderChaptersInput) {
	await requireStoryAuthor(storyId, userId);
	const orders = input.chapters.map((chapter) => chapter.chapter_order);

	if (new Set(orders).size !== orders.length) {
		throw new ApiError(400, 'Chapter orders must be unique');
	}

	await chaptersRepository.reorderChapters(storyId, input.chapters);
}

export async function getAutosave(chapterId: string, userId: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	return chaptersRepository.getAutosave(chapterId);
}

export async function saveAutosave(chapterId: string, userId: string, content: string) {
	const chapter = await requireChapter(chapterId);
	await requireStoryAuthor(chapter.story_id, userId);
	return chaptersRepository.saveAutosave(chapterId, content);
}
