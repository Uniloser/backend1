"""Additional isolated PostgreSQL deadline, eligibility and tie checks."""
import os,subprocess,time
PSQL=os.environ.get('PSQL',r'C:\Program Files\PostgreSQL\18\bin\psql.exe')
BASE=[PSQL,'-h','127.0.0.1','-p',os.environ.get('EVENT_TEST_PORT','55441'),'-U','postgres','-d',os.environ.get('EVENT_TEST_DATABASE','competition_test'),'-v','ON_ERROR_STOP=1','-At','-c']
def sql(text,ok=True):
 r=subprocess.run(BASE+[text],capture_output=True,text=True)
 if ok and r.returncode:raise AssertionError(r.stderr)
 return r
E='20000000-0000-4000-8000-000000000004';S='10000000-0000-4000-8000-000000000002';U='00000000-0000-4000-8000-000000000004';A='00000000-0000-4000-8000-000000000001'
sql(f"insert into community_events(id,slug,title,status,starts_at,ends_at,voting_starts_at,voting_ends_at) values('{E}','deadline-test','Deadline','live',now()-interval '1 day',now()+interval '2 seconds',now()-interval '1 day',now()+interval '2 seconds'); insert into event_story_entries(event_id,story_id,author_id) values('{E}','{S}','00000000-0000-4000-8000-000000000002');")
lock=subprocess.Popen(BASE+[f"begin;select id from community_events where id='{E}' for update;select pg_sleep(3);commit;"],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
time.sleep(0.3)
r=sql(f"select cast_event_story_vote('{E}','{S}','{U}')",False);lock.communicate(timeout=10)
assert r.returncode!=0 and 'Voting is not open' in r.stderr,r.stderr
assert sql(f"select count(*) from event_story_votes where event_id='{E}'").stdout.strip()=='0'
T='20000000-0000-4000-8000-000000000005'
sql(f"insert into community_events(id,slug,title,status,starts_at,ends_at,voting_starts_at,voting_ends_at,voting_enabled) values('{T}','tie-test','Tie','live',now()-interval '2 days',now()+interval '1 day',now()-interval '1 day',now()+interval '1 day',false);insert into event_story_entries(event_id,story_id,author_id) select '{T}',id,author_id from stories;")
r=sql(f"select review_event_competition('{T}','{A}','verify',null,null,'Checking tied entries')",False)
assert r.returncode!=0 and 'Tied results' in r.stderr,r.stderr
sql(f"select review_event_competition('{T}','{A}','verify_override','{S}',null,'Tie break: documented independent editorial review')")
assert sql(f"select verification_note from event_competition_results where event_id='{T}'").stdout.strip().startswith('Tie break:')
I='20000000-0000-4000-8000-000000000006'
sql(f"insert into community_events(id,slug,title,status,starts_at,ends_at,entry_starts_at,entry_ends_at,allow_existing_stories) values('{I}','eligibility-test','Eligibility','live',now()-interval '1 day',now()+interval '1 day',now()-interval '1 day',now()+interval '1 day',false)")
r=sql(f"select submit_event_story('{I}','{S}','00000000-0000-4000-8000-000000000002')",False)
assert r.returncode!=0 and 'not eligible' in r.stderr,r.stderr
r=sql(f"select submit_event_story('{I}','{S}','{U}')",False)
assert r.returncode!=0 and 'not eligible' in r.stderr,r.stderr
print('PASS: deadline after lock wait, tie review/override and existing-story/ownership eligibility')
