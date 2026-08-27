import { getSupabaseAdmin } from '../config/supabase';

export async function listGenres() {
	const { data, error } = await getSupabaseAdmin()
		.from('genres')
		.select('id, name, slug')
		.order('name', { ascending: true });

	if (error) throw error;
	return data ?? [];
}

export async function findByName(name: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('genres')
		.select('id, name, slug')
		.ilike('name', name.trim())
		.maybeSingle();

	if (error) throw error;
	return data;
}