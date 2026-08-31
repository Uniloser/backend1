import * as uploadsService from '../services/uploads.service';

export async function uploadCover(request: any, response: any) {
	const result = await uploadsService.uploadImage('cover', request.user.id, request.file);
	response.status(201).json({ data: { url: result.url } });
}

export async function uploadAvatar(request: any, response: any) {
	const result = await uploadsService.uploadImage('avatar', request.user.id, request.file);
	response.status(201).json({ data: { url: result.url } });
}

export async function uploadPanel(request: any, response: any) {
	const result = await uploadsService.uploadImage('panel', request.user.id, request.file);
	response.status(201).json({ data: result });
}
// Upload controller stub.
// TODO: accept multer multipart files for cover/avatar uploads, delegate image
// processing and Supabase Storage upload, then return the public WebP URL.
// TODO: enforce file type/size limits and clean up failed uploads.
