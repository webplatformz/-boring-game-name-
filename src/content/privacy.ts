import type { Language } from '../i18n'

export interface ContentSection {
  title: string
  body: string
}

export interface PrivacyPageCopy {
  eyebrow: string
  title: string
  intro: string
  draftWarning: string
  controllerTitle: string
  controllerContactBody: string
  pending: string
  categoriesTitle: string
  categories: ContentSection[]
  purposesTitle: string
  purposes: string[]
  profilingTitle: string
  profilingBody: string
  recipientsTitle: string
  recipients: string[]
  retentionTitle: string
  retentionBody: string
  rightsTitle: string
  rightsBody: string
  correctionTitle: string
  correctionIntro: string
  correctionSteps: string[]
  correctionUnavailable: string
  securityTitle: string
  securityBody: string
  updatedLabel: string
}

export interface DataMethodologyCopy {
  eyebrow: string
  title: string
  intro: string
  purposeTitle: string
  purposeBody: string
  categoriesTitle: string
  categories: ContentSection[]
  flowTitle: string
  flow: string[]
  scoreTitle: string
  scoreBody: string
  scoreDetails: ContentSection[]
  derivedTitle: string
  derivedBody: string
  exclusionsTitle: string
  exclusionsBody: string
  minimisationTitle: string
  minimisationBody: string
  limitationsTitle: string
  limitations: string[]
  challengeTitle: string
  challengeBody: string
  privacyLink: string
  scoreLink: string
}

interface PrivacyContent {
  privacy: PrivacyPageCopy
  methodology: DataMethodologyCopy
}

const en: PrivacyContent = {
  privacy: {
    eyebrow: 'PRIVACY NOTICE',
    title: 'Privacy',
    intro: 'This notice covers the public profiles and project-created scores for identifiable office-holders, as well as the limited data used when someone visits and plays the game.',
    draftWarning: 'Configuration incomplete: controller, hosting and retention details must be completed before public launch. Until then, this notice is a transparent draft, not a complete production privacy notice.',
    controllerTitle: 'Controller and contact',
    controllerContactBody: 'The following individuals jointly operate the project and determine the purposes and means of its data processing. Privacy and correction requests can be submitted electronically:',
    pending: 'To be supplied before public launch',
    categoriesTitle: 'Whose data and which categories',
    categories: [
      { title: 'Public office-holder identity', body: 'Name, portrait, age, party, canton, council, tenure, committees and public roles.' },
      { title: 'Political activity — specially protected', body: 'Party and parliamentary activity, authored affairs, voting participation, committee work, declared interests and published campaign-finance disclosures. These records can reveal political activity or views.' },
      { title: 'Project-created inferences', body: 'Sector classifications, component strengths, ATK, DEF, OVR, rarity, card order and rankings. These are calculated editorial game outputs, not official assessments.' },
      { title: 'Visitor game state', body: 'Packs, collection, preferences, battle record, language and disclaimer acknowledgement are stored in the visitor’s browser. The app does not transmit this game state to the project.' },
      { title: 'Technical access and analytics data', body: 'GitHub Pages may receive IP address, request time, requested URL, browser information and security logs when serving the site. Cloudflare Web Analytics receives cookie-free page-view and performance metrics such as host and path, referrer, browser or device information and approximate country.' },
    ],
    purposesTitle: 'Purposes',
    purposes: [
      'Operate an independent, non-commercial educational card game.',
      'Explain selected public parliamentary activity and the project’s scoring method.',
      'Generate fictional comparative game values and card rarity.',
      'Maintain accuracy, handle rights requests and protect the service.',
      'Measure aggregate visits and page performance without advertising cookies or a persistent visitor profile.',
      'Never target political advertising, infer voting intentions, determine eligibility or make decisions with legal or similarly significant effects.',
    ],
    profilingTitle: 'Profiling and automated decisions',
    profilingBody: 'The score calculation is an automated evaluation of identifiable people and is treated conservatively as profiling. It may involve specially protected political-activity data. It does not make an automated decision about anyone and must not be used for employment, credit, voting advice, eligibility or another consequential purpose.',
    recipientsTitle: 'Recipients and disclosures',
    recipients: [
      'The general public receives the published profile facts and project-created game outputs.',
      'GitHub Pages hosts the static site and processes technical request and security data. GitHub may process data in the United States and other countries where it or its subprocessors operate, using the transfer safeguards described in its privacy documentation.',
      'Google processes correspondence sent to the published Gmail privacy address.',
      'Cloudflare Web Analytics is integrated for aggregate, cookie-free audience and performance measurement. Cloudflare states that this service does not collect or use visitors’ personal data. No advertising network is integrated, and personal data is not sold.',
      'External source links send data to their operators only when a visitor follows the link.',
    ],
    retentionTitle: 'Retention',
    retentionBody: 'Browser game state remains on the visitor’s device until it is cleared. Published profiles are kept only while the person remains within the current card-game scope and the profile is needed for the stated purpose. Source snapshots and rights correspondence are kept only while needed for accuracy, reproducibility, corrections or disputes. Hosting, analytics and email providers apply their own security and operational retention rules. Data is deleted or anonymised when it is no longer necessary.',
    rightsTitle: 'Your rights',
    rightsBody: 'Depending on the circumstances, a person may request access, correction, deletion, restriction or an end to processing, and may object to a project-created inference. Requests are assessed under Swiss law; an overriding interest or legal preservation duty may limit deletion.',
    correctionTitle: 'Correction or removal workflow',
    correctionIntro: 'Send the request to the privacy email and include only what is needed to locate and assess the record:',
    correctionSteps: [
      'Identify the person and link to the affected card or profile.',
      'State which source fact, classification or score is disputed and why.',
      'Provide a reliable correction source or explain the requested removal.',
      'The controller acknowledges the request, verifies identity only where proportionate, preserves the request securely and normally responds within 30 days.',
      'A confirmed source error is corrected and scores are recalculated. A contested project inference is reviewed, clearly marked, corrected or removed as appropriate, with reasons communicated to the requester.',
    ],
    correctionUnavailable: 'The privacy email has not yet been supplied, so the correction channel is not operational. This is a launch blocker.',
    securityTitle: 'Security and changes',
    securityBody: 'The public app is designed as a static site, keeps player state locally and separates official inputs from project-created outputs. Access to source files and rights correspondence must be limited to authorised maintainers. This notice must be updated when the host, recipients, purposes, scoring method or retention schedule changes.',
    updatedLabel: 'Notice last updated',
  },
  methodology: {
    eyebrow: 'DATA METHODOLOGY',
    title: 'How personal data becomes game data',
    intro: 'This page describes the complete processing path, including sensitive political-activity inputs, project classifications and the comparative score outputs.',
    purposeTitle: 'Defined purpose',
    purposeBody: 'The project uses selected public records to operate an educational and entertainment card game. It does not attempt to determine political ideology, predict votes, recommend candidates or measure a person’s worth, integrity, competence or fitness for office.',
    categoriesTitle: 'Input categories',
    categories: [
      { title: 'Membership and identity', body: 'Name, portrait, age, party, canton, chamber, dates of service and current parliamentary roles.' },
      { title: 'Parliamentary work', body: 'Personally authored affairs and their official status, committee assignments and leadership roles, and eligible-vote participation.' },
      { title: 'Public disclosures', body: 'Declared external interests and published campaign-finance records. These are displayed for context and are deliberately excluded from ATK, DEF and OVR.' },
      { title: 'Project classifications', body: 'Organisation and donor sectors, committee overlaps, score components, percentile ranks, final game values and rarity. These are not official Parliament fields.' },
    ],
    flowTitle: 'Processing flow',
    flow: [
      'Retrieve a dated snapshot from the documented official endpoints and disclosure sources.',
      'Normalise identifiers, council and party labels; match committee, affair, voting, interest and financing records to the office-holder.',
      'Calculate source signals, rank comparable members within the same chamber and map the results to the game scale.',
      'Publish only the card/profile fields and clearly separated project-created outputs needed by the game.',
      'Keep visitor packs, collection and settings in local browser storage rather than a project account.',
    ],
    scoreTitle: 'Score logic',
    scoreBody: 'ATK and DEF are deterministic game calculations. Chamber-relative percentile ranking reduces structural differences between the National Council and Council of States; Federal Councillors use a separate executive-tenure formula.',
    scoreDetails: [
      { title: 'ATK', body: '45% authored-affair activity, 30% advancement of mature authored affairs and 25% current leadership roles.' },
      { title: 'DEF', body: '20% eligible-vote participation, 45% current committee workload, 30% capped parliamentary experience and 5% capped age-experience proxy.' },
      { title: 'OVR and rarity', body: 'OVR combines 45% ATK, 45% DEF and 10% of the lower value. Rarity reflects the resulting OVR distribution and never increases a score.' },
    ],
    derivedTitle: 'Derivations and rankings',
    derivedBody: 'The official source values remain unchanged. Scores, sector labels, rarity and card order are separate editorial outputs. A ranking is only an ordering of those fictional game values; it is not an official or objective political-performance ranking.',
    exclusionsTitle: 'Deliberate exclusions',
    exclusionsBody: 'Party size and prestige, political position, voting direction, lobbying ties and campaign financing do not increase or decrease ATK, DEF or OVR. The project does not use private communications, tracking profiles, inferred voter preferences, ethnicity, health, religion or criminal records.',
    minimisationTitle: 'Data minimisation',
    minimisationBody: 'The distributable app excludes unused source-only fields and does not publish detailed raw voting rows or the intermediate scoring ledger. Raw build snapshots are retained separately and require an approved retention schedule. No visitor account or behavioural advertising profile is created; analytics are limited to aggregate, cookie-free audience and performance statistics.',
    limitationsTitle: 'Known limitations and risks',
    limitations: [
      'Public records can be incomplete, delayed, mistranslated or matched incorrectly.',
      'Percentile methods are comparative and can amplify small differences.',
      'Council roles differ structurally, so scores cannot represent complete political performance.',
      'Age and tenure are imperfect proxies and are deliberately capped.',
      'Sector classification involves project judgement and may be disputed.',
      'Game presentation can be misunderstood despite labels; consequential use is prohibited.',
    ],
    challengeTitle: 'Challenge a source fact or inference',
    challengeBody: 'Use the correction/removal workflow in the Privacy page. Source errors are checked against authoritative records; project classifications and calculations are reviewed against the published rules and recalculated where necessary.',
    privacyLink: 'PRIVACY AND RIGHTS →',
    scoreLink: 'FULL SCORE FORMULA →',
  },
}

const de: PrivacyContent = {
  privacy: {
    eyebrow: 'DATENSCHUTZHINWEIS', title: 'Datenschutz', intro: 'Dieser Hinweis betrifft die veröffentlichten Profile und projektseitig berechneten Werte identifizierbarer Amtsträger sowie die begrenzten Daten, die beim Besuch und Spielen verwendet werden.',
    draftWarning: 'Konfiguration unvollständig: Angaben zu Verantwortlichem, Hosting und Aufbewahrung müssen vor der öffentlichen Lancierung ergänzt werden. Bis dahin ist dieser Hinweis ein transparenter Entwurf und keine vollständige produktive Datenschutzerklärung.',
    controllerTitle: 'Verantwortliche und Kontakt', controllerContactBody: 'Die folgenden Personen betreiben das Projekt gemeinsam und bestimmen Zweck und Mittel der Datenbearbeitung. Datenschutz- und Korrekturanfragen können elektronisch eingereicht werden:', pending: 'Vor der öffentlichen Lancierung anzugeben',
    categoriesTitle: 'Betroffene Personen und Datenkategorien', categories: [
      { title: 'Öffentliche Identität und Amt', body: 'Name, Porträt, Alter, Partei, Kanton, Rat, Amtsdauer, Kommissionen und öffentliche Funktionen.' },
      { title: 'Politische Tätigkeit — besonders schützenswert', body: 'Partei und parlamentarische Tätigkeit, eigene Geschäfte, Abstimmungsteilnahme, Kommissionsarbeit, deklarierte Interessen und veröffentlichte Angaben zur Kampagnenfinanzierung. Daraus können politische Tätigkeiten oder Ansichten hervorgehen.' },
      { title: 'Projektseitige Ableitungen', body: 'Sektorklassifikationen, Teilwerte, ATK, DEF, OVR, Seltenheit, Kartenreihenfolge und Rangfolgen. Dies sind redaktionelle Spielinhalte und keine amtlichen Beurteilungen.' },
      { title: 'Lokaler Spielstand', body: 'Packs, Sammlung, Einstellungen, Duellbilanz, Sprache und bestätigter Projekthinweis werden im Browser gespeichert. Die App übermittelt diesen Spielstand nicht an das Projekt.' },
      { title: 'Technische Zugriffs- und Analysedaten', body: 'GitHub Pages kann beim Ausliefern der Seite IP-Adresse, Zeitpunkt, URL, Browserangaben und Sicherheitsprotokolle verarbeiten. Cloudflare Web Analytics erhält cookiefreie Seitenaufruf- und Leistungsdaten wie Host und Pfad, Referrer, Browser- oder Geräteangaben und ungefähres Land.' },
    ],
    purposesTitle: 'Zwecke', purposes: ['Betrieb eines unabhängigen, nicht kommerziellen Lern- und Kartenspiels.', 'Erklärung ausgewählter öffentlicher Parlamentsaktivitäten und der projektseitigen Wertungsmethode.', 'Berechnung fiktiver vergleichender Spielwerte und Seltenheiten.', 'Sicherstellung der Richtigkeit, Bearbeitung von Betroffenenrechten und Schutz des Dienstes.', 'Messung aggregierter Besuche und Seitenleistung ohne Werbecookies oder dauerhaftes Besucherprofil.', 'Keine politische Zielwerbung, Prognose der Wahlabsicht, Eignungsentscheidung oder Entscheidung mit rechtlicher oder ähnlich erheblicher Wirkung.'],
    profilingTitle: 'Profiling und automatisierte Entscheidungen', profilingBody: 'Die Wertung ist eine automatisierte Beurteilung identifizierbarer Personen und wird vorsorglich als Profiling behandelt. Sie kann besonders schützenswerte Daten über politische Tätigkeiten betreffen. Sie trifft keine automatisierte Entscheidung und darf nicht für Arbeit, Kredit, Wahlberatung, Eignung oder andere folgenreiche Zwecke verwendet werden.',
    recipientsTitle: 'Empfänger und Bekanntgaben', recipients: ['Die Öffentlichkeit erhält die veröffentlichten Profilfakten und projektseitigen Spielinhalte.', 'GitHub Pages hostet die statische Website und verarbeitet technische Anfrage- und Sicherheitsdaten. GitHub kann Daten in den USA und weiteren Ländern bearbeiten, in denen GitHub oder seine Unterauftragsbearbeiter tätig sind, unter den in der Datenschutzdokumentation beschriebenen Garantien.', 'Google verarbeitet Korrespondenz, die an die veröffentlichte Gmail-Datenschutzadresse gesendet wird.', 'Cloudflare Web Analytics ist für aggregierte, cookiefreie Besuchs- und Leistungsmessung eingebunden. Cloudflare erklärt, dass dieser Dienst keine Personendaten der Besucher erhebt oder nutzt. Es ist kein Werbenetzwerk eingebunden; Personendaten werden nicht verkauft.', 'Externe Quellen erhalten erst Daten, wenn ein Link aufgerufen wird.'],
    retentionTitle: 'Aufbewahrung', retentionBody: 'Der lokale Spielstand bleibt auf dem Gerät, bis er gelöscht wird. Veröffentlichte Profile werden nur aufbewahrt, solange die Person zum aktuellen Kartenspiel gehört und das Profil für den angegebenen Zweck erforderlich ist. Quellen-Schnappschüsse und Betroffenenkorrespondenz bleiben nur so lange erhalten, wie sie für Richtigkeit, Reproduzierbarkeit, Korrekturen oder Streitfälle nötig sind. Hosting-, Analyse- und E-Mail-Anbieter wenden ihre eigenen Sicherheits- und Betriebsfristen an. Nicht mehr erforderliche Daten werden gelöscht oder anonymisiert.',
    rightsTitle: 'Ihre Rechte', rightsBody: 'Je nach Umständen können Betroffene Auskunft, Berichtigung, Löschung, Einschränkung oder Beendigung der Bearbeitung verlangen und einer projektseitigen Ableitung widersprechen. Anträge werden nach Schweizer Recht geprüft; überwiegende Interessen oder Aufbewahrungspflichten können eine Löschung begrenzen.',
    correctionTitle: 'Korrektur- oder Entfernungsverfahren', correctionIntro: 'Senden Sie an die Datenschutz-E-Mail nur die zur Prüfung erforderlichen Angaben:', correctionSteps: ['Person identifizieren und betroffene Karte oder Profil verlinken.', 'Angeben, welche Quellenangabe, Klassifikation oder Wertung bestritten wird und weshalb.', 'Verlässliche Korrekturquelle beilegen oder die gewünschte Entfernung begründen.', 'Der Verantwortliche bestätigt den Eingang, prüft die Identität nur verhältnismässig, schützt die Anfrage und antwortet normalerweise innert 30 Tagen.', 'Bestätigte Quellenfehler werden berichtigt und Werte neu berechnet. Bestrittene Ableitungen werden geprüft, gegebenenfalls gekennzeichnet, korrigiert oder entfernt; die Gründe werden mitgeteilt.'],
    correctionUnavailable: 'Die Datenschutz-E-Mail fehlt noch; der Korrekturkanal ist nicht betriebsbereit. Dies verhindert die öffentliche Lancierung.',
    securityTitle: 'Sicherheit und Änderungen', securityBody: 'Die öffentliche App ist als statische Seite konzipiert, speichert den Spielstand lokal und trennt offizielle Eingaben von Projektwerten. Der Zugriff auf Quelldateien und Betroffenenkorrespondenz ist auf berechtigte Personen zu beschränken. Änderungen bei Hosting, Empfängern, Zwecken, Wertungsmethode oder Aufbewahrung müssen in diesem Hinweis nachgeführt werden.', updatedLabel: 'Hinweis zuletzt aktualisiert',
  },
  methodology: {
    eyebrow: 'DATENMETHODIK', title: 'Wie Personendaten zu Spielwerten werden', intro: 'Diese Seite beschreibt den gesamten Bearbeitungsweg einschliesslich sensibler politischer Tätigkeitsdaten, Projektklassifikationen und vergleichender Wertungen.',
    purposeTitle: 'Festgelegter Zweck', purposeBody: 'Das Projekt nutzt ausgewählte öffentliche Aufzeichnungen für ein Lern- und Unterhaltungskartenspiel. Es bestimmt keine politische Ideologie, prognostiziert keine Abstimmungen, empfiehlt keine Kandidierenden und misst weder Wert, Integrität, Kompetenz noch Amtseignung einer Person.',
    categoriesTitle: 'Eingabekategorien', categories: [{ title: 'Mitgliedschaft und Identität', body: 'Name, Porträt, Alter, Partei, Kanton, Rat, Amtsdauer und aktuelle parlamentarische Funktionen.' }, { title: 'Parlamentarische Arbeit', body: 'Eigene Geschäfte und deren amtlicher Stand, Kommissions- und Führungsfunktionen sowie Teilnahme an berechtigten Abstimmungen.' }, { title: 'Öffentliche Offenlegungen', body: 'Deklarierte externe Interessen und veröffentlichte Kampagnenfinanzierung. Sie dienen dem Kontext und sind bewusst von ATK, DEF und OVR ausgeschlossen.' }, { title: 'Projektklassifikationen', body: 'Organisations- und Spendersektoren, Kommissionsüberschneidungen, Teilwerte, Perzentile, Spielwerte und Seltenheit. Dies sind keine amtlichen Parlamentsfelder.' }],
    flowTitle: 'Bearbeitungsablauf', flow: ['Datierter Schnappschuss aus dokumentierten amtlichen Endpunkten und Offenlegungsquellen.', 'Normalisierung von Identifikatoren, Rats- und Parteibezeichnungen; Zuordnung von Kommissionen, Geschäften, Abstimmungen, Interessen und Finanzierung.', 'Berechnung der Eingangssignale, Vergleich innerhalb desselben Rates und Abbildung auf die Spielskala.', 'Veröffentlichung nur der für Karte und Profil benötigten Felder und klar getrennten Projektwerte.', 'Lokale Speicherung von Packs, Sammlung und Einstellungen ohne Projektkonto.'],
    scoreTitle: 'Wertungslogik', scoreBody: 'ATK und DEF sind deterministische Spielberechnungen. Ratsinterne Perzentile verringern strukturelle Unterschiede zwischen National- und Ständerat; für Bundesratsmitglieder gilt eine separate Amtsdauerformel.', scoreDetails: [{ title: 'ATK', body: '45 % Aktivität bei eigenen Geschäften, 30 % Fortschritt reifer eigener Geschäfte und 25 % aktuelle Führungsrollen.' }, { title: 'DEF', body: '20 % Abstimmungsteilnahme, 45 % aktuelle Kommissionslast, 30 % gedeckelte Parlamentserfahrung und 5 % gedeckelter Alters-/Erfahrungswert.' }, { title: 'OVR und Seltenheit', body: 'OVR kombiniert 45 % ATK, 45 % DEF und 10 % des tieferen Werts. Die Seltenheit folgt der OVR-Verteilung und erhöht nie einen Wert.' }],
    derivedTitle: 'Ableitungen und Rangfolgen', derivedBody: 'Die amtlichen Quellwerte bleiben unverändert. Werte, Sektorlabels, Seltenheit und Kartenfolge sind getrennte redaktionelle Inhalte. Eine Rangfolge ordnet nur fiktive Spielwerte und ist keine amtliche oder objektive politische Leistungsbewertung.',
    exclusionsTitle: 'Bewusste Ausschlüsse', exclusionsBody: 'Parteigrösse und -prestige, politische Position, Abstimmungsrichtung, Lobbyverbindungen und Kampagnenfinanzierung verändern ATK, DEF und OVR nicht. Private Kommunikation, Trackingprofile, vermutete Wählerpräferenzen, Ethnie, Gesundheit, Religion und Strafdaten werden nicht genutzt.',
    minimisationTitle: 'Datenminimierung', minimisationBody: 'Die ausgelieferte App schliesst ungenutzte reine Quellenfelder aus und veröffentlicht weder einzelne Abstimmungszeilen noch das Zwischenrechenbuch. Rohdaten-Schnappschüsse bleiben getrennt und benötigen genehmigte Fristen. Es entstehen weder Besucherkonto noch Werbe- oder Verhaltensprofil; die Analyse ist auf aggregierte, cookiefreie Besuchs- und Leistungsstatistiken begrenzt.',
    limitationsTitle: 'Bekannte Grenzen und Risiken', limitations: ['Öffentliche Daten können unvollständig, verzögert, falsch übersetzt oder falsch zugeordnet sein.', 'Perzentile sind vergleichend und können kleine Unterschiede verstärken.', 'Die Räte unterscheiden sich strukturell; die Werte bilden politische Leistung nicht vollständig ab.', 'Alter und Amtsdauer sind unvollkommene, bewusst gedeckelte Näherungswerte.', 'Sektorklassifikationen beruhen auf Projekturteilen und können bestritten werden.', 'Spielgestaltung kann trotz Kennzeichnung missverstanden werden; folgenreiche Nutzung ist untersagt.'],
    challengeTitle: 'Quellenangabe oder Ableitung anfechten', challengeBody: 'Nutzen Sie das Korrektur-/Entfernungsverfahren auf der Datenschutzseite. Quellenfehler werden anhand verlässlicher Unterlagen geprüft; Projektklassifikationen und Berechnungen nach den veröffentlichten Regeln kontrolliert und nötigenfalls neu berechnet.', privacyLink: 'DATENSCHUTZ UND RECHTE →', scoreLink: 'VOLLSTÄNDIGE WERTUNGSFORMEL →',
  },
}

const fr: PrivacyContent = {
  privacy: {
    eyebrow: 'AVIS DE CONFIDENTIALITÉ', title: 'Confidentialité', intro: 'Cet avis couvre les profils publiés et les notes calculées par le projet pour des titulaires de fonctions identifiables, ainsi que les données limitées utilisées lors de la visite et du jeu.',
    draftWarning: 'Configuration incomplète : l’identité du responsable, l’hébergement et les durées de conservation doivent être renseignés avant la mise en ligne publique. D’ici là, cet avis est un projet transparent et non une déclaration de confidentialité de production complète.',
    controllerTitle: 'Responsables et contact', controllerContactBody: 'Les personnes suivantes exploitent conjointement le projet et déterminent les finalités et moyens du traitement. Les demandes de confidentialité et de rectification peuvent être envoyées par voie électronique :', pending: 'À fournir avant la mise en ligne publique',
    categoriesTitle: 'Personnes et catégories de données', categories: [{ title: 'Identité et fonction publiques', body: 'Nom, portrait, âge, parti, canton, conseil, ancienneté, commissions et fonctions publiques.' }, { title: 'Activité politique — spécialement protégée', body: 'Parti et activité parlementaire, objets personnels, participation aux votes, travail en commission, intérêts déclarés et financement de campagne publié. Ces données peuvent révéler des activités ou opinions politiques.' }, { title: 'Déductions du projet', body: 'Classements sectoriels, composantes, ATK, DEF, OVR, rareté, ordre des cartes et classements. Ce sont des contenus éditoriaux de jeu, non des évaluations officielles.' }, { title: 'État local du jeu', body: 'Packs, collection, préférences, résultats de duel, langue et acceptation de l’avertissement sont stockés dans le navigateur. L’application ne transmet pas cet état au projet.' }, { title: 'Données techniques d’accès et d’analyse', body: 'GitHub Pages peut traiter l’adresse IP, l’heure, l’URL, les informations du navigateur et les journaux de sécurité lors de la fourniture du site. Cloudflare Web Analytics reçoit des mesures sans cookies sur les pages vues et les performances, telles que l’hôte et le chemin, le référent, le navigateur ou l’appareil et le pays approximatif.' }],
    purposesTitle: 'Finalités', purposes: ['Exploiter un jeu de cartes éducatif indépendant et non commercial.', 'Expliquer certaines activités parlementaires publiques et la méthode de notation.', 'Créer des valeurs de jeu comparatives fictives et une rareté.', 'Maintenir l’exactitude, traiter les droits et protéger le service.', 'Mesurer les visites agrégées et les performances des pages sans cookies publicitaires ni profil visiteur persistant.', 'Ne jamais cibler de publicité politique, prédire une intention de vote, décider d’une éligibilité ou produire une décision à effet juridique ou comparable.'],
    profilingTitle: 'Profilage et décisions automatisées', profilingBody: 'Le calcul constitue une évaluation automatisée de personnes identifiables et est traité prudemment comme du profilage. Il peut concerner des activités politiques spécialement protégées. Il ne prend aucune décision automatisée et ne doit servir ni à l’emploi, au crédit, au conseil électoral, à l’éligibilité ou à une autre finalité conséquente.',
    recipientsTitle: 'Destinataires et communications', recipients: ['Le public reçoit les faits de profil publiés et les contenus de jeu créés par le projet.', 'GitHub Pages héberge le site statique et traite les requêtes techniques et les données de sécurité. GitHub peut traiter des données aux États-Unis et dans d’autres pays où GitHub ou ses sous-traitants opèrent, avec les garanties décrites dans sa documentation de confidentialité.', 'Google traite la correspondance envoyée à l’adresse Gmail de confidentialité publiée.', 'Cloudflare Web Analytics est intégré pour mesurer l’audience et les performances de façon agrégée et sans cookies. Cloudflare indique que ce service ne collecte ni n’utilise les données personnelles des visiteurs. Aucun réseau publicitaire n’est intégré et les données personnelles ne sont pas vendues.', 'Les opérateurs de liens externes ne reçoivent des données que si le visiteur ouvre le lien.'],
    retentionTitle: 'Conservation', retentionBody: 'L’état du jeu reste sur l’appareil jusqu’à son effacement. Les profils sont conservés uniquement tant que la personne relève du jeu actuel et que le profil reste nécessaire à la finalité déclarée. Les instantanés sources et la correspondance sont conservés seulement pour l’exactitude, la reproductibilité, les rectifications ou les litiges. Les fournisseurs d’hébergement, d’analyse et d’e-mail appliquent leurs propres durées de sécurité et d’exploitation. Les données devenues inutiles sont supprimées ou anonymisées.',
    rightsTitle: 'Vos droits', rightsBody: 'Selon les circonstances, une personne peut demander accès, rectification, suppression, limitation ou cessation du traitement et contester une déduction du projet. Les demandes sont examinées selon le droit suisse ; un intérêt prépondérant ou une obligation de conservation peut limiter la suppression.',
    correctionTitle: 'Procédure de rectification ou suppression', correctionIntro: 'Envoyez à l’e-mail confidentialité uniquement les informations nécessaires :', correctionSteps: ['Identifier la personne et fournir le lien de la carte ou du profil.', 'Indiquer le fait source, la classification ou la note contestée et pourquoi.', 'Fournir une source fiable ou expliquer la suppression demandée.', 'Le responsable accuse réception, vérifie l’identité seulement si proportionné, protège la demande et répond normalement sous 30 jours.', 'Une erreur source confirmée est corrigée et les notes recalculées. Une déduction contestée est examinée, signalée, corrigée ou supprimée selon le cas, avec communication des motifs.'],
    correctionUnavailable: 'L’e-mail confidentialité n’a pas encore été fourni ; le canal de correction n’est pas opérationnel. Cela bloque la mise en ligne publique.',
    securityTitle: 'Sécurité et modifications', securityBody: 'L’application publique est conçue comme site statique, conserve le jeu localement et sépare les entrées officielles des sorties du projet. L’accès aux fichiers sources et à la correspondance doit être limité aux personnes autorisées. Cet avis doit être actualisé si l’hébergeur, les destinataires, les finalités, la méthode ou la conservation changent.', updatedLabel: 'Avis mis à jour le',
  },
  methodology: {
    eyebrow: 'MÉTHODOLOGIE DES DONNÉES', title: 'Comment les données personnelles deviennent des données de jeu', intro: 'Cette page décrit tout le traitement, y compris les activités politiques sensibles, les classifications du projet et les notes comparatives.',
    purposeTitle: 'Finalité définie', purposeBody: 'Le projet utilise des documents publics sélectionnés pour un jeu éducatif et de divertissement. Il ne détermine pas une idéologie, ne prédit pas les votes, ne recommande pas de candidats et ne mesure ni la valeur, l’intégrité, la compétence ou l’aptitude à une fonction.',
    categoriesTitle: 'Catégories d’entrée', categories: [{ title: 'Appartenance et identité', body: 'Nom, portrait, âge, parti, canton, conseil, ancienneté et fonctions parlementaires actuelles.' }, { title: 'Travail parlementaire', body: 'Objets personnels et leur état officiel, commissions et responsabilités, participation aux votes admissibles.' }, { title: 'Déclarations publiques', body: 'Intérêts externes déclarés et financement de campagne publié. Ils donnent du contexte et sont exclus d’ATK, DEF et OVR.' }, { title: 'Classifications du projet', body: 'Secteurs d’organisations et de donateurs, liens avec commissions, composantes, percentiles, valeurs finales et rareté. Ce ne sont pas des champs officiels.' }],
    flowTitle: 'Flux de traitement', flow: ['Récupérer un instantané daté depuis les points d’accès et sources officielles documentés.', 'Normaliser les identifiants et libellés ; relier commissions, objets, votes, intérêts et financement à la personne.', 'Calculer les signaux, classer les personnes comparables dans le même conseil et convertir sur l’échelle de jeu.', 'Publier seulement les champs nécessaires et les sorties du projet clairement séparées.', 'Conserver packs, collection et réglages dans le navigateur, sans compte de projet.'],
    scoreTitle: 'Logique des notes', scoreBody: 'ATK et DEF sont des calculs déterministes. Les percentiles par conseil réduisent les différences entre Conseil national et Conseil des États ; une formule distincte d’ancienneté exécutive s’applique au Conseil fédéral.', scoreDetails: [{ title: 'ATK', body: '45 % activité sur les objets personnels, 30 % progression des objets arrivés à maturité et 25 % responsabilités actuelles.' }, { title: 'DEF', body: '20 % participation aux votes admissibles, 45 % charge actuelle en commission, 30 % expérience parlementaire plafonnée et 5 % indicateur âge-expérience plafonné.' }, { title: 'OVR et rareté', body: 'OVR combine 45 % ATK, 45 % DEF et 10 % de la valeur la plus basse. La rareté reflète la distribution OVR sans augmenter une note.' }],
    derivedTitle: 'Dérivations et classements', derivedBody: 'Les valeurs officielles restent inchangées. Notes, secteurs, rareté et ordre sont des productions éditoriales séparées. Un classement ordonne seulement des valeurs fictives et n’est pas une évaluation officielle ou objective de performance politique.',
    exclusionsTitle: 'Exclusions volontaires', exclusionsBody: 'Taille ou prestige du parti, position politique, sens du vote, liens de lobbying et financement ne modifient pas ATK, DEF ou OVR. Le projet n’utilise pas communications privées, profils de suivi, préférences électorales supposées, origine ethnique, santé, religion ou casier pénal.',
    minimisationTitle: 'Minimisation', minimisationBody: 'L’application distribuée exclut les champs sources inutilisés et ne publie ni votes détaillés ni registre intermédiaire de calcul. Les instantanés bruts restent séparés avec des durées à approuver. Aucun compte visiteur ni profil publicitaire ou comportemental n’est créé ; l’analyse est limitée à des statistiques agrégées et sans cookies sur l’audience et les performances.',
    limitationsTitle: 'Limites et risques connus', limitations: ['Les documents publics peuvent être incomplets, tardifs, mal traduits ou mal associés.', 'Les percentiles sont comparatifs et peuvent amplifier de faibles écarts.', 'Les conseils diffèrent structurellement ; les notes ne décrivent pas toute la performance politique.', 'Âge et ancienneté sont des indicateurs imparfaits et plafonnés.', 'La classification sectorielle implique un jugement du projet et peut être contestée.', 'La présentation ludique peut être mal comprise ; tout usage conséquent est interdit.'],
    challengeTitle: 'Contester un fait ou une déduction', challengeBody: 'Utilisez la procédure de rectification/suppression de la page Confidentialité. Les erreurs sources sont vérifiées auprès de références fiables ; les classifications et calculs sont contrôlés selon les règles publiées et recalculés si nécessaire.', privacyLink: 'CONFIDENTIALITÉ ET DROITS →', scoreLink: 'FORMULE COMPLÈTE →',
  },
}

const it: PrivacyContent = {
  privacy: {
    eyebrow: 'INFORMATIVA PRIVACY', title: 'Privacy', intro: 'Questa informativa riguarda i profili pubblicati e i punteggi calcolati dal progetto per titolari di cariche identificabili, oltre ai dati limitati usati durante la visita e il gioco.',
    draftWarning: 'Configurazione incompleta: titolare, hosting e conservazione devono essere indicati prima del lancio pubblico. Fino ad allora questa è una bozza trasparente, non un’informativa di produzione completa.',
    controllerTitle: 'Titolari e contatto', controllerContactBody: 'Le persone seguenti gestiscono congiuntamente il progetto e determinano finalità e mezzi del trattamento. Le richieste privacy e di rettifica possono essere inviate elettronicamente:', pending: 'Da fornire prima del lancio pubblico',
    categoriesTitle: 'Persone e categorie di dati', categories: [{ title: 'Identità e carica pubblica', body: 'Nome, ritratto, età, partito, cantone, camera, anzianità, commissioni e ruoli pubblici.' }, { title: 'Attività politica — particolarmente protetta', body: 'Partito e attività parlamentare, atti personali, partecipazione ai voti, lavoro in commissione, interessi dichiarati e finanziamento elettorale pubblicato. Questi dati possono rivelare attività o opinioni politiche.' }, { title: 'Deduzioni del progetto', body: 'Classificazioni settoriali, componenti, ATK, DEF, OVR, rarità, ordine delle carte e classifiche. Sono contenuti editoriali di gioco, non valutazioni ufficiali.' }, { title: 'Stato locale del gioco', body: 'Pack, collezione, preferenze, risultati delle sfide, lingua e accettazione dell’avvertenza sono memorizzati nel browser. L’app non li trasmette al progetto.' }, { title: 'Dati tecnici di accesso e analisi', body: 'GitHub Pages può trattare indirizzo IP, orario, URL, informazioni sul browser e log di sicurezza durante la fornitura del sito. Cloudflare Web Analytics riceve metriche senza cookie sulle visualizzazioni e sulle prestazioni, come host e percorso, referrer, browser o dispositivo e paese approssimativo.' }],
    purposesTitle: 'Finalità', purposes: ['Gestire un gioco di carte educativo indipendente e non commerciale.', 'Spiegare attività parlamentari pubbliche selezionate e il metodo di punteggio.', 'Generare valori di gioco comparativi fittizi e rarità.', 'Mantenere accuratezza, gestire i diritti e proteggere il servizio.', 'Misurare visite aggregate e prestazioni delle pagine senza cookie pubblicitari o un profilo visitatore persistente.', 'Mai fare pubblicità politica mirata, prevedere intenzioni di voto, decidere idoneità o prendere decisioni con effetti giuridici o analoghi.'],
    profilingTitle: 'Profilazione e decisioni automatizzate', profilingBody: 'Il calcolo valuta automaticamente persone identificabili ed è trattato prudentemente come profilazione. Può riguardare attività politiche particolarmente protette. Non prende decisioni automatizzate e non deve essere usato per lavoro, credito, consiglio elettorale, idoneità o altri scopi conseguenti.',
    recipientsTitle: 'Destinatari e comunicazioni', recipients: ['Il pubblico riceve i fatti pubblicati e i contenuti di gioco creati dal progetto.', 'GitHub Pages ospita il sito statico e tratta richieste tecniche e dati di sicurezza. GitHub può trattare dati negli Stati Uniti e in altri paesi in cui operano GitHub o i suoi sub-responsabili, con le garanzie descritte nella documentazione privacy.', 'Google tratta la corrispondenza inviata all’indirizzo Gmail privacy pubblicato.', 'Cloudflare Web Analytics è integrato per misurare pubblico e prestazioni in forma aggregata e senza cookie. Cloudflare dichiara che il servizio non raccoglie né usa dati personali dei visitatori. Non è integrata alcuna rete pubblicitaria e i dati personali non vengono venduti.', 'I gestori dei link esterni ricevono dati solo quando il visitatore apre il link.'],
    retentionTitle: 'Conservazione', retentionBody: 'Lo stato del gioco resta sul dispositivo finché viene cancellato. I profili sono conservati solo finché la persona rientra nel gioco attuale e il profilo è necessario alla finalità dichiarata. Gli snapshot delle fonti e la corrispondenza sono conservati solo per accuratezza, riproducibilità, rettifiche o controversie. I fornitori di hosting, analisi ed e-mail applicano i propri termini di sicurezza e operativi. I dati non più necessari vengono cancellati o anonimizzati.',
    rightsTitle: 'I tuoi diritti', rightsBody: 'Secondo le circostanze, una persona può chiedere accesso, rettifica, cancellazione, limitazione o cessazione del trattamento e contestare una deduzione del progetto. Le richieste sono valutate secondo il diritto svizzero; interessi prevalenti o obblighi di conservazione possono limitare la cancellazione.',
    correctionTitle: 'Procedura di rettifica o rimozione', correctionIntro: 'Invia all’e-mail privacy solo quanto necessario:', correctionSteps: ['Identificare la persona e collegare la carta o il profilo interessato.', 'Indicare quale fatto, classificazione o punteggio è contestato e perché.', 'Fornire una fonte affidabile o spiegare la rimozione richiesta.', 'Il titolare conferma, verifica l’identità solo se proporzionato, protegge la richiesta e normalmente risponde entro 30 giorni.', 'Un errore confermato viene corretto e i punteggi ricalcolati. Una deduzione contestata viene esaminata, segnalata, corretta o rimossa secondo il caso, comunicandone i motivi.'],
    correctionUnavailable: 'L’e-mail privacy non è ancora stata fornita; il canale di correzione non è operativo. Questo blocca il lancio pubblico.',
    securityTitle: 'Sicurezza e modifiche', securityBody: 'L’app pubblica è progettata come sito statico, conserva il gioco localmente e separa gli input ufficiali dagli output del progetto. L’accesso a fonti e corrispondenza deve essere limitato alle persone autorizzate. L’informativa va aggiornata quando cambiano host, destinatari, finalità, metodo o conservazione.', updatedLabel: 'Informativa aggiornata il',
  },
  methodology: {
    eyebrow: 'METODOLOGIA DEI DATI', title: 'Come i dati personali diventano dati di gioco', intro: 'Questa pagina descrive l’intero trattamento, comprese attività politiche sensibili, classificazioni del progetto e punteggi comparativi.',
    purposeTitle: 'Finalità definita', purposeBody: 'Il progetto usa documenti pubblici selezionati per un gioco educativo e di intrattenimento. Non determina ideologie, non prevede voti, non raccomanda candidati e non misura valore, integrità, competenza o idoneità alla carica.',
    categoriesTitle: 'Categorie di input', categories: [{ title: 'Appartenenza e identità', body: 'Nome, ritratto, età, partito, cantone, camera, anzianità e ruoli parlamentari attuali.' }, { title: 'Lavoro parlamentare', body: 'Atti personali e stato ufficiale, incarichi e leadership in commissione, partecipazione ai voti ammissibili.' }, { title: 'Divulgazioni pubbliche', body: 'Interessi esterni dichiarati e finanziamento elettorale pubblicato. Danno contesto e sono esclusi da ATK, DEF e OVR.' }, { title: 'Classificazioni del progetto', body: 'Settori di organizzazioni e donatori, sovrapposizioni con commissioni, componenti, percentili, valori e rarità. Non sono campi ufficiali.' }],
    flowTitle: 'Flusso di trattamento', flow: ['Recuperare uno snapshot datato dagli endpoint e dalle fonti ufficiali documentati.', 'Normalizzare identificatori ed etichette; collegare commissioni, atti, voti, interessi e finanze alla persona.', 'Calcolare i segnali, classificare membri comparabili nella stessa camera e convertire sulla scala di gioco.', 'Pubblicare solo i campi necessari e gli output del progetto chiaramente separati.', 'Conservare pack, collezione e impostazioni nel browser senza account del progetto.'],
    scoreTitle: 'Logica dei punteggi', scoreBody: 'ATK e DEF sono calcoli deterministici. I percentili per camera riducono le differenze strutturali tra Consiglio nazionale e Consiglio degli Stati; i consiglieri federali usano una formula separata di anzianità esecutiva.', scoreDetails: [{ title: 'ATK', body: '45% attività negli atti personali, 30% avanzamento degli atti maturi e 25% ruoli direttivi attuali.' }, { title: 'DEF', body: '20% partecipazione ai voti ammissibili, 45% carico attuale in commissione, 30% esperienza parlamentare limitata e 5% indicatore età-esperienza limitato.' }, { title: 'OVR e rarità', body: 'OVR combina 45% ATK, 45% DEF e 10% del valore più basso. La rarità riflette la distribuzione OVR e non aumenta mai un punteggio.' }],
    derivedTitle: 'Derivazioni e classifiche', derivedBody: 'I valori ufficiali restano invariati. Punteggi, settori, rarità e ordine sono output editoriali separati. Una classifica ordina solo valori di gioco fittizi e non è una valutazione ufficiale o oggettiva della prestazione politica.',
    exclusionsTitle: 'Esclusioni deliberate', exclusionsBody: 'Dimensione e prestigio del partito, posizione politica, direzione del voto, lobbying e finanziamento non modificano ATK, DEF o OVR. Non si usano comunicazioni private, profili di tracciamento, preferenze elettorali inferite, etnia, salute, religione o dati penali.',
    minimisationTitle: 'Minimizzazione', minimisationBody: 'L’app distribuita esclude i campi di origine inutilizzati e non pubblica righe di voto dettagliate né il registro intermedio dei calcoli. Gli snapshot grezzi restano separati e richiedono termini approvati. Non vengono creati account visitatore né profili pubblicitari o comportamentali; l’analisi è limitata a statistiche aggregate e senza cookie su pubblico e prestazioni.',
    limitationsTitle: 'Limiti e rischi noti', limitations: ['I documenti pubblici possono essere incompleti, tardivi, tradotti o associati erroneamente.', 'I percentili sono comparativi e possono amplificare piccole differenze.', 'Le camere sono strutturalmente diverse; i punteggi non descrivono tutta la prestazione politica.', 'Età e anzianità sono proxy imperfetti e limitati.', 'La classificazione settoriale comporta giudizio del progetto e può essere contestata.', 'La presentazione ludica può essere fraintesa; è vietato l’uso conseguente.'],
    challengeTitle: 'Contestare un fatto o una deduzione', challengeBody: 'Usa la procedura di rettifica/rimozione nella pagina Privacy. Gli errori di fonte sono verificati su documenti affidabili; classificazioni e calcoli sono controllati secondo le regole pubblicate e ricalcolati se necessario.', privacyLink: 'PRIVACY E DIRITTI →', scoreLink: 'FORMULA COMPLETA →',
  },
}

const content: Record<Language, PrivacyContent> = { en, de, fr, it }

export function privacyContent(language: Language): PrivacyContent {
  return content[language]
}
