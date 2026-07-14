function buildPages(currentPage, totalPages) {
  if (totalPages <= 1) return [1];

  const pages = new Set([1, totalPages]);
  for (let page = currentPage - 1; page <= currentPage + 1; page += 1) {
    if (page >= 1 && page <= totalPages) pages.add(page);
  }

  const sortedPages = [...pages].sort((a, b) => a - b);
  return sortedPages.reduce((items, page, index) => {
    const previous = sortedPages[index - 1];
    if (previous && page - previous > 1) {
      items.push(`ellipsis-${previous}-${page}`);
    }
    items.push(page);
    return items;
  }, []);
}

export default function Pagination({ page, totalPages, onPageChange }) {
  const safeTotalPages = Math.max(1, totalPages);
  const canGoPrevious = page > 1;
  const canGoNext = page < safeTotalPages;

  if (safeTotalPages <= 1) return null;

  return (
    <nav className="flex flex-col gap-3 border-t border-neutral-800 bg-[#141414] px-3 py-3 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
      <div className="text-center text-xs font-medium text-neutral-500 sm:text-left">
        Página {page} de {safeTotalPages}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        <button
          type="button"
          disabled={!canGoPrevious}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Anterior
        </button>
        {buildPages(page, safeTotalPages).map((item) =>
          typeof item === "number" ? (
            <button
              type="button"
              key={item}
              onClick={() => onPageChange(item)}
              className={
                "min-w-9 rounded-lg border px-3 py-1.5 transition-colors " +
                (item === page
                  ? "border-red-600 bg-red-700 text-white"
                  : "border-neutral-700 text-neutral-300 hover:bg-neutral-800")
              }
            >
              {item}
            </button>
          ) : (
            <span key={item} className="px-1.5 text-neutral-500">
              ...
            </span>
          ),
        )}
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-neutral-700 px-3 py-1.5 text-neutral-300 transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Siguiente
        </button>
      </div>
    </nav>
  );
}
