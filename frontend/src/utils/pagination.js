export function getPageAfterDeletion({ page, itemsOnPage }) {
  if (page > 1 && itemsOnPage <= 1) return page - 1;

  return page;
}
