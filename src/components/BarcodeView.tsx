import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface Props {
  value: string;
  height?: number;
  width?: number;
  fontSize?: number;
  margin?: number;
  displayValue?: boolean;
  className?: string;
  maxWidth?: number;
  minWidth?: number;
  background?: string;
}

/**
 * Responsive, machine-readable CODE128 barcode.
 *
 * Barcode itself is BLACK.
 * UI colors should be controlled by the parent component.
 */
export function BarcodeView({
  value,
  height = 60,
  width = 1.6,
  fontSize = 13,
  margin = 8,
  displayValue = true,
  className,
  maxWidth = 420,
  minWidth = 180,
  background = "#ffffff",
}: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || !value) return;

    const svg = ref.current;

    svg.innerHTML = "";

    try {
      JsBarcode(svg, String(value), {
        format: "CODE128",

        // Barcode size
        height,
        width,

        // Barcode text
        fontSize,
        font: "Arial, Helvetica, sans-serif",
        fontOptions: "bold",

        // IMPORTANT:
        // Barcode remains BLACK
        lineColor: "#000000",
        background,

        // Spacing
        margin,
        marginTop: margin,
        marginBottom: margin,
        marginLeft: margin,
        marginRight: margin,

        // Barcode number
        displayValue,

        textAlign: "center",
        textPosition: "bottom",
        textMargin: 6,
      });

      const svgWidth = svg.getAttribute("width");
      const svgHeight = svg.getAttribute("height");

      if (svgWidth && svgHeight) {
        const numericWidth = parseFloat(svgWidth);
        const numericHeight = parseFloat(svgHeight);

        svg.setAttribute(
          "viewBox",
          `0 0 ${numericWidth} ${numericHeight}`,
        );
      }

      svg.removeAttribute("width");
      svg.removeAttribute("height");

      svg.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet",
      );

      svg.style.display = "block";
      svg.style.width = "100%";
      svg.style.height = "auto";
      svg.style.maxWidth = "100%";
      svg.style.margin = "0 auto";
      svg.style.minWidth = "0";
    } catch {
      svg.innerHTML = "";
    }
  }, [
    value,
    height,
    width,
    fontSize,
    margin,
    displayValue,
    background,
  ]);

  if (!value) {
    return null;
  }

  return (
    <div
      className={className}
      style={{
        width: "100%",
        maxWidth: `${maxWidth}px`,
        minWidth,
        margin: "0 auto",

        display: "flex",
        justifyContent: "center",
        alignItems: "center",

        boxSizing: "border-box",
        overflow: "hidden",

        backgroundColor: background,

        WebkitFontSmoothing: "antialiased",
        MozOsxFontSmoothing: "grayscale",

        padding: "10px",
      }}
    >
      <div
        style={{
          width: "100%",
          minWidth: 0,

          display: "flex",
          justifyContent: "center",
          alignItems: "center",

          boxSizing: "border-box",

          padding: "8px 12px",

          backgroundColor: background,

          textAlign: "center",
        }}
      >
        <svg ref={ref} />
      </div>
    </div>
  );
}