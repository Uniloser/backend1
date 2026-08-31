import * as genresRepository from '../repositories/genres.repository';
import { ApiError } from '../utils/ApiError';

export function listGenres() {
	return genresRepository.listGenres();
}

export async function requireGenre(name: string) {
	const genre = await genresRepository.findByName(name);
	if (!genre) throw new ApiError(400, 'Genre is not supported');
	return genre;
}

export async function findGenreId(name?: string) {
	if (!name) return undefined;
	return (await requireGenre(name)).id;
}