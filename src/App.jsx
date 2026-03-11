import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, RadialBarChart, RadialBar } from "recharts";

const COLORS = {
  pf: "#00C9A7",
  os: "#4F8EF7",
  overlap: "#F5A623",
  only_pf: "#00C9A7",
  only_os: "#4F8EF7",
  bg: "#0D1117",
  card: "#161B22",
  border: "#30363D",
  text: "#E6EDF3",
  muted: "#8B949E",
  accent: "#58A6FF",
};

const DATA = {
  categories: [
    {
      id: "it",
      label: "Missing Intelligent Tiering on S3",
      shortLabel: "S3 Intelligent Tiering",
      pf: { total: 52, exclusive: 48, saving: 2373.29 },
      os: { total: 40, exclusive: 36, saving: 1734.04 },
      overlap: 4,
      overlapSaving: { pf: 588.22, os: 951.27 },
      note: "OptScale detecta apenas ausência direta de IT. PointFive agrupa 3 variantes complementares.",
      pfVariants: [
        { name: "Missing Intelligent-Tiering on an S3 Bucket", count: 48, saving: 1490.67, primary: true },
        { name: "Disabled Archive Tiers in an S3 Bucket IT Config", count: 2, saving: 868.49, primary: false },
        { name: "Delayed Transition of Objects to Intelligent-Tiering", count: 2, saving: 14.13, primary: false },
      ],
      osVariants: [
        { name: "Missing Intelligent Tiering on S3", count: 40, saving: 1734.04, primary: true },
      ],
    },
    {
      id: "s3",
      label: "Abandoned S3 Buckets",
      shortLabel: "Abandoned S3",
      pf: { total: 223, exclusive: 201, saving: 530.23 },
      os: { total: 100, exclusive: 78, saving: 13545.89 },
      overlap: 22,
      overlapSaving: { pf: 34.60, os: 42.54 },
      note: "Mesma semântica, mas critérios de inatividade divergem: OptScale captura valor de storage, PointFive foca em acesso.",
      pfVariants: [
        { name: "Inactive S3 Bucket", count: 223, saving: 530.23, primary: true },
      ],
      osVariants: [
        { name: "Abandoned S3 Buckets (get=0, put=0)", count: 100, saving: 13545.89, primary: true },
      ],
    },
    {
      id: "cw",
      label: "Inactive CloudWatch Log Group",
      shortLabel: "CloudWatch Logs",
      pf: { total: 43, exclusive: 43, saving: 2232.77 },
      os: { total: 100, exclusive: 100, saving: 0.00 },
      overlap: 0,
      overlapSaving: { pf: 0, os: 0 },
      note: "Zero overlap. OptScale detecta grupos com 0 bytes (custo real ≈ $0). PointFive detecta grupos com dados mas sem ingestão ativa — saving real.",
      pfVariants: [
        { name: "Inactive CloudWatch Log Group (com dados, sem ingestão)", count: 43, saving: 2232.77, primary: true },
      ],
      osVariants: [
        { name: "Inactive CloudWatch Log Group (stored_bytes = 0)", count: 100, saving: 0.00, primary: true },
      ],
    },
  ],
};

const totalPF = DATA.categories.reduce((s, c) => s + c.pf.saving, 0);
const totalOS = DATA.categories.reduce((s, c) => s + c.os.saving, 0);
const totalResources = DATA.categories.reduce((a, c) => ({
  pf: a.pf + c.pf.total,
  os: a.os + c.os.total,
}), { pf: 0, os: 0 });

const fmt = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
const fmtFull = (v) => `$${v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function VariantPill({ name, count, saving, primary }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px",
      background: primary ? "rgba(0,201,167,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${primary ? "rgba(0,201,167,0.3)" : COLORS.border}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: primary ? COLORS.pf : COLORS.muted, fontFamily: "monospace", lineHeight: 1.4 }}>{name}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: COLORS.muted }}>{count} recursos</span>
          <span style={{ fontSize: 11, color: saving > 0 ? "#7FD99C" : COLORS.muted }}>
            {saving > 0 ? `${fmtFull(saving)}/mês` : "saving ≈ $0"}
          </span>
        </div>
      </div>
      {primary && <span style={{ fontSize: 9, padding: "2px 6px", background: "rgba(0,201,167,0.15)", color: COLORS.pf, borderRadius: 4, border: "1px solid rgba(0,201,167,0.3)", whiteSpace: "nowrap" }}>principal</span>}
    </div>
  );
}

function OSVariantPill({ name, count, saving, primary }) {
  return (
    <div style={{
      display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 12px",
      background: primary ? "rgba(79,142,247,0.08)" : "rgba(255,255,255,0.03)",
      border: `1px solid ${primary ? "rgba(79,142,247,0.3)" : COLORS.border}`,
      borderRadius: 8, marginBottom: 6,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: primary ? COLORS.os : COLORS.muted, fontFamily: "monospace", lineHeight: 1.4 }}>{name}</div>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <span style={{ fontSize: 11, color: COLORS.muted }}>{count} recursos</span>
          <span style={{ fontSize: 11, color: saving > 0 ? "#7FD99C" : COLORS.muted }}>
            {saving > 0 ? `${fmtFull(saving)}/mês` : "saving ≈ $0"}
          </span>
        </div>
      </div>
    </div>
  );
}

function OverlapVenn({ overlap, pfOnly, osOnly }) {
  const total = pfOnly + osOnly + overlap;
  const pfRadius = 60;
  const osRadius = 60;
  const overlapColor = COLORS.overlap;
  const pct = total > 0 ? Math.round((overlap / total) * 100) : 0;

  return (
    <div style={{ textAlign: "center", padding: "8px 0" }}>
      <svg width="160" height="80" viewBox="0 0 160 80">
        <circle cx="58" cy="40" r="35" fill={COLORS.pf} fillOpacity="0.18" stroke={COLORS.pf} strokeWidth="1.5" />
        <circle cx="102" cy="40" r="35" fill={COLORS.os} fillOpacity="0.18" stroke={COLORS.os} strokeWidth="1.5" />
        <text x="42" y="44" textAnchor="middle" fill={COLORS.pf} fontSize="13" fontWeight="bold">{pfOnly}</text>
        <text x="118" y="44" textAnchor="middle" fill={COLORS.os} fontSize="13" fontWeight="bold">{osOnly}</text>
        <text x="80" y="44" textAnchor="middle" fill={overlapColor} fontSize="13" fontWeight="bold">{overlap}</text>
      </svg>
      <div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 4 }}>
        <span style={{ fontSize: 10, color: COLORS.pf }}>● só PointFive</span>
        <span style={{ fontSize: 10, color: overlapColor }}>● ambas</span>
        <span style={{ fontSize: 10, color: COLORS.os }}>● só OptScale</span>
      </div>
      <div style={{ marginTop: 6, fontSize: 11, color: COLORS.muted }}>{pct}% de overlap entre ferramentas</div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: "#1C2128", border: `1px solid ${COLORS.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ color: COLORS.text, fontSize: 12, marginBottom: 6, fontWeight: 600 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color, fontSize: 11, marginBottom: 2 }}>
          {p.name}: {typeof p.value === "number" && p.name?.includes("$") ? fmtFull(p.value) : p.value}
        </div>
      ))}
    </div>
  );
};

const savingChartData = DATA.categories.map(c => ({
  name: c.shortLabel,
  "PointFive ($)": c.pf.saving,
  "OptScale ($)": c.os.saving,
}));

const resourceChartData = DATA.categories.map(c => ({
  name: c.shortLabel,
  "PointFive": c.pf.total,
  "OptScale": c.os.total,
}));

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");
  const [expandedCat, setExpandedCat] = useState(null);

  const tabs = [
    { id: "overview", label: "Visão Geral" },
    { id: "resources", label: "Recursos" },
    { id: "savings", label: "Savings" },
    { id: "mapping", label: "Mapeamento" },
  ];

  return (
    <div style={{
      background: COLORS.bg, minHeight: "100vh", color: COLORS.text,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      padding: "32px 24px",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: ${COLORS.bg}; }
        ::-webkit-scrollbar-thumb { background: ${COLORS.border}; border-radius: 3px; }
        .tab-btn { cursor: pointer; transition: all 0.15s; }
        .tab-btn:hover { border-color: ${COLORS.accent} !important; color: ${COLORS.accent} !important; }
        .cat-card { cursor: pointer; transition: border-color 0.15s; }
        .cat-card:hover { border-color: rgba(88,166,255,0.4) !important; }
      `}</style>

      {/* Header */}
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 4, height: 28, background: `linear-gradient(180deg, ${COLORS.pf}, ${COLORS.os})`, borderRadius: 2 }} />
            <h1 style={{ fontSize: 22, fontWeight: 700, color: COLORS.text, margin: 0, letterSpacing: "-0.5px" }}>
              PointFive <span style={{ color: COLORS.muted }}>vs</span> OptScale
            </h1>
            <span style={{ fontSize: 11, padding: "3px 8px", background: "rgba(88,166,255,0.1)", color: COLORS.accent, borderRadius: 4, border: `1px solid rgba(88,166,255,0.2)` }}>
              3 categorias mapeadas
            </span>
          </div>
          <p style={{ fontSize: 12, color: COLORS.muted, margin: 0 }}>
            Comparativo de oportunidades de otimização — features agrupadas por equivalência semântica
          </p>
        </div>

        {/* Legend Banner */}
        <div style={{
          background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.border}`,
          borderRadius: 10, padding: "14px 20px", marginBottom: 24,
          display: "flex", flexWrap: "wrap", gap: 20, alignItems: "center"
        }}>
          <span style={{ fontSize: 11, color: COLORS.muted, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em" }}>Legenda</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.pf }} />
            <span style={{ fontSize: 11, color: COLORS.text }}>PointFive</span>
            <span style={{ fontSize: 10, color: COLORS.muted }}>(features agrupadas por categoria)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.os }} />
            <span style={{ fontSize: 11, color: COLORS.text }}>OptScale</span>
            <span style={{ fontSize: 10, color: COLORS.muted }}>(1 recomendação por categoria)</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: COLORS.overlap }} />
            <span style={{ fontSize: 11, color: COLORS.text }}>Overlap</span>
            <span style={{ fontSize: 10, color: COLORS.muted }}>(recurso detectado por ambas)</span>
          </div>
          <div style={{ marginLeft: "auto", fontSize: 10, color: COLORS.muted }}>
            PointFive: status open / validated / in_progress · Saving mensal (USD)
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              className="tab-btn"
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: "8px 16px", borderRadius: 6, fontSize: 12, fontFamily: "inherit",
                background: activeTab === t.id ? "rgba(88,166,255,0.12)" : "transparent",
                border: `1px solid ${activeTab === t.id ? "rgba(88,166,255,0.5)" : COLORS.border}`,
                color: activeTab === t.id ? COLORS.accent : COLORS.muted,
                cursor: "pointer", fontWeight: activeTab === t.id ? 600 : 400,
              }}
            >{t.label}</button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {activeTab === "overview" && (
          <>
            {/* KPI Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
              {[
                { label: "Saving total PointFive", value: fmt(totalPF), sub: "/mês · 3 categorias", color: COLORS.pf },
                { label: "Saving total OptScale", value: fmt(totalOS), sub: "/mês · 3 categorias", color: COLORS.os },
                { label: "Recursos PointFive", value: totalResources.pf.toLocaleString(), sub: "oportunidades ativas", color: COLORS.pf },
                { label: "Recursos OptScale", value: totalResources.os.toLocaleString(), sub: "oportunidades detectadas", color: COLORS.os },
              ].map((k, i) => (
                <div key={i} style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, padding: "16px 18px",
                  borderTop: `3px solid ${k.color}`,
                }}>
                  <div style={{ fontSize: 10, color: COLORS.muted, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{k.label}</div>
                  <div style={{ fontSize: 24, fontWeight: 700, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: 10, color: COLORS.muted, marginTop: 4 }}>{k.sub}</div>
                </div>
              ))}
            </div>

            {/* Category Summary Cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {DATA.categories.map(cat => (
                <div key={cat.id} style={{
                  background: COLORS.card, border: `1px solid ${COLORS.border}`,
                  borderRadius: 10, padding: "18px",
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.text, marginBottom: 14, lineHeight: 1.3 }}>{cat.label}</div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                    <div style={{ background: "rgba(0,201,167,0.06)", border: "1px solid rgba(0,201,167,0.2)", borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 9, color: COLORS.pf, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>PointFive</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.pf }}>{cat.pf.total}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>recursos</div>
                      <div style={{ fontSize: 12, color: "#7FD99C", marginTop: 6, fontWeight: 600 }}>{fmt(cat.pf.saving)}/mês</div>
                    </div>
                    <div style={{ background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 6, padding: "10px 12px" }}>
                      <div style={{ fontSize: 9, color: COLORS.os, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>OptScale</div>
                      <div style={{ fontSize: 20, fontWeight: 700, color: COLORS.os }}>{cat.os.total}</div>
                      <div style={{ fontSize: 10, color: COLORS.muted }}>recursos</div>
                      <div style={{ fontSize: 12, color: "#7FD99C", marginTop: 6, fontWeight: 600 }}>{fmt(cat.os.saving)}/mês</div>
                    </div>
                  </div>

                  <div style={{
                    padding: "8px 10px", background: "rgba(245,166,35,0.06)",
                    border: "1px solid rgba(245,166,35,0.2)", borderRadius: 6,
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                  }}>
                    <span style={{ fontSize: 10, color: COLORS.muted }}>Overlap</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: COLORS.overlap }}>{cat.overlap} recursos</span>
                  </div>

                  {cat.pfVariants.length > 1 && (
                    <div style={{
                      marginTop: 10, padding: "6px 10px",
                      background: "rgba(0,201,167,0.04)", border: "1px dashed rgba(0,201,167,0.25)",
                      borderRadius: 6,
                    }}>
                      <div style={{ fontSize: 9, color: COLORS.pf, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4 }}>
                        {cat.pfVariants.length} variantes agrupadas →
                      </div>
                      {cat.pfVariants.map((v, i) => (
                        <div key={i} style={{ fontSize: 10, color: COLORS.muted, paddingLeft: 6, marginBottom: 2 }}>
                          <span style={{ color: v.primary ? COLORS.pf : "rgba(0,201,167,0.5)" }}>{'▸'}</span> {v.name.length > 40 ? v.name.slice(0, 40) + "…" : v.name}
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: 10, fontSize: 10, color: COLORS.muted, lineHeight: 1.5, padding: "8px 0", borderTop: `1px solid ${COLORS.border}` }}>
                    {cat.note}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── RESOURCES TAB ── */}
        {activeTab === "resources" && (
          <div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 20px", fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Recursos Detectados por Categoria</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={resourceChartData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="PointFive" fill={COLORS.pf} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="OptScale" fill={COLORS.os} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {DATA.categories.map(cat => (
                <div key={cat.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, marginBottom: 14 }}>{cat.shortLabel}</div>
                  <OverlapVenn overlap={cat.overlap} pfOnly={cat.pf.exclusive} osOnly={cat.os.exclusive} />
                  <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, textAlign: "center" }}>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.pf }}>{cat.pf.exclusive}</div>
                      <div style={{ fontSize: 9, color: COLORS.muted }}>só PF</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.overlap }}>{cat.overlap}</div>
                      <div style={{ fontSize: 9, color: COLORS.muted }}>ambas</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: COLORS.os }}>{cat.os.exclusive}</div>
                      <div style={{ fontSize: 9, color: COLORS.muted }}>só OS</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── SAVINGS TAB ── */}
        {activeTab === "savings" && (
          <div>
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 24, marginBottom: 16 }}>
              <h3 style={{ margin: "0 0 4px", fontSize: 13, color: COLORS.text, fontWeight: 600 }}>Saving Mensal por Categoria (USD)</h3>
              <p style={{ margin: "0 0 20px", fontSize: 11, color: COLORS.muted }}>
                PointFive: soma de todas as variantes agrupadas por categoria
              </p>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={savingChartData} barGap={4} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="name" tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                  <YAxis tick={{ fill: COLORS.muted, fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="PointFive ($)" fill={COLORS.pf} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="OptScale ($)" fill={COLORS.os} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {DATA.categories.map(cat => (
                <div key={cat.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 18 }}>
                  <div style={{ fontSize: 11, fontWeight: 600, color: COLORS.text, marginBottom: 12 }}>{cat.shortLabel}</div>

                  <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 10, color: COLORS.muted, marginBottom: 6 }}>PointFive — breakdown por variante</div>
                    {cat.pfVariants.map((v, i) => (
                      <div key={i} style={{ marginBottom: 4 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                          <span style={{ fontSize: 9, color: v.primary ? COLORS.pf : "rgba(0,201,167,0.5)", maxWidth: "70%" }}>
                            {v.name.length > 35 ? v.name.slice(0, 35) + "…" : v.name}
                          </span>
                          <span style={{ fontSize: 9, color: "#7FD99C" }}>{fmtFull(v.saving)}</span>
                        </div>
                        <div style={{ height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2 }}>
                          <div style={{
                            height: 4, borderRadius: 2, background: v.primary ? COLORS.pf : "rgba(0,201,167,0.4)",
                            width: `${cat.pf.saving > 0 ? Math.max(4, (v.saving / cat.pf.saving) * 100) : 0}%`
                          }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 6, borderTop: `1px solid ${COLORS.border}` }}>
                      <span style={{ fontSize: 10, color: COLORS.muted }}>Total PointFive</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: COLORS.pf }}>{fmtFull(cat.pf.saving)}/mês</span>
                    </div>
                  </div>

                  <div style={{ paddingTop: 10, borderTop: `1px solid ${COLORS.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 10, color: COLORS.muted }}>Total OptScale</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: cat.os.saving > 0 ? COLORS.os : COLORS.muted }}>
                        {cat.os.saving > 0 ? `${fmtFull(cat.os.saving)}/mês` : "≈ $0"}
                      </span>
                    </div>
                    {cat.id === "cw" && (
                      <div style={{ marginTop: 6, fontSize: 10, color: "rgba(245,166,35,0.8)", background: "rgba(245,166,35,0.05)", border: "1px solid rgba(245,166,35,0.2)", borderRadius: 4, padding: "4px 8px" }}>
                        ⚠ OptScale detecta grupos vazios (stored_bytes=0) — sem saving real identificado
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── MAPPING TAB ── */}
        {activeTab === "mapping" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {DATA.categories.map(cat => (
              <div key={cat.id} style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                  <div style={{ width: 3, height: 18, background: `linear-gradient(180deg, ${COLORS.pf}, ${COLORS.os})`, borderRadius: 2 }} />
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: COLORS.text }}>{cat.label}</h3>
                  {cat.overlap === 0 && (
                    <span style={{ fontSize: 9, padding: "2px 8px", background: "rgba(245,166,35,0.1)", color: COLORS.overlap, borderRadius: 4, border: "1px solid rgba(245,166,35,0.3)" }}>
                      ZERO OVERLAP
                    </span>
                  )}
                  {cat.pfVariants.length > 1 && (
                    <span style={{ fontSize: 9, padding: "2px 8px", background: "rgba(0,201,167,0.1)", color: COLORS.pf, borderRadius: 4, border: "1px solid rgba(0,201,167,0.3)" }}>
                      {cat.pfVariants.length} variantes agrupadas
                    </span>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 16, alignItems: "start" }}>
                  {/* PointFive side */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.pf, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                      PointFive ({cat.pf.total} recursos · {fmt(cat.pf.saving)}/mês)
                    </div>
                    {cat.pfVariants.map((v, i) => <VariantPill key={i} {...v} />)}
                    {cat.pfVariants.length > 1 && (
                      <div style={{
                        marginTop: 8, padding: "6px 10px", fontSize: 10, color: COLORS.muted,
                        background: "rgba(0,201,167,0.04)", borderRadius: 6, border: "1px dashed rgba(0,201,167,0.2)"
                      }}>
                        Todas mapeadas como equivalentes para fins de comparação — cobrem o mesmo problema de otimização de S3 Intelligent Tiering.
                      </div>
                    )}
                  </div>

                  {/* Arrow */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingTop: 28 }}>
                    <div style={{ fontSize: 18, color: COLORS.overlap }}>⟺</div>
                    <div style={{ fontSize: 9, color: COLORS.muted, textAlign: "center", maxWidth: 60 }}>equivalência semântica</div>
                    <div style={{
                      marginTop: 8, padding: "4px 8px",
                      background: cat.overlap > 0 ? "rgba(245,166,35,0.1)" : "rgba(255,255,255,0.03)",
                      border: `1px solid ${cat.overlap > 0 ? "rgba(245,166,35,0.4)" : COLORS.border}`,
                      borderRadius: 6, textAlign: "center"
                    }}>
                      <div style={{ fontSize: 16, fontWeight: 700, color: cat.overlap > 0 ? COLORS.overlap : COLORS.muted }}>{cat.overlap}</div>
                      <div style={{ fontSize: 9, color: COLORS.muted }}>em comum</div>
                    </div>
                  </div>

                  {/* OptScale side */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: COLORS.os, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 10 }}>
                      OptScale ({cat.os.total} recursos · {cat.os.saving > 0 ? fmt(cat.os.saving) : "≈ $0"}/mês)
                    </div>
                    {cat.osVariants.map((v, i) => <OSVariantPill key={i} {...v} />)}
                  </div>
                </div>

                {/* Note */}
                <div style={{
                  marginTop: 14, padding: "10px 14px",
                  background: "rgba(88,166,255,0.04)", border: "1px solid rgba(88,166,255,0.15)",
                  borderRadius: 6, fontSize: 11, color: COLORS.muted, lineHeight: 1.6
                }}>
                  <span style={{ color: COLORS.accent }}>📌 Nota: </span>{cat.note}
                </div>
              </div>
            ))}

            {/* General Notes */}
            <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 10, padding: 22 }}>
              <h3 style={{ margin: "0 0 16px", fontSize: 13, fontWeight: 700, color: COLORS.text }}>Metodologia de Matching</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { title: "Identificação S3", body: "PointFive usa ARN (arn:aws:s3:::bucket-name). OptScale usa nome direto. Matching feito extraindo o nome do bucket do ARN e normalizando para lowercase." },
                  { title: "Identificação CloudWatch", body: "Matching por log_group_name. Zero recursos em comum — as ferramentas detectam conjuntos completamente distintos de grupos." },
                  { title: "Saving mensal", body: "Ambas as ferramentas reportam saving em base mensal (USD). Os valores são comparáveis diretamente." },
                  { title: "Filtro de status (PointFive)", body: "Apenas oportunidades com status open, validated ou in_progress foram incluídas. Oportunidades dismissed ou closed foram excluídas." },
                ].map((n, i) => (
                  <div key={i} style={{ padding: "12px 14px", background: "rgba(255,255,255,0.02)", border: `1px solid ${COLORS.border}`, borderRadius: 8 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: COLORS.accent, marginBottom: 6 }}>{n.title}</div>
                    <div style={{ fontSize: 11, color: COLORS.muted, lineHeight: 1.6 }}>{n.body}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
