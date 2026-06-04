import { createSPAPDF } from './createSPAPDF.js';
import { getDealInfo } from './helperFunctions/getDealInfo.js';

document.addEventListener('DOMContentLoaded', async () => {

  while (!window.BX24) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }



  try {
    const dealId = getDealInfo();
    console.log('Generating SPA for Deal ID:', dealId);

    const loader = document.getElementById('loader');
    const iframe = document.getElementById('pdf-preview');
    const errorContainer = document.getElementById('error-container');
    const errorMessage = document.getElementById('error-message');

    if (loader) loader.style.display = 'flex';
    if (iframe) iframe.style.display = 'none';

    const doc = await createSPAPDF(dealId);
    const blob = doc.output('blob');

    const renamedFile = new File([blob], `SPA_${dealId}.pdf`, {
      type: 'application/pdf'
    });

    const blobUrl = URL.createObjectURL(renamedFile);

    iframe.src = blobUrl;
    iframe.style.display = 'block';
    if (loader) loader.style.display = 'none';

  } catch (error) {
    if (loader) loader.style.display = 'none';
    if (iframe) iframe.style.display = 'none';

    if (errorContainer && errorMessage) {
      errorContainer.style.display = 'flex';
      errorMessage.innerText = error.message || 'An unexpected error occurred.';
    }

    console.error('SPA Generation Error:', error);
  }
});
