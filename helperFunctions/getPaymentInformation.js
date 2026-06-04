import { getDealUserFieldListValue } from "./getDealUserFieldListValue.js";
export const getPaymentInformation = async (productInformation, dealData) => {

    var paymentInfo;

    var {"PRODUCT_DISCOUNT_PERCENT" : productDiscountPercent, "GROSS_AREA": grossArea, "PRICE_PER_SQFT": pricePerSqft, "PROPERTY_TYPE": propertyType, "NET_AREA": netArea, "PRODUCT_PRICE": productPrice } = productInformation


    var {"UF_CRM_1767360946916": possessionPercent, "UF_CRM_1766573650": downPaymentPercent, "UF_CRM_1767727123846": paymentStartDate, "UF_CRM_1767773115009": modeOfPayment, "UF_CRM_1767773157225": chequeOrPoNumber} = dealData

    paymentInfo = {
        "DISCOUNT_PERCENT": productDiscountPercent,
        "DISCOUNT_AMOUNT": Number(productPrice * (productDiscountPercent / 100)).toFixed(2),
        "DOWN_PAYMENT_AMOUNT": Number(productPrice * (downPaymentPercent / 100)).toFixed(2),
        "DOWN_PAYMENT_PERCENT": downPaymentPercent,
        "POSSESSION_PERCENT": possessionPercent,
        "PUBLISHED_PRICE": productPrice,
        "BOOKING_PRICE": Number(productPrice - (productPrice * (productDiscountPercent / 100))).toFixed(2), 
        "PAYMENT_START_DATE": paymentStartDate,
        "MODE_OF_PAYMENT": await getDealUserFieldListValue("UF_CRM_1767773115009", modeOfPayment),
        "CHEQUE_OR_PO_NUMBER": chequeOrPoNumber
    }

    return paymentInfo;


}
