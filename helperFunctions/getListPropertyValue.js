import { callBX24Method } from './callBX24Method.js'

export const getListPropertyValue = async (value) => {

    const valueInfo = await callBX24Method('catalog.productPropertyEnum.get', {id: value})
    console.log("Value info is", valueInfo)
    return valueInfo['productPropertyEnum']['value'];

}