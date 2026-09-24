import { useMemo, useState } from "react";
import { CalendarDays, ChevronDown } from "lucide-react";
import {
  calculateFinancing,
  financingCurrencyFormatter,
  financingTermOptions,
} from "../config/financing";

const percentageFormatter = new Intl.NumberFormat("es-MX", {
  maximumFractionDigits: 1,
});
const MAXIMUM_DOWN_PAYMENT_PERCENT = 80;

function clamp(value, minimum, maximum) {
  return Math.min(Math.max(value, minimum), maximum);
}

export default function FinancingCalculator({ price, vehicleYear }) {
  const defaultFinancing = useMemo(
    () => calculateFinancing(price, vehicleYear),
    [price, vehicleYear],
  );
  const numericPrice = Number(price);
  const minimumDownPayment = defaultFinancing?.minimumDownPayment || 0;
  const maximumDownPayment = numericPrice * (MAXIMUM_DOWN_PAYMENT_PERCENT / 100);

  const [downPaymentInput, setDownPaymentInput] = useState(
    () => String(Math.round(defaultFinancing?.downPayment || 0)),
  );
  const [termMonths, setTermMonths] = useState(
    () => defaultFinancing?.termMonths || 60,
  );

  if (!defaultFinancing) return null;

  const inputAmount = Number(downPaymentInput);
  const downPayment = clamp(
    Number.isFinite(inputAmount) ? inputAmount : minimumDownPayment,
    minimumDownPayment,
    maximumDownPayment,
  );
  const downPaymentPercent = (downPayment / numericPrice) * 100;
  const minimumPercent = (minimumDownPayment / numericPrice) * 100;
  const financing = calculateFinancing(price, vehicleYear, {
    downPayment,
    termMonths,
  });

  function setDownPaymentFromPercent(percent) {
    const amount = Math.round((numericPrice * Number(percent)) / 100);
    setDownPaymentInput(String(amount));
  }

  function normalizeDownPayment() {
    setDownPaymentInput(String(Math.round(downPayment)));
  }

  return (
    <section className="payment-calculator" aria-labelledby="payment-calculator-title">
      <div className="payment-calculator-glow" aria-hidden="true" />

      <div className="payment-calculator-head">
        <div className="payment-calculator-title">
          <span className="payment-calculator-icon"><CalendarDays size={21} /></span>
          <div>
            <p>Simula tu financiamiento</p>
            <h2 id="payment-calculator-title">Calculadora de pagos</h2>
          </div>
        </div>
        <div className="payment-calculator-current">
          <span>Enganche</span>
          <strong>{financingCurrencyFormatter.format(downPayment)}</strong>
          <b>{percentageFormatter.format(downPaymentPercent)}%</b>
        </div>
      </div>

      <div className="payment-slider-wrap">
        <input
          className="payment-slider"
          type="range"
          min={minimumPercent}
          max={MAXIMUM_DOWN_PAYMENT_PERCENT}
          step="1"
          value={downPaymentPercent}
          style={{ "--payment-progress": `${((downPaymentPercent - minimumPercent) / (MAXIMUM_DOWN_PAYMENT_PERCENT - minimumPercent)) * 100}%` }}
          onChange={(event) => setDownPaymentFromPercent(event.target.value)}
          aria-label="Porcentaje de enganche"
        />
        <div className="payment-slider-limits">
          <span>{financingCurrencyFormatter.format(minimumDownPayment)}</span>
          <span>{financingCurrencyFormatter.format(maximumDownPayment)}</span>
        </div>
      </div>

      <div className="payment-fields">
        <label className="payment-field">
          <span>Enganche $</span>
          <div className="payment-input-wrap">
            <span>$</span>
            <input
              type="number"
              inputMode="numeric"
              min={Math.round(minimumDownPayment)}
              max={Math.round(maximumDownPayment)}
              step="1000"
              value={downPaymentInput}
              onChange={(event) => setDownPaymentInput(event.target.value)}
              onBlur={normalizeDownPayment}
              onKeyDown={(event) => event.key === "Enter" && event.currentTarget.blur()}
            />
          </div>
        </label>

        <label className="payment-field">
          <span>Plazo</span>
          <div className="payment-select-wrap">
            <select
              value={termMonths}
              onChange={(event) => setTermMonths(Number(event.target.value))}
            >
              {financingTermOptions.map((term) => (
                <option key={term} value={term}>{term} meses</option>
              ))}
            </select>
            <ChevronDown size={17} aria-hidden="true" />
          </div>
        </label>

        <div className="payment-field payment-field-readonly">
          <span>Tasa anual</span>
          <strong>{(defaultFinancing.annualRate * 100).toFixed(2)}%*</strong>
        </div>
      </div>

      <div className="payment-result" aria-live="polite">
        <div>
          <span>Pago mensual estimado</span>
          <strong>{termMonths} meses</strong>
        </div>
        <b>{financingCurrencyFormatter.format(financing?.monthlyPayment || 0)}</b>
      </div>

      <p className="payment-disclaimer">
        *Tasa puede variar. Incluye seguro (5% valor vehículo). Sujeto a aprobación.
      </p>
    </section>
  );
}
