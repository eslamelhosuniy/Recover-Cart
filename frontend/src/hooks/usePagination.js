import { useState, useCallback } from 'react'

export default function usePagination(initialLimit = 10) {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(initialLimit)

  const skip = (page - 1) * limit

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  const resetPage = useCallback(() => setPage(1), [])

  return {
    page,
    limit,
    skip,
    setLimit,
    handlePageChange,
    resetPage,
  }
}
