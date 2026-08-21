import * as usersService from '../services/users.service';
import { updateProfileSchema, usernameSchema } from '../validators/users.validator';

export async function getPublicProfile(request: any, response: any) {
	const username = usernameSchema.parse(request.params.username);
	const profile = await usersService.getPublicProfile(username);
	response.json({ data: profile });
}

export async function getCurrentProfile(request: any, response: any) {
	const profile = await usersService.getCurrentProfile(request.user.id);
	response.json({ data: profile });
}

export async function getCurrentStories(request: any, response: any) {
	const stories = await usersService.getCurrentStories(request.user.id);
	response.json({ data: stories });
}

export async function updateCurrentProfile(request: any, response: any) {
	const input = updateProfileSchema.parse(request.body);
	const profile = await usersService.updateCurrentProfile(request.user.id, input);
	response.json({ data: profile });
}

export async function getPublishedStories(request: any, response: any) {
	const username = usernameSchema.parse(request.params.username);
	const stories = await usersService.getPublishedStories(username);
	response.json({ data: stories });
}
// User controller stub.
// TODO: expose public profile data (bio, avatar, published stories, follower
// count), and protected GET/PATCH /users/me operations.
// TODO: validate input before calling users.service.js and never query the
// users table directly from this layer.
// TODO: derive follow mutations from req.user.id and route params.
