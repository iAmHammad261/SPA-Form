/**
 * Sale & Purchase Agreement (SPA) PDF Generator
 * Generates dynamic SPA with terms and dynamic fields from Bitrix24
 */

export async function createSPAPDF(dealId) {

  while (!window.jspdf) {
    await new Promise(resolve => setTimeout(resolve, 100));
  }



  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ format: "A4", orientation: "portrait" });

  try {
    // Fetch all required data from Bitrix24
    const dealData = await new Promise((resolve) => {
      BX24.callMethod("crm.deal.get", { ID: dealId }, resolve);
    });
    const fields = dealData.result || {};

    const contactIds = fields.CONTACT_ID || [];
    const buyerData = await fetchBuyerDetails(contactIds);
    const paymentPlan = await fetchPaymentSchedule(fields);

    // Document Setup
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    let currentY = margin;

    // Title Section
    currentY = addTitle(doc, currentY, pageWidth);

    // Header with parties
    currentY = addHeader(doc, currentY, pageWidth, margin, fields, buyerData);

    // Payment Schedule
    currentY = addPaymentSchedule(
      doc,
      currentY,
      pageWidth,
      margin,
      paymentPlan,
    );

    // Property Details
    currentY = addPropertyDetails(doc, currentY, pageWidth, margin, fields);

    // Terms & Conditions (Fixed)
    currentY = addTermsAndConditions(
      doc,
      currentY,
      pageWidth,
      margin,
      pageHeight,
    );

    return doc;
  } catch (error) {
    console.error("Error creating SPA PDF:", error);
    throw new Error(`Failed to generate SPA: ${error.message}`);
  }
}

/**
 * Add document title and logo
 */
function addTitle(doc, y, pageWidth) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("SALE AND PURCHASE AGREEMENT", pageWidth / 2, y + 10, {
    align: "center",
  });

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  const today = new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  doc.text(
    `This agreement is made on this day of ${today}`,
    pageWidth / 2,
    y + 20,
    { align: "center" },
  );

  return y + 30;
}

/**
 * Add buyer and seller information
 */
function addHeader(doc, y, pageWidth, margin, fields, buyerData) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Between:", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const sellerName = fields.UF_CRM_SELLER_NAME || "BOX PARK 3";
  const projectName = fields.UF_CRM_PROJECT_NAME || "BOX PARK 3";
  const projectLocation =
    fields.UF_CRM_PROJECT_LOCATION ||
    "Plot # 04, Commercial Mall, Road # 35 Mini, Extension-II Sector F DHA Phase 1, Rawalpindi";

  let textLines = [
    `M/s ${projectName} through Mr. ${sellerName}`,
    `Project: ${projectName}`,
    `Location: ${projectLocation}`,
  ];

  let lineY = y + 8;
  textLines.forEach((line) => {
    doc.text(line, margin + 5, lineY);
    lineY += 5;
  });

  // Buyer Information
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Buyer:", margin, lineY + 5);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  const buyerName = buyerData.NAME || "Mr. Muhammad Usman Nazar";
  const buyerFatherName = buyerData.FATHER_NAME || "Nazar Elahi";
  const buyerCNIC = buyerData.CNIC || "1330287836749";

  doc.text(`Name: ${buyerName} S/O ${buyerFatherName}`, margin + 5, lineY + 12);
  doc.text(`CNIC: ${buyerCNIC}`, margin + 5, lineY + 17);

  // Nominee Information
  const nomineeData = buyerData.NOMINEE || {};
  if (nomineeData.NAME) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Nominee:", margin, lineY + 24);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(`Name: ${nomineeData.NAME}`, margin + 5, lineY + 31);
    doc.text(`CNIC: ${nomineeData.CNIC}`, margin + 5, lineY + 36);

    return lineY + 45;
  }

  return lineY + 25;
}

/**
 * Add dynamic payment schedule table
 */
function addPaymentSchedule(doc, y, pageWidth, margin, paymentPlan) {
  if (!paymentPlan || paymentPlan.length === 0) return y;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("PAYMENT SCHEDULE", pageWidth / 2, y, { align: "center" });

  y += 8;

  const pageHeight = doc.internal.pageSize.getHeight();
  const tableData = [];

  // Headers
  tableData.push(["Sr. No", "Type", "Amount (PKR)", "Date"]);

  // Add payment rows
  paymentPlan.forEach((payment, index) => {
    const date = new Date(payment.date).toLocaleDateString("en-GB");
    tableData.push([
      (index + 1).toString(),
      payment.type || "Instalment",
      payment.amount.toLocaleString(),
      date,
    ]);
  });

  doc.autoTable({
    startY: y,
    head: [tableData[0]],
    body: tableData.slice(1),
    margin: { left: margin, right: margin },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 40 },
      2: { cellWidth: 50 },
      3: { cellWidth: 50 },
    },
    fontSize: 8,
    didDrawPage: (data) => {
      // Check if we need a new page
      if (data.cursor.y > pageHeight - 30) {
        doc.addPage();
      }
    },
  });

  return doc.lastAutoTable.finalY + 10;
}

/**
 * Add property details section
 */
function addPropertyDetails(doc, y, pageWidth, margin, fields) {
  if (y > doc.internal.pageSize.getHeight() - 50) {
    doc.addPage();
    y = margin;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("UNIT DETAILS", margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);

  const unitDetails = [
    { label: "Unit No.", value: fields.UF_CRM_UNIT_NO || "BP3-G1-07" },
    { label: "Floor", value: fields.UF_CRM_FLOOR || "Ground 1" },
    { label: "Size (Sq Ft)", value: fields.UF_CRM_UNIT_SIZE || "235.2" },
    { label: "Rate (PKR/Sq Ft)", value: fields.UF_CRM_UNIT_RATE || "41000" },
    { label: "Type", value: fields.UF_CRM_UNIT_TYPE || "SHOP" },
    { label: "Project", value: fields.UF_CRM_PROJECT_NAME || "BOX PARK III" },
  ];

  y += 8;
  unitDetails.forEach((detail) => {
    doc.text(`${detail.label}: ${detail.value}`, margin + 5, y);
    y += 6;
  });

  return y + 10;
}

/**
 * Add fixed terms and conditions
 */
function addTermsAndConditions(doc, y, pageWidth, margin, pageHeight) {
  const terms = [
    {
      section: "1. THE PROJECT",
      content: [
        "1.1 The Buyer acknowledges and understands that the Seller is the Seller of the Project and Defence Housing Authority is Master Developer.",
        "1.2 The Project consists of Commercial Units/Shops purely for commercial purpose.",
        "1.3 The Master Developers shall remain owner of the residual land.",
      ],
    },
    {
      section: "2. DISCLAIMERS",
      content: [
        "2.1 The Seller shall not be responsible for any physical obstructions within the Master Community.",
        "2.2 All matters pertaining to usage, maintenance shall be the domain of the Property Manager.",
      ],
    },
    {
      section: "3. THE SALE",
      content: [
        "The Seller hereby sells to the Buyer who hereby purchases the property in accordance with the terms and conditions contained in this Agreement.",
      ],
    },
    {
      section: "4. PURCHASE PRICE AND PAYMENT",
      content: [
        "4.1 Only one application form can be used for booking of one unit only.",
        "4.2 The Buyer shall ensure that payments are made in Pakistani Rupees (PKR).",
        "4.3 Late payment fee is 0.1% per day, monthly maximum 3.0%.",
        "4.4 Default after 60 days will result in cancellation with 25% penalty.",
      ],
    },
    {
      section: "5. POSSESSION AND RISK",
      content: [
        "5.1 Possession shall be given on the handing over date.",
        "5.2 All risks pass to Buyer on Completion Date.",
        "5.3 Buyer must submit receipt at time of handover.",
      ],
    },
  ];

  terms.forEach((termBlock) => {
    // Check if we need a new page
    if (y > pageHeight - 40) {
      doc.addPage();
      y = margin;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(termBlock.section, margin, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    termBlock.content.forEach((para) => {
      const splitText = doc.splitTextToSize(para, pageWidth - 2 * margin);
      doc.text(splitText, margin + 3, y);
      y += splitText.length * 4 + 2;
    });

    y += 3;
  });

  return y;
}

/**
 * Fetch buyer details from Bitrix24
 */
async function fetchBuyerDetails(contactId) {
  try {
    if (!contactId) return {};

    const contact = await BX24.callMethod("crm.contact.get", { ID: contactId });
    const contactFields = contact.data().result || {};

    return {
      NAME: contactFields.NAME || "",
      FATHER_NAME: contactFields.LAST_NAME || "",
      CNIC: contactFields.UF_CRM_CONTACT_CNIC || "",
      PHONE: contactFields.PHONE || "",
      EMAIL: contactFields.EMAIL || "",
    };
  } catch (error) {
    console.warn("Error fetching buyer details:", error);
    return {};
  }
}

/**
 * Fetch payment schedule from Bitrix24
 */
async function fetchPaymentSchedule(dealFields) {
  try {
    const payments = [];
    const paymentPlanType = dealFields.UF_CRM_PAYMENT_PLAN_TYPE || "standard";

    // Example: Generate 36 monthly payments
    const startDate = new Date(
      dealFields.UF_CRM_PAYMENT_START_DATE || new Date(),
    );
    const monthlyAmount = dealFields.UF_CRM_MONTHLY_PAYMENT || 105083;
    const balloonAmount = dealFields.UF_CRM_BALLOON_PAYMENT || 400000;

    for (let i = 0; i < 36; i++) {
      const paymentDate = new Date(startDate);
      paymentDate.setMonth(paymentDate.getMonth() + i);

      payments.push({
        number: i + 1,
        type: i % 6 === 5 ? "Balloon" : "Instalment",
        amount: i % 6 === 5 ? balloonAmount : monthlyAmount,
        date: paymentDate.toISOString().split("T")[0],
      });
    }

    return payments;
  } catch (error) {
    console.warn("Error fetching payment schedule:", error);
    return [];
  }
}
