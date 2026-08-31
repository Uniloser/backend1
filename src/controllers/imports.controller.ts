// ─────────────────────────────────────────────────────────────────────────────
// ReadAgora Backend — Imports Controller
// ─────────────────────────────────────────────────────────────────────────────
import * as importsService from '../services/imports.service';
import { commitImportSchema } from '../validators/imports.schema';
import { ApiError } from '../utils/ApiError';

export async function uploadAndProcessImport(request: any, response: any) {
  const file = request.file as any;
  const storyId = request.body.storyId;

  if (!file) {
    throw new ApiError(400, 'Manuscript file is required');
  }

  if (!storyId) {
    throw new ApiError(400, 'storyId is required');
  }

  const result = await importsService.processImport(file, storyId, request.user.id);
  response.status(200).json({ data: result });
}

export async function getImportPreview(request: any, response: any) {
  const preview = await importsService.getImportPreview(request.params.importId, request.user.id);
  response.status(200).json({ data: preview });
}

export async function commitImport(request: any, response: any) {
  const input = commitImportSchema.parse(request.body);
  const result = await importsService.commitImport(request.params.importId, request.user.id, input.chapters);
  response.status(200).json({ data: result });
}

export async function deleteImport(request: any, response: any) {
  await importsService.deleteImport(request.params.importId, request.user.id);
  response.status(204).send();
}
