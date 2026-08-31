import * as bookmarksService from '../services/bookmarks.service';
import {
	bookmarkIdSchema,
	createBookmarkSchema,
	storyIdSchema,
} from '../validators/bookmarks.validator';

export async function createBookmark(request: any, response: any) {
	const input = createBookmarkSchema.parse(request.body);
	const bookmark = await bookmarksService.createBookmark(request.user.id, input);
	response.status(201).json({ data: bookmark });
}

export async function listBookmarks(request: any, response: any) {
	const bookmarks = await bookmarksService.listBookmarks(request.user.id);
	response.json({ data: bookmarks });
}

export async function deleteBookmark(request: any, response: any) {
	const bookmarkId = bookmarkIdSchema.parse(request.params.id);
	const result = await bookmarksService.deleteBookmark(request.user.id, bookmarkId);
	response.json({ data: result });
}

export async function deleteBookmarkByStory(request: any, response: any) {
	const storyId = storyIdSchema.parse(request.params.storyId);
	const result = await bookmarksService.deleteBookmarkByStory(request.user.id, storyId);
	response.json({ data: result });
}
