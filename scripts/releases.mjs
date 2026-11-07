import fs from 'node:fs';
import {isDeepStrictEqual} from 'node:util';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv,pick} from './lib/csv.mjs';
import {table as textTable} from './lib/format.mjs';
import {page,table,record,writeOut,esc} from './lib/render.mjs';

const reads=['projects','categories','releases','readiness','attention','subscribers','audience','consent-gaps','tasks','approvals','activity','compliance','weekly-review'];
const writes=['add-project','update-project','add-category','add-release','revise-release','add-task','revise-task','complete-task','add-subscriber','record-consent','suppress','approve-release','log','import'];
export const commands=[...reads,...writes,'export','draft-announcement','draft-brief','help'];
const tables=['projects','categories','releases','tasks','subscribers','subscriptions','approvals','activity'];
const fields={
 'add-project':['code','name','sender-name','sender-contact','unsubscribe-url','access-review','retention-review'],
 'update-project':['name','sender-name','sender-contact','unsubscribe-url','access-review','retention-review'],
 'add-category':['name'],'add-release':['code','name','summary','owner','due','category'],
 'revise-release':['ref','name','summary','owner','due','category','status'],
 'add-task':['release','code','name','owner','due'],'revise-task':['ref','name','owner','due'],
 'complete-task':['ref','note'],'add-subscriber':['email','region','category','all-categories'],
 'record-consent':['ref','evidence','date'],'suppress':['ref','note','status'],
 'approve-release':['ref','note'],'log':['note'],'import':['file','map'],
 'audience':['release'],'export':['out'],'draft-announcement':['ref'],'draft-brief':['ref']
};
const requireText=(v,label)=>{if(typeof v!=='string'||!v.trim())throw Error(`Missing ${label}`);return v.trim();};
export function date(v){if(v===''||v==null)return null;if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||new Date(`${v}T00:00:00Z`).toISOString().slice(0,10)!==v)throw Error(`Invalid ISO date: ${v}`);return v;}
function email(v){const s=requireText(v,'email').toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw Error(`Invalid email: ${v}`);return s;}
function parse(args){const [cmd,...rest]=args;const opt={};const pos=[];for(const a of rest){if(!a.startsWith('--')){pos.push(a);continue;}const eq=a.indexOf('=');const k=a.slice(2,eq<0?undefined:eq);if(k in opt)throw Error(`Repeated option: ${k}`);opt[k]=eq<0?true:a.slice(eq+1);}
 if(!commands.includes(cmd))throw Error(`Unknown command: ${cmd||'(empty)'}. Use help.`);
 for(const k of Object.keys(opt))if(!['project','actor','dry-run','json',...(fields[cmd]||[])].includes(k))throw Error(`Unknown option for ${cmd}: --${k}`);
 for(const [k,v] of Object.entries(opt)){if(['json','dry-run','all-categories'].includes(k)){if(v!==true)throw Error(`--${k} is a boolean flag`);}else if(v===true)throw Error(`--${k} needs a value`);}
 if(pos.length&&!(cmd==='import'&&pos.length===1&&pos[0]==='launchnotes'))throw Error('Unexpected arguments; use import launchnotes --file=...');
 if(cmd==='import'&&pos[0]!=='launchnotes')throw Error('Use import launchnotes');
 return {cmd,opt};}
async function resolve(db,tableName,ref,pid){requireText(ref,'record reference');const vals=pid?[ref,pid]:[ref];const key=tableName==='subscribers'?'email':tableName==='categories'?'name':'code';
 const scope=pid?' and project_id=$2':'';const label=['subscribers','categories'].includes(tableName)?key:'name';
 let rows=await db.query(`select * from ${tableName} where (lower(${key})=lower($1) or id::text=$1)${scope}`,vals);
 if(!rows.length)rows=await db.query(`select * from ${tableName} where (starts_with(lower(${label}),lower($1)) or starts_with(id::text,lower($1)))${scope} order by ${key}`,vals);
 if(rows.length!==1)throw Error(`${rows.length?'Ambiguous':'No matching'} ${tableName}: ${ref}${rows.length?'\n'+rows.map(x=>`${x.id}  ${x[key]}  ${x.name||''}`).join('\n'):''}`);return rows[0];}
async function add(db,t,data){const keys=Object.keys(data);return (await db.query(`insert into ${t} (${keys.join(',')}) values (${keys.map((_,i)=>`$${i+1}`).join(',')}) returning *`,Object.entries(data).map(([k,v])=>['before_data','after_data','source_data'].includes(k)&&v!==null?JSON.stringify(v):v)))[0];}
async function update(db,t,id,data){if(!Object.keys(data).length)throw Error('No changes specified');const keys=Object.keys(data);return (await db.query(`update ${t} set ${keys.map((k,i)=>`${k}=$${i+2}`).join(',')} where id=$1 returning *`,[id,...Object.entries(data).map(([k,v])=>['before_data','after_data','source_data'].includes(k)&&v!==null?JSON.stringify(v):v)]))[0];}
function projectData(o){const d={};for(const k of ['name','sender-name','sender-contact','unsubscribe-url','access-review','retention-review'])if(k in o)d[k.replaceAll('-','_')]=k.endsWith('review')?date(o[k]):String(o[k]).trim();if('name'in d)requireText(d.name,'name');if(d.unsubscribe_url&&!/^https:\/\/[^\s]+$/.test(d.unsubscribe_url))throw Error('unsubscribe-url must be an HTTPS URL');return d;}
async function category(db,p,name){return (await resolve(db,'categories',name,p)).id;}
async function report(db,cmd,p){
 const maps={projects:['projects','code'],categories:['categories','name'],releases:['release_readiness','due nulls last,code'],readiness:['release_readiness','due nulls last,code'],attention:['attention_queue','due nulls last,code'],subscribers:['audience_readiness','email'],'consent-gaps':['audience_readiness','email'],tasks:['tasks','due,code'],approvals:['approvals','created_at'],activity:['activity','created_at']};
 const [tableName,order]=maps[cmd];const cond=cmd==='projects'?'':` where project_id=$1${cmd==='consent-gaps'?' and not consent_recorded':''}`;
 let rows=await db.query(`select * from ${tableName}${cond} order by ${order}`,cmd==='projects'?[]:[p]);
 return rows;
}
async function compliance(db,p){const pr=(await db.query('select * from projects where id=$1',[p]))[0];const today=(await db.query('select current_date::text as d'))[0].d;
 const count=(await db.query("select count(*)::integer n from audience_readiness where project_id=$1 and status='confirmed' and not consent_recorded",[p]))[0].n;
 const checks=[['CONSENT','Commercial audience has recorded consent evidence',count===0,`${count} confirmed addresses lack dated evidence`,'https://www.dia.govt.nz/Spam-Three-Steps'],['IDENTITY','Sender name and contact recorded',!!(pr.sender_name&&pr.sender_contact),'Review contact accuracy before external use','https://www.dia.govt.nz/Spam-Three-Steps'],['UNSUBSCRIBE','HTTPS unsubscribe location recorded',/^https:\/\/[^\s]+$/.test(pr.unsubscribe_url),'Presence only; functionality is not checked','https://www.dia.govt.nz/Spam-Three-Steps'],['ACCESS','Access review date is current',!!pr.access_review&&pr.access_review>=today,'Operator-set review date; not a statutory interval','https://www.privacy.org.nz/privacy-principles/5/'],['RETENTION','Retention review date is current',!!pr.retention_review&&pr.retention_review>=today,'Operator-set review date; no automatic deletion','https://www.privacy.org.nz/privacy-principles/9/']];
 return checks.map(([rule,check,ok,note,source])=>({rule,check,result:ok?'recorded':'review needed',note,source}));}
async function audience(db,p,release){const r=await resolve(db,'releases',release,p);return db.query(`select a.email,a.region,a.status,a.consent_recorded,
 case when a.status in ('unsubscribed','blocked') then 'suppressed'
 when not a.consent_recorded then 'consent review'
 when not (a.all_categories or exists(select 1 from subscriptions s where s.subscriber_id=a.id and s.category_id=$2)) then 'category not selected'
 else 'draft audience' end as disposition
 from audience_readiness a where a.project_id=$1 order by a.email`,[p,r.category_id]);}
export function loadImport(file,mapFile){const raw=fs.readFileSync(requireText(file,'file'),'utf8');let rows;
 if(path.extname(file).toLowerCase()==='.json'){
 const doc=JSON.parse(raw);if(doc.errors?.length)throw Error('LaunchNotes export contains API errors');
 const edges=doc.data?.project?.exportSubscribers?.edges??doc.project?.exportSubscribers?.edges??doc;
 if(!Array.isArray(edges))throw Error('Expected saved LaunchNotes exportSubscribers edges');
 rows=edges.map(e=>{if(!e.node)throw Error('Missing subscriber node');return {Email:e.node.email,Categories:(e.categories||[]).map(c=>c.name).join(','),Region:e.node.region||'',Status:e.status,ID:e.node.id,'Confirmed At':e.node.confirmedAt||'',__source:e};});
 }else rows=parseCsv(raw);
 if(!rows.length)throw Error('Import file has no records');
 let map=mapFile?JSON.parse(fs.readFileSync(mapFile,'utf8')):{};for(const k of Object.keys(map))if(!['Email','Categories','Region','Status','ID','Confirmed At'].includes(k))throw Error(`Unknown field map key: ${k}`);
 const seen=new Set();return rows.map((row,i)=>{for(const col of Object.values(map))if(!Object.keys(row).some(k=>k.toLowerCase()===String(col).toLowerCase()))throw Error(`Mapped column missing: ${col}`);const value=k=>pick(row,map[k]||k);const address=email(value('Email'));if(seen.has(address))throw Error(`Duplicate email in import row ${i+2}: ${address}`);seen.add(address);
 const state=String(value('Status')||'unconfirmed').toLowerCase();if(!['confirmed','unconfirmed','unsubscribed','blocked'].includes(state))throw Error(`Unknown subscription status: ${state}`);
 return {email:address,region:value('Region')||'',status:state,categories:[...new Set(String(value('Categories')||'').split(',').map(s=>s.trim()).filter(Boolean))],external_id:value('ID')||null,source_confirmed_at:value('Confirmed At')||null,source_data:row.__source||row};});}
async function importRows(db,p,o){const rows=loadImport(o.file,o.map);let inserted=0,updated=0,unchanged=0;
 for(const row of rows){const old=(await db.query('select * from subscribers where project_id=$1 and email=$2',[p,row.email]))[0];const cats=[];
 for(const name of row.categories){let c=(await db.query('select * from categories where project_id=$1 and name=$2',[p,name]))[0];if(!c)c=await add(db,'categories',{project_id:p,name});cats.push(c.id);}
 const data={all_categories:false,region:row.region,status:old&&['unsubscribed','blocked'].includes(old.status)?old.status:row.status,external_id:row.external_id,source_confirmed_at:row.source_confirmed_at,source_data:row.source_data};
 let s=old;
 const equalSource=old&&isDeepStrictEqual(old.source_data,row.source_data);
 const same=old&&['all_categories','region','status','external_id','source_confirmed_at'].every(k=>old[k]===data[k])&&equalSource;
 if(!old){s=await add(db,'subscribers',{project_id:p,email:row.email,...data});inserted++;}
 else if(!same){s=await update(db,'subscribers',old.id,data);updated++;}else unchanged++;
 // Source preferences replace imported category links. All-category permission is never inferred.
 const existing=await db.query('select category_id from subscriptions where subscriber_id=$1',[s.id]);
 const changed=existing.length!==cats.length||existing.some(x=>!cats.includes(x.category_id));
 if(changed){await db.query('delete from subscriptions where subscriber_id=$1',[s.id]);for(const cid of cats)await add(db,'subscriptions',{project_id:p,subscriber_id:s.id,category_id:cid});
 await add(db,'activity',{project_id:p,actor:o.actor,entity:'subscriptions',record_id:s.id,action:'IMPORT_PREFERENCES',before_data:existing,after_data:cats});}
 }
 return {inserted,updated,unchanged,total:rows.length,notice:'Source confirmation is not proof of consent. Empty category lists are not expanded. Suppression remains in force.'};}
export async function execute(db,args){const {cmd,opt:o}=parse(args);
 if(cmd==='help')return {commands,usage:'npm run releases -- COMMAND --project=CODE [--ref=CODE] [--json]. Writes require --actor=NAME; --dry-run rolls back. See CLAUDE.md for arguments.'};
 const write=writes.includes(cmd);if(o['dry-run']&&!write)throw Error('--dry-run applies only to writes');if(write)requireText(o.actor,'actor');
 await db.exec(write?'BEGIN':'BEGIN READ ONLY');
 try{
 if(write)await db.query("select set_config('app.actor',$1,true)",[o.actor]);
 const p=cmd==='projects'||cmd==='add-project'?null:(await resolve(db,'projects',o.project)).id;
 let result;
 if(reads.includes(cmd)){
 if(cmd==='weekly-review')result={readiness:await report(db,'readiness',p),attention:await report(db,'attention',p),consent_gaps:await report(db,'consent-gaps',p),compliance:await compliance(db,p)};
 else if(cmd==='compliance')result=await compliance(db,p);
 else if(cmd==='audience')result=await audience(db,p,o.release);
 else result=await report(db,cmd,p);
 }else if(cmd==='add-project')result=await add(db,'projects',{code:requireText(o.code,'code'),name:requireText(o.name,'name'),...projectData(o)});
 else if(cmd==='update-project')result=await update(db,'projects',p,projectData(o));
 else if(cmd==='add-category')result=await add(db,'categories',{project_id:p,name:requireText(o.name,'name')});
 else if(cmd==='add-release')result=await add(db,'releases',{project_id:p,code:requireText(o.code,'code'),name:requireText(o.name,'name'),summary:o.summary||'',owner:o.owner||'',due:date(o.due),category_id:o.category?await category(db,p,o.category):null});
 else if(cmd==='revise-release'){const r=await resolve(db,'releases',o.ref,p);const d={};for(const k of ['name','summary','owner','due','status'])if(k in o)d[k]=k==='due'?date(o[k]):String(o[k]);if('name'in d)requireText(d.name,'name');if(o.category)d.category_id=await category(db,p,o.category);if(o.status&&!['draft','archived'].includes(o.status))throw Error('Use approve-release to mark ready');result=await update(db,'releases',r.id,d);}
 else if(cmd==='add-task')result=await add(db,'tasks',{project_id:p,release_id:(await resolve(db,'releases',o.release,p)).id,code:requireText(o.code,'code'),name:requireText(o.name,'name'),owner:requireText(o.owner,'owner'),due:date(requireText(o.due,'due'))});
 else if(cmd==='revise-task'){const t=await resolve(db,'tasks',o.ref,p);const d={};for(const k of ['name','owner','due'])if(k in o)d[k]=k==='due'?date(requireText(o[k],k)):requireText(o[k],k);result=await update(db,'tasks',t.id,d);}
 else if(cmd==='complete-task'){const t=await resolve(db,'tasks',o.ref,p);if(t.completed_at)throw Error('Task already completed');result=await update(db,'tasks',t.id,{completed_at:new Date().toISOString(),completion_note:requireText(o.note,'note')});}
 else if(cmd==='add-subscriber'){result=await add(db,'subscribers',{project_id:p,email:email(o.email),region:o.region||'',all_categories:o['all-categories']===true});if(o.category)await add(db,'subscriptions',{project_id:p,subscriber_id:result.id,category_id:await category(db,p,o.category)});}
 else if(cmd==='record-consent'){const s=await resolve(db,'subscribers',o.ref,p);if(['unsubscribed','blocked'].includes(s.status))throw Error('Suppressed subscriber cannot be reconfirmed by this command');const d=date(requireText(o.date,'date'));if(d>(await db.query('select current_date::text d'))[0].d)throw Error('Consent date cannot be in the future');result=await update(db,'subscribers',s.id,{consent_source:requireText(o.evidence,'evidence'),consent_date:d,status:'confirmed'});}
 else if(cmd==='suppress'){const s=await resolve(db,'subscribers',o.ref,p);const status=o.status||'unsubscribed';if(!['unsubscribed','blocked'].includes(status))throw Error('Suppression status must be unsubscribed or blocked');result=await update(db,'subscribers',s.id,{status});await add(db,'activity',{project_id:p,actor:o.actor,entity:'subscribers',record_id:s.id,action:'SUPPRESS_REASON',after_data:{note:requireText(o.note,'note')}});}
 else if(cmd==='approve-release'){const r=await resolve(db,'releases',o.ref,p);if(r.status==='archived')throw Error('Archived release cannot be approved');const v=(await db.query('select * from release_readiness where id=$1',[r.id]))[0];if(!r.owner||!r.summary||!r.due||!r.category_id||v.open_tasks)throw Error('Approval needs owner, summary, due date, category and no open tasks');result=await add(db,'approvals',{project_id:p,release_id:r.id,revision:r.revision,reviewer:o.actor,note:requireText(o.note,'note')});await update(db,'releases',r.id,{status:'ready'});}
 else if(cmd==='log')result=await add(db,'activity',{project_id:p,actor:o.actor,entity:'projects',record_id:p,action:'NOTE',after_data:{note:requireText(o.note,'note')}});
 else if(cmd==='import')result=await importRows(db,p,o);
 else if(cmd==='export'){const data={format:'release-communications-v1',exported_at:new Date().toISOString(),records:{}};for(const t of tables)data.records[t]=await db.query(`select * from ${t} where ${t==='projects'?'id':'project_id'}=$1 order by id`,[p]);const dir=path.resolve(o.out||path.join(REPO_ROOT,'exports'));fs.mkdirSync(dir,{recursive:true,mode:0o700});const file=path.join(dir,`${p}-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{mode:0o600,flag:'wx'});result={file,counts:Object.fromEntries(Object.entries(data.records).map(([k,v])=>[k,v.length]))};}
 else if(cmd.startsWith('draft-')){const r=await resolve(db,'releases',o.ref,p);const pr=(await db.query('select * from projects where id=$1',[p]))[0];const v=(await db.query('select * from release_readiness where id=$1',[r.id]))[0];const sections=cmd==='draft-announcement'?[{title:r.name,html:`<p>${esc(r.summary)}</p>`},{title:'Sender and preferences',html:record(pr,['sender_name','sender_contact','unsubscribe_url'])},{title:'Readiness',html:record(v,['code','revision','status','open_tasks','current_approval'])}]:[{title:'Release',html:record(r,['code','name','summary','owner','due','revision'])},{title:'Tasks',html:table(await db.query('select code,name,owner,due,completed_at from tasks where release_id=$1 order by code',[r.id]))},{title:'Audience review',html:table(await audience(db,p,r.code))}];
 const file=writeOut('drafts',`${cmd}-${r.id}-r${r.revision}`,page({title:'INTERNAL DRAFT: '+r.name,subtitle:'Review only. Nothing has been sent or published. Audience consent and external delivery require a separate review.',sections}));result={file,revision:r.revision,review_ready:v.review_ready};}
 await db.exec(write&&!o['dry-run']?'COMMIT':'ROLLBACK');return o['dry-run']?{dry_run:true,result}:result;
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
const briefColumns={releases:['code','name','owner','due','status'],readiness:['code','revision','open_tasks','current_approval','review_ready'],attention:['code','kind','owner','due','reason'],subscribers:['email','status','categories','consent_recorded'],'consent-gaps':['email','status','consent_recorded'],tasks:['code','name','owner','due','completed_at'],activity:['actor','entity','action','created_at'],approvals:['reviewer','revision','note'],categories:['name'],projects:['code','name'],compliance:['rule','result','note']};
export function format(value,cmd=''){if(Array.isArray(value)){const cols=briefColumns[cmd]||Object.keys(value[0]||{});return textTable(value,cols.map(key=>({key,label:key.replaceAll('_',' '),width:cmd==='compliance'?65:52,format:v=>typeof v==='object'&&v!==null?JSON.stringify(v):v})));}if(value&&'readiness'in value)return Object.entries(value).map(([k,v])=>`${k.replaceAll('_',' ').toUpperCase()}\n${format(v,k==='consent_gaps'?'consent-gaps':k)}`).join('\n\n');return JSON.stringify(value,null,2);}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const result=await execute(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(result):format(result,process.argv[2]));}catch(e){const msg=String(e.message);console.error(process.argv.includes('--json')?JSON.stringify({error:msg}):msg);process.exitCode=1;}finally{await db?.close();}}
