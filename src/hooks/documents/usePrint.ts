import { useReactToPrint } from "react-to-print";

// 1. Create a type for the orientation option
type PrintOrientation = "portrait" | "landscape";

type UsePrintOptions = {
  ref?: React.RefObject<any | null>;
  onBeforePrint?: (() => Promise<void>) | undefined;
  onAfterPrint?: (() => Promise<void>) | undefined;
  delay?: number;
  orientation?: PrintOrientation;
  width?: string;
};

export function usePrint({
  ref,
  onBeforePrint,
  onAfterPrint,
  delay = 500,
  orientation = "portrait",
  width = "100%",
}: UsePrintOptions) {
  const handlePrint = useReactToPrint({
    contentRef: ref,
    onBeforePrint: async () => {
      if (onBeforePrint) {
        await onBeforePrint();
      }
      if (delay > 0) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    },
    onAfterPrint,
    pageStyle: `
      @page {
        size: ${orientation}; 
        margin: 5mm 5mm 5mm 5mm; 
      }
      @media print {
        body {
          width: ${width};
        }
      }
    `,
  });

  return { handlePrint };
}
