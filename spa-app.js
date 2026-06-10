import { getDealInfo } from "../helperFunctions/getDealInfo.js";
import { createSPAPdf } from "./createSPAPdf.js";

document.addEventListener("DOMContentLoaded", async () => {
  let renamedFile = null;
  let dealId = null;

  const loader = document.getElementById("loader");
  const iframe = document.getElementById("pdf-preview");
  const errorContainer = document.getElementById("error-container");
  const errorMessage = document.getElementById("error-message");
  const attachBtn = document.getElementById("attachToDealBtn");

  try {
    dealId = getDealInfo();

    if (loader) loader.style.display = "flex";
    if (iframe) iframe.style.display = "none";

    const doc = await createSPAPdf(dealId);
    const blob = doc.output("blob");

    renamedFile = new File([blob], `SPA_${dealId}.pdf`, {
      type: "application/pdf",
    });

    const blob_url = URL.createObjectURL(renamedFile);
    iframe.src = blob_url;

    if (loader) loader.style.display = "none";
    if (iframe) iframe.style.display = "block";
  } catch (error) {
    if (loader) loader.style.display = "none";
    if (iframe) iframe.style.display = "none";

    if (errorContainer && errorMessage) {
      errorContainer.style.display = "flex";
      errorMessage.innerText = error.message || "An unexpected error occurred.";
    }
  }

  attachBtn.addEventListener("click", async () => {
    if (!renamedFile || !dealId) {
      alert("PDF is not ready yet. Please wait for it to load.");
      return;
    }

    attachBtn.disabled = true;
    attachBtn.textContent = "Attaching...";

    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(renamedFile);
      });

      await new Promise((resolve, reject) => {
        BX24.callMethod(
          "crm.deal.update",
          {
            id: dealId,
            fields: {
              // TODO: Replace with the actual SPA custom field ID from Bitrix24
              UF_CRM_SPA_FIELD_ID_HERE: {
                fileData: [`SPA_${dealId}.pdf`, base64],
              },
            },
          },
          (result) => {
            if (result.error()) reject(result.error());
            else resolve(result.data());
          },
        );
      });

      attachBtn.textContent = "Attached!";
      attachBtn.style.borderColor = "green";
      attachBtn.style.color = "green";
    } catch (err) {
      console.error("Attach to deal failed:", err);
      attachBtn.textContent = "Failed";
      attachBtn.style.borderColor = "red";
      attachBtn.style.color = "red";
    } finally {
      setTimeout(() => {
        attachBtn.textContent = "Attach to Deal";
        attachBtn.style.borderColor = "";
        attachBtn.style.color = "";
        attachBtn.disabled = false;
      }, 3000);
    }
  });
});
