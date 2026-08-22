import { getSupabaseAdmin } from '../config/supabase';

export async function listPanels(chapterId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.select('*')
		.eq('chapter_id', chapterId)
		.order('panel_order', { ascending: true });

	if (error) throw error;
	return data ?? [];
}

export async function countPanels(chapterId: string) {
	const { count, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.select('id', { count: 'exact', head: true })
		.eq('chapter_id', chapterId);

	if (error) throw error;
	return count ?? 0;
}

export async function countPanelsByChapterIds(chapterIds: string[]) {
	if (chapterIds.length === 0) return {} as Record<string, number>;

	const { data, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.select('chapter_id')
		.in('chapter_id', chapterIds);

	if (error) throw error;

	const counts: Record<string, number> = {};
	for (const row of data ?? []) {
		counts[row.chapter_id] = (counts[row.chapter_id] ?? 0) + 1;
	}
	return counts;
}

export async function findPanel(panelId: string) {
	const { data, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.select('*')
		.eq('id', panelId)
		.maybeSingle();

	if (error) throw error;
	return data;
}

export async function findNextPanelOrder(chapterId: string) {
	const panels = await listPanels(chapterId);
	return panels.reduce((highest: number, panel: { panel_order: number }) => (
		Math.max(highest, panel.panel_order)
	), 0) + 1;
}

export async function createPanel(input: {
	chapter_id: string;
	panel_order: number;
	image_url: string;
	width: number | null;
	height: number | null;
}) {
	const { data, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.insert(input)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function updatePanel(panelId: string, input: Record<string, unknown>) {
	const { data, error } = await getSupabaseAdmin()
		.from('comic_panels')
		.update(input)
		.eq('id', panelId)
		.select()
		.single();

	if (error) throw error;
	return data;
}

export async function deletePanel(panelId: string) {
	const { error } = await getSupabaseAdmin()
		.from('comic_panels')
		.delete()
		.eq('id', panelId);

	if (error) throw error;
}

export async function resequencePanels(chapterId: string) {
	const panels = await listPanels(chapterId);

	for (let index = 0; index < panels.length; index += 1) {
		const panel = panels[index];
		const nextOrder = index + 1;

		if (panel.panel_order === nextOrder) {
			continue;
		}

		const { error } = await getSupabaseAdmin()
			.from('comic_panels')
			.update({ panel_order: nextOrder })
			.eq('id', panel.id)
			.eq('chapter_id', chapterId);

		if (error) throw error;
	}
}

export async function reorderPanels(chapterId: string, panels: Array<{ id: string; panel_order: number }>) {
	for (const panel of panels) {
		const { error } = await getSupabaseAdmin()
			.from('comic_panels')
			.update({ panel_order: panel.panel_order })
			.eq('id', panel.id)
			.eq('chapter_id', chapterId);

		if (error) throw error;
	}
}
