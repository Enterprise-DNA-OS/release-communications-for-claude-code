# Bring your LaunchNotes audience

The one-command import covers subscribers and category preferences. It does not claim to move the full LaunchNotes product.

## Export from LaunchNotes

Open Audience, then Subscribers, and use Export. [LaunchNotes documents the CSV export](https://updates.launchnotes.com/announcements/announcing-bulk-subscriber-export) and says it includes the full subscriber list regardless of filters. Check the exported row count and project before loading it.

For a documented structured alternative, ask your authorised administrator to save the response from [exportSubscribers](https://help.launchnotes.com/en/articles/15437464-keep-your-subscriber-list-in-sync). The importer accepts the saved response, its project object, or the edges array. It does not access an account or handle a token. Check that the saved export contains all intended statuses and records; a limited or filtered response is not a full backup. API errors reject the file.

The vendor also documents [Email and Categories input fields](https://help.launchnotes.com/en/articles/5251797-how-do-i-import-subscribers-in-bulk). That is an import specification, not proof that every CSV export uses the same headers. Inspect your file and supply a map when they differ. Our fixtures are synthetic documentation examples.

## Map and import

```bash
npm run releases -- add-project --code=PRODUCT --name="Our product" --actor="Your name"
npm run releases -- import launchnotes --project=PRODUCT --file=imports/subscribers.csv --actor="Your name" --dry-run
npm run releases -- import launchnotes --project=PRODUCT --file=imports/subscribers.csv --actor="Your name"
```

Or use the saved subscriber response with `--file=imports/subscribers.json`.

| Input field | Destination | Treatment |
|---|---|---|
| Email / node.email | Subscriber identity within project | Required; trimmed, lowercased, validated; duplicate addresses within the file reject it. |
| Categories / categories[].name | Selected category links | Comma-separated names in quoted CSV cells. Empty lists are not expanded to all categories. |
| Region / node.region | Region text | Retained without guessing. |
| Status / edge.status | Subscription status | confirmed, unconfirmed, unsubscribed, blocked. Missing means unconfirmed; unknown values reject the file. Existing local suppression wins. |
| ID / node.id | Source ID | Retained; matching uses project plus email. |
| Confirmed At / node.confirmedAt | Source confirmation timestamp | Preserved as text; not promoted to local consent evidence. |
| Other columns / complete edge | Source record | Preserved as JSON for later mapping. |

For different CSV headers, create a mapping file such as `{"Email":"Email address","Categories":"Topics","Status":"Subscription status"}` and pass `--map=imports/field-map.json`. Values are actual column headers. Do not map a display label or an inferred permission into a status.

Every import runs in a transaction. Repeat imports update the same email within the selected project. Changed email addresses create new records; reconcile the old record explicitly. Imported category preferences replace existing category links and do not grant all-category permission. Fields outside the mapping stay in the original source record. Unchanged rows produce no duplicate subscriber or activity entry.

## Reconcile before changing services

Compare subscriber counts, status totals, category names and a sample of original source records. Review consent gaps and suppressed records. Export the destination for a backup. Keep the source account available until the required records and delivery workflow have been checked.

Announcement bodies, roadmap items, comments, feedback, attachments, historical deliveries, metrics and public URLs are outside this importer. Export and retain them separately, then agree mapping work with Enterprise DNA. The free base prepares internal drafts; it does not replace a public changelog or mail delivery service. The full switch depends on those requirements, not just the subscriber import.
