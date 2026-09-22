'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

type SearchAndPaginateProps = {
  placeholder: string;
  emptyMessage: string;
  itemsLabel: string;
  children: ReactNode;
};

const PAGE_SIZE_OPTIONS = [10, 20, 30, 40] as const;

function getPageNumbers(currentPage: number, totalPages: number) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages]);

  if (currentPage <= 4) {
    [2, 3, 4, 5, 6].forEach((page) => pages.add(page));
  } else if (currentPage >= totalPages - 3) {
    [
      totalPages - 5,
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
    ].forEach((page) => pages.add(page));
  } else {
    [
      currentPage - 2,
      currentPage - 1,
      currentPage,
      currentPage + 1,
      currentPage + 2,
    ].forEach((page) => pages.add(page));
  }

  const ordered = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | 'ellipsis'> = [];

  ordered.forEach((page, index) => {
    if (index > 0 && page - ordered[index - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(page);
  });

  return result;
}

export default function SearchAndPaginate({
  placeholder,
  emptyMessage,
  itemsLabel,
  children,
}: SearchAndPaginateProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [resultCount, setResultCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, pageSize]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>('[data-search-item]')
    );

    const terms = query
      .trim()
      .toLocaleLowerCase()
      .split(/\s+/)
      .filter(Boolean);

    const matchingItems = items.filter((item) => {
      const text = (item.dataset.searchText || '').toLocaleLowerCase();
      return terms.length === 0 || terms.every((term) => text.includes(term));
    });

    const nextResultCount = matchingItems.length;
    const nextTotalPages = Math.max(
      1,
      Math.ceil(nextResultCount / pageSize)
    );
    const safePage = Math.min(currentPage, nextTotalPages);
    const firstVisibleIndex = (safePage - 1) * pageSize;
    const lastVisibleIndex = firstVisibleIndex + pageSize;
    const matchingIndexMap = new Map<HTMLElement, number>(
      matchingItems.map((item, index) => [item, index])
    );

    items.forEach((item) => {
      const matchingIndex = matchingIndexMap.get(item);
      const shouldShow =
        matchingIndex !== undefined &&
        matchingIndex >= firstVisibleIndex &&
        matchingIndex < lastVisibleIndex;

      item.hidden = !shouldShow;
    });

    setResultCount((value) =>
      value === nextResultCount ? value : nextResultCount
    );
    setTotalPages((value) =>
      value === nextTotalPages ? value : nextTotalPages
    );

    if (safePage !== currentPage) {
      setCurrentPage(safePage);
    }
  }, [query, pageSize, currentPage]);

  const pageNumbers = getPageNumbers(currentPage, totalPages);
  const hasContent = resultCount > 0;
  const hasPagination = hasContent && totalPages > 1;
  const showSearchNoResults = query.trim().length > 0 && resultCount === 0;

  return (
    <div ref={rootRef}>
      <div
        style={{
          marginBottom: '20px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center',
        }}
      >
        <div style={{ flex: '1 1 320px' }}>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '13px 15px',
              border: '1px solid #cfd4da',
              borderRadius: '12px',
              font: 'inherit',
              background: '#fff',
              outline: 'none',
            }}
          />
        </div>
      </div>

      {children}

      {showSearchNoResults && (
        <div className="card">
          <div className="cardbody">
            <p className="small">{emptyMessage}</p>
          </div>
        </div>
      )}

      {hasContent && (
        <div
          style={{
            marginTop: '28px',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '14px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <label
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              margin: 0,
              fontSize: '13px',
              fontWeight: 700,
            }}
          >
            <span>{itemsLabel} per page:</span>
            <select
              value={pageSize}
              onChange={(event) => setPageSize(Number(event.target.value))}
              aria-label={`${itemsLabel} per page`}
              style={{
                width: 'auto',
                minWidth: '78px',
                padding: '9px 10px',
                border: '1px solid #cfd4da',
                borderRadius: '10px',
                font: 'inherit',
                background: '#fff',
              }}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </label>

          {hasPagination && (
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) => Math.max(1, page - 1))
                }
                disabled={currentPage === 1}
                style={{
                  padding: '8px 11px',
                  border: '1px solid #cfd4da',
                  borderRadius: '9px',
                  background: '#fff',
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  opacity: currentPage === 1 ? 0.5 : 1,
                }}
              >
                ← Previous
              </button>

              {pageNumbers.map((page, index) =>
                page === 'ellipsis' ? (
                  <span
                    key={`ellipsis-${index}`}
                    style={{ padding: '8px 4px', color: '#6b7280' }}
                  >
                    …
                  </span>
                ) : (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                    style={{
                      minWidth: '38px',
                      padding: '8px 10px',
                      border: '1px solid #cfd4da',
                      borderRadius: '9px',
                      background:
                        page === currentPage ? '#111827' : '#fff',
                      color: page === currentPage ? '#fff' : '#111827',
                      fontWeight: page === currentPage ? 800 : 600,
                      cursor: 'pointer',
                    }}
                  >
                    {page}
                  </button>
                )
              )}

              <button
                type="button"
                onClick={() =>
                  setCurrentPage((page) =>
                    Math.min(totalPages, page + 1)
                  )
                }
                disabled={currentPage === totalPages}
                style={{
                  padding: '8px 11px',
                  border: '1px solid #cfd4da',
                  borderRadius: '9px',
                  background: '#fff',
                  cursor:
                    currentPage === totalPages ? 'not-allowed' : 'pointer',
                  opacity: currentPage === totalPages ? 0.5 : 1,
                }}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
