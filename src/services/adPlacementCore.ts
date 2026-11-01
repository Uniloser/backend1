const { z } = require('zod');
const sharp = require('sharp');
const { randomUUID } = require('node:crypto');
const uuid = z.string().uuid();
const date = z.string().datetime({ offset: true }).nullable();
const destination = z.string().url().max(2048).regex(/^https?:\/\//);
export const assignmentSchema = z.object({
 placement_id: uuid, priority: z.number().int().min(0).max(100).default(0),
 frequency_limit: z.number().int().min(1).max(100).default(3),
 rotation_seconds: z.number().int().min(60).max(86400).default(300),
 audience: z.enum(['all','authenticated','anonymous']).default('all'), active: z.boolean().default(true),
 start_at: date.default(null), end_at: date.default(null),
}).strict().refine((v: any) => !v.start_at || !v.end_at || Date.parse(v.end_at)>Date.parse(v.start_at), 'End must follow start');
export const campaignSchema = z.object({
 id: uuid.optional(), name: z.string().trim().min(1).max(120), headline: z.string().trim().min(1).max(160),
 description: z.string().trim().max(1000).default(''), status: z.enum(['draft','published','paused']).default('draft'),
 start_at: z.string().datetime({ offset:true }), end_at: date.default(null),
 creative: z.object({creative_type:z.enum(['image','text']),image_url:z.string().url().regex(/^https:\/\//).max(2048).nullable().default(null),destination_url:destination}).strict()
  .refine((v:any)=>v.creative_type==='text'||Boolean(v.image_url),'Image creative requires an image'),
 placements: z.array(assignmentSchema).max(12),
}).strict().refine((v:any)=>!v.end_at||Date.parse(v.end_at)>Date.parse(v.start_at),'End must follow start')
 .refine((v:any)=>new Set(v.placements.map((p:any)=>p.placement_id)).size===v.placements.length,'Duplicate placement')
 .refine((v:any)=>v.status!=='published'||v.placements.some((p:any)=>p.active),'Publishing requires an active placement');
export async function check(query: any): Promise<any> {
 const {data,error}=await query; if(error) throw error; return data;
}
export async function listPlacements(db:any) { return check(db.from('ad_placements').select('*').order('platform').order('display_name')); }
export async function listCampaigns(db:any) {
 return check(db.from('ad_campaigns').select('*,ad_creatives(*),ad_campaign_placements(*)').order('created_at',{ascending:false}).limit(100));
}
export async function saveCampaign(db:any,raw:any) {
 const payload=campaignSchema.parse(raw);
 return {id:await check(db.rpc('save_ad_campaign',{payload}))};
}
export async function campaignPayload(db:any,id:string) {
 uuid.parse(id);
 const row=await check(db.from('ad_campaigns').select('*,ad_creatives(*),ad_campaign_placements(*)').eq('id',id).single());
 const {created_at,updated_at,ad_creatives,ad_campaign_placements,...campaign}=row;
 const creative=ad_creatives[0];
 return {...campaign,creative:{creative_type:creative.creative_type,image_url:creative.image_url,destination_url:creative.destination_url},
 placements:ad_campaign_placements.map(({id:_,campaign_id:__,...p}:any)=>p)};
}
export async function changeAssignment(db:any,id:string,placementId:string,raw:any,remove=false) {
 uuid.parse(placementId);
 // Read/modify/write is serialized by the route's transaction RPC below.
 const patch=remove?null:assignmentSchema.parse({...raw,placement_id:placementId});
 return {id:await check(db.rpc('change_ad_assignment',{p_campaign:uuid.parse(id),p_placement:placementId,p_patch:patch}))};
}
export async function uploadCreative(db:any,raw:any) {
 const {dataUrl}=z.object({dataUrl:z.string().max(8*1024*1024)}).parse(raw);
 const match=/^data:image\/(?:png|jpeg|webp);base64,([a-z0-9+/=]+)$/i.exec(dataUrl);
 if(!match) throw new Error('Choose a PNG, JPEG, or WebP image');
 const bytes=require('node:buffer').Buffer.from(match[1],'base64');
 if(bytes.length>5*1024*1024) throw new Error('Images must be 5 MB or smaller');
 // Decode and re-encode: reject disguised files, excessive dimensions, and metadata.
 const image=await sharp(bytes,{limitInputPixels:24000000}).rotate().resize({width:2400,height:2400,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
 const path=`campaigns/${randomUUID()}.webp`;
 await check(db.storage.from('ad-creatives').upload(path,image,{contentType:'image/webp',upsert:false}));
 return {url:db.storage.from('ad-creatives').getPublicUrl(path).data.publicUrl};
}
