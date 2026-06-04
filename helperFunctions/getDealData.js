import { callBX24Method } from "./callBX24Method.js";

export const getDealData = async (dealId) => {
    var dealData = await callBX24Method('crm.deal.get', {id: dealId});
    return dealData;
}