import type { Language } from '../i18n'

export interface UpdateItem {
  id: string
  date: string
  title: string
  body: string
}

interface UpdatesCopy {
  eyebrow: string
  title: string
  intro: string
  items: readonly UpdateItem[]
}

const STORAGE_KEY = 'bundeshaus-updates-read-v1'

const content: Record<Language, UpdatesCopy> = {
  en: {
    eyebrow: 'WHAT’S NEW',
    title: 'Updates',
    intro: 'Short notes about new features, improvements, and other news from Bundeshaus Pack.',
    items: [
      {
        id: '2026-08-29-campaign-mode',
        date: '2026-08-29',
        title: 'Campaign mode arrives',
        body: 'Take one card from a Common opponent all the way to Mythic. Bank your growing pack reward after a win or keep going—but one loss forfeits it. However the campaign ends, the card is exhausted until the next day.',
      },
      {
        id: '2026-08-28-updates',
        date: '2026-08-28',
        title: 'A home for project news',
        body: 'This updates page is now live. The yellow dot in the footer will let you know whenever another note has been posted.',
      },
    ],
  },
  de: {
    eyebrow: 'WAS IST NEU?',
    title: 'Neuigkeiten',
    intro: 'Kurze Meldungen zu neuen Funktionen, Verbesserungen und weiteren Neuigkeiten rund um Bundeshaus Pack.',
    items: [
      {
        id: '2026-08-29-campaign-mode',
        date: '2026-08-29',
        title: 'Der Kampagnenmodus ist da',
        body: 'Führe eine Karte von einem gewöhnlichen Gegner bis zu Mythisch. Sichere nach einem Sieg deine wachsende Pack-Belohnung oder mache weiter – aber eine Niederlage kostet alles. Unabhängig vom Ausgang ist die Karte danach bis zum nächsten Tag erschöpft.',
      },
      {
        id: '2026-08-28-updates',
        date: '2026-08-28',
        title: 'Ein Ort für Projektneuigkeiten',
        body: 'Diese Neuigkeiten-Seite ist jetzt online. Der gelbe Punkt im Footer zeigt dir künftig, wenn eine weitere Meldung veröffentlicht wurde.',
      },
    ],
  },
  fr: {
    eyebrow: 'NOUVEAUTÉS',
    title: 'Actualités',
    intro: 'De brèves nouvelles sur les fonctionnalités, les améliorations et les autres actualités de Bundeshaus Pack.',
    items: [
      {
        id: '2026-08-29-campaign-mode',
        date: '2026-08-29',
        title: 'Le mode Campagne est arrivé',
        body: 'Mène une carte d’un adversaire commun jusqu’au niveau mythique. Encaisse une récompense croissante après une victoire ou continue, mais une défaite fait tout perdre. Quelle que soit l’issue, la carte est ensuite épuisée jusqu’au lendemain.',
      },
      {
        id: '2026-08-28-updates',
        date: '2026-08-28',
        title: 'Un espace pour les actualités du projet',
        body: 'Cette page d’actualités est maintenant disponible. Le point jaune dans le pied de page t’indiquera lorsqu’une nouvelle note aura été publiée.',
      },
    ],
  },
  it: {
    eyebrow: 'NOVITÀ',
    title: 'Aggiornamenti',
    intro: 'Brevi notizie su nuove funzionalità, miglioramenti e altre novità di Bundeshaus Pack.',
    items: [
      {
        id: '2026-08-29-campaign-mode',
        date: '2026-08-29',
        title: 'Arriva la modalità Campagna',
        body: 'Porta una carta da un avversario comune fino al livello mitico. Incassa la ricompensa crescente dopo una vittoria o continua, ma una sconfitta fa perdere tutto. Qualunque sia l’esito, la carta resta poi esaurita fino al giorno successivo.',
      },
      {
        id: '2026-08-28-updates',
        date: '2026-08-28',
        title: 'Uno spazio per le novità del progetto',
        body: 'Questa pagina degli aggiornamenti è ora disponibile. Il punto giallo nel piè di pagina ti segnalerà quando verrà pubblicata un’altra nota.',
      },
    ],
  },
  rm: {
    eyebrow: 'TGE DATTI DA NOV?',
    title: 'Novitads',
    intro: 'Curtas infurmaziuns davart novas funcziuns, meglieraziuns ed autras novitads da Bundeshaus Pack.',
    items: [
      {
        id: '2026-08-29-campaign-mode',
        date: '2026-08-29',
        title: 'Il modus da campagna è qua',
        body: 'Maina ina carta d’in adversari cumin fin al nivel mitic. Segirescha la recompensa creschenta suenter ina victoria u cuntinuescha, ma ina terrada fa perder tut. Independentamain da la fin è la carta silsuenter exausta fin l’auter di.',
      },
      {
        id: '2026-08-28-updates',
        date: '2026-08-28',
        title: 'In lieu per novitads dal project',
        body: 'Questa pagina da novitads è ussa online. Il punct mellen en il pe da pagina ta mussa en l’avegnir, cura ch’ina nova infurmaziun è vegnida publitgada.',
      },
    ],
  },
}

export const LATEST_UPDATE_ID = content.en.items[0].id

export function updatesContent(language: Language): UpdatesCopy {
  return content[language]
}

export function hasUnreadUpdates(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== LATEST_UPDATE_ID
  } catch {
    return true
  }
}

export function markUpdatesRead(): void {
  try {
    localStorage.setItem(STORAGE_KEY, LATEST_UPDATE_ID)
  } catch {
    /* Keep the indicator when storage is unavailable. */
  }
}
