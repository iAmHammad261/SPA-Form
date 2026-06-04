// imageHelper.js

export async function getBase64Image(url) {
    // The endpoint of your deployed backend
    const backendEndpoint = "https://bookingfrombackend.premierchoiceint.online/get-base64";

    try {
        // console.log("Asking backend to fetch image...");

        // Call your backend using POST
        const response = await fetch(backendEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ fileUrl: url })
        });

        // Check if the network request itself failed (e.g., 404 or 500)
        if (!response.ok) {
            throw new Error(`Backend request failed with status: ${response.status}`);
        }

        // Parse the JSON response from your server
        const result = await response.json();

        // Check if your server logic reported success
        if (!result.success) {
            throw new Error(result.error || "Unknown error from backend");
        }

        // Return the clean Base64 string
        return result.data;

    } catch (error) {
        console.error("Failed to get Base64 image via backend:", error);
        throw error;
    }
}