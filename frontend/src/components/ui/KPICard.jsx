/**
 * KPICard — stat card with icon, value, label, and optional subtitle.
 *
 * Props:
 *  - label:    string
 *  - value:    string | number
 *  - icon:     FontAwesome class e.g. 'fa-cart-shopping'
 *  - iconColor: CSS color for icon bg tint
 *  - sub:      optional subtitle text
 *  - highlight: boolean — gold value color
 */
export default function KPICard({ label, value, icon, iconColor = 'var(--accent)', sub, highlight }) {
  return (
    <div className={`kpi-card animate-in${highlight ? ' highlight' : ''}`}>
      <div
        className="kpi-icon"
        style={{
          background: `${iconColor}22`,
          color: iconColor,
        }}
      >
        <i className={`fa-solid ${icon}`} />
      </div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  )
}
