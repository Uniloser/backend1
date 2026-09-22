import { z } from 'zod';
import { DISCOVERY_CONFIG as C } from '../discovery/config';
import * as service from '../services/discovery.service';
import * as repository from '../repositories/discovery.repository';
const query=z.object({limit:z.coerce.number().int().min(1).max(C.limits.maxShelf).default(C.limits.shelf),cursor:z.string().max(1000).optional()});
export async function discover(req:any,res:any) {
  const input=query.parse(req.query);
  res.set('Cache-Control','private, no-store');
  res.json({data:input.cursor ? await service.loadMore(input.cursor,req.user?.id,input.limit) : await service.discover(req.user?.id,input.limit)});
}
export async function preferences(req:any,res:any) {
  const input=z.object({genres:z.array(z.string().trim().min(1).max(80)).max(10),tags:z.array(z.string().trim().min(1).max(80)).max(20),allowMature:z.boolean().default(false)}).strict().parse(req.body);
  res.json({data:await repository.savePreferences(req.user.id,input)});
}
export async function events(req:any,res:any) {
  const input=z.object({sessionId:z.string().uuid(),events:z.array(z.object({event:z.enum(['discovery_shelf_view','story_impression','story_click','story_open']),shelf:z.string().min(1).max(100),storyId:z.string().uuid().optional(),position:z.number().int().min(0).max(C.limits.maxOffset).optional()}).strict()).min(1).max(50)}).strict().parse(req.body);
  res.json({data:await service.track(req.user?.id,input)});
}
