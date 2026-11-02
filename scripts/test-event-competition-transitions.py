"""Run after test-event-competitions.sql against an isolated database only."""
import concurrent.futures, os, subprocess
PSQL=os.environ.get('PSQL',r'C:\Program Files\PostgreSQL\18\bin\psql.exe')
BASE=[PSQL,'-h','127.0.0.1','-p',os.environ.get('EVENT_TEST_PORT','55441'),'-U','postgres','-d',os.environ.get('EVENT_TEST_DATABASE','competition_test'),'-v','ON_ERROR_STOP=1','-At','-c']
E='20000000-0000-4000-8000-000000000001'; A='00000000-0000-4000-8000-000000000001'
def sql(command,ok=True):
 r=subprocess.run(BASE+[command],capture_output=True,text=True)
 if ok and r.returncode: raise AssertionError(r.stderr)
 return r
def vote(story,reader): return sql(f"select public.cast_event_story_vote('{E}','10000000-0000-4000-8000-{story:012}','00000000-0000-4000-8000-{reader:012}');",False)
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results=list(pool.map(lambda s:vote(s,4),[2,3]))
assert sorted(r.returncode==0 for r in results)==[False,True], [r.stderr for r in results]
assert sql(f"select count(*) from event_story_votes where event_id='{E}' and user_id='00000000-0000-4000-8000-000000000004'").stdout.strip()=='1'
choice=sql(f"select right(story_id::text,1) from event_story_votes where event_id='{E}' and user_id='00000000-0000-4000-8000-000000000004'").stdout.strip()
assert vote(int(choice),4).returncode==0
assert vote(3 if choice=='2' else 2,4).returncode!=0
sql(f"update community_events set allow_vote_changes=true where id='{E}'")
assert vote(2,4).returncode==0
sql(f"update community_events set allow_vote_changes=false where id='{E}'")
assert vote(2,5).returncode==0
sql(f"select review_event_competition('{E}','{A}','verify',null,null,'Reviewed all valid votes')",False)
assert not sql(f"select review_event_competition('{E}','{A}','verify',null,null,'Reviewed all valid votes')",False).returncode==0
sql(f"select review_event_competition('{E}','{A}','invalidate_vote',null,'00000000-0000-4000-8000-000000000005','Confirmed test invalidation')")
assert sql(f"select count(*) from event_story_votes where event_id='{E}'").stdout.strip()=='2'
assert sql(f"select votes from event_story_vote_counts('{E}') where story_id='10000000-0000-4000-8000-000000000002'").stdout.strip()=='1'
sql(f"select review_event_competition('{E}','{A}','close_voting',null,null,'Voting window closed for review')")
assert vote(3,5).returncode!=0
sql(f"select review_event_competition('{E}','{A}','verify',null,null,'Reviewed eligible entries and reader votes')")
assert sql(f"select published_at is null from event_competition_results where event_id='{E}'").stdout.strip()=='t'
assert sql(f"select verified_votes from event_competition_results where event_id='{E}'").stdout.strip()=='1'
assert sql(f"update community_events set voting_enabled=true where id='{E}'",False).returncode!=0
sql(f"select review_event_competition('{E}','{A}','publish',null,null,'Verified result approved for publication')")
assert sql(f"select published_at is not null from event_competition_results where event_id='{E}'").stdout.strip()=='t'
assert sql(f"select review_event_competition('{E}','{A}','restore_vote',null,'00000000-0000-4000-8000-000000000005','Attempt after publication')",False).returncode!=0
assert sql(f"select count(*)>=5 from event_competition_audit where event_id='{E}'").stdout.strip()=='t'
assert sql("select has_function_privilege('anon','public.cast_event_story_vote(uuid,uuid,uuid)','EXECUTE')").stdout.strip()=='f'
print('PASS: simultaneous/final/idempotent/changeable votes, invalidation, close, verification, publication, audit and permissions')
