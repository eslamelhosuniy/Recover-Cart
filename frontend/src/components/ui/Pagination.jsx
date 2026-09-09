export default function Pagination({
  page,
  currentPage,
  totalPages,
  total,
  totalItems,
  limit,
  pageSize,
  onPageChange,
  onChange,
}) {
  const activePage = page || currentPage || 1
  const count = totalItems ?? total ?? 0
  const size = pageSize ?? limit ?? 10
  const pagesCount = totalPages || Math.ceil(count / size)
  const handleChange = onPageChange || onChange || (() => {})

  if (pagesCount <= 1) return null

  const getPages = () => {
    let pages = []
    for (let i = 1; i <= pagesCount; i++) {
      if (i === 1 || i === pagesCount || (i >= activePage - 1 && i <= activePage + 1)) {
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
        disabled={activePage <= 1}
        onClick={() => handleChange(activePage - 1)}
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
            className={activePage === p ? 'active' : ''}
            onClick={() => handleChange(p)}
          >
            {p}
          </button>
        )
      ))}

      <button
        disabled={activePage >= pagesCount}
        onClick={() => handleChange(activePage + 1)}
        aria-label="التالي"
      >
        <i className="fa-solid fa-chevron-left" />
      </button>
    </div>
  )
}
