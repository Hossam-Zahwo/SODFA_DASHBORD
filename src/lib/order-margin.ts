/** Order-level margin using realized amounts after any refunds and recovered stock. */
export function calculateOrderMargin(
  merchandiseRevenue: number,
  customerShipping: number,
  merchandiseCost: number,
  carrierCost: number,
  otherCosts: number,
) {
  const amounts = [merchandiseRevenue, customerShipping, merchandiseCost, carrierCost, otherCosts];
  if (amounts.some((value) => !Number.isFinite(value) || value < 0 || value > 1_000_000_000)) {
    throw new RangeError("Invalid order margin input");
  }
  const [sales = 0, delivery = 0, goods = 0, freight = 0, expenses = 0] = amounts.map((value) =>
    Math.round(value * 100),
  );
  const revenue = sales + delivery;
  const contribution = revenue - goods - freight - expenses;
  return {
    contribution: contribution / 100,
    rate: revenue > 0 ? (contribution / revenue) * 100 : null,
  };
}
