const {test,after}=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://test.supabase.co';
process.env.SUPABASE_ANON_KEY='test-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY='test-service';
process.env.AD_ACTOR_SECRET='test-ad-identity';
const {supabase,supabaseAdmin}=require('../dist/src/config/supabase');
const app=require('../dist/src/app').default;
const {adActor}=require('../dist/src/routes/adPlacements.routes');
const id='123e4567-e89b-42d3-a456-426614174000';
const calls=[];
supabaseAdmin.rpc=async(name,args)=>{calls.push({name,args});return {data:name==='deliver_ad'?null:true,error:null};};
supabase.auth.getUser=async(token)=>({data:{user:{id,app_metadata:{role:token==='admin'?'admin':'reader'}}},error:null});
let server;
const ready=new Promise(resolve=>{server=app.listen(0,'127.0.0.1',()=>resolve(`http://127.0.0.1:${server.address().port}`));});
after(()=>new Promise(resolve=>server.close(resolve)));
test('public retrieval uses placement/platform and does not record an impression',async()=>{
 const base=await ready;const response=await fetch(base+'/api/ads?placement=home_banner&platform=android');
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{data:null});assert.match(response.headers.get('cache-control'),/no-store/);
 assert.equal(calls.at(-1).name,'deliver_ad');assert.equal(calls.at(-1).args.p_platform,'android');assert.equal(calls.at(-1).args.p_user,null);
});
test('anonymous and ordinary users cannot manage campaigns',async()=>{
 const base=await ready;
 assert.equal((await fetch(base+'/api/admin/ads')).status,401);
 assert.equal((await fetch(base+'/api/admin/ads',{headers:{Authorization:'Bearer reader'}})).status,403);
 assert.equal((await fetch(base+'/api/admin/ads',{method:'POST',headers:{Authorization:'Bearer admin','Content-Type':'application/json'},body:'{}'})).status,400);
});
test('retrieval and event payloads reject malformed input',async()=>{
 const base=await ready;
 assert.equal((await fetch(base+'/api/ads?placement=home_banner&platform=ios')).status,400);
 assert.equal((await fetch(base+`/api/ads/${id}/impression`,{method:'POST',headers:{'Content-Type':'application/json'},body:'{"delivery_token":"forged"}'})).status,400);
});
test('events bind an opaque delivery token to a server-derived actor',async()=>{
 const base=await ready;
 assert.equal((await fetch(base+`/api/ads/${id}/impression`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({delivery_token:id})})).status,200);
 assert.equal(calls.at(-1).name,'record_ad_event');assert.equal(calls.at(-1).args.p_type,'impression');assert.match(calls.at(-1).args.p_actor,/^[a-f0-9]{64}$/);
 const request={ip:'127.0.0.1',get:()=> 'client',user:{id}};
 assert.equal(adActor(request),adActor({...request,ip:'another-ip'}));
 assert.notEqual(adActor(request),adActor({...request,user:undefined}));
});
