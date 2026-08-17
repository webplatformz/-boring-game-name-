# Data Protection Impact Assessment (DPIA / DSFA) — draft

Project: **Bundeshaus Pack**  
Assessment date: **2026-08-17**  
Status: **draft — controller decision and review required before public launch**  
Joint controllers: **Lucas Schnüriger and Timo Spring**  
Privacy reviewer: **not appointed**

This assessment follows the risk-based approach in Articles 22–23 of the Swiss Federal Act on Data Protection (FADP/DSG). Official guidance: [FDPIC DPIA overview](https://www.edoeb.admin.ch/de/datenschutz-folgenabschaetzung).

## 1. Threshold screening

The processing has several high-risk indicators:

- it concerns identifiable natural persons;
- party affiliation and parliamentary activity can constitute specially protected data concerning political views or activities;
- multiple public records are linked to one person;
- a deterministic algorithm evaluates work-related behaviour and creates comparative scores and rankings;
- profiles and inferences are made available to an unrestricted public audience;
- errors or misleading presentation can cause reputational and democratic-participation harms.

Risk-reducing factors include the public and official nature of the inputs, the limited cohort of public office-holders, the non-commercial educational purpose, exclusion of ideological vote direction from scoring, transparent formulas, separation of official and derived data, and the absence of consequential automated decisions.

**Preliminary result:** treat the project as processing with a potentially high risk and complete this DPIA. Whether Article 22 legally compels a DPIA depends on the controller’s final assessment of scale, linkage and severity, including whether this is high-risk profiling or extensive processing of specially protected data. Given the uncertainty and low cost of documenting the assessment, proceeding without a completed DPIA is not recommended.

## 2. Processing description

The build pipeline retrieves dated public records about current parliamentarians and Federal Councillors. It matches membership, tenure, committees, authored affairs, eligible-vote participation, declared interests, campaign-finance disclosures and portraits. It then calculates chamber-relative component strengths, ATK, DEF, OVR, rarity and card order. The static app publishes selected profile facts, contextual disclosures and the separate game outputs. Visitor game state is kept in browser local storage. The host may process ordinary HTTP access and security logs. A Cloudflare Web Analytics beacon measures aggregate, cookie-free page views, approximate unique visits and page performance; it is not used for advertising or a persistent behavioural profile.

No score is used to decide employment, credit, eligibility, access to a service, voting advice or another matter with legal or similarly significant effects.

## 3. People, data and recipients

Affected people include current/former public office-holders in source history, people named in interest or campaign-finance disclosures, and site visitors whose technical requests reach the host.

Data categories and sources are documented on the public Data Methodology and provenance pages. Recipients are the unrestricted public, GitHub Pages for static hosting, Cloudflare for aggregate web analytics and Google for correspondence sent to the published Gmail privacy address. GitHub and Cloudflare may process data through infrastructure in multiple countries. The controllers must keep the applicable provider terms, retention and transfer safeguards under review.

## 4. Necessity and proportionality

The stated purpose is a transparent educational and entertainment card game. Identity and current parliamentary-role information are necessary to identify each card. Selected activity signals are necessary only to the extent used by the published formula. Intermediate ledgers and unused source fields are excluded from the browser bundle. Lobbying and financing data are contextual rather than scoring inputs and require a separate necessity decision from the controller.

Less intrusive alternatives considered:

- random/arbitrary scores: less privacy intrusive but defeats the public-data methodology;
- party-level rather than person-level cards: materially changes the game;
- publish only final values: less transparent and makes correction harder;
- publish aggregates rather than named donor details: viable and still under review;
- omit age or use an age band: viable and still under review.

## 5. Proposed legal position

For a private Swiss controller, the current proposed justification is an overriding private and public interest in editorial, educational and transparent discussion of public official activity, subject to proportionality and personality rights. This is not a claim that public data falls outside the FADP, and it is not consent.

The controller must confirm the justification after considering Article 30–31 FADP, the severity of the inferences and any additional law applicable because of targeting, establishment, commercialisation or cross-border processing. If EU/EEA targeting or establishment brings the GDPR into scope, a separate Articles 6 and 9 analysis is required.

## 6. Risk assessment

| Risk | Inherent risk | Existing / required controls | Expected residual risk |
|---|---|---|---|
| Incorrect source match or stale fact | High | Dated provenance, authoritative-source verification, reproducible build, correction workflow | Medium |
| Game value mistaken for an official or objective assessment | High | Repeated unofficial/game labels, derivation separation, public formula, no endorsement language | Medium |
| Reputational harm from score/ranking | High | Narrow purpose, no competence/integrity claim, no consequential-use instruction, dispute review | Medium |
| Sensitive political inference beyond stated purpose | High | Do not score ideology or vote direction; limit fields; no voter targeting; review new sources | Medium |
| Bias from chamber comparison, age or tenure proxies | High | Chamber-relative calculation, capped low-weight age, separate executive formula, limitations disclosure | Medium; age decision open |
| Incorrect sector or committee-overlap classification | Medium | Label as project-created, publish rules, correction workflow, human review | Low–medium |
| Excessive retention or public repository history | High | Retention criteria, raw/runtime separation and minimisation review | **High until repository status and operational deletion schedule are resolved** |
| Rights requests cannot be exercised | High | Named controllers, published privacy email, permanent notice and documented workflow | Medium; mailbox monitoring must be assigned |
| Hosting or analytics recipient and foreign transfer are misunderstood | High | GitHub Pages and Cloudflare Web Analytics disclosed; cookie-free aggregate analytics; self-hosted fonts; no advertising | Medium; provider terms, retention and safeguards require periodic review |
| Unauthorised change to formula/source data | Medium | Versioned provenance, deterministic build and build-time validation | Low–medium |
| Consequential downstream misuse | Medium | Explicit prohibition and game framing; no API designed for eligibility decisions | Medium |

## 7. Measures implemented

- official-source provenance, retrieval date, endpoints and version;
- official fields separated from project-created ratings;
- multilingual Methodology, Data Methodology, Privacy and Project Notice pages;
- explicit profiling and sensitive-political-data disclosure;
- public correction/removal steps and internal operational workflow;
- field-level data-minimisation review and removal of unused runtime fields;
- browser-only player state; no account, advertising or persistent analytics profile; Cloudflare analytics limited to aggregate, cookie-free audience and performance measurement;
- self-hosted fonts to eliminate an avoidable third-party request;
- build validation for source provenance and derived-field boundaries.

## 8. Required actions before approval

1. Assign responsibility for monitoring `bundeshauspack@gmail.com` and a substitute during absences.
2. Confirm that GitHub Pages remains the production host and record the applicable GitHub and Cloudflare provider terms, retention, transfer safeguards and available log or analytics information.
3. Convert the public retention criteria into an operational deletion schedule for profiles, raw snapshots, rights records and repository history.
4. Decide the open age and named-donor minimisation questions.
5. Confirm the Swiss-law justification and whether any foreign law applies.
6. Reassess the risk matrix after these measures. If high residual risk remains, consult the FDPIC before processing unless the statutory alternative involving an independent data-protection adviser is validly used.

## 9. Approval record

| Role | Name | Decision | Date / reference |
|---|---|---|---|
| Joint controllers | Lucas Schnüriger; Timo Spring | Approve / reject / require measures | Pending |
| Privacy counsel or independent adviser | Pending | Advice; not a substitute for controller decision | Pending |
| Technical owner | Pending | Confirm controls and hosting facts | Pending |

The DPIA must be reviewed whenever the purpose, sources, formula, population, recipients, hosting, tracking or commercial model changes materially.
