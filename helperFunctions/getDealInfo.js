
// this function will get the deal information from the placement call
export const getDealInfo = (dealID) => {
    var placementInfo = BX24.placement.info()

    return placementInfo['options']['ID']

}