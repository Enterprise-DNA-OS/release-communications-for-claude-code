# Release Communications for Claude Code

Your release decisions, handover tasks, announcement drafts and audience preferences in a database you own. Find what blocks the next release before the Monday meeting.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Free, MIT. Install and run the demo. | Your release fields, review rules, imported history and documents. | Installed and operated through Omni by Enterprise DNA. One setup fee, then a retainer. |

[Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=launchnotes) · [Instead of LaunchNotes](https://enterprisedna.co/omni/instead-of/launchnotes?utm_source=github&utm_medium=readme&utm_campaign=launchnotes)

## Start with the release review

Node 20 or later. Open this folder with Claude Code, Codex, OpenCode or Cursor.

```bash
npm install
npm run demo
npm run releases -- readiness --project=HARBOUR
npm run releases -- audience --project=HARBOUR --release=R03
npm run docs
npm run view
```

The fictional demo has an overdue export announcement, an unfinished handover, a ready connection-status announcement, and audience records with missing evidence and suppressed addresses. No customer data is included. Never seed your live database.

Local PGlite needs no server. Set DATABASE_URL to use PostgreSQL 15 or later. Use a trusted database owner account. This is a trusted operator workspace, with no per-user sign-in or project access policy. Project filters prevent accidental cross-linking, not access by another trusted operator. Restrict the database, backup files and generated reports.

## The weekly rituals

31 CLI commands and 34 workflow recipes ship. `/weekly-review` combines readiness, overdue work, consent gaps and safeguard reviews. `/readiness` shows blockers. `/audience` explains every inclusion or exclusion. `/approve-release` records a named review of the current revision. `/draft-announcement` and `/draft-brief` write private HTML drafts; nothing sends or publishes.

Every command supports `--json`. Writes require `--actor="Your name"`; `--dry-run` rolls back the records and audit entries. Codes match exactly, names match without case and UUID prefixes work. Ambiguous references list candidates and fail. Run `npm run releases -- help` or read CLAUDE.md for arguments.

## Approval follows the version

Changing release wording, owner, date or category invalidates its approval. Adding, changing or completing a task also starts a new revision. Approval needs a summary, owner, date, category and no open tasks. It marks internal readiness only. Approval does not send anything or assert consent for an audience.

Audience checks require a confirmed status, dated consent evidence and a matching category or explicit all-category preference. Imported confirmation timestamps are retained as source facts, not promoted to consent evidence. Unsubscribed and blocked addresses remain suppressed after re-import. The tool never infers a right to message a person from a file. [Checks and sources](docs/compliance.md).

## Ten questions to ask of your own records

These queries run today. They are not claims that LaunchNotes cannot answer them.

1. Which release has overdue handover work? `attention`
2. Which release has all tasks complete and a current approval? `readiness`
3. Which approval became stale after wording changed? `readiness`
4. Who owns each unfinished readiness task? `tasks`
5. Which confirmed subscribers lack recorded consent evidence? `consent-gaps`
6. Why is an address excluded from this announcement? `audience --release=R03`
7. Which subscribers selected each category? `subscribers`
8. Which access and retention reviews need attention? `compliance`
9. Who changed the release and what changed? `activity`
10. What must be reviewed before Monday's announcement? `weekly-review`

## Bring your LaunchNotes audience

Create a project, export the subscriber list, then import it in one command:

```bash
npm run releases -- add-project --code=PRODUCT --name="Our product" --actor="Your name"
npm run releases -- import launchnotes --project=PRODUCT --file=imports/subscribers.csv --actor="Your name" --dry-run
npm run releases -- import launchnotes --project=PRODUCT --file=imports/subscribers.csv --actor="Your name"
```

The documented saved exportSubscribers JSON response also imports. CSV headers vary: use `--map=imports/field-map.json` if needed. The importer carries email, region, status, selected categories, source ID and confirmation date where present, with every original source field retained. An empty category list is held for review, never expanded to everyone. It does not import announcement bodies, roadmap history, feedback, attachments or delivery metrics. [Export steps and exact mapping](docs/replace-launchnotes.md).

Repeating an unchanged import does not duplicate subscribers or audit writes. Imports are atomic and project scoped; invalid records roll back the whole file. Imported preferences replace recorded category links; review the dry run and back up first. Suppression stays in force. Fixtures are synthetic examples built from the documentation, not exports from a paid account.

## Documents and views

Change brand.json once. `npm run docs` produces a release readiness brief per release and an audience review per project. `npm run view` produces read-only weekly and audience reports. The views and document batch include all projects in this trusted workspace. Individual drafts and exports require a project. Generated files are internal and ignored by version control.

The free base does not host a public changelog, in-app widget, subscriber sign-in, delivery service or engagement tracking. Enterprise DNA can scope those into your version. [What screens and delivery services add](docs/why-no-front-end.md).

## Your first hour: ten things to ask for

1. Put our name on the release brief.
2. Create a project for our product.
3. Import a subscriber file without saving it.
4. Map our category column.
5. List records without a consent reference.
6. Add our support handover check.
7. Assign the announcement review to its owner.
8. Show approvals that no longer match the wording.
9. Add our rollout region field.
10. Draft the next announcement for review.

`/customise` writes and tests a migration for a new field or rule. `/new-view` adds a read-only report from existing records.

## Verification and operation

`npm test` creates a temporary database and checks every command, repeat migration and seed, stale approvals, cross-project constraints, imports, suppression, consent, exports, escaped HTML and document rendering. CI covers Node 20 and 22 on Linux and Windows, plus PostgreSQL. Consult actual CI results before claiming a platform passed.

Audit entries retain before and after values. Database administrators can alter them; this is not a tamper-proof record. Set an appropriate retention policy, restrict access, back up the database, and verify that backups can be restored. The free base does not certify legal compliance or send messages.

Enterprise DNA builds your version, maps the agreed LaunchNotes data and operates it through Omni by Enterprise DNA. One setup fee, then a retainer. [Book 30 minutes with Sam](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_medium=readme&utm_campaign=launchnotes).

MIT. Not affiliated with LaunchNotes or Anthropic. Hosting and agent usage have their own costs.
