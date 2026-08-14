import type { CSSProperties, ReactNode } from 'react'
import { META } from '../data/members'
import { SwissCross } from '../components/CardBack'

const AB = "'Archivo Black',sans-serif"
const MONO = "'IBM Plex Mono',monospace"
const SCORE_SOURCES = META.scoreSources ?? {
  openData: 'https://www.parlament.ch/de/%C3%BCber-das-parlament/fakten-und-zahlen/open-data-web-services',
  odata: 'https://ws.parlament.ch/odata.svc/',
  voting: 'https://www.parlament.ch/de/ratsbetrieb/abstimmungen',
  votingWorkbooks: 'https://www.parlament.ch/de/ratsbetrieb/abstimmungen/abstimmung-nr-xls',
}

const section: CSSProperties = {
  padding: '17px 18px',
  borderRadius: 14,
  background: '#0B121D',
  border: '1px solid rgba(234,242,255,.11)',
}

function Metric({ weight, color, title, children }: { weight: string; color: string; title: string; children: ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '48px 1fr', gap: 11, alignItems: 'start' }}>
      <div style={{ fontFamily: AB, fontSize: 16, color, lineHeight: 1 }}>{weight}</div>
      <div>
        <div style={{ fontFamily: AB, fontSize: 11, color: '#EAF2FF', letterSpacing: '.025em' }}>{title}</div>
        <div style={{ marginTop: 3, color: '#91A6C1', fontSize: 12, lineHeight: 1.5 }}>{children}</div>
      </div>
    </div>
  )
}

function SourceLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" style={{ textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children} ↗
    </a>
  )
}

export function Methodology({ onClose }: { onClose: () => void }) {
  return (
    <main style={{ padding: '22px 20px 50px', display: 'flex', flexDirection: 'column', gap: 14, animation: 'riseIn 260ms ease-out' }}>
      <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <SwissCross size={24} />
          <div style={{ fontFamily: AB, fontSize: 13, letterSpacing: '.08em' }}>SCORE LAB</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '8px 11px', borderRadius: 9, border: '1px solid rgba(234,242,255,.16)', color: '#AFC0D5', fontFamily: MONO, fontSize: 10 }}
        >
          ← BACK TO GAME
        </button>
      </header>

      <div>
        <h1 style={{ margin: 0, fontFamily: AB, fontSize: 31, lineHeight: 1, letterSpacing: '-.035em' }}>HOW THE SCORES WORK</h1>
        <p style={{ margin: '9px 0 0', color: '#9FB6D2', fontSize: 13, lineHeight: 1.55 }}>
          ATK rewards personal drive and follow-through. DEF rewards personal reliability and institutional staying power. Party size, party prestige, lobbying links and campaign finance are deliberately excluded.
        </p>
      </div>

      <section style={{ ...section, borderColor: 'rgba(255,95,162,.32)' }}>
        <h2 style={{ margin: '0 0 14px', fontFamily: AB, fontSize: 16, color: '#FF5FA2' }}>ATK — DRIVE &amp; INITIATIVE</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Metric weight="45%" color="#FF5FA2" title="PERSONALLY AUTHORED PROPOSAL DRIVE">
            Weighted points per active year in the current legislature: parliamentary initiatives and motions = 3, postulates = 2, interpellations and questions = 1.
          </Metric>
          <Metric weight="30%" color="#FF5FA2" title="AUTHORED PROPOSALS ADVANCED">
            Weighted points per active year for affairs that reached their next meaningful stage. Questions/interpellations need an official answer; motions/postulates need scheduling, committee work, referral or implementation reporting; parliamentary initiatives need scheduling or committee/preliminary review. A generic closed status alone is not proof. Only affairs at least 12 months old are judged.
          </Metric>
          <Metric weight="25%" color="#FF5FA2" title="CURRENT LEADERSHIP">
            Current committee or parliamentary-group president = 2 points; vice-president = 1. Ordinary membership does not create leadership points.
          </Metric>
        </div>
      </section>

      <section style={{ ...section, borderColor: 'rgba(47,211,196,.32)' }}>
        <h2 style={{ margin: '0 0 14px', fontFamily: AB, fontSize: 16, color: '#2FD3C4' }}>DEF — RELIABILITY &amp; RESILIENCE</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Metric weight="20%" color="#2FD3C4" title="VOTING RELIABILITY">
            Yes, no and abstention count as participation. “Did not participate” counts against the rate. Excused members, the presiding member, rare source cells marked “unknown,” and the isolated “present” record without a decision are excluded from both sides of the fraction.
          </Metric>
          <Metric weight="45%" color="#2FD3C4" title="CURRENT COMMITTEE WORK">
            One point per current standing-committee seat; substitute seats count 0.35. This measures the member’s own workload, not their party’s strength.
          </Metric>
          <Metric weight="30%" color="#2FD3C4" title="PARLIAMENTARY EXPERIENCE">
            Years served with diminishing returns, reaching the cap at 24 years. Experience therefore helps without letting very long tenure dominate the score.
          </Metric>
          <Metric weight="5%" color="#2FD3C4" title="AGE EXPERIENCE / NETWORK">
            A deliberately small proxy that rises from age 35 and caps at 60. Its low weight acknowledges experience and networks without making age decisive.
          </Metric>
        </div>
      </section>

      <section style={section}>
        <h2 style={{ margin: '0 0 9px', fontFamily: AB, fontSize: 15, color: '#FFC53D' }}>FROM INPUTS TO CARD NUMBERS</h2>
        <div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.6 }}>
          Proposal drive, advancement, leadership and committee workload are percentile-ranked separately inside the National Council and Council of States. The weighted ATK and DEF results are ranked once more inside the same chamber and mapped to a shared 45–97 card scale. This keeps structurally different chambers comparable while rewarding differences between individuals.
          <div style={{ marginTop: 9, padding: '10px 12px', borderRadius: 9, background: 'rgba(255,197,61,.07)', color: '#E8D89E', fontFamily: MONO, fontSize: 10.5 }}>
            OVR = 45% ATK + 45% DEF + 10% lower of ATK/DEF
          </div>
          <p style={{ margin: '9px 0 0' }}>Regular-card rarity is reapplied from the new OVR distribution. Rarity never boosts a score. Federal Councillors remain mythic and use a separate executive-tenure formula because they do not submit or vote like members of either chamber.</p>
        </div>
      </section>

      <section style={section}>
        <h2 style={{ margin: '0 0 9px', fontFamily: AB, fontSize: 15, color: '#C9B8FF' }}>DATA &amp; SOURCES</h2>
        <div style={{ color: '#9FB6D2', fontSize: 12, lineHeight: 1.65 }}>
          <p style={{ margin: '0 0 8px' }}>Score snapshot: {META.generatedAt} · algorithm v{META.algorithmVersion ?? 2}</p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <li><SourceLink href={SCORE_SOURCES.openData}>Swiss Parliament Open Data overview</SourceLink></li>
            <li><SourceLink href={SCORE_SOURCES.odata}>OData: members, committees and authored-affair status</SourceLink></li>
            <li><SourceLink href={SCORE_SOURCES.voting}>Official parliamentary voting records</SourceLink></li>
            <li><SourceLink href={SCORE_SOURCES.votingWorkbooks}>National Council and Council of States session workbooks</SourceLink></li>
          </ul>
          <p style={{ margin: '10px 0 0', color: '#7187A4' }}>The scores are game-created interpretations of official records, not ratings published or endorsed by the Swiss Federal Assembly.</p>
        </div>
      </section>
    </main>
  )
}
