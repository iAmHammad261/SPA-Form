// helperFunctions/getLocalBase64.js
export async function getLocalBase64(imagePath) {
  try {
    // 1. Fetch the image from the local server path
    const response = await fetch(imagePath);
    
    if (!response.ok) {
      throw new Error(`Failed to load local image: ${response.statusText}`);
    }

    // 2. Convert to Blob
    const blob = await response.blob();

    // 3. Read Blob as Base64 string
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result); // Returns "data:image/jpeg;base64,..."
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error("Error converting local image to Base64:", error);
    return null; // Return null so the PDF generation doesn't crash completely
  }
}