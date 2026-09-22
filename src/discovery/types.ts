export type StoryCard = {
  id: string; author_id: string; title: string; description: string | null; cover_url: string | null;
  genre: string; tags: string[]; status: 'published' | 'draft'; created_at: string; updated_at: string;
  view_count: number; content_type?: string;
  author: { id: string; username: string; display_name: string | null; avatar_url: string | null };
};
export type Metrics = {
  unique_readers: number; readers_7d: number; readers_previous_7d: number;
  reads_lifetime: number; reads_24h: number; reads_7d: number; reads_30d: number;
  likes: number; likes_7d: number; likes_30d: number;
  bookmarks: number; bookmarks_7d: number; bookmarks_30d: number;
  comments: number; comments_7d: number; comments_30d: number;
  followers: number; followers_7d: number; chapters_published: number;
  completion_rate: number; retention_rate: number; retention_3_rate: number; average_progress: number;
  published_at: string; last_chapter_published_at: string; last_activity_at: string;
};
export type Candidate = StoryCard & {
  metrics: Metrics; published_at: string; last_chapter_published_at: string;
  visibility: string; moderation_status: string; is_mature: boolean; is_complete: boolean;
  chapters_published: number; author_active: boolean;
  trending_score: number; rising_score: number; quality_score: number; hidden_gem_score: number;
};
export type Signal = { story_id: string; genre: string; tags: string[]; author_id: string; title: string;
  opened: boolean; chapters_read: number; liked: boolean; bookmarked: boolean; completed: boolean;
  started: boolean; abandoned: boolean; occurred_at: string };
export type Preferences = { genres: string[]; tags: string[]; allowMature: boolean };
export type Profile = {
  genres: Record<string, number>; tags: Record<string, number>; authors: Record<string, number>;
  consumed: Set<string>; abandoned: Set<string>; signals: Signal[]; personalized: boolean;
};
export type ShelfType = 'for_you' | 'trending' | 'rising' | 'recently_updated' | 'because_you_read' | 'hidden_gems' | 'genre';
export type Shelf = { id: string; type: ShelfType; title: string; stories: StoryCard[];
  sourceStory?: { id: string; title: string }; nextCursor?: string | null; positions?: Record<string,number> };
export type DiscoveryResponse = { userPersonalized: boolean; generatedAt: string; recommendationSessionId: string; shelves: Shelf[] };
