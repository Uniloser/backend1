import { getSupabaseAdmin } from '../config/supabase';
import type { ManuscriptImportRecord } from '../services/importers/types';

export async function deleteAccountImports(userId: string) {
	const { error } = await getSupabaseAdmin()
		.from('manuscript_imports')
		.delete()
		.eq('user_id', userId);
	if (error) throw error;
}

export async function createImport(record: ManuscriptImportRecord): Promise<ManuscriptImportRecord> {
	const { data, error } = await getSupabaseAdmin()
		.from('manuscript_imports')
		.insert(record)
		.select()
		.single();
	if (error) throw error;
	if (!data) throw new Error('Import record was not saved.');
	return data as ManuscriptImportRecord;
}

export async function findImportById(importId: string, userId: string): Promise<ManuscriptImportRecord | null> {
	const { data, error } = await getSupabaseAdmin()
		.from('manuscript_imports')
		.select('*')
		.eq('id', importId)
		.eq('user_id', userId)
		.maybeSingle();
	if (error) throw error;
	return data as ManuscriptImportRecord | null;
}

export async function updateImport(
	importId: string,
	status: ManuscriptImportRecord['status'],
	extra: Partial<Pick<ManuscriptImportRecord, 'error_message' | 'result'>> = {},
): Promise<void> {
	const { error } = await getSupabaseAdmin()
		.from('manuscript_imports')
		.update({ status, updated_at: new Date().toISOString(), ...extra })
		.eq('id', importId);
	if (error) throw error;
}
