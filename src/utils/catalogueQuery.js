const PAGE_SIZE = 12;
const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" }
];

function readText(query, key, label, maxLength, errors) {
  const value = query[key];
  if (value === undefined) return "";
  if (typeof value !== "string") {
    errors.push(`${label} must be a single value.`);
    return "";
  }
  const text = value.trim();
  if (/[\u0000-\u001f\u007f]/u.test(text)) {
    errors.push(`${label} cannot contain control characters.`);
    return "";
  }
  if (text.length > maxLength) {
    errors.push(`${label} must be ${maxLength} characters or fewer.`);
  }
  return text.slice(0, maxLength);
}

function priceInMinorUnits(value) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function parseCatalogueQuery(query = {}) {
  const errors = [];
  const filters = {
    q: readText(query, "q", "Search text", 100, errors),
    category: readText(query, "category", "Category", 120, errors),
    minPrice: readText(query, "minPrice", "Minimum price", 13, errors),
    maxPrice: readText(query, "maxPrice", "Maximum price", 13, errors),
    sort: readText(query, "sort", "Sort option", 20, errors) || "newest",
    page: 1
  };

  if (filters.category && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(filters.category)) {
    errors.push("Choose a valid category.");
  }

  const validPrice = value => /^\d{1,10}(?:\.\d{1,2})?$/.test(value);
  for (const [key, label] of [["minPrice", "Minimum price"], ["maxPrice", "Maximum price"]]) {
    if (filters[key] && !validPrice(filters[key])) {
      errors.push(`${label} must be between 0 and 9999999999.99, with at most two decimal places.`);
    }
  }
  if (validPrice(filters.minPrice) && validPrice(filters.maxPrice)
      && priceInMinorUnits(filters.minPrice) > priceInMinorUnits(filters.maxPrice)) {
    errors.push("Minimum price cannot be greater than maximum price.");
  }

  if (!SORT_OPTIONS.some(option => option.value === filters.sort)) {
    errors.push("Choose a valid sort option.");
    filters.sort = "newest";
  }

  const pageText = readText(query, "page", "Page", 7, errors);
  if (pageText) {
    const page = Number(pageText);
    if (!/^\d+$/.test(pageText) || !Number.isSafeInteger(page) || page < 1 || page > 1000000) {
      errors.push("Page must be a whole number between 1 and 1000000.");
    } else {
      filters.page = page;
    }
  }
  return { filters, errors };
}

function catalogueUrl(filters = {}, changes = {}) {
  const selected = { ...filters, ...changes };
  const query = new URLSearchParams();
  for (const key of ["q", "category", "minPrice", "maxPrice"]) {
    if (selected[key]) query.set(key, selected[key]);
  }
  if (selected.sort && selected.sort !== "newest") query.set("sort", selected.sort);
  if (selected.page > 1) query.set("page", String(selected.page));
  return "/products" + (query.size ? "?" + query.toString() : "");
}

function paginationPages(page, totalPages) {
  if (totalPages < 2) return [];
  const numbers = [...new Set([1, page - 1, page, page + 1, totalPages])]
    .filter(number => number >= 1 && number <= totalPages)
    .sort((a, b) => a - b);
  const pages = [];
  for (const number of numbers) {
    if (pages.length && number - pages[pages.length - 1] > 1) pages.push(null);
    pages.push(number);
  }
  return pages;
}

function isProductId(value) {
  return typeof value === "string" && /^[1-9]\d{0,18}$/.test(value)
    && BigInt(value) <= 9223372036854775807n;
}

module.exports = { PAGE_SIZE, SORT_OPTIONS, parseCatalogueQuery, catalogueUrl, paginationPages, isProductId };
