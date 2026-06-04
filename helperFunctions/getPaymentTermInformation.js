import { getDealUserFieldListValue } from "./getDealUserFieldListValue.js"
export const getPaymentTermInformation = async (productInformation,dealData) => {

    var {"UF_CRM_1767359953127": paymentPlan , "UF_CRM_1767715497": paymentPlanMonths, "UF_CRM_1767360946916": possessionPercent} = dealData
    var {DISCOUNT_AMOUNT, DOWN_PAYMENT_AMOUNT , PUBLISHED_PRICE} = productInformation 

    var paymentTermInfo = {
        "PAYMENT_PLAN": await getDealUserFieldListValue("UF_CRM_1767359953127", paymentPlan),
        "PAYMENT_PLAN_MONTHS": paymentPlanMonths, 
        "POSSESSION_AMOUNT": Number(PUBLISHED_PRICE * ( possessionPercent / 100)).toFixed(2),
        "POSSESSION_PERCENT": possessionPercent,
        "INSTALLMENT_AMOUNT": Number(PUBLISHED_PRICE - DISCOUNT_AMOUNT - DOWN_PAYMENT_AMOUNT - (PUBLISHED_PRICE * (possessionPercent / 100))).toFixed(2),
    }

    console.log("Payment Term Info is ", paymentTermInfo)

    return paymentTermInfo;

}