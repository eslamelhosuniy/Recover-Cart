/**
 * RatingStars Component
 * Displays a visual star rating (1-5 stars)
 */

export default function RatingStars({ rating, size = 'md', onClick, className = '' }) {
  const ratingNum = rating ? parseInt(rating, 10) : 0

  const starSize = {
    sm: '1rem',
    md: '1.25rem',
    lg: '1.75rem',
  }[size] || '1.25rem'

  const handleClick = () => {
    if (onClick) {
      onClick(ratingNum)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '0.25rem',
        cursor: onClick ? 'pointer' : 'default',
        alignItems: 'center',
      }}
      onClick={handleClick}
      title={`Rating: ${ratingNum} out of 5 stars`}
      className={className}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <span
          key={star}
          style={{
            fontSize: starSize,
            color: star <= ratingNum ? 'var(--gold)' : 'var(--border-hover)',
            transition: 'color 0.2s ease',
            lineHeight: 1,
          }}
        >
          ★
        </span>
      ))}
    </div>
  )
}
