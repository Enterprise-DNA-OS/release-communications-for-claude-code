# Release Communications for Claude Code

Read README.md and docs/compliance.md first. One CLI: `npm run releases -- COMMAND`. One workflow library: .claude/commands. Every answer about records starts with a fresh CLI read.

Use `--project=CODE` for scoped work and `--actor="Name"` on writes. Do not guess a project, person, permission or review. Ambiguous matches list candidates. Keep suppressed people suppressed; an imported confirmed flag is not consent evidence. All output remains private. Never send, publish or upload from this workspace.

## Arguments

All commands support --json. Mutations support --dry-run, which rolls back the transaction and audit writes.

- projects: list projects without a project argument.
- categories, releases, readiness, attention, subscribers, consent-gaps, tasks, approvals, activity, compliance, weekly-review: --project.
- audience: --project --release=CODE.
- add-project: --code --name [--sender-name --sender-contact --unsubscribe-url --access-review=DATE --retention-review=DATE].
- update-project: --project and the changed fields listed above, excluding code.
- add-category: --project --name.
- add-release: --project --code --name [--summary --owner --due=DATE --category=NAME].
- revise-release: --project --ref=CODE and changed --name, --summary, --owner, --due, --category or --status=draft|archived.
- add-task: --project --release=CODE --code --name --owner --due=DATE.
- revise-task: --project --ref=CODE and changed --name, --owner or --due.
- complete-task: --project --ref=CODE --note.
- add-subscriber: --project --email [--region --category=NAME --all-categories]. New records start unconfirmed.
- record-consent: --project --ref=EMAIL --evidence="Source reference" --date=YYYY-MM-DD. Human instruction is required. Suppressed addresses cannot be reconfirmed with this command.
- suppress: --project --ref=EMAIL --note [--status=unsubscribed|blocked].
- approve-release: --project --ref=CODE --note. Requires current completed tasks and release details. Internal readiness only.
- log: --project --note.
- import launchnotes: --project --file=PATH [--map=PATH]. CSV or documented saved subscriber JSON export only. No network calls.
- export: --project [--out=DIRECTORY]. Complete project records as JSON, including personal data and activity.
- draft-announcement, draft-brief: --project --ref=RELEASE. Write to drafts/; never send.
- help: command inventory.

## Operation

Node 20+. npm install, npm run demo, npm test, npm run docs, npm run view. Never seed a production database. Tests use a temporary local database unless TEST_DATABASE_URL names an empty disposable PostgreSQL database. Never print credentials or commit imports, exports, drafts or local data.

The schema enforces same-project links, but trusted database operators can read all projects. There is no multi-user access system. Public database roles have no default grants. Keep files and backups restricted. Reports render all projects unless you use a scoped draft or export.

## Recurring work

Use the matching recipe for every command above. /weekly-review is the Monday ritual. /draft-announcement prepares wording. /draft-brief prepares the handover. /compliance checks recorded safeguards, not legal compliance. /customise adds fields and rules through migrations and tests; /new-view adds a read-only report; /docs renders the business paperwork.

Use plain language. No em dashes or buzzwords. Never invent a source, send result, approval or consent. Do not represent the source import as a full LaunchNotes migration.
