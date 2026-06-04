export const drawRow = (doc, y, items) => {
    let maxRowHeight = 0;
    // 1. Define exact height per line (Size 10 font needs ~5mm to look clean)
    const lineHeight = 3; 

    items.forEach(item => {
        // Draw Label
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(item.label, item.x, y);

        // Setup Value
        const labelWidth = doc.getTextWidth(item.label);
        const valueX = item.x + labelWidth + 2; 
        const displayValue = item.value ? String(item.value) : "-"; 

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);

        // Calculate Wrapping Width
        const pageWidth = doc.internal.pageSize.getWidth();
        const marginRight = 15;
        // If it's the 2nd column (col2X ~120), we have less space. 
        // If it's 1st column, we only have space until the 2nd column starts.
        let availableWidth = 80; // Default safe width
        if (item.x > 100) {
            // This is the right column
            availableWidth = pageWidth - valueX - marginRight;
        } else {
            // This is the left column
            availableWidth = 110 - valueX - 5; // Stop before col2X starts
        }

        // Split text
        const lines = doc.splitTextToSize(displayValue, availableWidth);

        // Draw text
        doc.text(lines, valueX, y);

        // Calculate height
        const blockHeight = lines.length * lineHeight;
        
        // Track the tallest block in this row
        if (blockHeight > maxRowHeight) {
            maxRowHeight = blockHeight;
        }
    });

    // 2. Return the dynamic height
    // If it's 1 line, height is 5mm. If 4 lines, height is 20mm.
    // We add +3mm padding for breathing room.
    const finalHeight = Math.max(maxRowHeight, lineHeight);
    
    return finalHeight + 3; 
};