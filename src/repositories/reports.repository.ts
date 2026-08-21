import { getSupabaseAdmin } from '../config/supabase';

export async function createReport(reporterId: string, input: { category: string; description: string }) {
	const { data, error } = await getSupabaseAdmin()
		.from('reports')
		.insert({ reporter_id: reporterId, ...input })
		.select('id, category, description, status, priority, created_at')
		.single();

	if (error) throw error;
	return data;
}