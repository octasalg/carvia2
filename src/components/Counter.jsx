import { useState, useEffect } from "react";
import { useReveal } from "./Reveal";

export default function Counter({ to, suffix = "", duration = 1600 }) {
  const [ref, shown] = useReveal();
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!shown) return;
    let raf, start;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      setVal(Math.floor((1 - Math.pow(1 - p, 3)) * to));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [shown, to, duration]);
  return <span ref={ref}>{val.toLocaleString("es-MX")}{suffix}</span>;
}
