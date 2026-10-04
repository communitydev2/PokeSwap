const gbp = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' });
const gbpWhole = new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 });

// 3600 -> "£36", 350 -> "£3.50" (whole pounds drop the pence)
export function formatPence(pence: number) {
  return pence % 100 === 0 ? gbpWhole.format(pence / 100) : gbp.format(pence / 100);
}
