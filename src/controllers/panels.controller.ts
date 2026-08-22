import * as panelsService from '../services/panels.service';
import {
	createPanelSchema,
	reorderPanelsSchema,
	updatePanelSchema,
} from '../validators/panels.schema';

export async function listPanels(request: any, response: any) {
	const panels = await panelsService.listPanels(request.params.id, request.user?.id);
	response.json({ data: panels });
}

export async function createPanel(request: any, response: any) {
	const input = createPanelSchema.parse(request.body);
	const panel = await panelsService.createPanel(request.params.id, request.user.id, input);
	response.status(201).json({ data: panel });
}

export async function updatePanel(request: any, response: any) {
	const input = updatePanelSchema.parse(request.body);
	const panel = await panelsService.updatePanel(request.params.id, request.user.id, input);
	response.json({ data: panel });
}

export async function deletePanel(request: any, response: any) {
	await panelsService.deletePanel(request.params.id, request.user.id);
	response.status(204).send();
}

export async function reorderPanels(request: any, response: any) {
	const input = reorderPanelsSchema.parse(request.body);
	const panels = await panelsService.reorderPanels(request.params.id, request.user.id, input);
	response.json({ data: panels });
}
