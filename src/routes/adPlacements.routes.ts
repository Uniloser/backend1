import { auth, optionalAuth } from '../middleware/auth.middleware';
import { getSupabaseAdmin } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import * as ads from '../services/adPlacementCore';
const router=require('express').Router();
const { z }=require('zod');
const { createHmac }=require('node:crypto');
const { rateLimit }=require('express-rate-limit');
const limits=rateLimit({windowMs:60000,limit:120,standardHeaders:'draft-8',legacyHeaders:false});
const writes=rateLimit({windowMs:60000,limit:30,standardHeaders:'draft-8',legacyHeaders:false});
export function requireAdAdmin(req:any,_res:any,next:any) {
 return req.user?.app_metadata?.role==='admin'?next():next(new ApiError(403,'Administrator access required'));
}
export function adActor(req:any) {
 const secret=process.env.AD_ACTOR_SECRET||process.env.SUPABASE_SERVICE_ROLE_KEY||process.env.SUPABASE_SECRET_KEY;
 if(!secret) throw new ApiError(503,'Advertisement identity is not configured');
 // Anonymous identity is server-derived; callers cannot reset a supplied device ID to evade caps.
 const identity=req.user?.id?`user:${req.user.id}`:`anon:${req.ip}:${String(req.get('user-agent')||'').slice(0,300)}`;
 return createHmac('sha256',secret).update(identity).digest('hex');
}
router.use('/api/ads',limits,(_req:any,res:any,next:any)=>{res.set('Cache-Control','no-store');next();});
router.get('/api/ads/placements',asyncHandler(async(_req:any,res:any)=>res.json({data:await ads.listPlacements(getSupabaseAdmin())})));
router.get('/api/ads',optionalAuth,asyncHandler(async(req:any,res:any)=>{
 const {placement,platform}=z.object({placement:z.string().regex(/^[a-z_]{1,60}$/),platform:z.enum(['website','android'])}).parse(req.query);
 const data=await ads.check(getSupabaseAdmin().rpc('deliver_ad',{p_key:placement,p_platform:platform,p_actor:adActor(req),p_user:req.user?.id||null}));
 res.json({data});
}));
for(const type of ['impression','click']) router.post(`/api/ads/:id/${type}`,optionalAuth,asyncHandler(async(req:any,res:any)=>{
 const id=z.string().uuid().parse(req.params.id), token=z.string().uuid().parse(req.body.delivery_token);
 const counted=await ads.check(getSupabaseAdmin().rpc('record_ad_event',{p_campaign:id,p_delivery:token,p_actor:adActor(req),p_type:type}));
 res.json({data:{counted}});
}));
router.use('/api/admin/ads',writes,auth,requireAdAdmin,(_req:any,res:any,next:any)=>{res.set('Cache-Control','no-store');next();});
router.get('/api/admin/ads',asyncHandler(async(_req:any,res:any)=>res.json({data:await ads.listCampaigns(getSupabaseAdmin())})));
router.post('/api/admin/ads',asyncHandler(async(req:any,res:any)=>res.status(201).json({data:await ads.saveCampaign(getSupabaseAdmin(),req.body)})));
router.post('/api/admin/ads/upload',require('express').json({limit:'8mb'}),asyncHandler(async(req:any,res:any)=>res.json({data:await ads.uploadCreative(getSupabaseAdmin(),req.body)})));
router.patch('/api/admin/ads/:id',asyncHandler(async(req:any,res:any)=>{
 const id=z.string().uuid().parse(req.params.id);
 if(Object.keys(req.body).every(k=>k==='status')&&req.body.status) {
  const status=z.enum(['draft','published','paused']).parse(req.body.status);
  const data=await ads.check(getSupabaseAdmin().from('ad_campaigns').update({status,updated_at:new Date().toISOString()}).eq('id',id).select('id').single());
  return res.json({data});
 }
 res.json({data:await ads.saveCampaign(getSupabaseAdmin(),{...req.body,id})});
}));
router.delete('/api/admin/ads/:id',asyncHandler(async(req:any,res:any)=>{
 await ads.check(getSupabaseAdmin().from('ad_campaigns').delete().eq('id',z.string().uuid().parse(req.params.id)));res.status(204).end();
}));
router.post('/api/admin/ads/:id/placements',asyncHandler(async(req:any,res:any)=>res.json({data:await ads.changeAssignment(getSupabaseAdmin(),req.params.id,req.body.placement_id,req.body)})));
router.patch('/api/admin/ads/:id/placements/:placementId',asyncHandler(async(req:any,res:any)=>{
 const patch=req.body;
 res.json({data:await ads.check(getSupabaseAdmin().rpc('change_ad_assignment',{p_campaign:z.string().uuid().parse(req.params.id),p_placement:z.string().uuid().parse(req.params.placementId),p_patch:z.object({priority:z.number().int().min(0).max(100).optional(),frequency_limit:z.number().int().min(1).max(100).optional(),rotation_seconds:z.number().int().min(60).max(86400).optional(),active:z.boolean().optional(),audience:z.enum(['all','authenticated','anonymous']).optional(),start_at:z.string().datetime({offset:true}).nullable().optional(),end_at:z.string().datetime({offset:true}).nullable().optional()}).strict().parse(patch)}))});
}));
router.delete('/api/admin/ads/:id/placements/:placementId',asyncHandler(async(req:any,res:any)=>res.json({data:await ads.changeAssignment(getSupabaseAdmin(),req.params.id,req.params.placementId,{},true)})));
export default router;
