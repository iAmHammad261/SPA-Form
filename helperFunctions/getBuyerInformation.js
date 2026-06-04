import { callBX24Method } from "./callBX24Method.js";
import { getContactUserFieldListValue } from "./getContactUserFieldListValue.js";
// import { getFileFieldsOfDeal } from "./getFileFieldsOfDeal.js";
import { getBase64Image } from "./getBase64ImageFromUrl.js";

export const getBuyerInformation = async (contactIdsList) => {
  // console.log("Fetching Buyer Information for Deal ID:", dealId)

  // var dealData = await callBX24Method('crm.deal.get', {id: dealId});

  // var contactId = dealData["CONTACT_ID"];

  // first get the deal id

  // var contactData = await callBX24Method("crm.deal.contact.items.get", {
  //   id: dealId,
  // });

  // var index = 0;
  // var buyersData = {};
  // var contactArray = [];
  // // make the array from the contact data:
  // for (var contact of contactData) contactArray.push(contact["CONTACT_ID"]);

  // for (var contactId of contactArray) {
  //   var contactInformation = await callBX24Method("crm.contact.get", {
  //     id: contactId,
  //   });

  //   console.log("Contact Information is", contactInformation);

  //   var {
  //     NAME: name,
  //     UF_CRM_1767352714903: sonof,
  //     UF_CRM_1766983512371: cnic,
  //     UF_CRM_1767353184396: currentAddress,
  //     UF_CRM_1767353344846: permanentAddress,
  //     EMAIL: email,
  //     PHONE: phone,
  //     UF_CRM_1767691283: nationality,
  //     UF_CRM_1767353877567: occupation,
  //     UF_CRM_1767354042765: dateofbirth,
  //     UF_CRM_1767354222357: gender,
  //     UF_CRM_1767691738: alternativeEmail,
  //     UF_CRM_1767691716: alternativePhoneNumber,
  //     UF_CRM_1767691738: alternativeEmail,
  //     HAS_EMAIL: hasEmail,
  //     HAS_PHONE: hasPhone,
  //     UF_CRM_1767866386: humanRelationshipWithNature,
  //     UF_CRM_1767873477: buyerPictureCNIC,
  //     UF_CRM_1767873500: buyerCNICFront,
  //     UF_CRM_1767873531: buyerCNICBack,
  //   } = contactInformation;

  //   var buyerData = {
  //     NAME: name,
  //     SON_OF: sonof,
  //     CNIC: cnic,
  //     CURRENT_ADDRESS: currentAddress,
  //     PERMANENT_ADDRESS: permanentAddress,
  //     EMAIL: hasEmail == 'Y' ? email[0].VALUE : "",
  //     PHONE: hasPhone == 'Y' ? phone[0].VALUE : "",
  //     NATIONALITY: await getContactUserFieldListValue(
  //       "UF_CRM_1767691283",
  //       nationality
  //     ),
  //     OCCUPATION: occupation,
  //     DATE_OF_BIRTH: dateofbirth,
  //     GENDER: await getContactUserFieldListValue(
  //       "UF_CRM_1767354222357",
  //       gender
  //     ),
  //     ALTERNATIVE_EMAIL: alternativeEmail,
  //     ALTERNATIVE_PHONE_NUMBER: alternativePhoneNumber,
  //     HUMAN_RELATIONSHIP_WITH_NATURE: await getContactUserFieldListValue(
  //       "UF_CRM_1767866386",
  //       humanRelationshipWithNature
  //     ),
  //     buyerImage: buyerPictureCNIC ?  await getBase64Image(`https://pcicrm.bitrix24.com${buyerPictureCNIC['downloadUrl']}`) : null,
  //     buyerCNICFront: buyerCNICFront ? await getBase64Image(`https://pcicrm.bitrix24.com${buyerCNICFront['downloadUrl']}`) : null,
  //     buyerCNICBack: buyerCNICBack ? await getBase64Image(`https://pcicrm.bitrix24.com${buyerCNICBack['downloadUrl']}`) : null,
  //   };

  //   // construct the buyer key name:
  //   var buyerKey = "BUYER_" + (index + 1);
  //   buyersData[buyerKey] = buyerData;
  //   index += 1;

  //   console.log("Buyer Data is", buyerData);
  // }

  // return buyersData;

  //   return buyerData;

  var buyersDataToReturn = [];

  var buyerData = await callBX24Method("crm.contact.list", {
    filter: {
      "@ID": contactIdsList,
      "=UF_CRM_1767876111269": 665,
    },
    select: [
      "NAME",
      "LAST_NAME", 
      "SECOND_NAME",
      "UF_CRM_1767352714903",
      "UF_CRM_1766983512371",
      "UF_CRM_1767353184396",
      "UF_CRM_1767353344846",
      "EMAIL",
      "PHONE",
      "UF_CRM_1767691283",
      "UF_CRM_1767353877567",
      "UF_CRM_1767354042765",
      "UF_CRM_1767354222357",
      "UF_CRM_1767691738",
      "UF_CRM_1767691716",
      "HAS_EMAIL",
      "HAS_PHONE",
      "UF_CRM_1767866386",
      "UF_CRM_1767873477",
      "UF_CRM_1767873500",
      "UF_CRM_1767873531",
      "UF_CRM_1767873477",
      "UF_CRM_1767873500",
      "UF_CRM_1768191467",
      "UF_CRM_1768218461"
    ],
  });

  if(buyerData.length == 0){
    throw new Error("No buyer contacts found for the deal");
  }
  
  var objectToHoldBuyerData = {};
  for (var buyer of buyerData) {
    objectToHoldBuyerData = {};
    var {
      NAME: name ,
      LAST_NAME: lastName,
      SECOND_NAME: secondName,
      UF_CRM_1767352714903: sonof,
      UF_CRM_1766983512371: cnic,
      UF_CRM_1767353184396: currentAddress,
      UF_CRM_1767353344846: permanentAddress,
      EMAIL: email,
      PHONE: phone,
      UF_CRM_1767691283: NATIONALITY,
      UF_CRM_1767353877567: occupation,
      UF_CRM_1767354042765: dateOfBirth,
      UF_CRM_1767354222357: gender,
      UF_CRM_1767691738: alternativeEmail,
      UF_CRM_1767691716: alternativePhoneNumber,
      HAS_EMAIL: hasEmail,
      HAS_PHONE: hasPhone,
      UF_CRM_1767866386: humanRelationshipWithNature, 
      UF_CRM_1767873500: documentFirstPage,
      UF_CRM_1767873531: documentSecondPage,
      UF_CRM_1767873477: buyerPictureCNIC,
      UF_CRM_1768191467: documentType,
      UF_CRM_1768218461: identificationDocumentType
    } = buyer;

    objectToHoldBuyerData = {
      NAME: `${name}${secondName ? ' ' + secondName : ''}${lastName ? ' ' + lastName : ''}`.trim(),
      SON_OF: sonof,
      CNIC: cnic,
      CURRENT_ADDRESS: currentAddress,
      PERMANENT_ADDRESS: permanentAddress,
      EMAIL: hasEmail == "Y" ? email[0].VALUE : "",
      PHONE: hasPhone == "Y" ? phone[0].VALUE : "",
      IDENTIFICATION_DOCUMENT_TYPE: await getContactUserFieldListValue(
        "UF_CRM_1768218461",
        identificationDocumentType
      ),
      NATIONALITY: await getContactUserFieldListValue(
        "UF_CRM_1767691283",
        NATIONALITY
      ),
      OCCUPATION: occupation,
      DATE_OF_BIRTH: dateOfBirth,
      GENDER: await getContactUserFieldListValue(
        "UF_CRM_1767354222357",
        gender
      ),
      ALTERNATIVE_EMAIL: alternativeEmail,
      ALTERNATIVE_PHONE_NUMBER: alternativePhoneNumber,
      HUMAN_RELATIONSHIP_WITH_NATURE: await getContactUserFieldListValue(
        "UF_CRM_1767866386",
        humanRelationshipWithNature
      ),
      buyerImage: buyerPictureCNIC
        ? await getBase64Image(
            `https://pcicrm.bitrix24.com${buyerPictureCNIC["downloadUrl"]}`
          )
        : null,
      DOCUMENT_FIRST_PAGE: documentFirstPage
        ? await getBase64Image(
            `https://pcicrm.bitrix24.com${documentFirstPage["downloadUrl"]}`
          )
        : null,
      DOCUMENT_SECOND_PAGE: documentSecondPage
        ? await getBase64Image(
            `https://pcicrm.bitrix24.com${documentSecondPage["downloadUrl"]}`
          )
        : null,
      DOCUMENT_TYPE: documentType
    };

    buyersDataToReturn.push(objectToHoldBuyerData);
  }

  return buyersDataToReturn;
};
