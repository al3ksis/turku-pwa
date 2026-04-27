// solution-a-mockups.jsx — Solution A: Bussit-driven editing.
//
// Core idea: Bussit is the master place for stop management
// (add/remove/reorder/line filtering). Etusivu's "edit" is just
// "which of these do I want quick-glance on the home screen" —
// a checkbox list, no drag, no add UI.
//
// Mocks:
//   SA1 · Etusivu view mode    — unchanged glance list
//   SA2 · Etusivu edit sheet   — new: simple checkbox + link to Bussit
//   SA3 · Bussit edit mode     — existing edit mode + small hint copy
//   SA4 · Flow: tap "Hallitse" → lands in Bussit edit mode

const ALL_STOPS_SA = [
  { id: 'tori',    name: 'Market Square (City centre) D3', code: '1933', onHome: true,  lines: ['9A','9','8T','8'] },
  { id: 'ratiala', name: 'Rätiälänkatu',     code: '598',  onHome: true,  lines: ['9','9A','90','89','43'] },
  { id: 'yliop',   name: 'Yliopisto',                       code: 'Y3',   onHome: false, lines: ['18','42'] },
  { id: 'kupit',   name: 'Kupittaa asema',                  code: 'K2',   onHome: false, lines: ['1','32'] },
];

const sa_card = {
  background: DESIGN_TOKENS.card, borderRadius: 16, padding: 14, marginBottom: 12,
};

// ── Shared header for the home page ───────────────────────────
function SAPageHeader({ title = 'Hyvää huomenta' }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: DESIGN_TOKENS.text }}>TURKU</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: DESIGN_TOKENS.accent, marginBottom: 8 }}>ÅBO</div>
      <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>{title}</h1>
    </div>
  );
}

function SAGlanceRow({ stop }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${DESIGN_TOKENS.border}` }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: DESIGN_TOKENS.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{stop.name}</div>
        <div style={{ fontSize: 11, color: DESIGN_TOKENS.textMuted, marginTop: 2 }}>{stop.lines[0]} · {stop.lines[1]}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
        <span style={{ fontSize: 11, color: DESIGN_TOKENS.textMuted }}>12:54</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: DESIGN_TOKENS.accentGreen, fontVariantNumeric: 'tabular-nums' }}>10 min</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SA1 · Etusivu view mode (unchanged) — for reference
// ═══════════════════════════════════════════════════════════
function HomeViewMode() {
  const onHome = ALL_STOPS_SA.filter(s => s.onHome);
  return (
    <div style={{ padding: 16 }}>
      <SAPageHeader />
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', padding: '0 4px', marginBottom: 6 }}>
        <div style={{ fontSize: 17, fontWeight: 700 }}>Seuraavat bussit</div>
        <button style={{ background: 'none', border: 'none', color: DESIGN_TOKENS.accent, fontSize: 13, fontWeight: 600, padding: 0 }}>Muokkaa</button>
      </div>
      <div style={sa_card}>
        {onHome.map(s => <SAGlanceRow key={s.id} stop={s} />)}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SA2 · Etusivu edit sheet (NEW — checkbox only, link to Bussit)
// Bottom-sheet style
// ═══════════════════════════════════════════════════════════
function HomeEditSheet() {
  return (
    <div style={{ padding: 16, position: 'relative', height: '100%' }}>
      {/* Backdrop dimmed home behind */}
      <div style={{ opacity: 0.3, pointerEvents: 'none' }}>
        <SAPageHeader />
        <div style={sa_card}>
          {ALL_STOPS_SA.filter(s => s.onHome).map(s => <SAGlanceRow key={s.id} stop={s} />)}
        </div>
      </div>

      {/* Sheet */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        background: '#15151c', borderTopLeftRadius: 20, borderTopRightRadius: 20,
        padding: '14px 18px 22px',
        boxShadow: '0 -8px 24px rgba(0,0,0,0.4)',
      }}>
        <div style={{ width: 36, height: 4, borderRadius: 2, background: '#3a3a48', margin: '0 auto 14px' }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
          <h3 style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>Etusivulla näytettävät</h3>
          <button style={{ background: 'none', border: 'none', color: DESIGN_TOKENS.accentGreen, fontSize: 13, fontWeight: 600 }}>Valmis</button>
        </div>
        <p style={{ fontSize: 12, color: DESIGN_TOKENS.textMuted, margin: '0 0 14px', lineHeight: 1.4 }}>
          Pysäkkien järjestystä ja sisältöä hallitaan Bussit-näkymässä. Tästä valitset mitkä niistä nakyvat etusivulla.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {ALL_STOPS_SA.map(s => (
            <label key={s.id} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 4px', borderBottom: `1px solid ${DESIGN_TOKENS.border}`, cursor: 'pointer',
            }}>
              <div style={{
                width: 22, height: 22, borderRadius: 6,
                background: s.onHome ? DESIGN_TOKENS.accentGreen : 'transparent',
                border: `1.5px solid ${s.onHome ? DESIGN_TOKENS.accentGreen : '#444'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
              }}>
                {s.onHome && <svg width="12" height="12" viewBox="0 0 12 12"><path d="M2 6l3 3 5-6" stroke="#0a0a0f" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: DESIGN_TOKENS.text }}>{s.name}</div>
                <div style={{ fontSize: 11, color: DESIGN_TOKENS.textMuted, marginTop: 1 }}>Tunnus {s.code}</div>
              </div>
            </label>
          ))}
        </div>

        <button style={{
          marginTop: 16, width: '100%',
          background: 'transparent', border: `1px solid ${DESIGN_TOKENS.accent}`,
          color: DESIGN_TOKENS.accent, fontSize: 14, fontWeight: 600,
          padding: '12px 16px', borderRadius: 10, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          Hallitse pysäkkejä Bussit-näkymässä
          <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SA3 · Bussit edit mode (existing-ish, with hint copy)
// ═══════════════════════════════════════════════════════════
function BussitEditMode() {
  return (
    <div style={{ padding: 16 }}>
      <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.5, color: DESIGN_TOKENS.text }}>TURKU</div>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.8, color: DESIGN_TOKENS.accent, marginBottom: 8 }}>ÅBO</div>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, margin: 0, letterSpacing: -0.3 }}>Bussit</h1>
        <button style={{ background: 'none', border: 'none', color: DESIGN_TOKENS.accentGreen, fontSize: 14, fontWeight: 600 }}>Valmis</button>
      </div>
      <div style={{ fontSize: 12, color: DESIGN_TOKENS.textMuted, marginTop: 2, marginBottom: 4 }}>
        Föli · Turun seutu · <span style={{ color: DESIGN_TOKENS.accent }}>Muokkaustila</span>
      </div>
      {/* Hint copy */}
      <div style={{
        background: 'rgba(74, 158, 255, 0.08)',
        border: `1px solid rgba(74, 158, 255, 0.2)`,
        borderRadius: 10, padding: '10px 12px', marginTop: 10, marginBottom: 14,
        fontSize: 12, color: DESIGN_TOKENS.textSecondary, lineHeight: 1.4,
        display: 'flex', alignItems: 'flex-start', gap: 8,
      }}>
        <svg width="14" height="14" viewBox="0 0 14 14" style={{ flexShrink: 0, marginTop: 1, color: DESIGN_TOKENS.accent }}>
          <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" fill="none"/>
          <path d="M7 4v3.5M7 9.5v0.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
        </svg>
        <span>Muutokset näkyvät myös etusivun "Seuraavat bussit" -listassa.</span>
      </div>

      {ALL_STOPS_SA.slice(0, 2).map((s) => (
        <div key={s.id} style={{ ...sa_card, padding: '12px 14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <svg width="14" height="20" viewBox="0 0 14 20" style={{ color: DESIGN_TOKENS.textMuted, flexShrink: 0 }}>
              <circle cx="3" cy="5" r="1.3" fill="currentColor"/><circle cx="11" cy="5" r="1.3" fill="currentColor"/>
              <circle cx="3" cy="10" r="1.3" fill="currentColor"/><circle cx="11" cy="10" r="1.3" fill="currentColor"/>
              <circle cx="3" cy="15" r="1.3" fill="currentColor"/><circle cx="11" cy="15" r="1.3" fill="currentColor"/>
            </svg>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: DESIGN_TOKENS.accentGreen, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 800, color: '#0a0a0f' }}>F</div>
            <div style={{ flex: 1, fontSize: 14, fontWeight: 600 }}>{s.name}</div>
            <button style={{ background: 'none', border: 'none', color: DESIGN_TOKENS.textMuted, padding: 4, fontSize: 16 }}>✕</button>
          </div>
          <div style={{ fontSize: 10, color: DESIGN_TOKENS.textMuted, letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>SEURATUT LINJAT</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {s.lines.map(l => (
              <span key={l} style={{ background: DESIGN_TOKENS.accentGreen, color: '#0a0a0f', fontSize: 11, fontWeight: 700, padding: '4px 8px', borderRadius: 12 }}>✓ {l}</span>
            ))}
          </div>
        </div>
      ))}

      <div style={{ ...sa_card, padding: '12px 14px' }}>
        <div style={{ fontSize: 10, color: DESIGN_TOKENS.textMuted, letterSpacing: 0.6, fontWeight: 600, marginBottom: 6 }}>LISÄÄ PYSÄKKI</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="esim. 1933" style={{ flex: 1, background: 'transparent', border: `1px solid ${DESIGN_TOKENS.border}`, color: DESIGN_TOKENS.text, padding: '10px 12px', borderRadius: 8, fontSize: 14, fontFamily: 'inherit' }} />
          <button style={{ background: DESIGN_TOKENS.accent, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600 }}>Lisää</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SA4 · Flow diagram — three frames showing the journey
// ═══════════════════════════════════════════════════════════
function FlowDiagram() {
  const Step = ({ n, title, desc }) => (
    <div style={{ padding: '12px 14px', background: DESIGN_TOKENS.card, borderRadius: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
        <span style={{ width: 22, height: 22, borderRadius: '50%', background: DESIGN_TOKENS.accent, color: '#fff', fontSize: 12, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{n}</span>
        <span style={{ fontSize: 14, fontWeight: 700 }}>{title}</span>
      </div>
      <div style={{ fontSize: 12, color: DESIGN_TOKENS.textSecondary, lineHeight: 1.5, paddingLeft: 32 }}>{desc}</div>
    </div>
  );
  return (
    <div style={{ padding: 16, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: DESIGN_TOKENS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Mentaalimalli</div>
      <div style={{ background: '#15151c', padding: '14px 16px', borderRadius: 12, marginBottom: 18, fontSize: 13, lineHeight: 1.5, color: DESIGN_TOKENS.text }}>
        <strong style={{ color: DESIGN_TOKENS.accent }}>Bussit</strong> on master-lista pysäkeille. <strong>Etusivu</strong> on ote siitä — valitse mitkä haluat nähdä nopeasti.
      </div>

      <div style={{ fontSize: 11, fontWeight: 700, color: DESIGN_TOKENS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Käyttäjän polku</div>
      <Step n="1" title="Etusivu · Muokkaa" desc="Käyttäjä napauttaa 'Muokkaa' Seuraavat bussit -otsikon vierestä." />
      <Step n="2" title="Sheet aukeaa" desc="Pelkkä checkbox-lista omista pysäkeistä. Ei drag handlea, ei poistoa, ei lisäysketjä." />
      <Step n="3a" title="Vähemmän näyttöön → toggle pois" desc="Pysäkki häviää etusivulta, mutta säilyy Bussit-listassa." />
      <Step n="3b" title="Hallitse pysäkkejä → vie Bussit-tabiin" desc="Sheet sulkeutuu, alapalkista valitaan Bussit, näkymä aukeaa muokkaustilassa." />

      <div style={{ marginTop: 18, fontSize: 11, fontWeight: 700, color: DESIGN_TOKENS.textMuted, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 10 }}>Mitä muuttuu</div>
      <ul style={{ fontSize: 12, color: DESIGN_TOKENS.textSecondary, lineHeight: 1.6, paddingLeft: 16, margin: 0 }}>
        <li>Etusivun sheet on radikaalisti yksinkertaisempi</li>
        <li>Etusivun järjestys = Bussit-listan järjestys (ei erillistä)</li>
        <li>Pysäkin lisäys ja poisto vain Bussit-näkymässä</li>
        <li>Bussit-muokkaustilan otsikon alle pieni vihje yhteydestä etusivuun</li>
      </ul>
    </div>
  );
}

Object.assign(window, {
  HomeViewMode, HomeEditSheet, BussitEditMode, FlowDiagram,
});
