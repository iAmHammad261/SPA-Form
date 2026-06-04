import { callBX24Method } from './callBX24Method.js'
import { getListPropertyValue } from './getListPropertyValue.js';


export const getPropertyInformation = async (dealId) => {

    var productId;


    var productRows = await callBX24Method('crm.deal.productrows.get', {id: dealId});

    console.log("product row is ", productRows);

    if(productRows.length == 0){
        throw new Error("No products found for this deal");
    }
    productId = productRows[0]['PRODUCT_ID'];


    // after getting the product id, we get the product information
    var productInformation;
     productInformation = await callBX24Method('crm.product.get', { id: productId });

     console.log("Product information is", productInformation)

    // first get the project field
    var {"PROPERTY_173": projectFieldValue, "NAME": propertyNameValue, "PROPERTY_139": propertyTypeValue, "PROPERTY_113": grossAreaValue, "PROPERTY_115": basicRateValue, "PROPERTY_135": floorValue, "PROPERTY_149": netAreaValue}  = productInformation 

    // data to return : 
    var productData = {
        "PRODUCT_ID": productId,
        "PRODUCT_DISCOUNT_PERCENT": productRows[0]['DISCOUNT_RATE'],
        "PRODUCT_PRICE": productRows[0]['PRICE_BRUTTO'],
        "PROJECT": await getListPropertyValue(projectFieldValue['value']),
        "PROPERTY_TYPE": await getListPropertyValue(propertyTypeValue['value']),
        "PROPERTY_FLOOR": await getListPropertyValue(floorValue['value']),
        "UNIT_NO": propertyNameValue,
        "GROSS_AREA": grossAreaValue['value'],
        "NET_AREA": netAreaValue['value'],
        "PRICE_PER_SQFT": basicRateValue['value']
    }


    return productData

   
}