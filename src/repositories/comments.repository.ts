import { getSupabaseAdmin } from '../config/supabase';

export async function listByChapter(chapterId: string, limit: number, offset: number) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .select('id, chapter_id, parent_comment_id, text, quote:quoted_text, created_at, updated_at, user:users!comments_user_id_fkey(id, username, display_name, avatar_url, is_alpha)')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .order('id', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function create(input: {
  chapter_id: string;
  user_id: string;
  text: string;
  quoted_text?: string | null;
  parent_comment_id?: string | null;
}) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .insert(input)
    .select('id, chapter_id, parent_comment_id, text, quote:quoted_text, created_at, updated_at, user:users!comments_user_id_fkey(id, username, display_name, avatar_url, is_alpha)')
    .single();

  if (error) throw error;
  return data;
}

export async function findById(commentId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .select('id, chapter_id, user_id')
    .eq('id', commentId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function updateById(
  commentId: string,
  userId: string,
  input: { text: string; quoted_text?: string | null },
) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id, chapter_id, parent_comment_id, text, quote:quoted_text, created_at, updated_at, user:users!comments_user_id_fkey(id, username, display_name, avatar_url, is_alpha)')
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function deleteById(commentId: string, userId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', userId)
    .select('id')
    .maybeSingle();

  if (error) throw error;
  return data;
}
