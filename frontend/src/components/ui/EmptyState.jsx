export default function EmptyState({ icon = 'fa-inbox', title, desc }) {
  return (
    <div className="empty-state animate-in">
      <i className={`fa-solid ${icon} empty-icon`} />
      <h3>{title}</h3>
      {desc && <p>{desc}</p>}
    </div>
  )
}
