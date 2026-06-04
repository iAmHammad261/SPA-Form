/**
 * Draws a row of images with labels, handling automatic page breaks.
 * Returns the NEW Y position to continue writing from.
 */
export const drawImageRow = (doc, y, items, imgWidth = 40, imgHeight = 40) => {
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageBottomMargin = 5;
    const pageTopMargin = 20;
    
    // Estimate the height this block will take to decide if we need a new page.
    // Image Height + ~10mm for labels and padding
    const estimatedBlockHeight = imgHeight;

    // 1. Check for Page Break
    if (y + estimatedBlockHeight > pageHeight - pageBottomMargin) {
        doc.addPage();
        y = pageTopMargin; // Reset to top of new page
    }

    // 2. Add space before the labels are rendered (Top Padding for the row)
    // y += 6; 

    let maxRowHeight = 0;

    items.forEach(item => {
        // 3. Draw Label
        if (item.label) {
            doc.setFont("helvetica", "normal");
            doc.setFontSize(8);
            doc.text(item.label, item.x, y);
        }

        // 4. Draw Image
        if (item.value) {
            // Draw image slightly below the text baseline
            const imageY = y + 2;

            try {
                // Determine format if possible, otherwise let jsPDF decide
                doc.addImage(item.value, "JPEG", item.x, imageY, imgWidth, imgHeight, undefined, "FAST");
            } catch (error) {
                console.warn(`Failed to render image for ${item.label}`, error);
                // Fallback text for invalid image
                doc.setFont("helvetica", "italic");
                doc.setFontSize(8);
                doc.text("[Invalid Image Data]", item.x, imageY + 5);
            }

            // Calculate height used by this specific block
            const blockHeight = 2 + imgHeight;

            // Track the tallest block to know where the next row starts
            if (blockHeight > maxRowHeight) {
                maxRowHeight = blockHeight;
            }
        }
    });

    // 5. Return the NEW Y position (Absolute)
    // Current Y + Height of tallest item + Spacing for next section
    const heightUsed = maxRowHeight > 0 ? maxRowHeight : 10;
    
    return y + heightUsed + 5;
};