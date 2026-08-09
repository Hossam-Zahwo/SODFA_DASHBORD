import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  className?: string;
}

/** Real, machine-readable CODE128 barcode. */
export function BarcodeView({ value, height = 50, width = 1.6, fontSize = 12, className }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;
    try {
      JsBarcode(ref.current, String(value), {
        format: "CODE128",
        height,
        width,
        fontSize,
        margin: 4,
        displayValue: true,
      });
    } catch {
      /* invalid barcode content — leave empty */
    }
  }, [value, height, width, fontSize]);

  return <svg ref={ref} className={className} />;
}