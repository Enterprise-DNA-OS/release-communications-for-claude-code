do $$ declare p uuid; c uuid; r uuid; s uuid; begin
 if exists(select 1 from projects where code='HARBOUR') then return; end if;
 perform set_config('app.actor','Fictional demo',true);
 insert into projects(code,name,sender_name,sender_contact,unsubscribe_url,access_review,retention_review)
 values('HARBOUR','Harbour Software','Harbour Software','support@example.test','https://example.test/unsubscribe',current_date-3,current_date+30) returning id into p;
 insert into categories(project_id,name) values(p,'Integrations') returning id into c;
 insert into categories(project_id,name) values(p,'Reporting');
 insert into releases(project_id,code,name,summary,owner,due,category_id) values(p,'R01','Export history','Customers can inspect the last export result.','Ana',current_date-2,c) returning id into r;
 insert into tasks(project_id,release_id,code,name,owner,due) values(p,r,'T01','Check support handover','Jo',current_date-3),(p,r,'T02','Review announcement wording','Ana',current_date+2);
 insert into releases(project_id,code,name,summary,owner,due,category_id) values(p,'R02','Export history follow-up','','Jo',current_date+7,c);
 insert into releases(project_id,code,name,summary,owner,due,category_id) values(p,'R03','Connection status','Show when the last connection check completed.','Mara',current_date+4,c) returning id into r;
 insert into approvals(project_id,release_id,revision,reviewer,note) select p,r,revision,'Mara','Demo wording checked' from releases where id=r;
 update releases set status='ready' where id=r;
 insert into subscribers(project_id,email,status,all_categories,consent_source,consent_date) values(p,'ana@example.test','confirmed',true,'Demo opt-in reference',current_date-10);
 insert into subscribers(project_id,email,status,consent_source,consent_date) values(p,'jo@example.test','confirmed','Demo opt-in reference',current_date-20) returning id into s;
 insert into subscriptions(project_id,subscriber_id,category_id) values(p,s,c);
 insert into subscribers(project_id,email,status,all_categories) values(p,'unknown@example.test','confirmed',true),(p,'left@example.test','unsubscribed',true),(p,'blocked@example.test','blocked',true);
 insert into projects(code,name) values('SANDBOX','Separate demonstration project');
end $$;
