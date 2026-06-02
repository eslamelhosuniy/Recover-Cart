import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { reviewsApi } from '../api/client'
import RatingStars from '../components/ui/RatingStars'
import ReviewModal from '../components/ui/ReviewModal'
import UnifiedFilter from '../components/ui/UnifiedFilter'
import usePagination from '../hooks/usePagination'
import Pagination from '../components/ui/Pagination'

export default function Reviews() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [reviews, setReviews] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(false)
  const [selectedReview, setSelectedReview] = useState(null)
  const [total, setTotal] = useState(0)
  const [customerFilter, setCustomerFilter] = useState({ id: null, name: '' })
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
  })
  const { page, limit, skip, handlePageChange, resetPage } = usePagination(10)

  useEffect(() => {
    const customerId = searchParams.get('customerId')
    const customerName = searchParams.get('customerName')

    setCustomerFilter({
      id: customerId,
      name: customerName || '',
    })
  }, [searchParams])

  useEffect(() => {
    fetchReviewsAndStats()
  }, [skip, filters, customerFilter.id])

  const fetchReviewsAndStats = async () => {
    try {
      setLoading(true)

      if (customerFilter.id) {
        const customerResponse = await reviewsApi.getByCustomerId(customerFilter.id)
        const customerReviews = customerResponse.data || []

        setReviews(customerReviews)
        setTotal(customerReviews.length)
        setStats(null)
        return
      }

      const [reviewsResponse, statsResponse] = await Promise.all([
        reviewsApi.list(
          skip,
          limit,
          filters.startDate || undefined,
          filters.endDate || undefined
        ),
        reviewsApi.stats(
          filters.startDate || undefined,
          filters.endDate || undefined
        ),
      ])

      const reviewsData = reviewsResponse.data
      const statsData = statsResponse.data

      setReviews(reviewsData.data || [])
      setTotal(reviewsData.total || 0)
      setStats(statsData || null)
    } catch (error) {
      console.error('Error fetching reviews:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReviewClick = (review) => {
    setSelectedReview(review)
  }

  const handleCustomerClick = (customerId, customerName) => {
    if (!customerId) return
    setSearchParams({ customerId, customerName: customerName || '' })
    resetPage()
  }

  const clearCustomerFilter = () => {
    setSearchParams({})
    resetPage()
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('ar-SA')
    } catch {
      return dateString
    }
  }

  const currentPage = page
  const totalPages = Math.ceil(total / limit)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>التقييمات</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
            إدارة وعرض تقييمات العملاء
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <UnifiedFilter
            startDate={filters.startDate}
            endDate={filters.endDate}
            onApply={(start, end) => {
              setFilters((prev) => ({
                ...prev,
                startDate: start,
                endDate: end,
              }))
              resetPage()
            }}
          />
          <button
            onClick={fetchReviewsAndStats}
            disabled={loading}
            style={{
              height: '36px',
              padding: '0 0.75rem',
              background: loading ? 'rgba(139, 92, 246, 0.3)' : 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.5 : 1,
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            onMouseEnter={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--accent-hover)'
            }}
            onMouseLeave={(e) => {
              if (!loading) e.currentTarget.style.background = 'var(--accent)'
            }}
          >
            <i className={`fa-solid fa-rotate-right ${loading ? 'fa-spin' : ''}`} style={{ fontSize: '0.9rem' }} />
            تحديث
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {/* Total Reviews Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.boxShadow = 'var(--shadow-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '10px',
                background: 'rgba(139, 92, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent)',
              }}
            >
              <i className="fa-solid fa-star" style={{ fontSize: '1.5rem' }} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                إجمالي التقييمات
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--accent)' }}>
                {stats.total_reviews}
              </div>
            </div>
          </div>

          {/* Average Rating Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--gold)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(245, 158, 11, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--gold)',
              }}
            >
              <i className="fa-solid fa-trophy" style={{ fontSize: '1.5rem' }} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                متوسط التقييم
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--gold)' }}>
                  {(stats?.average_rating ?? 0).toFixed(1)}
                </span>
                <RatingStars rating={Math.round(stats?.average_rating ?? 0)} size="sm" />
              </div>
            </div>
          </div>

          {/* 5-Star Reviews Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--success)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(16, 185, 129, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--success)',
              }}
            >
              <i className="fa-solid fa-thumbs-up" style={{ fontSize: '1.5rem' }} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                تقييمات 5 نجوم
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--success)' }}>
                {(stats?.rating_distribution?.['5']) || 0}
              </div>
            </div>
          </div>

          {/* Reviews With Content Card */}
          <div
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--border)',
              borderRadius: '12px',
              padding: '1.5rem',
              transition: 'all var(--transition)',
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--info)'
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(59, 130, 246, 0.25)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div
              style={{
                width: '50px',
                height: '50px',
                borderRadius: '10px',
                background: 'rgba(59, 130, 246, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--info)',
              }}
            >
              <i className="fa-solid fa-message" style={{ fontSize: '1.5rem' }} />
            </div>
            <div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.25rem' }}>
                تقييمات مع نص
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--info)' }}>
                {stats?.reviews_with_content || 0}
              </div>
            </div>
          </div>
        </div>
      )}

      {customerFilter.id && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              عرض تقييمات العميل:
            </div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
              {customerFilter.name || customerFilter.id}
            </div>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={clearCustomerFilter}>
            إعادة ضبط الفلتر
          </button>
        </div>
      )}

      {/* Reviews Table */}
      <div
        style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          overflow: 'hidden',
        }}
      >
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            جاري التحميل...
          </div>
        ) : reviews.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            لا توجد تقييمات حتى الآن
          </div>
        ) : (
          <>
            {/* Table */}
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(0,0,0,0.2)', borderBottom: '1px solid var(--border)' }}>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      العميل
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      التقييم
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      النص
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      رقم الطلب
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      التاريخ
                    </th>
                    <th style={{ padding: '1rem', textAlign: 'center', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      الإجراء
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {reviews.map((review, idx) => (
                    <tr
                      key={review.id}
                      style={{
                        borderBottom: '1px solid var(--border)',
                        background: idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)',
                        transition: 'all var(--transition)',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(139, 92, 246, 0.08)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = idx % 2 === 0 ? 'transparent' : 'rgba(0,0,0,0.1)'
                      }}
                    >
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                        {review.customer_id ? (
                          <button
                            type="button"
                            className="btn btn-link p-0 text-start"
                            style={{
                              border: 'none',
                              background: 'transparent',
                              padding: 0,
                              fontWeight: 700,
                              color: 'var(--accent)',
                              cursor: 'pointer',
                            }}
                            onClick={() => handleCustomerClick(review.customer_id, review.customer_name)}
                          >
                            {review.customer_name || 'Unknown'}
                          </button>
                        ) : (
                          review.customer_name || 'Unknown'
                        )}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem' }}>
                        <RatingStars rating={review.rating} size="sm" />
                      </td>
                      <td style={{
                        padding: '1rem',
                        fontSize: '0.9rem',
                        color: 'var(--text)',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {review.review_content || '-'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text)', fontFamily: 'monospace' }}>
                        {review.order_reference_id || '-'}
                      </td>
                      <td style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--text)' }}>
                        {formatDate(review.reviewed_at)}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'center' }}>
                        <button
                          onClick={() => handleReviewClick(review)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--accent)',
                            fontWeight: 600,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            transition: 'all var(--transition)',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.color = 'var(--accent-hover)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.color = 'var(--accent)'
                          }}
                        >
                          عرض
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {!customerFilter.id && totalPages > 1 && (
              <Pagination page={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
            )}
          </>
        )}
      </div>

      {/* Review Modal */}
      {selectedReview && (
        <ReviewModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
          onCustomerClick={(customerId) => {
            console.log('Navigate to customer:', customerId)
          }}
        />
      )}
    </div>
  )
}
