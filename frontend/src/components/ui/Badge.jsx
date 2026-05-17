/**
 * Badge — inline status chip.
 * variant: 'success' | 'warning' | 'danger' | 'info' | 'accent' | 'muted'
 */
export default function Badge({ children, variant = 'muted' }) {
  return <span className={`badge badge-${variant}`}>{children}</span>
}
