const { Router } = require('express');
const rateLimit = require('express-rate-limit');
import { auth, optionalAuth } from '../middleware/auth.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import * as repo from '../repositories/community.repository';
import * as v from '../validators/community.validator';
const router=Router();
const writes=rateLimit({windowMs:60000,limit:30,keyGenerator:(req:any)=>req.user.id,standardHeaders:true,legacyHeaders:false});
const handle=(fn:(req:any)=>Promise<any>)=>asyncHandler(async(req:any,res:any)=>{res.json({data:await fn(req)});});
const id=(req:any)=>v.communityId.parse(req.params.id);
router.get('/community',optionalAuth,handle(req=>{const q=v.communityQuery.parse(req.query);return repo.feed(req.user?.id,q.tab,q.limit,q.offset);}));
router.get('/community/sidebar',optionalAuth,handle(req=>repo.sidebar(req.user?.id)));
router.get('/community/posts/:id',optionalAuth,handle(async req=>repo.hydrate(await repo.getPost(id(req),req.user?.id),req.user?.id)));
router.post('/community/posts',auth,writes,handle(req=>repo.createPost(req.user.id,v.communityPostInput.parse(req.body))));
router.delete('/community/posts/:id',auth,writes,handle(req=>repo.removePost(id(req),req.user.id)));
router.patch('/community/posts/:id',auth,writes,handle(req=>repo.editPost(id(req),req.user.id,v.communityEditInput.parse(req.body).content)));
for(const kind of ['like','save'] as const) {
 router.post(`/community/posts/:id/${kind}`,auth,writes,handle(req=>repo.reaction(id(req),req.user.id,kind,true)));
 router.delete(`/community/posts/:id/${kind}`,auth,writes,handle(req=>repo.reaction(id(req),req.user.id,kind,false)));
}
router.get('/community/posts/:id/comments',optionalAuth,handle(req=>{const q=v.communityQuery.parse(req.query);return repo.comments(id(req),req.user?.id,q.limit,q.offset);}));
router.post('/community/posts/:id/comments',auth,writes,handle(req=>repo.addComment(id(req),req.user.id,v.communityCommentInput.parse(req.body))));
router.delete('/community/comments/:id',auth,writes,handle(req=>repo.mutateComment(id(req),req.user.id)));
router.patch('/community/comments/:id',auth,writes,handle(req=>repo.mutateComment(id(req),req.user.id,v.communityCommentInput.parse(req.body).content)));
router.post('/community/posts/:id/vote',auth,writes,handle(req=>repo.vote(id(req),req.user.id,v.communityVoteInput.parse(req.body).option_index)));
export default router;
