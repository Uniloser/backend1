// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Repository
// ─────────────────────────────────────────────────────────────────────────────
import { getSupabaseAdmin, supabase } from '../config/supabase';
import type { ManuscriptImportRecord } from '../services/importers/types';

// In-memory fallback cache
const memoryImports = new Map<string, ManuscriptImportRecord>();

function getDbClient() {
  try {
    return getSupabaseAdmin();
  } catch {
    return supabase;
  }
}

export async function createImport(record: ManuscriptImportRecord): Promise<ManuscriptImportRecord> {
  memoryImports.set(record.id, record);

  try {
    const client = getDbClient();
    const { data, error } = await client
      .from('manuscript_imports')
      .insert(record)
      .select()
      .single();

    if (!error && data) {
      return data as ManuscriptImportRecord;
    }
  } catch (err) {
    console.warn('[ImportsRepository] Supabase insert notice (using memory cache):', err);
  }

  return record;
}

export async function findImportById(importId: string, userId: string): Promise<ManuscriptImportRecord | null> {
  const memoryRecord = memoryImports.get(importId);
  if (memoryRecord && memoryRecord.user_id === userId) {
    return memoryRecord;
  }

  try {
    const client = getDbClient();
    const { data, error } = await client
      .from('manuscript_imports')
      .select('*')
      .eq('id', importId)
      .eq('user_id', userId)
      .single();

    if (!error && data) {
      return data as ManuscriptImportRecord;
    }
  } catch (err) {
    console.warn('[ImportsRepository] Supabase find notice:', err);
  }

  return memoryRecord ?? null;
}

export async function updateImport(
  importId: string,
  status: ManuscriptImportRecord['status'],
  extra: Partial<Pick<ManuscriptImportRecord, 'error_message' | 'result'>> = {},
): Promise<void> {
  const existing = memoryImports.get(importId);
  if (existing) {
    const updated: ManuscriptImportRecord = {
      ...existing,
      status,
      updated_at: new Date().toISOString(),
      ...extra,
    };
    memoryImports.set(importId, updated);
  }

  try {
    const client = getDbClient();
    await client
      .from('manuscript_imports')
      .update({
        status,
        updated_at: new Date().toISOString(),
        ...extra,
      })
      .eq('id', importId);
  } catch (err) {
    console.warn('[ImportsRepository] Supabase update notice:', err);
  }
}

