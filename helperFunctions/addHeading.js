export const addHeading = (doc, y, title, x, fontSize, headingOrNot) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageBottomMargin = 20; // Distance from bottom to trigger new page
  const pageTopMargin = 30;    // Where to start on the new page
  const spacingAfterHeader = (headingOrNot == true) ? 8 : 6; // Space to leave after the header for the next row

  // 1. Check if we need a new page
  // We check if the current Y + specific space needed exceeds the page limit
  if (y + 10 > pageHeight - pageBottomMargin) {
    doc.addPage();
    y = pageTopMargin; // Reset Y to the top of the new page
  }

  // 2. Set Styles
  doc.setFont("helvetica", (headingOrNot ? "bold" : "normal"));
  doc.setFontSize(fontSize);

  // 3. Draw the Title
  doc.text(title, x, y, { align: "left" });

  // 4. (Optional) Add the bottom line automatically
  // This draws a line 2 units below the text, spanning the page width minus margins
  const pageWidth = doc.internal.pageSize.getWidth();
  const marginRight = 15;

  if (headingOrNot){
  doc.setLineWidth(0.25);
  doc.line(x, y + 2, pageWidth - marginRight, y + 2);
  }

  // 5. Return updated Y
  // We return y + spacing so the next element starts below this header
  return y + spacingAfterHeader;
};