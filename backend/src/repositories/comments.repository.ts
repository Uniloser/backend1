import { getSupabaseAdmin } from '../config/supabase';

export async function listByChapter(chapterId: string, limit: number, offset: number) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .select('id, chapter_id, text, created_at, user:users!comments_user_id_fkey(id, username, display_name, avatar_url)')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return data ?? [];
}

export async function create(input: { chapter_id: string; user_id: string; text: string }) {
  const { data, error } = await getSupabaseAdmin()
    .from('comments')
    .insert(input)
    .select()
    .single();

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
}// Comments-table repository stub.
// TODO: own paginated chapter comment reads, inserts, and deletes; expose only
// repository methods rather than direct table access to services/controllers.
