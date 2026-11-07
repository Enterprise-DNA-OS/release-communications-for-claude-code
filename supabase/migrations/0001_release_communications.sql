create function touch_record() returns trigger language plpgsql as $$ begin new.updated_at=now(); return new; end $$;
create table projects (
 id uuid primary key default gen_random_uuid(), code text unique not null check(code<>''), name text not null check(name<>''),
 sender_name text not null default '', sender_contact text not null default '', unsubscribe_url text not null default '',
 access_review date, retention_review date, created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table categories (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id), name text not null check(name<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,name), unique(project_id,id)
);
create table releases (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id), code text not null, name text not null check(name<>''),
 summary text not null default '', owner text not null default '', due date, category_id uuid,
 revision integer not null default 1 check(revision>0), status text not null default 'draft' check(status in ('draft','ready','archived')),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(project_id,code), unique(project_id,id), foreign key(project_id,category_id) references categories(project_id,id)
);
create table tasks (
 id uuid primary key default gen_random_uuid(), project_id uuid not null, release_id uuid not null, code text not null, name text not null check(name<>''),
 owner text not null check(owner<>''), due date not null, completed_at timestamptz, completion_note text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 unique(project_id,code), foreign key(project_id,release_id) references releases(project_id,id)
);
create table subscribers (
 id uuid primary key default gen_random_uuid(), project_id uuid not null references projects(id), email text not null check(email=lower(email) and email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'),
 region text not null default '', status text not null default 'unconfirmed' check(status in ('confirmed','unconfirmed','unsubscribed','blocked')),
 all_categories boolean not null default false, consent_source text not null default '', consent_date date,
 source_data jsonb not null default '{}', external_id text, source_confirmed_at text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(project_id,email), unique(project_id,id)
);
create table subscriptions (
 id uuid primary key default gen_random_uuid(), project_id uuid not null, subscriber_id uuid not null, category_id uuid not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(subscriber_id,category_id),
 foreign key(project_id,subscriber_id) references subscribers(project_id,id), foreign key(project_id,category_id) references categories(project_id,id)
);
create table approvals (
 id uuid primary key default gen_random_uuid(), project_id uuid not null, release_id uuid not null, revision integer not null,
 reviewer text not null check(reviewer<>''), note text not null check(note<>''),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 foreign key(project_id,release_id) references releases(project_id,id), unique(release_id,revision)
);
create table activity (
 id uuid primary key default gen_random_uuid(), project_id uuid references projects(id), actor text not null, entity text not null,
 record_id uuid, action text not null, before_data jsonb, after_data jsonb,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create function audit_record() returns trigger language plpgsql as $$
declare pid uuid; who text;
begin
 who=coalesce(nullif(current_setting('app.actor',true),''),'database operator');
 pid=case when tg_table_name='projects' then new.id else (to_jsonb(new)->>'project_id')::uuid end;
 insert into activity(project_id,actor,entity,record_id,action,before_data,after_data)
 values(pid,who,tg_table_name,new.id,tg_op,case when tg_op='UPDATE' then to_jsonb(old) else null end,to_jsonb(new));
 return new;
end $$;
create function release_changed() returns trigger language plpgsql as $$ begin
 if (new.name,new.summary,new.owner,new.due,new.category_id) is distinct from (old.name,old.summary,old.owner,old.due,old.category_id) then
 new.revision=old.revision+1; new.status='draft';
 end if; return new;
end $$;
create trigger invalidate_release before update on releases for each row execute function release_changed();
create function task_changed() returns trigger language plpgsql as $$ begin
 update releases set revision=revision+1,status=case when status='archived' then 'archived' else 'draft' end where id=new.release_id;
 return new;
end $$;
create trigger invalidate_task after insert or update on tasks for each row execute function task_changed();
do $$ declare t text; begin
 foreach t in array array['projects','categories','releases','tasks','subscribers','subscriptions','approvals','activity'] loop
 execute format('create trigger touch before update on %I for each row execute function touch_record()',t);
 execute format('alter table %I enable row level security',t);
 execute format('revoke all on %I from public',t);
 if t<>'activity' then execute format('create trigger audit after insert or update on %I for each row execute function audit_record()',t); end if;
 end loop;
end $$;
create view release_readiness as
 select r.id,r.project_id,r.code,r.name,r.owner,r.due,r.revision,r.status,c.name as category,
 (select count(*)::integer from tasks t where t.release_id=r.id and t.completed_at is null) as open_tasks,
 (select count(*)::integer from tasks t where t.release_id=r.id and t.completed_at is null and t.due<current_date) as overdue_tasks,
 exists(select 1 from approvals a where a.release_id=r.id and a.revision=r.revision) as current_approval,
 (r.owner<>'' and r.summary<>'' and r.due is not null and r.category_id is not null
 and not exists(select 1 from tasks t where t.release_id=r.id and t.completed_at is null)
 and exists(select 1 from approvals a where a.release_id=r.id and a.revision=r.revision)) as review_ready
 from releases r left join categories c on c.id=r.category_id;
create view audience_readiness as
 select s.id,s.project_id,s.email,s.region,s.status,s.consent_source,s.consent_date,s.all_categories,
 (select string_agg(c.name,', ' order by c.name) from subscriptions x join categories c on c.id=x.category_id where x.subscriber_id=s.id) as categories,
 (s.status='confirmed' and s.consent_source<>'' and s.consent_date is not null and s.consent_date<=current_date) as consent_recorded
 from subscribers s;
create view attention_queue as
 select project_id,'release'::text as kind,code,name,owner,due,'release date passed'::text as reason from releases where status<>'archived' and due<current_date
 union all
 select project_id,'task',code,name,owner,due,'open task overdue' from tasks where completed_at is null and due<current_date
 union all
 select project_id,'release',code,name,owner,due,'owner or content missing' from releases where status<>'archived' and (owner='' or summary='')
 union all
 select project_id,'release',code,name,owner,due,'no current approval' from release_readiness where status<>'archived' and not current_approval;
revoke all on release_readiness,audience_readiness,attention_queue from public;
