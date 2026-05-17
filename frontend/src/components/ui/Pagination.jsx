export default function Pagination({ page, totalPages, onPageChange }) {
  if (totalPages <= 1) return null

  const getPages = () => {
    let pages = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        pages.push(i)
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...')
      }
    }
    return pages
  }

  return (
    <div className="pagination">
      <button
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="السابق"
      >
        <i className="fa-solid fa-chevron-right" />
      </button>

      {getPages().map((p, idx) => (
        p === '...' ? (
          <span key={idx} className="dots">...</span>
        ) : (
          <button
            key={idx}
            className={page === p ? 'active' : ''}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        )
      ))}

      <button
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="التالي"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
    </div>
  )
}
