import { canReadStory } from '../repositories/discovery.repository';
import { ApiError } from '../utils/ApiError';
export async function requireReadableStory(storyId:string,userId?:string) {
  if(!await canReadStory(storyId,userId)) throw new ApiError(404,'Story not found');
}
