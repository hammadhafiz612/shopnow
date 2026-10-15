// Keep database DECIMAL values as strings; formatting does not round money.
function formatPrice(value) {
  const [whole, fraction = ""] = String(value).split(".");
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `PKR ${grouped}.${fraction.padEnd(2, "0")}`;
}

module.exports = formatPrice;
