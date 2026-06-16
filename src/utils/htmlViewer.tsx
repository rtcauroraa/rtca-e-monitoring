import React from "react";
import DOMPurify from "dompurify";

interface HtmlViewerProps {
  htmlString: string;
}

export const HtmlViewer: React.FC<HtmlViewerProps> = ({ htmlString }) => {
  // Always sanitize untrusted HTML string input
  const cleanHtml = DOMPurify.sanitize(htmlString);

  return <div dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
};
