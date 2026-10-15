function toMinorUnits(value) {
  const [whole, fraction = ""] = String(value).split(".");
  return BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
}

function toDecimal(value) {
  return `${value / 100n}.${String(value % 100n).padStart(2, "0")}`;
}

module.exports = { toMinorUnits, toDecimal };
