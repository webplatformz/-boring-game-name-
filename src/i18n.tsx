import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { LobbyingSector } from './data/members'
import type { RarityKey } from './theme'

export type Language = 'en' | 'de' | 'fr' | 'it'

export const LANGUAGES: readonly Language[] = ['en', 'de', 'fr', 'it']

const STORAGE_KEY = 'bundeshaus-language-v1'

const en = {
  documentTitle: 'Bundeshaus Pack — Rip a Pack. Build the House.',
  languageSwitcher: 'Display language',
  legislature: 'LEGISLATURE {number}',
  packs: 'PACKS',
  homeHeadlineOne: 'RIP A PACK.',
  homeHeadlineTwo: 'BUILD THE HOUSE.',
  homeSubtitle: '{count} members per pack, no repeats inside it. Rarity follows the new overall-score distribution.',
  ripPackAria: 'Rip open a pack',
  ripOpen: 'RIP IT OPEN',
  nextPackIn: 'NEXT PACK IN {time}',
  noPacksLeft: 'NO PACKS LEFT',
  openCollectionAria: 'Open the collection',
  collected: 'COLLECTED',
  bestPull: 'BEST PULL',
  showCardAria: 'Show card for {name}',
  ripAPack: 'RIP A PACK',
  cardDuplicates: 'CARD DUPLICATES?',
  tradeHint: 'Trade in 5 cards → get 1 higher rarity',
  tradeIn: 'TRADE IN →',
  methodologyLink: 'SWISS PARLIAMENT DATA · HOW SCORES WORK →',
  tabPacks: 'PACKS',
  tabCollection: 'COLLECTION',
  tabBattle: 'BATTLE',
  tabTrade: 'TRADE',
  collectionTitle: 'THE COLLECTION',
  collectionCount: '{owned} OF {total} MEMBERS',
  all: 'ALL',
  rarity: 'RARITY',
  name: 'NAME',
  cantons: 'CANTONS',
  cantonsToggle: 'CANTONS ▾',
  cantonsSelected: 'CANTONS · {count} SELECTED ▾',
  cantonCount: '{count} C',
  member: 'MEMBER',
  nothingHere: 'NOTHING IN HERE YET',
  collectionEmpty: 'Rip your first pack and {count} members of the house land in this table.',
  getPack: 'GO GET A PACK',
  tradeTitle: 'CARD TRADE-IN',
  tradeSubtitle: 'EXCHANGE 5 CARDS FOR 1 HIGHER RARITY',
  selectedCount: '{count} / 5 SELECTED',
  autoFill: 'AUTO-FILL',
  dupes: 'DUPES',
  clear: 'CLEAR',
  tradeReady: 'TRADE 5 CARDS → GET 1 {rarity}',
  tradeSelect: 'SELECT 5 {rarity} CARDS',
  availableCards: 'AVAILABLE {rarity} CARDS',
  types: '{count} UNIQUE CARDS',
  availableShort: '{count} avail',
  noRarityOwned: 'NO {rarity} CARDS OWNED',
  acquireRarity: 'Rip packs or trade lower rarity cards to acquire {rarity} cards.',
  tearingOpen: 'TEARING IT OPEN',
  specialTradePack: 'SPECIAL {rarity} TRADE PACK',
  membersIncoming: '{count} MEMBERS INCOMING',
  tradePackLabel: '1 CARD · {rarity} TRADE',
  standardPackLabel: '{count} CARDS · NO DUPES',
  packLabel: '{count} CARDS · NO DUPES',
  tear: 'TEAR',
  cardProgress: 'CARD {current} / {total}',
  skipAll: 'SKIP ALL →',
  revealNextDesktop: 'TAP OR SWIPE FOR THE NEXT CARD',
  revealNextTouch: 'SWIPE LEFT FOR THE NEXT CARD',
  revealTurn: 'TAP TO TURN THE CARD',
  home: '← HOME',
  battleTitle: 'BATTLE',
  winsShort: '{count}W',
  lossesShort: '{count}L',
  noFighters: 'NO FIGHTERS YET',
  noFightersBody: 'Rip a pack first — you need at least one card to enter battle.',
  chooseFighter: 'CHOOSE YOUR FIGHTER',
  opponent: 'OPPONENT',
  yourCard: 'YOUR CARD',
  versus: 'VS',
  attack: 'ATTACK',
  defend: 'DEFEND',
  attacked: 'ATTACKED',
  defended: 'DEFENDED',
  resolving: 'RESOLVING…',
  lockingIn: 'LOCKING IN…',
  youWon: 'YOU WON!',
  youLost: 'YOU LOST',
  fightAgain: 'FIGHT AGAIN',
  battlePlayerAttackWin: 'You attacked and won!',
  battlePlayerDefendWin: 'You defended and won!',
  battleOpponentAttackWin: 'They attacked and won!',
  battleOpponentDefendWin: 'They defended and won!',
  tapClose: 'TAP TO CLOSE',
  yearsServedOne: 'YEAR SERVED',
  yearsServedMany: 'YEARS SERVED',
  yearsShort: 'YRS',
  age: 'AGE',
  sectorsAria: 'Sectors: {sectors}',
  sectorAria: 'Sector: {sector}',
  federalCouncillor: 'FEDERAL COUNCILLOR',
  scoreFormulaAria: '{score} {value}. Show score formula',
  executiveTenure: 'Executive tenure',
  ageNetwork: 'Age / network',
  proposalDrive: 'Proposal drive',
  proposalsAdvanced: 'Proposals advanced',
  currentLeadership: 'Current leadership',
  votingReliability: 'Voting reliability',
  currentCommitteeWork: 'Current committee work',
  parliamentExperience: 'Parliament experience',
  ageExperience: 'Age experience',
  executiveInfluence: 'EXECUTIVE INFLUENCE',
  executiveResilience: 'EXECUTIVE RESILIENCE',
  weightedExperience: '{baseline} + {multiplier} × weighted experience.',
  driveInitiative: 'DRIVE & INITIATIVE',
  reliabilityResilience: 'RELIABILITY & RESILIENCE',
  atkBlurb: 'Individual work, progress and leadership; normalized by chamber.',
  defBlurb: 'Individual attendance, committee work and experience.',
  formulaLink: 'FORMULA, METRICS & SOURCES →',
  committeeAria: 'CMTE {count}. Show committee metrics',
  committeeWork: 'COMMITTEE WORK',
  committeeIntro: 'Current standing committee assignments published by Parliament.',
  assignments: 'Assignments',
  leadershipRoles: 'Chair / vice-chair roles',
  chair: 'CHAIR',
  moreAssignments: '+{count} more assignment',
  moreAssignmentsPlural: '+{count} more assignments',
  noCommittee: 'No current standing committee assignment.',
  ties: 'TIES',
  camp: 'CAMP',
  pool: 'POOL',
  notApplicable: 'N/A',
  tiesMetricName: 'declared interests',
  campMetricName: 'campaign financing',
  leadingSectorAria: 'Leading classified sector: {sector}',
  showMetricsAria: 'Show {label} metrics',
  disclosedLinks: 'DISCLOSED EXTERNAL LINKS',
  campaignFinancing: 'CAMPAIGN FINANCING',
  officialSource: 'OFFICIAL SOURCE ↗',
  tiesNotApplicable: 'The parliamentary interests register does not cover Federal Councillors.',
  tiesIntro: 'Self-declared external interests. Sector icons identify classified links; paid amounts are not published.',
  declaredInterests: 'Declared interests',
  paidMandates: 'Paid mandates',
  leadershipRolesMetric: 'Leadership roles',
  committeeOverlaps: 'Committee overlaps',
  classifiedLinks: 'Sector-classified links',
  declaredInterestsTitle: 'DECLARED INTERESTS',
  paid: 'PAID',
  unpaid: 'UNPAID',
  committeeMatch: 'COMMITTEE MATCH',
  financeIntro: 'Candidate-specific 2023 EFK final accounts. Sector icons cover classified named large gifts only; shared pools are separate.',
  directIncome: 'Direct campaign income',
  monetaryContributions: 'Monetary contributions',
  nonMonetary: 'Non-monetary',
  eventsSales: 'Events + sales',
  ownFunds: 'Own funds',
  unallocatedResidual: 'Unallocated EFK residual',
  namedGifts: 'Named gifts > CHF 15k',
  classifiedGifts: 'Sector-classified gifts',
  sharedPoolsPlus: 'Plus {count} shared pool totalling {amount}; none of that pool is allocated to this candidate.',
  sharedPoolsPlusPlural: 'Plus {count} shared pools totalling {amount}; none of that pool is allocated to this candidate.',
  financeNotApplicable: 'Federal Councillors were not candidates in the 2023 federal parliamentary election.',
  financeNone: 'No itemized EFK final-account record matched this member. This does not mean CHF 0: campaigns below the legal reporting threshold need no filing.',
  financeShared: 'The member appears only in shared campaign pools. Their personal share is not published and is not estimated.',
  sharedCampaignPools: 'Shared campaign pools',
  wholePoolIncome: 'Whole-pool income',
  personallyAttributed: 'Attributed personally',
  notAvailable: 'Not available',
  scoreLab: 'SCORE LAB',
  backToGame: '← BACK TO GAME',
  methodologyTitle: 'HOW THE SCORES WORK',
  methodologyIntro: 'ATK rewards personal drive and follow-through. DEF rewards personal reliability and institutional staying power. Party size, party prestige, lobbying links and campaign finance are deliberately excluded.',
  atkMethodTitle: 'ATK — DRIVE & INITIATIVE',
  authoredDriveTitle: 'PERSONALLY AUTHORED PROPOSAL DRIVE',
  authoredDriveBody: 'Weighted points per active year in the current legislature: parliamentary initiatives and motions = 3, postulates = 2, interpellations and questions = 1.',
  advancedTitle: 'AUTHORED PROPOSALS ADVANCED',
  advancedBody: 'Weighted points per active year for affairs that reached their next meaningful stage. Questions/interpellations need an official answer; motions/postulates need scheduling, committee work, referral or implementation reporting; parliamentary initiatives need scheduling or committee/preliminary review. A generic closed status alone is not proof. Only affairs at least 12 months old are judged.',
  leadershipTitle: 'CURRENT LEADERSHIP',
  leadershipBody: 'Current committee or parliamentary-group president = 2 points; vice-president = 1. Ordinary membership does not create leadership points.',
  defMethodTitle: 'DEF — RELIABILITY & RESILIENCE',
  votingTitle: 'VOTING RELIABILITY',
  votingBody: 'Yes, no and abstention count as participation. “Did not participate” counts against the rate. Excused members, the presiding member, rare source cells marked “unknown,” and the isolated “present” record without a decision are excluded from both sides of the fraction.',
  committeeTitle: 'CURRENT COMMITTEE WORK',
  committeeBody: 'One point per current standing-committee seat; substitute seats count 0.35. This measures the member’s own workload, not their party’s strength.',
  experienceTitle: 'PARLIAMENTARY EXPERIENCE',
  experienceBody: 'Years served with diminishing returns, reaching the cap at 24 years. Experience therefore helps without letting very long tenure dominate the score.',
  ageTitle: 'AGE EXPERIENCE / NETWORK',
  ageBody: 'A deliberately small proxy that rises from age 35 and caps at 60. Its low weight acknowledges experience and networks without making age decisive.',
  inputsTitle: 'FROM INPUTS TO CARD NUMBERS',
  inputsBody: 'Proposal drive, advancement, leadership and committee workload are percentile-ranked separately inside the National Council and Council of States. The weighted ATK and DEF results are ranked once more inside the same chamber and mapped to a shared 45–97 card scale. This keeps structurally different chambers comparable while rewarding differences between individuals.',
  rarityMethodBody: 'Regular-card rarity is reapplied from the new OVR distribution. Rarity never boosts a score. Federal Councillors remain mythic and use a separate executive-tenure formula because they do not submit or vote like members of either chamber.',
  dataSources: 'DATA & SOURCES',
  scoreSnapshot: 'Score snapshot: {date} · algorithm v{version}',
  sourceOpenData: 'Swiss Parliament Open Data overview',
  sourceOData: 'OData: members, committees and authored-affair status',
  sourceVoting: 'Official parliamentary voting records',
  sourceWorkbooks: 'National Council and Council of States session workbooks',
  methodologyDisclaimer: 'The scores are game-created interpretations of official records, not ratings published or endorsed by the Swiss Federal Assembly.',
} as const

export type TranslationKey = keyof typeof en
type Params = Record<string, string | number>

const de: Partial<Record<TranslationKey, string>> = {
  documentTitle: 'Bundeshaus Pack — Öffne ein Pack. Bau das Bundeshaus.',
  languageSwitcher: 'Anzeigesprache', legislature: 'LEGISLATUR {number}', packs: 'PACKS',
  homeHeadlineOne: 'ÖFFNE EIN PACK.', homeHeadlineTwo: 'BAU DAS BUNDESHAUS.',
  homeSubtitle: '{count} Mitglieder pro Pack, keine Wiederholungen darin. Die Seltenheit folgt der neuen Verteilung der Gesamtwertung.',
  ripPackAria: 'Pack öffnen', ripOpen: 'PACK ÖFFNEN', nextPackIn: 'NÄCHSTES PACK IN {time}', noPacksLeft: 'KEINE PACKS MEHR',
  openCollectionAria: 'Sammlung öffnen', collected: 'GESAMMELT', bestPull: 'BESTE KARTE', showCardAria: 'Karte von {name} anzeigen', ripAPack: 'ÖFFNE EIN PACK',
  cardDuplicates: 'DOPPELTE KARTEN?', tradeHint: '5 Karten eintauschen → 1 höhere Seltenheit erhalten', tradeIn: 'EINTAUSCHEN →', methodologyLink: 'DATEN DES SCHWEIZER PARLAMENTS · SO ENTSTEHEN DIE WERTE →',
  tabPacks: 'PACKS', tabCollection: 'SAMMLUNG', tabBattle: 'DUELL', tabTrade: 'TAUSCH',
  collectionTitle: 'DIE SAMMLUNG', collectionCount: '{owned} VON {total} MITGLIEDERN', all: 'ALLE', rarity: 'SELTENHEIT', name: 'NAME', cantons: 'KANTONE', cantonsToggle: 'KANTONE ▾', cantonsSelected: 'KANTONE · {count} GEWÄHLT ▾', cantonCount: '{count} K', member: 'MITGLIED',
  nothingHere: 'NOCH NICHTS DA', collectionEmpty: 'Öffne dein erstes Pack und {count} Ratsmitglieder landen in dieser Tabelle.', getPack: 'PACK HOLEN',
  tradeTitle: 'KARTENTAUSCH', tradeSubtitle: '5 KARTEN GEGEN 1 HÖHERE SELTENHEIT TAUSCHEN', selectedCount: '{count} / 5 GEWÄHLT', autoFill: 'AUTO-AUSWAHL', dupes: 'DOPPELTE', clear: 'LEEREN',
  tradeReady: '5 KARTEN TAUSCHEN → 1× {rarity}', tradeSelect: '5 {rarity}-KARTEN WÄHLEN', availableCards: 'VERFÜGBARE {rarity}-KARTEN', types: '{count} EINZIGARTIGE KARTEN', availableShort: '{count} verf.', noRarityOwned: 'KEINE {rarity}-KARTEN', acquireRarity: 'Öffne Packs oder tausche niedrigere Seltenheiten, um {rarity}-Karten zu erhalten.',
  tearingOpen: 'PACK WIRD GEÖFFNET', specialTradePack: 'SPEZIELLES {rarity}-TAUSCHPACK', membersIncoming: '{count} MITGLIEDER KOMMEN', tradePackLabel: '1 KARTE · {rarity}-TAUSCH', standardPackLabel: '{count} KARTEN · KEINE DOPPELTEN', packLabel: '{count} KARTEN · KEINE DOPPELTEN', tear: 'AUFREISSEN',
  cardProgress: 'KARTE {current} / {total}', skipAll: 'ALLE ÜBERSPRINGEN →', revealNextDesktop: 'KLICKEN ODER WISCHEN FÜR DIE NÄCHSTE KARTE', revealNextTouch: 'NACH LINKS WISCHEN FÜR DIE NÄCHSTE KARTE', revealTurn: 'KLICKEN ZUM UMDREHEN',
  home: '← START', battleTitle: 'DUELL', winsShort: '{count}S', lossesShort: '{count}N', noFighters: 'NOCH KEINE KÄMPFER', noFightersBody: 'Öffne zuerst ein Pack — du brauchst mindestens eine Karte für ein Duell.', chooseFighter: 'KÄMPFER WÄHLEN', opponent: 'GEGNER', yourCard: 'DEINE KARTE', versus: 'VS', attack: 'ANGRIFF', defend: 'ABWEHR', attacked: 'ANGEGRIFFEN', defended: 'VERTEIDIGT', resolving: 'AUSWERTUNG…', lockingIn: 'WIRD FESTGELEGT…', youWon: 'DU GEWINNST!', youLost: 'DU VERLIERST', fightAgain: 'NOCHMAL KÄMPFEN',
  battlePlayerAttackWin: 'Du hast angegriffen und gewonnen!', battlePlayerDefendWin: 'Du hast verteidigt und gewonnen!', battleOpponentAttackWin: 'Der Gegner hat angegriffen und gewonnen!', battleOpponentDefendWin: 'Der Gegner hat verteidigt und gewonnen!',
  tapClose: 'KLICKEN ZUM SCHLIESSEN', yearsServedOne: 'JAHR IM AMT', yearsServedMany: 'JAHRE IM AMT', yearsShort: 'J.', age: 'ALTER', sectorsAria: 'Sektoren: {sectors}', sectorAria: 'Sektor: {sector}', federalCouncillor: 'BUNDESRAT',
  scoreFormulaAria: '{score} {value}. Bewertungsformel anzeigen', executiveTenure: 'Amtsdauer in der Exekutive', ageNetwork: 'Alter / Netzwerk', proposalDrive: 'Vorstossaktivität', proposalsAdvanced: 'Weitergeführte Vorstösse', currentLeadership: 'Aktuelle Führungsrollen', votingReliability: 'Abstimmungszuverlässigkeit', currentCommitteeWork: 'Aktuelle Kommissionsarbeit', parliamentExperience: 'Parlamentserfahrung', ageExperience: 'Alterserfahrung', executiveInfluence: 'EINFLUSS DER EXEKUTIVE', executiveResilience: 'BESTÄNDIGKEIT DER EXEKUTIVE', weightedExperience: '{baseline} + {multiplier} × gewichtete Erfahrung.', driveInitiative: 'ANTRIEB & INITIATIVE', reliabilityResilience: 'ZUVERLÄSSIGKEIT & BESTÄNDIGKEIT', atkBlurb: 'Individuelle Arbeit, Fortschritt und Führung; nach Rat normalisiert.', defBlurb: 'Individuelle Präsenz, Kommissionsarbeit und Erfahrung.', formulaLink: 'FORMEL, METRIKEN & QUELLEN →',
  committeeAria: 'KOMM {count}. Kommissionswerte anzeigen', committeeWork: 'KOMMISSIONSARBEIT', committeeIntro: 'Aktuelle ständige Kommissionsmandate gemäss Parlament.', assignments: 'Mandate', leadershipRoles: 'Präsidium / Vizepräsidium', chair: 'PRÄSIDIUM', moreAssignments: '+{count} weiteres Mandat', moreAssignmentsPlural: '+{count} weitere Mandate', noCommittee: 'Kein aktuelles Mandat in einer ständigen Kommission.',
  ties: 'MAND.', camp: 'KAMP.', pool: 'POOL', notApplicable: 'N/V', tiesMetricName: 'deklarierte Interessen', campMetricName: 'Kampagnenfinanzierung', leadingSectorAria: 'Wichtigster klassifizierter Sektor: {sector}', showMetricsAria: 'Kennzahlen zu {label} anzeigen', disclosedLinks: 'DEKLARIERTE EXTERNE VERBINDUNGEN', campaignFinancing: 'KAMPAGNENFINANZIERUNG', officialSource: 'OFFIZIELLE QUELLE ↗',
  tiesNotApplicable: 'Das Interessenregister des Parlaments gilt nicht für Bundesratsmitglieder.', tiesIntro: 'Selbst deklarierte externe Interessen. Sektorsymbole kennzeichnen klassifizierte Verbindungen; bezahlte Beträge werden nicht veröffentlicht.', declaredInterests: 'Deklarierte Interessen', paidMandates: 'Bezahlte Mandate', leadershipRolesMetric: 'Führungsrollen', committeeOverlaps: 'Kommissionsüberschneidungen', classifiedLinks: 'Nach Sektor klassifizierte Verbindungen', declaredInterestsTitle: 'DEKLARIERTE INTERESSEN', paid: 'BEZAHLT', unpaid: 'UNBEZAHLT', committeeMatch: 'KOMMISSIONSBEZUG',
  financeIntro: 'Kandidatenspezifische EFK-Schlussrechnungen 2023. Sektorsymbole erfassen nur klassifizierte, namentlich bekannte Grossspenden; gemeinsame Pools sind separat.', directIncome: 'Direkte Kampagneneinnahmen', monetaryContributions: 'Geldbeiträge', nonMonetary: 'Sachleistungen', eventsSales: 'Anlässe + Verkäufe', ownFunds: 'Eigenmittel', unallocatedResidual: 'Nicht zugewiesener EFK-Rest', namedGifts: 'Namentliche Spenden > CHF 15’000', classifiedGifts: 'Nach Sektor klassifizierte Spenden', sharedPoolsPlus: 'Zusätzlich {count} gemeinsamer Pool mit insgesamt {amount}; davon wird dieser Person nichts zugerechnet.', sharedPoolsPlusPlural: 'Zusätzlich {count} gemeinsame Pools mit insgesamt {amount}; davon wird dieser Person nichts zugerechnet.', financeNotApplicable: 'Bundesratsmitglieder kandidierten nicht bei den eidgenössischen Parlamentswahlen 2023.', financeNone: 'Für dieses Mitglied wurde keine aufgeschlüsselte EFK-Schlussrechnung gefunden. Das bedeutet nicht CHF 0: Kampagnen unter der gesetzlichen Meldeschwelle müssen nichts einreichen.', financeShared: 'Das Mitglied erscheint nur in gemeinsamen Kampagnenpools. Der persönliche Anteil wird nicht veröffentlicht und nicht geschätzt.', sharedCampaignPools: 'Gemeinsame Kampagnenpools', wholePoolIncome: 'Einnahmen des gesamten Pools', personallyAttributed: 'Persönlich zugerechnet', notAvailable: 'Nicht verfügbar',
  scoreLab: 'SCORE-LABOR', backToGame: '← ZURÜCK ZUM SPIEL', methodologyTitle: 'SO ENTSTEHEN DIE WERTE', methodologyIntro: 'ATK belohnt persönlichen Antrieb und konsequente Umsetzung. DEF belohnt persönliche Zuverlässigkeit und institutionelle Beständigkeit. Parteigrösse, Parteiprestige, Lobbyverbindungen und Kampagnenfinanzierung werden bewusst ausgeschlossen.', atkMethodTitle: 'ATK — ANTRIEB & INITIATIVE', authoredDriveTitle: 'EIGENE VORSTOSSAKTIVITÄT', authoredDriveBody: 'Gewichtete Punkte pro aktivem Jahr in der laufenden Legislatur: parlamentarische Initiativen und Motionen = 3, Postulate = 2, Interpellationen und Fragen = 1.', advancedTitle: 'WEITERGEFÜHRTE EIGENE VORSTÖSSE', advancedBody: 'Gewichtete Punkte pro aktivem Jahr für Geschäfte, die die nächste relevante Stufe erreicht haben. Fragen und Interpellationen brauchen eine offizielle Antwort; Motionen und Postulate eine Terminierung, Kommissionsarbeit, Überweisung oder einen Umsetzungsbericht; parlamentarische Initiativen eine Terminierung oder Kommissions- bzw. Vorprüfung. Ein allgemeiner Abschlussstatus allein genügt nicht. Bewertet werden nur Geschäfte, die mindestens 12 Monate alt sind.', leadershipTitle: 'AKTUELLE FÜHRUNGSROLLEN', leadershipBody: 'Aktuelles Kommissions- oder Fraktionspräsidium = 2 Punkte; Vizepräsidium = 1. Eine ordentliche Mitgliedschaft gibt keine Führungspunkte.', defMethodTitle: 'DEF — ZUVERLÄSSIGKEIT & BESTÄNDIGKEIT', votingTitle: 'ABSTIMMUNGSZUVERLÄSSIGKEIT', votingBody: 'Ja, Nein und Enthaltung zählen als Teilnahme. „Nicht teilgenommen“ senkt die Quote. Entschuldigte Mitglieder, das Präsidium, seltene als „unbekannt“ markierte Quelldaten und der einzelne Eintrag „anwesend“ ohne Entscheid werden aus Zähler und Nenner ausgeschlossen.', committeeTitle: 'AKTUELLE KOMMISSIONSARBEIT', committeeBody: 'Ein Punkt pro Sitz in einer ständigen Kommission; Ersatzsitze zählen 0,35. Gemessen wird die eigene Arbeitslast des Mitglieds, nicht die Stärke seiner Partei.', experienceTitle: 'PARLAMENTSERFAHRUNG', experienceBody: 'Amtsjahre mit abnehmendem Zusatznutzen und einer Obergrenze bei 24 Jahren. Erfahrung hilft, ohne dass eine sehr lange Amtszeit den Wert dominiert.', ageTitle: 'ALTERSERFAHRUNG / NETZWERK', ageBody: 'Ein bewusst kleiner Näherungswert, der ab 35 steigt und bei 60 gedeckelt ist. Das geringe Gewicht berücksichtigt Erfahrung und Netzwerke, ohne das Alter entscheidend zu machen.', inputsTitle: 'VON DEN EINGABEN ZU DEN KARTENWERTEN', inputsBody: 'Vorstossaktivität, Fortschritt, Führung und Kommissionsarbeit werden in National- und Ständerat separat nach Perzentilen geordnet. Die gewichteten ATK- und DEF-Ergebnisse werden im selben Rat nochmals geordnet und auf eine gemeinsame Kartenskala von 45–97 übertragen. So bleiben die strukturell unterschiedlichen Räte vergleichbar und individuelle Unterschiede sichtbar.', rarityMethodBody: 'Die Seltenheit regulärer Karten wird aus der neuen OVR-Verteilung neu zugewiesen. Seltenheit erhöht nie einen Wert. Bundesratsmitglieder bleiben mythisch und verwenden eine eigene Formel zur Amtsdauer, da sie nicht wie Mitglieder der beiden Räte Vorstösse einreichen oder abstimmen.', dataSources: 'DATEN & QUELLEN', scoreSnapshot: 'Datenstand: {date} · Algorithmus v{version}', sourceOpenData: 'Open-Data-Übersicht des Schweizer Parlaments', sourceOData: 'OData: Mitglieder, Kommissionen und Status eigener Geschäfte', sourceVoting: 'Offizielle parlamentarische Abstimmungsdaten', sourceWorkbooks: 'Sitzungsdateien von National- und Ständerat', methodologyDisclaimer: 'Die Werte sind spielerische Interpretationen offizieller Daten und keine von der Schweizerischen Bundesversammlung veröffentlichten oder unterstützten Bewertungen.',
}

const fr: Partial<Record<TranslationKey, string>> = {
  documentTitle: 'Bundeshaus Pack — Ouvre un pack. Bâtis le Palais.',
  languageSwitcher: 'Langue d’affichage', legislature: 'LÉGISLATURE {number}', packs: 'PACKS', homeHeadlineOne: 'OUVRE UN PACK.', homeHeadlineTwo: 'BÂTIS LE PALAIS.', homeSubtitle: '{count} membres par pack, sans doublon à l’intérieur. La rareté suit la nouvelle distribution de la note générale.', ripPackAria: 'Ouvrir un pack', ripOpen: 'OUVRIR LE PACK', nextPackIn: 'PROCHAIN PACK DANS {time}', noPacksLeft: 'PLUS DE PACKS', openCollectionAria: 'Ouvrir la collection', collected: 'COLLECTION', bestPull: 'MEILLEURE CARTE', showCardAria: 'Afficher la carte de {name}', ripAPack: 'OUVRE UN PACK', cardDuplicates: 'DES DOUBLONS ?', tradeHint: 'Échange 5 cartes → obtiens 1 rareté supérieure', tradeIn: 'ÉCHANGER →', methodologyLink: 'DONNÉES DU PARLEMENT SUISSE · COMMENT FONCTIONNENT LES NOTES →', tabPacks: 'PACKS', tabCollection: 'COLLECTION', tabBattle: 'DUEL', tabTrade: 'ÉCHANGE',
  collectionTitle: 'LA COLLECTION', collectionCount: '{owned} SUR {total} MEMBRES', all: 'TOUTES', rarity: 'RARETÉ', name: 'NOM', cantons: 'CANTONS', cantonsToggle: 'CANTONS ▾', cantonsSelected: 'CANTONS · {count} SÉLECTIONNÉS ▾', cantonCount: '{count} C', member: 'MEMBRE', nothingHere: 'RIEN POUR L’INSTANT', collectionEmpty: 'Ouvre ton premier pack et {count} parlementaires apparaîtront dans ce tableau.', getPack: 'OBTENIR UN PACK', tradeTitle: 'ÉCHANGE DE CARTES', tradeSubtitle: 'ÉCHANGE 5 CARTES CONTRE 1 DE RARETÉ SUPÉRIEURE', selectedCount: '{count} / 5 SÉLECTIONNÉES', autoFill: 'REMPLIR AUTO', dupes: 'DOUBLONS', clear: 'EFFACER', tradeReady: 'ÉCHANGER 5 CARTES → 1 {rarity}', tradeSelect: 'SÉLECTIONNE 5 CARTES {rarity}', availableCards: 'CARTES {rarity} DISPONIBLES', types: '{count} CARTES UNIQUES', availableShort: '{count} disp.', noRarityOwned: 'AUCUNE CARTE {rarity}', acquireRarity: 'Ouvre des packs ou échange des cartes moins rares pour obtenir des cartes {rarity}.',
  tearingOpen: 'OUVERTURE DU PACK', specialTradePack: 'PACK D’ÉCHANGE SPÉCIAL {rarity}', membersIncoming: '{count} MEMBRES ARRIVENT', tradePackLabel: '1 CARTE · ÉCHANGE {rarity}', standardPackLabel: '{count} CARTES · SANS DOUBLON', packLabel: '{count} CARTES · SANS DOUBLON', tear: 'DÉCHIRER', cardProgress: 'CARTE {current} / {total}', skipAll: 'TOUT PASSER →', revealNextDesktop: 'CLIQUE OU BALAIE POUR LA CARTE SUIVANTE', revealNextTouch: 'BALAIE À GAUCHE POUR LA CARTE SUIVANTE', revealTurn: 'CLIQUE POUR RETOURNER LA CARTE',
  home: '← ACCUEIL', battleTitle: 'DUEL', winsShort: '{count}V', lossesShort: '{count}D', noFighters: 'AUCUN COMBATTANT', noFightersBody: 'Ouvre d’abord un pack — il te faut au moins une carte pour combattre.', chooseFighter: 'CHOISIS TON COMBATTANT', opponent: 'ADVERSAIRE', yourCard: 'TA CARTE', versus: 'VS', attack: 'ATTAQUER', defend: 'DÉFENDRE', attacked: 'ATTAQUE', defended: 'DÉFENSE', resolving: 'RÉSOLUTION…', lockingIn: 'VALIDATION…', youWon: 'VICTOIRE !', youLost: 'DÉFAITE', fightAgain: 'REJOUER', battlePlayerAttackWin: 'Tu as attaqué et gagné !', battlePlayerDefendWin: 'Tu as défendu et gagné !', battleOpponentAttackWin: 'L’adversaire a attaqué et gagné !', battleOpponentDefendWin: 'L’adversaire a défendu et gagné !',
  tapClose: 'CLIQUE POUR FERMER', yearsServedOne: 'AN DE MANDAT', yearsServedMany: 'ANS DE MANDAT', yearsShort: 'ANS', age: 'ÂGE', sectorsAria: 'Secteurs : {sectors}', sectorAria: 'Secteur : {sector}', federalCouncillor: 'CONSEILLER FÉDÉRAL', scoreFormulaAria: '{score} {value}. Afficher la formule', executiveTenure: 'Ancienneté à l’exécutif', ageNetwork: 'Âge / réseau', proposalDrive: 'Dynamique des interventions', proposalsAdvanced: 'Interventions avancées', currentLeadership: 'Responsabilités actuelles', votingReliability: 'Fiabilité des votes', currentCommitteeWork: 'Travail actuel en commission', parliamentExperience: 'Expérience parlementaire', ageExperience: 'Expérience liée à l’âge', executiveInfluence: 'INFLUENCE EXÉCUTIVE', executiveResilience: 'RÉSILIENCE EXÉCUTIVE', weightedExperience: '{baseline} + {multiplier} × expérience pondérée.', driveInitiative: 'DYNAMISME & INITIATIVE', reliabilityResilience: 'FIABILITÉ & RÉSILIENCE', atkBlurb: 'Travail individuel, progrès et responsabilités ; normalisés par conseil.', defBlurb: 'Présence individuelle, travail en commission et expérience.', formulaLink: 'FORMULE, INDICATEURS & SOURCES →',
  committeeAria: 'COMM {count}. Afficher les indicateurs de commission', committeeWork: 'TRAVAIL EN COMMISSION', committeeIntro: 'Attributions actuelles aux commissions permanentes publiées par le Parlement.', assignments: 'Attributions', leadershipRoles: 'Présidence / vice-présidence', chair: 'PRÉSIDENCE', moreAssignments: '+{count} autre attribution', moreAssignmentsPlural: '+{count} autres attributions', noCommittee: 'Aucune attribution actuelle à une commission permanente.', ties: 'LIENS', camp: 'CAMP.', pool: 'POOL', notApplicable: 'N/D', tiesMetricName: 'intérêts déclarés', campMetricName: 'financement de campagne', leadingSectorAria: 'Principal secteur classé : {sector}', showMetricsAria: 'Afficher les indicateurs de {label}', disclosedLinks: 'LIENS EXTERNES DÉCLARÉS', campaignFinancing: 'FINANCEMENT DE CAMPAGNE', officialSource: 'SOURCE OFFICIELLE ↗',
  tiesNotApplicable: 'Le registre des intérêts parlementaires ne couvre pas les membres du Conseil fédéral.', tiesIntro: 'Intérêts externes autodéclarés. Les icônes indiquent les liens classés par secteur ; les montants rémunérés ne sont pas publiés.', declaredInterests: 'Intérêts déclarés', paidMandates: 'Mandats rémunérés', leadershipRolesMetric: 'Fonctions dirigeantes', committeeOverlaps: 'Recoupements avec les commissions', classifiedLinks: 'Liens classés par secteur', declaredInterestsTitle: 'INTÉRÊTS DÉCLARÉS', paid: 'RÉMUNÉRÉ', unpaid: 'NON RÉMUNÉRÉ', committeeMatch: 'LIEN AVEC COMMISSION', financeIntro: 'Comptes finaux 2023 du CDF propres aux candidats. Les icônes ne couvrent que les grands dons nominatifs classés ; les fonds communs sont séparés.', directIncome: 'Recettes directes de campagne', monetaryContributions: 'Contributions monétaires', nonMonetary: 'Contributions en nature', eventsSales: 'Événements + ventes', ownFunds: 'Fonds propres', unallocatedResidual: 'Solde CDF non attribué', namedGifts: 'Dons nominatifs > CHF 15’000', classifiedGifts: 'Dons classés par secteur', sharedPoolsPlus: 'Plus {count} fonds commun totalisant {amount} ; aucune part n’est attribuée à cette personne.', sharedPoolsPlusPlural: 'Plus {count} fonds communs totalisant {amount} ; aucune part n’est attribuée à cette personne.', financeNotApplicable: 'Les membres du Conseil fédéral n’étaient pas candidats aux élections fédérales de 2023.', financeNone: 'Aucun compte final détaillé du CDF ne correspond à ce membre. Cela ne signifie pas CHF 0 : les campagnes sous le seuil légal ne doivent rien déclarer.', financeShared: 'Le membre apparaît uniquement dans des fonds de campagne communs. Sa part personnelle n’est ni publiée ni estimée.', sharedCampaignPools: 'Fonds de campagne communs', wholePoolIncome: 'Recettes totales des fonds', personallyAttributed: 'Attribué personnellement', notAvailable: 'Non disponible',
  scoreLab: 'LABO DES NOTES', backToGame: '← RETOUR AU JEU', methodologyTitle: 'COMMENT FONCTIONNENT LES NOTES', methodologyIntro: 'ATK récompense l’initiative personnelle et le suivi. DEF récompense la fiabilité personnelle et la solidité institutionnelle. La taille et le prestige du parti, les liens de lobbying et le financement de campagne sont volontairement exclus.', atkMethodTitle: 'ATK — DYNAMISME & INITIATIVE', authoredDriveTitle: 'DYNAMIQUE DES INTERVENTIONS PERSONNELLES', authoredDriveBody: 'Points pondérés par année active durant la législature actuelle : initiatives parlementaires et motions = 3, postulats = 2, interpellations et questions = 1.', advancedTitle: 'INTERVENTIONS PERSONNELLES AYANT PROGRESSÉ', advancedBody: 'Points pondérés par année active pour les objets ayant atteint l’étape pertinente suivante. Les questions et interpellations exigent une réponse officielle ; les motions et postulats une planification, un travail de commission, un renvoi ou un rapport de mise en œuvre ; les initiatives parlementaires une planification ou un examen en commission/préalable. Un simple statut clos ne suffit pas. Seuls les objets âgés d’au moins 12 mois sont évalués.', leadershipTitle: 'RESPONSABILITÉS ACTUELLES', leadershipBody: 'Présidence actuelle d’une commission ou d’un groupe parlementaire = 2 points ; vice-présidence = 1. Une simple appartenance ne rapporte aucun point de responsabilité.', defMethodTitle: 'DEF — FIABILITÉ & RÉSILIENCE', votingTitle: 'FIABILITÉ DES VOTES', votingBody: 'Oui, non et abstention comptent comme participation. « N’a pas participé » réduit le taux. Les membres excusés, la présidence, les rares cellules « inconnu » et l’enregistrement isolé « présent » sans décision sont exclus du numérateur comme du dénominateur.', committeeTitle: 'TRAVAIL ACTUEL EN COMMISSION', committeeBody: 'Un point par siège actuel dans une commission permanente ; les suppléances valent 0,35. Cette mesure reflète la charge propre du membre, pas la force de son parti.', experienceTitle: 'EXPÉRIENCE PARLEMENTAIRE', experienceBody: 'Les années de mandat ont un rendement décroissant et plafonnent à 24 ans. L’expérience aide donc sans laisser les très longs mandats dominer.', ageTitle: 'EXPÉRIENCE D’ÂGE / RÉSEAU', ageBody: 'Un petit indicateur volontaire qui augmente dès 35 ans et plafonne à 60. Son faible poids reconnaît l’expérience et les réseaux sans rendre l’âge décisif.', inputsTitle: 'DES DONNÉES AUX NOTES DES CARTES', inputsBody: 'La dynamique des interventions, leur avancement, les responsabilités et le travail en commission sont classés séparément par percentile au Conseil national et au Conseil des États. Les résultats ATK et DEF pondérés sont ensuite reclassés dans le même conseil et convertis sur une échelle commune de 45 à 97. Les conseils restent ainsi comparables malgré leurs structures différentes, tout en valorisant les écarts individuels.', rarityMethodBody: 'La rareté des cartes ordinaires est recalculée d’après la nouvelle distribution OVR. Elle n’augmente jamais une note. Les membres du Conseil fédéral restent mythiques et utilisent une formule distincte fondée sur l’ancienneté exécutive, car ils ne déposent ni ne votent comme les membres des deux conseils.', dataSources: 'DONNÉES & SOURCES', scoreSnapshot: 'Instantané des notes : {date} · algorithme v{version}', sourceOpenData: 'Vue d’ensemble Open Data du Parlement suisse', sourceOData: 'OData : membres, commissions et statut des objets personnels', sourceVoting: 'Résultats officiels des votes parlementaires', sourceWorkbooks: 'Fichiers de séance du Conseil national et du Conseil des États', methodologyDisclaimer: 'Ces notes sont des interprétations ludiques de données officielles, et non des évaluations publiées ou approuvées par l’Assemblée fédérale.',
}

const it: Partial<Record<TranslationKey, string>> = {
  documentTitle: 'Bundeshaus Pack — Apri un pacchetto. Costruisci il Palazzo.',
  languageSwitcher: 'Lingua di visualizzazione', legislature: 'LEGISLATURA {number}', packs: 'PACK', homeHeadlineOne: 'APRI UN PACCHETTO.', homeHeadlineTwo: 'COSTRUISCI IL PALAZZO.', homeSubtitle: '{count} membri per pacchetto, senza doppioni al suo interno. La rarità segue la nuova distribuzione del punteggio complessivo.', ripPackAria: 'Apri un pacchetto', ripOpen: 'APRI IL PACCHETTO', nextPackIn: 'PROSSIMO PACK TRA {time}', noPacksLeft: 'NESSUN PACK RIMASTO', openCollectionAria: 'Apri la collezione', collected: 'RACCOLTE', bestPull: 'CARTA MIGLIORE', showCardAria: 'Mostra la carta di {name}', ripAPack: 'APRI UN PACCHETTO', cardDuplicates: 'CARTE DOPPIE?', tradeHint: 'Scambia 5 carte → ottieni 1 rarità superiore', tradeIn: 'SCAMBIA →', methodologyLink: 'DATI DEL PARLAMENTO SVIZZERO · COME FUNZIONANO I PUNTEGGI →', tabPacks: 'PACK', tabCollection: 'COLLEZIONE', tabBattle: 'SFIDA', tabTrade: 'SCAMBIO',
  collectionTitle: 'LA COLLEZIONE', collectionCount: '{owned} DI {total} MEMBRI', all: 'TUTTE', rarity: 'RARITÀ', name: 'NOME', cantons: 'CANTONI', cantonsToggle: 'CANTONI ▾', cantonsSelected: 'CANTONI · {count} SELEZIONATI ▾', cantonCount: '{count} C', member: 'MEMBRO', nothingHere: 'ANCORA NIENTE', collectionEmpty: 'Apri il primo pacchetto e {count} parlamentari appariranno in questa tabella.', getPack: 'OTTIENI UN PACK', tradeTitle: 'SCAMBIO DI CARTE', tradeSubtitle: 'SCAMBIA 5 CARTE CON 1 DI RARITÀ SUPERIORE', selectedCount: '{count} / 5 SELEZIONATE', autoFill: 'RIEMPI AUTO', dupes: 'DOPPIONI', clear: 'SVUOTA', tradeReady: 'SCAMBIA 5 CARTE → 1 {rarity}', tradeSelect: 'SELEZIONA 5 CARTE {rarity}', availableCards: 'CARTE {rarity} DISPONIBILI', types: '{count} CARTE UNICHE', availableShort: '{count} disp.', noRarityOwned: 'NESSUNA CARTA {rarity}', acquireRarity: 'Apri pacchetti o scambia carte meno rare per ottenere carte {rarity}.',
  tearingOpen: 'APERTURA IN CORSO', specialTradePack: 'PACK SCAMBIO SPECIALE {rarity}', membersIncoming: '{count} MEMBRI IN ARRIVO', tradePackLabel: '1 CARTA · SCAMBIO {rarity}', standardPackLabel: '{count} CARTE · SENZA DOPPIONI', packLabel: '{count} CARTE · SENZA DOPPIONI', tear: 'STRAPPA', cardProgress: 'CARTA {current} / {total}', skipAll: 'SALTA TUTTE →', revealNextDesktop: 'CLICCA O SCORRI PER LA CARTA SUCCESSIVA', revealNextTouch: 'SCORRI A SINISTRA PER LA CARTA SUCCESSIVA', revealTurn: 'CLICCA PER GIRARE LA CARTA',
  home: '← HOME', battleTitle: 'SFIDA', winsShort: '{count}V', lossesShort: '{count}S', noFighters: 'NESSUN COMBATTENTE', noFightersBody: 'Apri prima un pacchetto: serve almeno una carta per entrare in sfida.', chooseFighter: 'SCEGLI IL COMBATTENTE', opponent: 'AVVERSARIO', yourCard: 'LA TUA CARTA', versus: 'VS', attack: 'ATTACCA', defend: 'DIFENDI', attacked: 'ATTACCATO', defended: 'DIFESO', resolving: 'RISOLUZIONE…', lockingIn: 'CONFERMA…', youWon: 'HAI VINTO!', youLost: 'HAI PERSO', fightAgain: 'SFIDA ANCORA', battlePlayerAttackWin: 'Hai attaccato e vinto!', battlePlayerDefendWin: 'Hai difeso e vinto!', battleOpponentAttackWin: 'L’avversario ha attaccato e vinto!', battleOpponentDefendWin: 'L’avversario ha difeso e vinto!',
  tapClose: 'CLICCA PER CHIUDERE', yearsServedOne: 'ANNO DI MANDATO', yearsServedMany: 'ANNI DI MANDATO', yearsShort: 'ANNI', age: 'ETÀ', sectorsAria: 'Settori: {sectors}', sectorAria: 'Settore: {sector}', federalCouncillor: 'CONSIGLIERE FEDERALE', scoreFormulaAria: '{score} {value}. Mostra la formula', executiveTenure: 'Anzianità nell’esecutivo', ageNetwork: 'Età / rete', proposalDrive: 'Iniziativa negli atti', proposalsAdvanced: 'Atti portati avanti', currentLeadership: 'Ruoli direttivi attuali', votingReliability: 'Affidabilità di voto', currentCommitteeWork: 'Lavoro attuale in commissione', parliamentExperience: 'Esperienza parlamentare', ageExperience: 'Esperienza anagrafica', executiveInfluence: 'INFLUENZA ESECUTIVA', executiveResilience: 'RESILIENZA ESECUTIVA', weightedExperience: '{baseline} + {multiplier} × esperienza ponderata.', driveInitiative: 'SLANCIO & INIZIATIVA', reliabilityResilience: 'AFFIDABILITÀ & RESILIENZA', atkBlurb: 'Lavoro individuale, progresso e leadership; normalizzati per camera.', defBlurb: 'Presenza individuale, lavoro in commissione ed esperienza.', formulaLink: 'FORMULA, METRICHE & FONTI →',
  committeeAria: 'COMM {count}. Mostra le metriche delle commissioni', committeeWork: 'LAVORO IN COMMISSIONE', committeeIntro: 'Incarichi attuali nelle commissioni permanenti pubblicati dal Parlamento.', assignments: 'Incarichi', leadershipRoles: 'Presidenza / vicepresidenza', chair: 'PRESIDENZA', moreAssignments: '+{count} altro incarico', moreAssignmentsPlural: '+{count} altri incarichi', noCommittee: 'Nessun incarico attuale in una commissione permanente.', ties: 'LEGAMI', camp: 'CAMP.', pool: 'POOL', notApplicable: 'N/D', tiesMetricName: 'interessi dichiarati', campMetricName: 'finanziamento della campagna', leadingSectorAria: 'Settore classificato principale: {sector}', showMetricsAria: 'Mostra le metriche di {label}', disclosedLinks: 'LEGAMI ESTERNI DICHIARATI', campaignFinancing: 'FINANZIAMENTO DELLA CAMPAGNA', officialSource: 'FONTE UFFICIALE ↗',
  tiesNotApplicable: 'Il registro degli interessi parlamentari non copre i membri del Consiglio federale.', tiesIntro: 'Interessi esterni autodichiarati. Le icone indicano i legami classificati per settore; gli importi retribuiti non sono pubblicati.', declaredInterests: 'Interessi dichiarati', paidMandates: 'Mandati retribuiti', leadershipRolesMetric: 'Ruoli direttivi', committeeOverlaps: 'Sovrapposizioni con commissioni', classifiedLinks: 'Legami classificati per settore', declaredInterestsTitle: 'INTERESSI DICHIARATI', paid: 'RETRIBUITO', unpaid: 'NON RETRIBUITO', committeeMatch: 'LEGAME CON COMMISSIONE', financeIntro: 'Conti finali CDF 2023 specifici per candidato. Le icone coprono solo le grandi donazioni nominative classificate; i fondi condivisi sono separati.', directIncome: 'Entrate dirette della campagna', monetaryContributions: 'Contributi monetari', nonMonetary: 'Contributi non monetari', eventsSales: 'Eventi + vendite', ownFunds: 'Fondi propri', unallocatedResidual: 'Residuo CDF non assegnato', namedGifts: 'Donazioni nominative > CHF 15’000', classifiedGifts: 'Donazioni classificate per settore', sharedPoolsPlus: 'Inoltre {count} fondo condiviso per un totale di {amount}; nessuna quota è attribuita a questa persona.', sharedPoolsPlusPlural: 'Inoltre {count} fondi condivisi per un totale di {amount}; nessuna quota è attribuita a questa persona.', financeNotApplicable: 'I membri del Consiglio federale non erano candidati alle elezioni federali del 2023.', financeNone: 'Nessun conto finale CDF dettagliato corrisponde a questo membro. Non significa CHF 0: le campagne sotto la soglia legale non devono presentare dati.', financeShared: 'Il membro compare solo in fondi di campagna condivisi. La sua quota personale non è pubblicata né stimata.', sharedCampaignPools: 'Fondi di campagna condivisi', wholePoolIncome: 'Entrate totali dei fondi', personallyAttributed: 'Attribuito personalmente', notAvailable: 'Non disponibile',
  scoreLab: 'LAB PUNTEGGI', backToGame: '← TORNA AL GIOCO', methodologyTitle: 'COME FUNZIONANO I PUNTEGGI', methodologyIntro: 'ATK premia l’iniziativa personale e la capacità di portare avanti il lavoro. DEF premia l’affidabilità personale e la solidità istituzionale. Dimensione e prestigio del partito, legami di lobbying e finanziamento della campagna sono esclusi intenzionalmente.', atkMethodTitle: 'ATK — SLANCIO & INIZIATIVA', authoredDriveTitle: 'INIZIATIVA NEGLI ATTI PERSONALI', authoredDriveBody: 'Punti ponderati per anno attivo nella legislatura corrente: iniziative parlamentari e mozioni = 3, postulati = 2, interpellanze e domande = 1.', advancedTitle: 'ATTI PERSONALI PORTATI AVANTI', advancedBody: 'Punti ponderati per anno attivo per gli affari arrivati alla fase rilevante successiva. Domande e interpellanze richiedono una risposta ufficiale; mozioni e postulati una programmazione, un lavoro di commissione, un rinvio o un rapporto di attuazione; le iniziative parlamentari una programmazione o un esame in commissione/preliminare. Un generico stato di chiusura non basta. Sono valutati solo gli affari vecchi di almeno 12 mesi.', leadershipTitle: 'RUOLI DIRETTIVI ATTUALI', leadershipBody: 'Presidenza attuale di una commissione o di un gruppo parlamentare = 2 punti; vicepresidenza = 1. La semplice appartenenza non dà punti direttivi.', defMethodTitle: 'DEF — AFFIDABILITÀ & RESILIENZA', votingTitle: 'AFFIDABILITÀ DI VOTO', votingBody: 'Sì, no e astensione contano come partecipazione. «Non ha partecipato» riduce il tasso. Membri giustificati, la presidenza, le rare celle «sconosciuto» e l’isolato record «presente» senza decisione sono esclusi da numeratore e denominatore.', committeeTitle: 'LAVORO ATTUALE IN COMMISSIONE', committeeBody: 'Un punto per ogni seggio attuale in una commissione permanente; le supplenze valgono 0,35. Misura il carico personale del membro, non la forza del partito.', experienceTitle: 'ESPERIENZA PARLAMENTARE', experienceBody: 'Gli anni di mandato hanno rendimenti decrescenti e un tetto a 24 anni. L’esperienza aiuta senza lasciare che mandati molto lunghi dominino il punteggio.', ageTitle: 'ESPERIENZA ANAGRAFICA / RETE', ageBody: 'Un indicatore volutamente piccolo che cresce dai 35 anni e si ferma a 60. Il peso ridotto riconosce esperienza e reti senza rendere decisiva l’età.', inputsTitle: 'DAI DATI AI PUNTEGGI DELLE CARTE', inputsBody: 'Iniziativa negli atti, avanzamento, leadership e lavoro in commissione sono classificati separatamente per percentile nel Consiglio nazionale e nel Consiglio degli Stati. I risultati ATK e DEF ponderati sono riclassificati nella stessa camera e convertiti su una scala comune 45–97. Così le camere, strutturalmente diverse, restano comparabili premiando le differenze individuali.', rarityMethodBody: 'La rarità delle carte normali viene ricalcolata dalla nuova distribuzione OVR. La rarità non aumenta mai un punteggio. I membri del Consiglio federale restano mitici e usano una formula separata basata sull’anzianità esecutiva, perché non presentano atti né votano come i membri delle due camere.', dataSources: 'DATI & FONTI', scoreSnapshot: 'Istantanea dei punteggi: {date} · algoritmo v{version}', sourceOpenData: 'Panoramica Open Data del Parlamento svizzero', sourceOData: 'OData: membri, commissioni e stato degli atti personali', sourceVoting: 'Risultati ufficiali delle votazioni parlamentari', sourceWorkbooks: 'File di sessione del Consiglio nazionale e del Consiglio degli Stati', methodologyDisclaimer: 'I punteggi sono interpretazioni ludiche di dati ufficiali, non valutazioni pubblicate o approvate dall’Assemblea federale.',
}

const translations: Record<Language, Partial<Record<TranslationKey, string>>> = { en, de, fr, it }

const rarityNames: Record<Language, Record<RarityKey, string>> = {
  en: { common: 'COMMON', uncommon: 'UNCOMMON', rare: 'RARE', ultra: 'ULTRA RARE', legend: 'LEGENDARY', mythic: 'MYTHIC' },
  de: { common: 'GEWÖHNLICH', uncommon: 'UNGEWÖHNLICH', rare: 'SELTEN', ultra: 'ULTRASELTEN', legend: 'LEGENDÄR', mythic: 'MYTHISCH' },
  fr: { common: 'COMMUNE', uncommon: 'PEU COMMUNE', rare: 'RARE', ultra: 'ULTRA RARE', legend: 'LÉGENDAIRE', mythic: 'MYTHIQUE' },
  it: { common: 'COMUNE', uncommon: 'NON COMUNE', rare: 'RARA', ultra: 'ULTRA RARA', legend: 'LEGGENDARIA', mythic: 'MITICA' },
}

const sectorNames: Record<Language, Record<LobbyingSector, string>> = {
  en: { 'Economy & finance': 'Economy & finance', 'Health & social': 'Health & social', 'Energy & environment': 'Energy & environment', 'Transport & telecom': 'Transport & telecom', 'Education & culture': 'Education & culture', 'Agriculture & food': 'Agriculture & food', 'Security & defence': 'Security & defence', 'Law & justice': 'Law & justice', 'Foreign affairs': 'Foreign affairs', 'Politics & civic': 'Politics & civic' },
  de: { 'Economy & finance': 'Wirtschaft & Finanzen', 'Health & social': 'Gesundheit & Soziales', 'Energy & environment': 'Energie & Umwelt', 'Transport & telecom': 'Verkehr & Telekom', 'Education & culture': 'Bildung & Kultur', 'Agriculture & food': 'Landwirtschaft & Ernährung', 'Security & defence': 'Sicherheit & Verteidigung', 'Law & justice': 'Recht & Justiz', 'Foreign affairs': 'Aussenpolitik', 'Politics & civic': 'Politik & Zivilgesellschaft' },
  fr: { 'Economy & finance': 'Économie & finances', 'Health & social': 'Santé & social', 'Energy & environment': 'Énergie & environnement', 'Transport & telecom': 'Transports & télécoms', 'Education & culture': 'Formation & culture', 'Agriculture & food': 'Agriculture & alimentation', 'Security & defence': 'Sécurité & défense', 'Law & justice': 'Droit & justice', 'Foreign affairs': 'Affaires étrangères', 'Politics & civic': 'Politique & société civile' },
  it: { 'Economy & finance': 'Economia & finanza', 'Health & social': 'Salute & sociale', 'Energy & environment': 'Energia & ambiente', 'Transport & telecom': 'Trasporti & telecom', 'Education & culture': 'Formazione & cultura', 'Agriculture & food': 'Agricoltura & alimentazione', 'Security & defence': 'Sicurezza & difesa', 'Law & justice': 'Diritto & giustizia', 'Foreign affairs': 'Affari esteri', 'Politics & civic': 'Politica & società civile' },
}

const partyNames: Record<Language, Record<string, string>> = {
  en: { SVP: 'SVP', SP: 'SP', FDP: 'FDP', LDP: 'LDP', MITTE: 'THE CENTRE', GRUENE: 'GREENS', GLP: 'GLP', EVP: 'EVP', EDU: 'EDU', LEGA: 'LEGA', MCG: 'MCG', AL: 'PdA/AL', NONE: 'INDEPENDENT' },
  de: { SVP: 'SVP', SP: 'SP', FDP: 'FDP', LDP: 'LDP', MITTE: 'DIE MITTE', GRUENE: 'GRÜNE', GLP: 'GLP', EVP: 'EVP', EDU: 'EDU', LEGA: 'LEGA', MCG: 'MCG', AL: 'PdA/AL', NONE: 'PARTEILOS' },
  fr: { SVP: 'UDC', SP: 'PS', FDP: 'PLR', LDP: 'PLD', MITTE: 'LE CENTRE', GRUENE: 'LES VERT-E-S', GLP: 'PVL', EVP: 'PEV', EDU: 'UDF', LEGA: 'LEGA', MCG: 'MCG', AL: 'PdA/AL', NONE: 'SANS PARTI' },
  it: { SVP: 'UDC', SP: 'PS', FDP: 'PLR', LDP: 'PLD', MITTE: 'IL CENTRO', GRUENE: 'VERDI', GLP: 'PVL', EVP: 'PEV', EDU: 'UDF', LEGA: 'LEGA', MCG: 'MCG', AL: 'PdA/AL', NONE: 'INDIPENDENTE' },
}

export function normalizeLanguage(value: string | null | undefined): Language | null {
  const base = value?.trim().toLowerCase().split(/[-_]/)[0]
  return LANGUAGES.includes(base as Language) ? (base as Language) : null
}

export function detectBrowserLanguage(languages?: readonly string[]): Language {
  const candidates = languages ?? (typeof navigator === 'undefined' ? [] : [...navigator.languages, navigator.language])
  for (const candidate of candidates) {
    const supported = normalizeLanguage(candidate)
    if (supported) return supported
  }
  return 'en'
}

function initialLanguage(): Language {
  try {
    const saved = normalizeLanguage(localStorage.getItem(STORAGE_KEY))
    if (saved) return saved
  } catch {
    // Storage can be unavailable in private browsing; browser detection still works.
  }
  return detectBrowserLanguage()
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template
  return template.replace(/\{(\w+)\}/g, (match, key: string) => String(params[key] ?? match))
}

interface I18nValue {
  language: Language
  setLanguage: (language: Language) => void
  t: (key: TranslationKey, params?: Params) => string
  rarity: (rarity: RarityKey) => string
  sector: (sector: LobbyingSector) => string
  party: (code: string, fallback: string) => string
}

const I18nContext = createContext<I18nValue | null>(null)

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(initialLanguage)

  const setLanguage = (next: Language) => {
    setLanguageState(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // A language choice still applies for this session when storage is unavailable.
    }
  }

  useEffect(() => {
    document.documentElement.lang = language
    document.title = interpolate(translations[language].documentTitle ?? en.documentTitle)
  }, [language])

  const value = useMemo<I18nValue>(() => ({
    language,
    setLanguage,
    t: (key, params) => interpolate(translations[language][key] ?? en[key], params),
    rarity: (rarity) => rarityNames[language][rarity],
    sector: (sector) => sectorNames[language][sector],
    party: (code, fallback) => partyNames[language][fallback] ?? partyNames[language][code] ?? fallback,
  }), [language])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext)
  if (!value) throw new Error('useI18n must be used inside I18nProvider')
  return value
}
