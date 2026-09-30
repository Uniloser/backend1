import { getSupabaseAdmin } from '../config/supabase';

type ComicPanelOrderRow = { id: string; panel_order: number };

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
	const panels: ComicPanelOrderRow[] = await listPanels(chapterId);
	await writePanelOrder(chapterId, panels.map((panel, index) => ({
		id: panel.id,
		panel_order: index + 1,
	})), panels);
}

export async function reorderPanels(chapterId: string, panels: Array<{ id: string; panel_order: number }>) {
	const existingPanels = await listPanels(chapterId);
	await writePanelOrder(chapterId, panels, existingPanels);
}

async function writePanelOrder(
	chapterId: string,
	orderedPanels: Array<{ id: string; panel_order: number }>,
	existingPanels: Array<{ id: string; panel_order: number }>,
) {
	if (orderedPanels.length === 0) return;

	// Vacate every current position first. Otherwise moving a panel into a slot
	// still held by another panel violates UNIQUE (chapter_id, panel_order).
	const temporaryBase = Math.max(0, ...existingPanels.map((panel) => panel.panel_order)) + orderedPanels.length + 1;
	const supabase = getSupabaseAdmin();

	for (let index = 0; index < orderedPanels.length; index += 1) {
		const panel = orderedPanels[index];
		const { error } = await supabase
			.from('comic_panels')
			.update({ panel_order: temporaryBase + index })
			.eq('id', panel.id)
			.eq('chapter_id', chapterId);

		if (error) throw error;
	}

	for (const panel of orderedPanels) {
		const { error } = await supabase
			.from('comic_panels')
			.update({ panel_order: panel.panel_order })
			.eq('id', panel.id)
			.eq('chapter_id', chapterId);

		if (error) throw error;
	}
}
