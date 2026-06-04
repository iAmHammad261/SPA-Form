/**
 * Converts a 0-based index to an ordinal word (e.g., 0 -> "first")
 * @param {number} index - The currentsalesindex from your department object.
 * @returns {string} - The ordinal word representation.
 */
export const indexToOrdinalWord = (index) => {
    const n = index + 1; // Adjust so 0 is "first"

   const rules = {
        ones: ["", "First", "Second", "Third", "Fourth", "Fifth", "Sixth", "Seventh", "Eighth", "Ninth"],
        teens: ["Tenth", "Eleventh", "Twelfth", "Thirteenth", "Fourteenth", "Fifteenth", "Sixteenth", "Seventeenth", "Eighteenth", "Nineteenth"],
        tens: ["", "", "Twentieth", "Thirtieth", "Fortieth", "Fiftieth", "Sixtieth", "Seventieth", "Eightieth", "Ninetieth"]
    };

    // 1-9
    if (n < 10) return rules.ones[n];
    
    // 10-19
    if (n >= 10 && n < 20) return rules.teens[n - 10];

    // 20-99
    if (n < 100) {
        const tenIdx = Math.floor(n / 10);
        const unitIdx = n % 10;
        
        if (unitIdx === 0) return rules.tens[tenIdx];
        
        // For compound ordinals (e.g., 21st), the first part is cardinal 
        // "twenty" and the second is ordinal "first"
        const cardinalTens = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
        return `${cardinalTens[tenIdx]}-${rules.ones[unitIdx]}`;
    }

    return n + "th"; // Fallback for very large numbers
}