import * as followsRepository from '../repositories/follows.repository';
import * as notificationsService from '../services/notifications.service';

const BATCH_SIZE = 100;

export type NotifyFollowersEvent =
	| { type: 'story_published'; authorId: string; storyId: string; storyTitle: string }
	| {
			type: 'chapter_published';
			authorId: string;
			storyId: string;
			chapterId: string;
			chapterTitle: string;
	  };

export async function notifyFollowers(event: NotifyFollowersEvent) {
	let offset = 0;

	for (;;) {
		const followerIds = await followsRepository.listFollowerIds(event.authorId, BATCH_SIZE, offset);

		if (followerIds.length === 0) {
			break;
		}

		await Promise.all(
			followerIds.map((recipientId: string) => {
				if (event.type === 'story_published') {
					return notificationsService.notifyStoryPublished(
						recipientId,
						event.authorId,
						event.storyId,
						event.storyTitle,
					);
				}

				return notificationsService.notifyChapterPublished(
					recipientId,
					event.authorId,
					event.storyId,
					event.chapterId,
					event.chapterTitle,
				);
			}),
		);

		if (followerIds.length < BATCH_SIZE) {
			break;
		}

		offset += BATCH_SIZE;
	}
}

export function enqueueNotifyFollowers(event: NotifyFollowersEvent) {
	void notifyFollowers(event).catch((error) => {
		console.error('notifyFollowers failed', error);
	});
}
