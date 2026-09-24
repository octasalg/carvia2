export const financingRules = [
  {
    minYear: 2015,
    maxYear: 2017,
    downPayment: 0.15,
    termMonths: 60,
    annualRate: 0.20,
  },
  {
    minYear: 2018,
    maxYear: 2019,
    downPayment: 0.10,
    termMonths: 48,
    annualRate: 0.1599,
  },
  {
    minYear: 2020,
    maxYear: 2021,
    downPayment: 0.10,
    termMonths: 48,
    annualRate: 0.1399,
  },
  {
    minYear: 2022,
    maxYear: 2026,
    downPayment: 0.10,
    termMonths: 60,
    annualRate: 0.1399,
  },
];

export const financingCosts = Object.freeze({
  taxRate: 0.16,
  annualInsuranceRate: 0.05,
  calendarDays: 365,
  financialDays: 360,
});

export const financingTermOptions = Object.freeze([12, 24, 36, 48, 60]);

export const financingCurrencyFormatter = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

export function getFinancingRule(vehicleYear) {
  const numericYear = Number(vehicleYear);
  if (!Number.isInteger(numericYear)) return null;

  return financingRules.find(
    ({ minYear, maxYear }) => numericYear >= minYear && numericYear <= maxYear,
  ) || null;
}

export function calculateFinancing(price, vehicleYear, options = {}) {
  const numericPrice = Number(price);
  const numericYear = Number(vehicleYear);

  if (
    !Number.isFinite(numericPrice) ||
    numericPrice <= 0 ||
    !Number.isInteger(numericYear)
  ) {
    return null;
  }

  const rule = getFinancingRule(numericYear);

  if (!rule) return null;

  const minimumDownPayment = numericPrice * rule.downPayment;
  const downPayment = options.downPayment === undefined
    ? minimumDownPayment
    : Number(options.downPayment);
  const termMonths = options.termMonths === undefined
    ? rule.termMonths
    : Number(options.termMonths);

  if (
    !Number.isFinite(downPayment) ||
    downPayment < minimumDownPayment ||
    downPayment >= numericPrice ||
    !Number.isInteger(termMonths) ||
    termMonths <= 0
  ) {
    return null;
  }

  const annualInsurance = numericPrice * financingCosts.annualInsuranceRate;
  const financedAmount = numericPrice - downPayment + annualInsurance;
  const monthlyInterestRate =
    (rule.annualRate * (financingCosts.calendarDays / financingCosts.financialDays)) / 12;
  const monthlyRateWithTax = monthlyInterestRate * (1 + financingCosts.taxRate);

  // Las renovaciones anuales del seguro se incorporan a su valor presente.
  let insuranceRenewalsPresentValue = 0;
  for (let month = 12; month < termMonths; month += 12) {
    insuranceRenewalsPresentValue +=
      annualInsurance / ((1 + monthlyRateWithTax) ** month);
  }

  const equivalentCapital = financedAmount + insuranceRenewalsPresentValue;
  const monthlyPayment =
    (equivalentCapital * monthlyRateWithTax) /
    (1 - ((1 + monthlyRateWithTax) ** -termMonths));

  const values = [
    downPayment,
    annualInsurance,
    financedAmount,
    insuranceRenewalsPresentValue,
    equivalentCapital,
    monthlyPayment,
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;

  return {
    downPayment,
    financedAmount,
    monthlyPayment,
    termMonths,
    annualRate: rule.annualRate,
    minimumDownPayment,
    annualInsurance,
    insuranceRenewalsPresentValue,
  };
}
