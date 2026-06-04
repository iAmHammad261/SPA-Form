import { getDealInfo } from "./helperFunctions/getDealInfo.js";
import { createSPAPDF } from "./helperFunctions/createSPAPDF.js";

document.addEventListener("DOMContentLoaded", async () => {
  try {
    console.log("Generating SPA for Deal ID:", getDealInfo());
    const dealId = getDealInfo();

    var loader = document.getElementById("loader");
    var iframe = document.getElementById("pdf-preview");
    var errorContainer = document.getElementById("error-container");
    var errorMessage = document.getElementById("error-message");

    if (loader) loader.style.display = "flex";
    if (iframe) iframe.style.display = "none";

    var doc = await createSPAPDF(dealId);
    var blob = doc.output("blob");

    const renamedFile = new File([blob], `SPA_${dealId}.pdf`, {
      type: "application/pdf",
    });

    var blob_url = URL.createObjectURL(renamedFile);

    iframe.src = blob_url;

    iframe.style.display = "block";

    if (loader) loader.style.display = "none";
    if (iframe) iframe.style.display = "block";
  } catch (error) {
    if (loader) loader.style.display = "none";
    if (iframe) iframe.style.display = "none";

    if (errorContainer && errorMessage) {
      errorContainer.style.display = "flex";
      errorMessage.innerText = error.message || "An unexpected error occurred.";
    }

    console.error("SPA Generation Error:", error);
  }
});
