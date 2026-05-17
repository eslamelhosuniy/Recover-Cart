export default function Spinner({ size = 'md', center = false }) {
  const sizeClass = size === 'sm' ? 'spinner-sm' : ''
  const spinner = <div className={`spinner ${sizeClass}`} />
  if (center) {
    return <div className="spinner-wrap">{spinner}</div>
  }
  return spinner
}
