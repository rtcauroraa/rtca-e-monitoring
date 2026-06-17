import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

type UsePDFOptions = {
  ref: React.RefObject<HTMLDivElement | null>;
  delay?: number;
  onBeforeDownload?: () => Promise<void> | void;
  onAfterDownload?: () => Promise<void> | void;
};

export function usePDF({
  ref,
  delay = 400,
  onBeforeDownload,
  onAfterDownload,
}: UsePDFOptions) {
  const handleDownloadPDF = async (filename?: string) => {
    const element = ref?.current;
    if (!element) {
      console.warn("Capture Target Error: Provided ref is empty or unmounted.");
      return;
    }

    // 1. Fire custom preparation triggers (e.g., show loaders)
    if (onBeforeDownload) {
      await onBeforeDownload();
    }

    // Small timeout to allow state changes to paint
    await new Promise((resolve) => setTimeout(resolve, 150));

    // 2. Inject temporary CSS sheet to neutralize "oklch" canvas parser crashes
    const styleOverride = document.createElement("style");
    styleOverride.id = "pdf-capture-oklch-override";
    styleOverride.innerHTML = `
      .pdf-capture-active, 
      .pdf-capture-active * {
        background-color: #ffffff !important;
        color: #111827 !important;
        border-color: #e5e7eb !important;
        box-shadow: none !important;
        text-shadow: none !important;
      }
      .pdf-capture-active .ant-tag-success {
        background-color: #f6ffed !important;
        color: #52c41a !important;
        border-color: #b7eb8f !important;
      }
      .pdf-capture-active .ant-tag-error {
        background-color: #fff1f0 !important;
        color: #f5222d !important;
        border-color: #ffa39e !important;
      }
    `;
    document.head.appendChild(styleOverride);
    element.classList.add("pdf-capture-active");

    try {
      // Allow styles to settle
      await new Promise((resolve) => setTimeout(resolve, delay));

      // 3. Take the snapshot image of the true DOM element structure
      const canvas = await html2canvas(element, {
        scale: 2, // 🚀 Keeps text and Ant Design tags perfectly crisp and readable
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      // 4. Convert the captured canvas into image compression data
      const imgData = canvas.toDataURL("image/jpeg", 1.0);

      // 5. Initialize jsPDF document context
      // Note: "l" (landscape) is recommended for wide layout logs/tables. Use "p" for portrait.
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      // 6. Draw the image data directly onto the blank PDF canvas page wrapper
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);

      // 7. Download the final PDF file
      pdf.save(`${filename || "report-export"}.pdf`);
    } catch (error) {
      console.error("PDF canvas transformation exception:", error);
    } finally {
      // 8. Clean up styling mutations instantly so your UI returns back to normal
      element.classList.remove("pdf-capture-active");
      const activeSheet = document.getElementById("pdf-capture-oklch-override");
      if (activeSheet) activeSheet.remove();

      if (onAfterDownload) {
        onAfterDownload();
      }
    }
  };

  return { handleDownloadPDF };
}
