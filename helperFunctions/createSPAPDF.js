import { getFileFieldsOfDeal } from "./getFileFieldsOfDeal.js";
import { getDealInfo } from "./getDealInfo.js";
import { getBase64Image } from "./getBase64ImageFromUrl.js";
import { getLocalBase64 } from "./getBase64ImageFromLocalPath.js";
import { getPropertyInformation } from "./getPropertyInformation.js";
import { getBuyerInformation } from "./getBuyerInformation.js";
import { drawRow } from "./drawRow.js";
import { getDealData } from "./getDealData.js";
// import { getNumberOfNominees  } from "./helperFunctions/getNomineeExistence.js";
// import { getNomineeExistence } from "./helperFunctions/getNomineeExistence.js";
import { getNomineeInformation } from "./getNomineeInformation.js";
import { getPaymentInformation } from "./getPaymentInformation.js";
import { getPaymentTermInformation } from "./getPaymentTermInformation.js";
import { drawImageRow } from "./drawImageRow.js";
import { addHeading } from "./addHeading.js";
import { getContactIdOfList } from "./getContactIdsListOfDeal.js";
import { getContactUserFieldListValue } from "./getContactUserFieldListValue.js";
import { indexToOrdinalWord } from "./wordsToOrdinal.js";
const PCILogo = "./assets/PCILogo.jpeg";
const PCILogoForReservationForm = "./assets/PCILogoForReservationForm.png";
const temsAndCondtionPdfPage = "../assets/termAndConditon.jpg";

function removePipeSuffix(text) {
  if (!text) return "";

  // Find the index of the pipe

  const pipeIndex = text.indexOf("|");

  // If a pipe exists, return the substring before it

  if (pipeIndex !== -1) {
    return text.substring(0, pipeIndex).trim();
  }

  // If no pipe, return the original text

  return text;
}

function formatToReadableDate(isoDateString) {
  if (!isoDateString) return "";

  // Create a Date object from the ISO string
  const date = new Date(isoDateString);

  // Check if date is invalid
  if (isNaN(date.getTime())) return "Invalid Date";

  // Array for converting month index (0-11) to uppercase text
  const months = [
    "JAN",
    "FEB",
    "MAR",
    "APR",
    "MAY",
    "JUN",
    "JUL",
    "AUG",
    "SEP",
    "OCT",
    "NOV",
    "DEC",
  ];

  // Get the day and pad with '0' if it is a single digit (e.g., 5 -> 05)
  const day = String(date.getDate()).padStart(2, "0");

  // Get the month string based on index
  const month = months[date.getMonth()];

  // Get the full year
  const year = date.getFullYear();

  // Return combined string
  return `${day}-${month}-${year}`;
}

const formatCurrency = (val) => {
  return "PKR " + Number(val).toLocaleString();
};

const getInstallmentDate = (startObj, monthOffset) => {
  let d = new Date(startObj);

  // 1. Capture the original day of the month (e.g., 30 or 31)
  const targetDay = d.getDate();

  // 2. Set the month
  d.setMonth(d.getMonth() + monthOffset);

  // 3. Check for Overflow:
  // If the new month's day is not the targetDay, it means it wrapped to the next month.
  // We fix this by setting the date to 0 of the current month (which is the last day of the previous month).
  if (d.getDate() !== targetDay) {
    d.setDate(0);
  }

  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  const year = d.getFullYear();

  return `${getOrdinal(day)} ${month}, ${year}`;
};

const getOrdinal = (n) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export const createSPAPDF = async (dealId) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ compress: true });

  const [dealData, contactIdsList] = await Promise.all([
    getDealData(dealId),
    getContactIdOfList(dealId),
  ]);

  const [propertyInformation, buyerData, nomineeInformation] =
    await Promise.all([
      getPropertyInformation(dealId),
      getBuyerInformation(contactIdsList),
      getNomineeInformation(contactIdsList),
    ]);

  const paymentInformation = await getPaymentInformation(
    propertyInformation,
    dealData
  );

  const paymentTermInformation = await getPaymentTermInformation(
    paymentInformation,
    dealData
  );

  const textLeftMargin = 15;
  const imgWidth = 25;
  const imgHeight = 25;
  const marginTopForProfilePic = 18;
  const marginRight = 15;
  const logoWidth = 60;
  const logoHeight = 60;
  const marginTopForPCILogo = -5;
  const marginLeft = 2;
  const col1X = 15;
  const col2X = 120;

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(6);
  doc.text(
    `Booking Form No: PCI/BF/${new Date().getFullYear().toString().slice(-2)}/${
      new Date().getMonth() + 1
    }/${String(dealId).padStart(4, "0")}`,
    15,
    5
  );

  const pageWidth = doc.internal.pageSize.getWidth();

  const xPositionForProfilePic = pageWidth - imgWidth - marginRight;

  var localImageData = await getLocalBase64(PCILogoForReservationForm);

  let currentY = 45;

  // add the booking form no at the the top left of the page:

  doc.addImage(
    localImageData,
    "JPEG",
    marginLeft,
    marginTopForPCILogo,
    logoWidth,
    logoHeight,
    undefined,
    "FAST"
  );

  // adding the profile picture
  doc.addImage(
    buyerData[0].buyerImage,
    "JPEG",
    xPositionForProfilePic,
    marginTopForProfilePic,
    imgWidth,
    imgHeight,
    undefined,
    "FAST"
  );

  // adding the heading of the "RESERVATION FORM"
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("RESERVATION FORM", pageWidth / 2, 30, { align: "center" });

  // Adding Property Details Heading
  currentY = addHeading(
    doc,
    currentY,
    "PROPERTY DETAILS",
    textLeftMargin,
    9,
    true
  );

  doc.setFontSize(8);

  // Drawing the property details rows
  currentY += drawRow(doc, currentY, [
    { label: "Project: ", value: propertyInformation.PROJECT, x: col1X },
    {
      label: "Property Type: ",
      value: propertyInformation.PROPERTY_TYPE,
      x: col2X,
    },
  ]);

  currentY += drawRow(doc, currentY, [
    { label: "Unit No: ", value: propertyInformation.UNIT_NO, x: col1X },
    {
      label: "Property Floor: ",
      value: propertyInformation.PROPERTY_FLOOR,
      x: col2X,
    },
  ]);

  currentY += drawRow(doc, currentY, [
    {
      label: "Gross Area(SQ/FT): ",
      value: propertyInformation.GROSS_AREA,
      x: col1X,
    },
    {
      label: "Price per SQ/FT: ",
      value: formatCurrency(
        Number(propertyInformation.PRICE_PER_SQFT.replace(/,/g, ""))
      ),
      x: col2X,
    },
  ]);

  // Adding Buyer Details Heading
  currentY = addHeading(
    doc,
    currentY,
    "BUYER DETAILS",
    textLeftMargin,
    9,
    true
  );

  // Drawing the buyer details rows
  var buyerInformation;
  var buyerIndex = 0;
  for (var buyerNo in buyerData) {
    buyerInformation = buyerData[buyerNo];

    if (Object.keys(buyerData).length > 1) {
      // doc.setFont("helvetica", "bold");

      currentY = addHeading(
        doc,
        currentY,
        `${indexToOrdinalWord(buyerIndex)} Buyer Details:`,
        textLeftMargin,
        9,
        false
      );
    }

    currentY += drawRow(doc, currentY, [
      { label: "Name: ", value: buyerInformation.NAME, x: col1X },
      {
        label: `${buyerInformation.HUMAN_RELATIONSHIP_WITH_NATURE}:`,
        value: buyerInformation.SON_OF,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Permanent Address: ",
        value: removePipeSuffix(buyerInformation.PERMANENT_ADDRESS),
        x: col1X,
      },
      {
        label: "Current Address: ",
        value: removePipeSuffix(buyerInformation.CURRENT_ADDRESS),
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      { label: `${buyerInformation.IDENTIFICATION_DOCUMENT_TYPE}:`, value: buyerInformation.CNIC, x: col1X },
      { label: "Email: ", value: buyerInformation.EMAIL, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      { label: "Phone Number: ", value: buyerInformation.PHONE, x: col1X },
      {
        label: "Alt. Email: ",
        value: buyerInformation.ALTERNATIVE_EMAIL,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Alt. Phone Number: ",
        value: buyerInformation.ALTERNATIVE_PHONE_NUMBER,
        x: col1X,
      },
      { label: "Occupation: ", value: buyerInformation.OCCUPATION, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      { label: "Gender: ", value: buyerInformation.GENDER, x: col1X },
      {
        label: "Date of Birth: ",
        value: formatToReadableDate(buyerInformation.DATE_OF_BIRTH),
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Nationality: ",
        value: buyerInformation.NATIONALITY,
        x: col1X,
      },
    ]);

    buyerIndex += 1;
  }

  // Adding Nominee Details Heading
  currentY = addHeading(
    doc,
    currentY,
    "NOMINEE(S) DETAILS",
    textLeftMargin,
    9,
    true
  );

  // Adding nominee details row
  for (var i = 0; i < nomineeInformation.length; i++) {
    var nomineeData = nomineeInformation[i];

    if (nomineeInformation.length > 1) {
      doc.setFont("helvetica", "bold");
      currentY = addHeading(
        doc,
        currentY,
        `${indexToOrdinalWord(i)} Nominee Details:`,
        textLeftMargin,
        9,
        false
      );
    }

    currentY += drawRow(doc, currentY, [
      { label: "Name: ", value: nomineeData.NAME, x: col1X },
      { label: `${nomineeData.IDENTIFICATION_DOCUMENT_TYPE}: `, value: nomineeData.CNIC, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Email: ",
        value: nomineeData.EMAIL,
        x: col1X,
      },
      {
        label: "Phone Number: ",
        value: nomineeData.PHONE,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Address: ",
        value: removePipeSuffix(nomineeData.CURRENT_ADDRESS),
        x: col1X,
      },
      { label: "Nationality: ", value: nomineeData.NATIONALITY, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Relationship: ",
        value: nomineeData.RELATIONSHIP,
        x: col1X,
      },
      {
        label: `${nomineeData.HUMAN_RELATIONSHIP_WITH_NATURE.replace(
          /\s*\(.*$/,
          ""
        ).trim()}:`,
        value: nomineeData.RELATIONSHIP_NAME,
        x: col2X,
      },
    ]);
  }

  // Adding Payment Details Heading
  currentY = addHeading(
    doc,
    currentY,
    "PAYMENT DETAILS",
    textLeftMargin,
    9,
    true
  );

  currentY += drawRow(doc, currentY, [
    {
      label: "Published Price: ",
      value: formatCurrency(paymentInformation.PUBLISHED_PRICE),
      x: col1X,
    },
    {
      label: "Discount: ",
      value: `${formatCurrency(paymentInformation.DISCOUNT_AMOUNT)} (${
        paymentInformation.DISCOUNT_PERCENT
      }%)`,
      x: col2X,
    },
  ]);

  if (paymentTermInformation.PAYMENT_PLAN !== "Full") {
    currentY += drawRow(doc, currentY, [
      {
        label: "Booking Price: ",
        value: formatCurrency(paymentInformation.BOOKING_PRICE),
        x: col1X,
      },
      {
        label: "Down Payment: ",
        value: `${formatCurrency(paymentInformation.DOWN_PAYMENT_AMOUNT)} (${
          paymentInformation.DOWN_PAYMENT_PERCENT
        }%)`,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Mode of Payment: ",
        value: paymentInformation.MODE_OF_PAYMENT,
        x: col1X,
      },
      {
        label: "Cheque / PO Number: ",
        value: paymentInformation.CHEQUE_OR_PO_NUMBER,
        x: col2X,
      },
    ]);
  } else {
    currentY += drawRow(doc, currentY, [
      {
        label: "Booking Price: ",
        value: formatCurrency(paymentInformation.BOOKING_PRICE),
        x: col1X,
      },
      {
        label: "Mode of Payment: ",
        value: paymentInformation.MODE_OF_PAYMENT,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Cheque / PO Number: ",
        value: paymentInformation.CHEQUE_OR_PO_NUMBER,
        x: col1X,
      },
    ]);
  }

  // doc.setFont("helvetica", "bold");
  // doc.setFontSize(9);
  // doc.text("PAYMENT TERMS", textLeftMargin, currentY, { align: "left" });
  currentY = addHeading(
    doc,
    currentY,
    "PAYMENT TERMS",
    textLeftMargin,
    9,
    true
  );
  // doc.setLineWidth(0.25); // Set thickness (optional)
  // doc.line(
  //   textLeftMargin,
  //   currentY + 2,
  //     pageWidth - marginRight,
  //   currentY + 2
  // );

  // currentY += 8;

  if (paymentTermInformation.PAYMENT_PLAN !== "Full") {
    currentY += drawRow(doc, currentY, [
      {
        label: "Payment Plan: ",
        value: paymentTermInformation.PAYMENT_PLAN,
        x: col1X,
      },
      {
        label: `Payment Plan ${
          paymentTermInformation.PAYMENT_PLAN == "Full"
            ? ""
            : paymentTermInformation.PAYMENT_PLAN == "Monthly"
            ? "(months)"
            : paymentTermInformation.PAYMENT_PLAN == "Biannual"
            ? "(biannual / 6 months)"
            : "(quarters)"
        }: `,
        value: paymentTermInformation.PAYMENT_PLAN_MONTHS,
        x: col2X,
      },
    ]);

    currentY += drawRow(doc, currentY, [
      {
        label: "Installment Amount: ",
        value: formatCurrency(paymentTermInformation.INSTALLMENT_AMOUNT),
        x: col2X,
      },
      {
        label: "Possession Amount: ",
        value: `${formatCurrency(paymentTermInformation.POSSESSION_AMOUNT)} (${
          paymentTermInformation.POSSESSION_PERCENT
        }%)`,
        x: col1X,
      },
    ]);
  } else {
    currentY += drawRow(doc, currentY, [
      {
        label: "Payment Plan: ",
        value: paymentTermInformation.PAYMENT_PLAN,
        x: col1X,
      },
      {
        label: "Payment Amount: ",
        value: formatCurrency(paymentInformation.BOOKING_PRICE),
        x: col2X,
      },
    ]);
  }

  doc.setFontSize(8);

  doc.text(
    "DECLERATION: I/WE the, undersigned, do hereby declare that I/we have read, understood and accept the terms and conditions attached to this booking form, and any information provided above is true and correct to the best of my/our knowledge.",
    textLeftMargin,
    currentY + 5,
    { align: "left", maxWidth: pageWidth - marginRight - textLeftMargin }
  );

  currentY += 5;

  const col1XForSignatureAndThumbImpression = textLeftMargin;
  const col2XForSignatureAndThumbImpression = 110; // Horizontal start for the second column
  const lineLength = 40; // Standard length for both lines

  currentY += 15; // Space before signatures

  // --- Buyer's Signature ---
  doc.setFontSize(9);

  const label1 = "Buyer's Signature:";
  doc.text(label1, col1XForSignatureAndThumbImpression, currentY);

  const textWidth1 = doc.getTextWidth(label1);
  const gap = 3;

  doc.line(
    col1XForSignatureAndThumbImpression + textWidth1 + gap, // start after text
    currentY,
    col1XForSignatureAndThumbImpression + textWidth1 + gap + lineLength,
    currentY
  );

  // ---- Buyer's Thumbprint (CNIC) ----
  const label2 = "Buyer's Thumbprint (CNIC):";
  doc.text(label2, col2XForSignatureAndThumbImpression, currentY);

  const textWidth2 = doc.getTextWidth(label2);

  doc.line(
    col2XForSignatureAndThumbImpression + textWidth2 + gap,
    currentY,
    col2XForSignatureAndThumbImpression + textWidth2 + gap + lineLength,
    currentY
  );

  doc.addPage();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PAYMENT PLAN", pageWidth / 2, 30, { align: "center" });

  currentY = 40;

  doc.setFontSize(9);
  doc.text("Details", textLeftMargin, currentY, { align: "left" });

  doc.setLineWidth(0.25); // Set thickness (optional)
  doc.line(textLeftMargin, currentY + 2, pageWidth - marginRight, currentY + 2);

  currentY += 7;

  currentY += drawRow(doc, currentY, [
    {
      label: "Project: ",
      value: propertyInformation.PROJECT,
      x: col1X,
    },
    {
      label: "Unit No: ",
      value: propertyInformation.UNIT_NO,
      x: col2X,
    },
  ]);

  if (paymentTermInformation.PAYMENT_PLAN !== "Full") {
    currentY += drawRow(doc, currentY, [
      {
        label: "Installment Amount: ",
        value: formatCurrency(paymentTermInformation.INSTALLMENT_AMOUNT),
        x: col1X,
      },
      {
        label: "Installment Duration: ",
        value:
          paymentTermInformation.PAYMENT_PLAN_MONTHS +
          `${
            paymentTermInformation.PAYMENT_PLAN == "Full"
              ? ""
              : paymentTermInformation.PAYMENT_PLAN == "Monthly"
              ? " Months"
              : paymentTermInformation.PAYMENT_PLAN == "Biannual"
              ? " Biannuals"
              : " Quarters"
          }`,
        x: col2X,
      },
    ]);
  }

  currentY += drawRow(doc, currentY, [
    {
      label: `${
        paymentTermInformation.PAYMENT_PLAN == "Full"
          ? "Payment Amount: "
          : "Possession Amount: "
      }`,
      value: `${
        paymentTermInformation.PAYMENT_PLAN == "Full"
          ? formatCurrency(paymentInformation.BOOKING_PRICE)
          : formatCurrency(paymentTermInformation.POSSESSION_AMOUNT)
      }`,
      x: col1X,
    },
    {
      label: "Start Date: ",
      value: formatToReadableDate(paymentInformation.PAYMENT_START_DATE),
      x: col2X,
    },
  ]);

  const totalPaymentPlanUnits = paymentTermInformation.PAYMENT_PLAN_MONTHS;
  const amount = paymentTermInformation.INSTALLMENT_AMOUNT;
  const rawString = paymentInformation.PAYMENT_START_DATE;

  // 1. Check Plan Type
  const planType = paymentTermInformation.PAYMENT_PLAN;
  const isFullPlan = planType === "Full";
  const isQuarterly = planType === "Quarterly";
  const isBiannual = planType === "Biannual";

  // 2. Determine "Effective" Units (Loop Limit)
  // If Full, we only need 1 row. Otherwise, use the actual months/quarters.
  const effectiveTotalUnits = isFullPlan ? 1 : totalPaymentPlanUnits;

  // 3. Determine Amount
  let finalRowAmount = 0;
  if (isFullPlan) {
    // User Request: No division, use BOOKING_PRICE directly
    finalRowAmount = paymentInformation.BOOKING_PRICE;
  } else {
    // Standard Division Logic
    if (totalPaymentPlanUnits > 0) {
      finalRowAmount = amount / totalPaymentPlanUnits;
    }
  }

  // 4. Determine Label
  const rowTypeLabel = isFullPlan ? "Full Payment" : "Instalment";

  // 5. Determine Date Multiplier (Quarterly = 3 months, others = 1 month)
  var monthMultiplier;

  if (isQuarterly) {
    monthMultiplier = 3;
  } else if (isBiannual) {
    monthMultiplier = 6;
  } else {
    monthMultiplier = 1;
  }

  console.log("Raw date string is", rawString);

  let startDate;
  if (rawString && rawString.length >= 10) {
    const cleanString = rawString.substring(0, 10);
    startDate = new Date(cleanString);
  } else {
    console.error("Date string is missing or too short:", rawString);
    startDate = new Date();
  }

  const tableBody = [];
  const maxRowsPerCol = 24;
  const minRows = 12;

  for (let i = 0; i < maxRowsPerCol; i++) {
    const leftIndex = i + 1;
    const rightIndex = i + 1 + 24;

    // FIX: Use 'effectiveTotalUnits' to stop the loop correctly for Full plans
    if (
      i >= minRows &&
      leftIndex > effectiveTotalUnits &&
      rightIndex > effectiveTotalUnits
    ) {
      break;
    }

    // -- LEFT COLUMN --
    let leftSr = "",
      leftType = "",
      leftAmt = "",
      leftDate = "";

    if (leftIndex <= effectiveTotalUnits) {
      leftSr = leftIndex;
      leftType = rowTypeLabel; // Uses "Full Payment" or "Instalment"
      leftAmt = formatCurrency(finalRowAmount); // Uses Booking Price or Calculated Division
      leftDate = getInstallmentDate(startDate, i * monthMultiplier);
    }

    // -- RIGHT COLUMN --
    let rightSr = "",
      rightType = "",
      rightAmt = "",
      rightDate = "";

    if (rightIndex <= effectiveTotalUnits) {
      rightSr = rightIndex;
      rightType = rowTypeLabel;
      rightAmt = formatCurrency(finalRowAmount);
      rightDate = getInstallmentDate(startDate, (i + 24) * monthMultiplier);
    }

    tableBody.push([
      leftSr,
      leftType,
      leftAmt,
      leftDate,
      rightSr,
      rightType,
      rightAmt,
      rightDate,
    ]);
  }

  doc.autoTable({
    startY: currentY + 10,
    head: [
      ["Sr. No", "Type", "Amount", "Date", "Sr. No", "Type", "Amount", "Date"],
    ],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: "middle",
      halign: "center",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      fontStyle: "bold",
      lineWidth: 0.1,
      lineColor: [180, 180, 180],
    },
    columnStyles: {
      // Left Side
      0: { cellWidth: 12, halign: "center" }, // Sr No
      1: { cellWidth: 20, halign: "left" }, // Type
      2: { cellWidth: 28, halign: "right" }, // Amount
      3: { cellWidth: 25, halign: "center" }, // Date

      // Right Side
      4: { cellWidth: 12, halign: "center" }, // Sr No
      5: { cellWidth: 20, halign: "left" }, // Type
      6: { cellWidth: 28, halign: "right" }, // Amount
      7: { cellWidth: 25, halign: "center" }, // Date
    },
    didDrawPage: function (data) {
      currentY = data.cursor.y;
    },
  });

  doc.setFontSize(9);

  console.log("Current Y before signatures is", currentY);

  currentY += 120;

  const labelForBuyerSignatureOnInstallmentPlan = "Buyer's Signature:";
  doc.text(
    labelForBuyerSignatureOnInstallmentPlan,
    col1XForSignatureAndThumbImpression,
    currentY
  );

  const textWidthForSignature = doc.getTextWidth(
    labelForBuyerSignatureOnInstallmentPlan
  );

  doc.line(
    col1XForSignatureAndThumbImpression + textWidthForSignature + gap, // start after text
    currentY,
    col1XForSignatureAndThumbImpression +
      textWidthForSignature +
      gap +
      lineLength,
    currentY
  );

  // create new page:
  doc.addPage();

  currentY = 30;

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("BOOKING FORM TERMS AND CONDITIONS", pageWidth / 2, 20, {
    align: "center",
  });

  drawRow(doc, currentY, [
    {
      label: "Project",
      value: propertyInformation.PROJECT,
      x: 15,
    },
    {
      label: "Unit No",
      value: propertyInformation.UNIT_NO,
      x: 140,
    },
  ]);

  doc.addImage(
    await getLocalBase64(temsAndCondtionPdfPage),
    "JPEG",
    20,
    35,
    pageWidth - 40,
    doc.internal.pageSize.getHeight() - 50,
    undefined,
    "FAST"
  );

  currentY += doc.internal.pageSize.getHeight() - 40;

  doc.text("Buyers Signature:", textLeftMargin, currentY);

  const textWidthForTermsAndConditionsSignature =
    doc.getTextWidth("Buyers Signature:");

  doc.line(
    textLeftMargin + textWidthForTermsAndConditionsSignature + gap, // start after text
    currentY,
    textLeftMargin + textWidthForTermsAndConditionsSignature + gap + lineLength,
    currentY
  );

  // create new page:
  doc.addPage();

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("DOCUMENTS", pageWidth / 2, 20, { align: "center" });

  currentY = 28;

  currentY = addHeading(
    doc,
    currentY,
    "Buyer Documents",
    textLeftMargin,
    9,
    true
  );

  var buyerNumber = 0;
  for (var buyerNo in buyerData) {
    var itemForDocuments;
    var widthOfDocument;
    var heightOfDocument;
    buyerInformation = buyerData[buyerNo];

    if (Object.keys(buyerData).length > 1){
      doc.setFont("helvetica", "bold");
      currentY = addHeading(
        doc,
        currentY,
        `${indexToOrdinalWord(buyerNumber)} Buyer Documents:`,
        textLeftMargin,
        9,
        false
      );
    }

    // if it is not the first buyer: add the its image before the documents
    if (buyerNo != 0) {
      var imageOfBuyer = [
        {
          label: "Buyer Picture",
          value: buyerInformation.buyerImage,
          x: 15,
        },
      ];

      currentY = drawImageRow(doc, currentY, imageOfBuyer, 50, 50);
    }

    if (buyerInformation.DOCUMENT_TYPE == "699") {
      itemForDocuments = [
        {
          label: "CNIC (Front)",
          value: buyerInformation.DOCUMENT_FIRST_PAGE,
          x: 15,
        },
        {
          label: "CNIC (Back)",
          value: buyerInformation.DOCUMENT_SECOND_PAGE,
          x: 120,
        },
      ];

      widthOfDocument = 80;
      heightOfDocument = 50;
    } else {
      itemForDocuments = [
        {
          label: await getContactUserFieldListValue(
            "UF_CRM_1768191467",
            buyerInformation.DOCUMENT_TYPE
          ),
          value: buyerInformation.DOCUMENT_FIRST_PAGE,
          x: 15
        },
      ];

      widthOfDocument = 80;
      heightOfDocument = 50;
    }

    currentY = drawImageRow(
      doc,
      currentY,
      itemForDocuments,
      widthOfDocument,
      heightOfDocument
    );

    ++buyerNumber;
  }

  currentY = addHeading(
    doc,
    currentY,
    "Nominee Documents",
    textLeftMargin,
    9,
    true
  );

  for (var i = 0; i < nomineeInformation.length; i++) {
    var nomineeData = nomineeInformation[i];
    var itemForNomineeDocuments;
    var widthOfDocument;
    var heightOfDocument;

    if (nomineeInformation.length > 1){
      // doc.setFont("helvetica", "bold");
      currentY = addHeading(
        doc,
        currentY,
        `${indexToOrdinalWord(i)} Nominee:`,
        textLeftMargin,
        9,
        false
      );
    }

    console.log(
      "Nominee Information Document Type:",
      nomineeData.DOCUMENT_TYPE
    );
    console.log(
      "Nominee Image Data:",
      nomineeData.NOMINEE_FIRST_PAGE_OF_DOCUMENT
    );

    // get the document type
    if (nomineeData.DOCUMENT_TYPE == "699") {
      console.log("Rendering nominee cnic document");
      itemForNomineeDocuments = [
        {
          label: "CNIC (Front)",
          value: nomineeData.NOMINEE_FIRST_PAGE_OF_DOCUMENT,
          x: 15,
        },
        {
          label: "CNIC (Back)",
          value: nomineeData.NOMINEE_SECOND_PAGE_OF_DOCUMENT,
          x: 120,
        },
      ];

      heightOfDocument = 50;
      widthOfDocument = 80;
    } else if (nomineeData.DOCUMENT_TYPE == "701") {
      console.log("Rendering nominee passport document");
      itemForNomineeDocuments = [
        {
          label: "Passport",
          value: nomineeData.NOMINEE_FIRST_PAGE_OF_DOCUMENT,
          x: 15,
        },
      ];

      heightOfDocument = 70;
      widthOfDocument = 40;
    } else {
      itemForNomineeDocuments = [
        {
          label: await getContactUserFieldListValue(
            "UF_CRM_1768191467",
            nomineeData.DOCUMENT_TYPE
          ),
          value: nomineeData.NOMINEE_FIRST_PAGE_OF_DOCUMENT,
          x: 15
        },
      ];

      widthOfDocument = 80;
      heightOfDocument = 50;
    }

    currentY = drawImageRow(
      doc,
      currentY,
      itemForNomineeDocuments,
      widthOfDocument,
      heightOfDocument
    );
  }

  return doc;
};
