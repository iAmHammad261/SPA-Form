import { callBX24Method } from "./helperFunctions/callBX24Method.js";
import { getContactIdOfList } from "./helperFunctions/getContactIdsListOfDeal.js";
import { getDealData } from "./helperFunctions/getDealData.js";
import { getPropertyInformation } from "./helperFunctions/getPropertyInformation.js";
import { getBuyerInformation } from "./helperFunctions/getBuyerInformation.js";
import { getNomineeInformation } from "./helperFunctions/getNomineeInformation.js";
import { getPaymentInformation } from "./helperFunctions/getPaymentInformation.js";
import { getPaymentTermInformation } from "./helperFunctions/getPaymentTermInformation.js";
import { addHeading } from "./helperFunctions/addHeading.js";
import { drawRow } from "./helperFunctions/drawRow.js";
import { getLocalBase64 } from "./helperFunctions/getBase64ImageFromLocalPath.js";

const PCILogoForSPA = "./assets/PCILogoForReservationForm.png";

function formatToReadableDate(isoDateString) {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  
  const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
}

const formatCurrency = (val) => {
  return "PKR " + Number(val).toLocaleString();
};

const getInstallmentDate = (startObj, monthOffset) => {
  let d = new Date(startObj);
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + monthOffset);
  
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

  try {
    // Fetch all data using same pattern as booking form
    const [dealData, contactIdsList] = await Promise.all([
      getDealData(dealId),
      getContactIdOfList(dealId),
    ]);

    const [propertyInformation, buyerData, nomineeInformation] = await Promise.all([
      getPropertyInformation(dealId),
      getBuyerInformation(contactIdsList),
      getNomineeInformation(contactIdsList),
    ]);

    const paymentInformation = await getPaymentInformation(propertyInformation, dealData);
    const paymentTermInformation = await getPaymentTermInformation(paymentInformation, dealData);

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 15;
    const col1X = 15;
    const col2X = 120;
    let currentY = margin;

    // Logo
    const localImageData = await getLocalBase64(PCILogoForSPA);
    doc.addImage(localImageData, "JPEG", 2, -5, 60, 60, undefined, "FAST");

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("SALE AND PURCHASE AGREEMENT", pageWidth / 2, 30, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const today = formatToReadableDate(new Date().toISOString().split('T')[0]);
    doc.text(`This agreement is made on this day of ${today}`, pageWidth / 2, 40, { align: "center" });

    currentY = 50;

    // Header - Seller & Buyer
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("Between:", margin, currentY);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    currentY += 8;

    const sellerName = dealData.UF_CRM_1767352714903 || "BOX PARK 3";
    const projectName = propertyInformation.PROJECT || "BOX PARK 3";
    
    doc.text(`M/s ${projectName} through Mr. ${sellerName}`, margin + 5, currentY);
    currentY += 5;
    doc.text("who are the Owners of the Project", margin + 5, currentY);
    currentY += 5;

    // Buyer Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Buyer:", margin, currentY + 5);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    const buyer = buyerData[0];
    doc.text(`Name: ${buyer.NAME}`, margin + 5, currentY + 12);
    doc.text(`S/O: ${buyer.SON_OF}`, margin + 5, currentY + 17);
    doc.text(`CNIC: ${buyer.CNIC}`, margin + 5, currentY + 22);

    currentY += 35;

    // Unit Details Section
    currentY = addHeading(doc, currentY, "UNIT DETAILS", margin, 11, true);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    
    currentY += drawRow(doc, currentY, [
      { label: "Unit No: ", value: propertyInformation.UNIT_NO, x: col1X },
      { label: "Floor: ", value: propertyInformation.PROPERTY_FLOOR, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      { label: "Size (Sq Ft): ", value: propertyInformation.GROSS_AREA, x: col1X },
      { label: "Rate (PKR/Sq Ft): ", value: propertyInformation.PRICE_PER_SQFT, x: col2X },
    ]);

    currentY += drawRow(doc, currentY, [
      { label: "Type: ", value: propertyInformation.PROPERTY_TYPE, x: col1X },
      { label: "Project: ", value: projectName, x: col2X },
    ]);

    currentY += 5;

    // Payment Schedule
    if (currentY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("PAYMENT SCHEDULE", pageWidth / 2, currentY, { align: "center" });

    currentY += 10;

    // Generate payment schedule
    const totalPaymentPlanUnits = paymentTermInformation.PAYMENT_PLAN_MONTHS || 36;
    const amount = paymentTermInformation.INSTALLMENT_AMOUNT || paymentInformation.BOOKING_PRICE;
    const isFullPlan = paymentTermInformation.PAYMENT_PLAN === "Full";
    const rawString = paymentInformation.PAYMENT_START_DATE;

    let startDate = new Date();
    if (rawString && rawString.length >= 10) {
      startDate = new Date(rawString.substring(0, 10));
    }

    const tableBody = [];
    const installments = isFullPlan ? 1 : totalPaymentPlanUnits;

    for (let i = 0; i < installments; i++) {
      const displayAmount = isFullPlan ? paymentInformation.BOOKING_PRICE : amount;
      const displayDate = getInstallmentDate(startDate, i);
      
      tableBody.push([
        (i + 1).toString(),
        isFullPlan ? "Full Payment" : "Instalment",
        formatCurrency(displayAmount),
        displayDate
      ]);
    }

    doc.autoTable({
      startY: currentY,
      head: [["Sr. No", "Type", "Amount (PKR)", "Date"]],
      body: tableBody,
      theme: "grid",
      styles: {
        fontSize: 8,
        cellPadding: 3,
      },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 40 },
        2: { cellWidth: 50 },
        3: { cellWidth: 50 }
      },
      headStyles: {
        fillColor: [240, 240, 240],
        fontStyle: "bold",
      }
    });

    currentY = doc.lastAutoTable.finalY + 15;

    // Terms & Conditions (Fixed)
    if (currentY > doc.internal.pageSize.getHeight() - 80) {
      doc.addPage();
      currentY = 20;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("TERMS AND CONDITIONS", margin, currentY);

    currentY += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);

    const termsText = `
1. THE PROJECT: The Buyer acknowledges that the Seller is the Seller of the Project and Defence Housing Authority is Master Developer. The Project consists of Commercial Units/Shops purely for commercial purpose.

2. DISCLAIMERS: The Seller shall not be responsible for any physical obstructions within the Master Community. All matters pertaining to usage and maintenance shall be the domain of the Property Manager.

3. THE SALE: The Seller hereby sells to the Buyer who hereby purchases the property in accordance with the terms and conditions contained in this Agreement.

4. PURCHASE PRICE AND PAYMENT: Only one application form can be used for booking of one unit. The Buyer shall ensure payments are made in Pakistani Rupees (PKR). Late payment fee is 0.1% per day, monthly maximum 3.0%. Default after 60 days will result in cancellation with 25% penalty.

5. POSSESSION AND RISK: Possession shall be given on the handing over date. All risks pass to Buyer on Completion Date. Buyer must submit receipt at time of handover.
    `;

    const splitText = doc.splitTextToSize(termsText, pageWidth - 2 * margin);
    doc.text(splitText, margin, currentY);

    return doc;

  } catch (error) {
    console.error("Error creating SPA PDF:", error);
    throw new Error(`Failed to generate SPA: ${error.message}`);
  }
};
