export const getFileFieldsOfDeal = (fileFieldId, dealID) => {
    return new Promise((resolve, reject) => {
        BX24.callMethod('crm.deal.get', { id: dealID }, (result) => {
            
            if (result.error()) {
                console.error("Error fetching the deal", result.error());
                reject(result.error());
            } else {
                const data = result.data();
                
                // Check if the field exists and has data before accessing downloadUrl
                if (data[fileFieldId] && data[fileFieldId]['downloadUrl']) {
                    resolve(data[fileFieldId]['downloadUrl']);
                } else {
                    console.warn(`Field ${fileFieldId} is empty or missing on Deal ${dealID}`);
                    resolve(null); // Return null or '' if no file is found
                }
            }
        });
    });
};