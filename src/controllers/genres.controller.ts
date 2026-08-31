import * as genresService from '../services/genres.service';

export async function listGenres(_request: any, response: any) {
	response.json({ data: await genresService.listGenres() });
}