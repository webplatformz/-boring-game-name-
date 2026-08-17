# Data-minimisation review

Review date: **2026-08-17**  
Scope: public application bundle, build snapshots, local game state and hosting metadata  
Status: **implemented where technically determinable; retention and hosting decisions pending**

The test is whether each field is suitable and necessary for the stated educational card-game purpose, not merely whether it is public or convenient to retain.

| Data or processing | Decision | Reason / safeguard |
|---|---|---|
| Name, portrait, party, canton, chamber | Retain in public profile | Core card identity and parliamentary context; source and portrait attribution remain visible. |
| First and last name separately | Retain | Required by the existing card layout and name fitting. |
| Age and tenure | Retain provisionally | Displayed and used in capped, low-weight components. Controller must reconsider whether exact age is necessary; birth date is not published. |
| Current committees and roles | Retain | Displayed and used by the scoring method. Only current standing assignments needed by the app are published. |
| Detailed per-vote outcome ledger | Exclude from distributable member record | The game uses a participation signal; detailed raw rows are unnecessary in the browser. |
| Intermediate scoring ledger and raw counts | Exclude from distributable member record | Methodology and component strengths provide transparency without publishing unused intermediate personal metrics. Reproducibility remains in the build process. |
| Gender, raw party label, parliamentary-group label and free-text mandates | Exclude from distributable member record | Not displayed or required by gameplay. |
| Declared interests and campaign-finance details | Retain provisionally for the contextual disclosure feature | Public-source context, explicitly excluded from ATK/DEF/OVR. Sector classifications must be labelled as project-created and remain challengeable. |
| Named large donors | Retain provisionally | Already publicly disclosed and shown in the financing feature; controller must assess whether public names are necessary for the educational purpose. |
| Raw source snapshots | Keep outside the runtime bundle | Needed for reproducibility, correction and audit. Access and deletion periods require the controller’s approved retention policy. |
| Player collection, packs, language, preferences and battle record | Browser-only | No project account or server transfer. Data remains until the visitor clears site storage. |
| Analytics and advertising profiles | Do not collect | No analytics or ad network is intentionally integrated. |
| Web-font requests | Self-host fonts | Removes an avoidable third-party request and related IP/browser disclosure. |
| Hosting access/security logs | Minimise after provider selection | Configure the shortest period consistent with security; disable unnecessary analytics and document locations/subprocessors. |

## Open decisions before launch

1. Decide whether exact age should remain visible or be replaced with a band / omitted from cards.
2. Decide whether named donor details are necessary or whether aggregates are sufficient.
3. Set deletion periods for published profiles after a person leaves office, raw snapshots, correction correspondence and hosting logs.
4. Determine whether the repository and raw build caches are public. If public, include that disclosure and retention reality in the DPIA.
5. Repeat this review when adding a source, score component, analytics tool, account system or commercial purpose.

