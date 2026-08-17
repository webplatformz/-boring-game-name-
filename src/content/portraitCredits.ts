import type { Language } from '../i18n'

interface PortraitCreditsCopy {
  eyebrow: string
  title: string
  intro: string
  summary: (count: number) => string
  authorLabel: string
  attributionLabel: string
  licenceLabel: string
  sourceLabel: string
  changesLabel: string
  changesBody: string
  attributionOnly: string
  sourceLink: string
}

const content: Record<Language, PortraitCreditsCopy> = {
  en: {
    eyebrow: 'PHOTO CREDITS',
    title: 'Portrait sources and licences',
    intro: 'Portraits were obtained from Wikimedia Commons. Wikimedia does not own most files: the permission and attribution requirements shown on each linked file page apply.',
    summary: (count) => `${count} portraits with individual source and licence records.`,
    authorLabel: 'Author / rights holder',
    attributionLabel: 'Required credit',
    licenceLabel: 'Licence',
    sourceLabel: 'Source file',
    changesLabel: 'Changes',
    changesBody: 'Square-cropped, resized to 512 × 512 pixels and converted to WebP by Bundeshaus Pack.',
    attributionOnly: 'Attribution-only permission — see the Commons file page',
    sourceLink: 'OPEN COMMONS FILE ↗',
  },
  de: {
    eyebrow: 'BILDNACHWEISE',
    title: 'Portraitquellen und Lizenzen',
    intro: 'Die Portraits stammen von Wikimedia Commons. Wikimedia besitzt die meisten Dateien nicht; massgebend sind die Freigabe- und Namensnennungsbedingungen der jeweils verlinkten Dateiseite.',
    summary: (count) => `${count} Portraits mit individuellem Quellen- und Lizenznachweis.`,
    authorLabel: 'Urheber / Rechteinhaber',
    attributionLabel: 'Vorgeschriebene Nennung',
    licenceLabel: 'Lizenz',
    sourceLabel: 'Quelldatei',
    changesLabel: 'Bearbeitung',
    changesBody: 'Quadratisch zugeschnitten, auf 512 × 512 Pixel skaliert und durch Bundeshaus Pack in WebP umgewandelt.',
    attributionOnly: 'Freigabe mit Namensnennung — siehe Commons-Dateiseite',
    sourceLink: 'COMMONS-DATEI ÖFFNEN ↗',
  },
  fr: {
    eyebrow: 'CRÉDITS PHOTO',
    title: 'Sources et licences des portraits',
    intro: 'Les portraits proviennent de Wikimedia Commons. Wikimedia ne possède pas la plupart des fichiers ; les conditions d’autorisation et d’attribution indiquées sur chaque page liée s’appliquent.',
    summary: (count) => `${count} portraits avec une source et une licence individuelles.`,
    authorLabel: 'Auteur / titulaire des droits',
    attributionLabel: 'Crédit requis',
    licenceLabel: 'Licence',
    sourceLabel: 'Fichier source',
    changesLabel: 'Modifications',
    changesBody: 'Recadré au format carré, redimensionné à 512 × 512 pixels et converti en WebP par Bundeshaus Pack.',
    attributionOnly: 'Autorisation avec attribution — voir la page du fichier Commons',
    sourceLink: 'OUVRIR LE FICHIER COMMONS ↗',
  },
  it: {
    eyebrow: 'CREDITI FOTO',
    title: 'Fonti e licenze dei ritratti',
    intro: 'I ritratti provengono da Wikimedia Commons. Wikimedia non possiede la maggior parte dei file; si applicano le condizioni di autorizzazione e attribuzione indicate nella pagina collegata di ciascun file.',
    summary: (count) => `${count} ritratti con fonte e licenza individuali.`,
    authorLabel: 'Autore / titolare dei diritti',
    attributionLabel: 'Attribuzione richiesta',
    licenceLabel: 'Licenza',
    sourceLabel: 'File sorgente',
    changesLabel: 'Modifiche',
    changesBody: 'Ritagliato in formato quadrato, ridimensionato a 512 × 512 pixel e convertito in WebP da Bundeshaus Pack.',
    attributionOnly: 'Autorizzazione con attribuzione — vedi la pagina del file Commons',
    sourceLink: 'APRI IL FILE COMMONS ↗',
  },
}

export function portraitCreditsContent(language: Language): PortraitCreditsCopy {
  return content[language]
}
