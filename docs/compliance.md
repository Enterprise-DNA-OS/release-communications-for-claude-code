# Record checks, sources and limits

Sources checked 7 November 2026. These are prompts for the operator, not legal advice or a compliance certificate. The software does not send. Release readiness and audience permission are separate decisions.

| Check | Recorded test | Source and limit |
|---|---|---|
| CONSENT | Confirmed addresses need a dated evidence reference before inclusion in a draft audience | [NZ DIA: three steps](https://www.dia.govt.nz/Spam-Three-Steps) says the sender must be able to demonstrate consent. This tool records the operator's evidence; it cannot decide whether that evidence is sufficient or whether a message is commercial. |
| IDENTITY | Sender name and contact are present | Same DIA guidance. Presence is checked, not accuracy. Check the final external message yourself. |
| UNSUBSCRIBE | An HTTPS unsubscribe location is present | Same DIA guidance. The tool does not test the endpoint or process requests from a live service. /suppress immediately excludes the recorded address locally. |
| ACCESS | The operator-set access review date has not passed | [NZ Privacy Principle 5](https://www.privacy.org.nz/privacy-principles/5/): safeguards for personal information. A review date is only a reminder; it does not prove that safeguards exist. |
| RETENTION | The operator-set retention review date has not passed | [NZ Privacy Principle 9](https://www.privacy.org.nz/privacy-principles/9/): retain information only while required for a lawful purpose. There is no prescribed period encoded here and no automatic deletion. |

[ACMA guidance](https://www.acma.gov.au/spam-compliance-alerts) likewise covers permission, sender identity and unsubscribe in Australia. It describes processing unsubscribe requests within five business days. This local workspace excludes a suppressed address immediately; it neither monitors external requests nor proves an external service met that deadline.

Source confirmation status and confirmation timestamps are kept separately from local consent evidence. CSV imports with no status start unconfirmed. Empty category selections remain excluded until an operator establishes the intended preference. Re-import cannot remove suppression. A new consent request for an already suppressed person requires a separately designed, reviewed process.

Release approval is an internal policy: required content, owner, date, category and complete tasks. Wording and task changes invalidate the approval. It is not a statutory rule. Review the actual external message, audience, sender details and working unsubscribe route before using any separate delivery service.

Activity holds personal data too. Protect and review retention of the database, backups, exports and generated reports. Administrators can modify audit entries. No electronic signature, statutory record certification or tenant isolation is provided.
