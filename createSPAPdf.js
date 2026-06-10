import { getDealData } from "../helperFunctions/getDealData.js";
import { getContactIdOfList } from "../helperFunctions/getContactIdsListOfDeal.js";
import { getPropertyInformation } from "../helperFunctions/getPropertyInformation.js";
import { getBuyerInformation } from "../helperFunctions/getBuyerInformation.js";
import { getNomineeInformation } from "../helperFunctions/getNomineeInformation.js";
import { getPaymentInformation } from "../helperFunctions/getPaymentInformation.js";
import { getPaymentTermInformation } from "../helperFunctions/getPaymentTermInformation.js";
import { getLocalBase64 } from "../helperFunctions/getBase64ImageFromLocalPath.js";
import { addHeading } from "../helperFunctions/addHeading.js";
import { drawRow } from "../helperFunctions/drawRow.js";

const PCILogoForReservationForm = "../assets/PCILogoForReservationForm.png";

// ─── Helpers ────────────────────────────────────────────────────────────────

function removePipeSuffix(text) {
  if (!text) return "";
  const pipeIndex = text.indexOf("|");
  return pipeIndex !== -1 ? text.substring(0, pipeIndex).trim() : text;
}

function formatToReadableDate(isoDateString) {
  if (!isoDateString) return "";
  const date = new Date(isoDateString);
  if (isNaN(date.getTime())) return "Invalid Date";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const day = date.getDate();
  const s = ["th", "st", "nd", "rd"];
  const v = day % 100;
  const ordinal = day + (s[(v - 20) % 10] || s[v] || s[0]);
  return `${ordinal} ${months[date.getMonth()]}, ${date.getFullYear()}`;
}

function formatCurrency(val) {
  return "PKR " + Number(val).toLocaleString();
}

function getOrdinal(n) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

function getInstallmentDate(startObj, monthOffset) {
  let d = new Date(startObj);
  const targetDay = d.getDate();
  d.setMonth(d.getMonth() + monthOffset);
  if (d.getDate() !== targetDay) d.setDate(0);
  const day = d.getDate();
  const month = d.toLocaleDateString("en-US", { month: "short" });
  return `${getOrdinal(day)} ${month}, ${d.getFullYear()}`;
}

function getSumOfBallonPayments(ballonPayments) {
  return ballonPayments.reduce((sum, p) => sum + Number(p.amount), 0);
}

// ─── Text utilities ──────────────────────────────────────────────────────────

/**
 * Wraps doc.text with automatic page-break detection.
 * Returns the new Y after printing.
 */
function addTextWithPageBreak(
  doc,
  text,
  x,
  y,
  options,
  pageHeight,
  bottomMargin,
) {
  const threshold = pageHeight - bottomMargin;
  if (y > threshold) {
    doc.addPage();
    y = 20;
  }
  doc.text(text, x, y, options);
  return y;
}

/**
 * Renders a numbered clause with a bold title on its own line,
 * then the body text wrapped to maxWidth. Returns new Y.
 */
function renderClause(
  doc,
  number,
  title,
  body,
  x,
  y,
  pageHeight,
  bottomMargin,
  maxWidth,
) {
  const lineHeight = 5;
  const indent = x + 5;

  // Check space before starting a clause
  if (y > pageHeight - bottomMargin - 20) {
    doc.addPage();
    y = 20;
  }

  // Clause title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text(`${number}. ${title}`, x, y);
  y += lineHeight + 1;

  // Clause body — split into lines
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(body, maxWidth - 5);
  for (const line of lines) {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, indent, y);
    y += lineHeight;
  }

  y += 3; // gap after clause
  return y;
}

/**
 * Renders a sub-clause (e.g. 4.1, 4.2) indented under a parent.
 * Returns new Y.
 */
function renderSubClause(
  doc,
  ref,
  body,
  x,
  y,
  pageHeight,
  bottomMargin,
  maxWidth,
) {
  const lineHeight = 5;
  const indent = x + 5;

  if (y > pageHeight - bottomMargin - 10) {
    doc.addPage();
    y = 20;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text(`${ref}`, x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const lines = doc.splitTextToSize(body, maxWidth - 10);
  let firstLine = true;
  for (const line of lines) {
    if (y > pageHeight - bottomMargin) {
      doc.addPage();
      y = 20;
    }
    doc.text(line, firstLine ? x + doc.getTextWidth(ref) + 3 : indent + 5, y);
    if (firstLine) firstLine = false;
    else y += lineHeight;
    y += lineHeight;
  }
  // undo the last increment and re-add with gap
  y += 1;
  return y;
}

// ─── Main export ─────────────────────────────────────────────────────────────

export const createSPAPdf = async (dealId) => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ compress: true });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const bottomMargin = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const col1X = 15;
  const col2X = 120;

  // ── Fetch all data (same as booking form) ──────────────────────────────────
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
    dealData,
  );
  const paymentTermInformation = await getPaymentTermInformation(
    paymentInformation,
    dealData,
  );

  // Derive buyer name(s) for the SPA header
  const primaryBuyer = buyerData[0];
  const primaryBuyerName = primaryBuyer ? primaryBuyer.NAME : "—";
  const primaryBuyerFatherName = primaryBuyer ? primaryBuyer.SON_OF : "—";

  const today = new Date();
  const todayFormatted = formatToReadableDate(today.toISOString());

  // ── Logo ───────────────────────────────────────────────────────────────────
  const logoData = await getLocalBase64(PCILogoForReservationForm);
  doc.addImage(logoData, "JPEG", 2, -5, 60, 60, undefined, "FAST");

  // ── Page 1: Cover / Parties ───────────────────────────────────────────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("SALE AND PURCHASE AGREEMENT", pageWidth / 2, 32, {
    align: "center",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `This agreement (this "Agreement") is made on this day of ${todayFormatted}`,
    pageWidth / 2,
    42,
    { align: "center" },
  );

  let currentY = 52;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Between:", marginLeft, currentY);
  currentY += 7;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);

  // Seller block
  const sellerText = doc.splitTextToSize(
    `M/s BOX PARK 3 through Mr. MUHAMMAD AMRAN ZIA hereinafter referred to as (the "Sellers / Vendors") who are the Owners of the Project M/S BOX PARK 3, Buildings located in Plot # 04-A, Mini River View, Commercial Mall, Extension-II, Bahria Town Phase 7, Rawalpindi. The Sellers/Vendors is represented by its authorized worldwide Sales & Marketing Agents, Premier Choice International Real Estate.`,
    contentWidth,
  );
  doc.text(sellerText, marginLeft, currentY);
  currentY += sellerText.length * 5 + 5;

  // "And" separator
  doc.setFont("helvetica", "bold");
  doc.text("And:", marginLeft, currentY);
  currentY += 7;

  // Buyer block
  doc.setFont("helvetica", "normal");
  const buyerIntroLines = doc.splitTextToSize(
    `${primaryBuyerName} S/O ${primaryBuyerFatherName} hereinafter referred to as (the "Buyer / Vendee") and further detailed in the Schedule below, which term shall include the nominees, successors-in-interest, legal heirs, liquidators and/or administrators and assigns. Provided that where the context so permits, the Seller and Buyer shall collectively be referred to as the "Parties".`,
    contentWidth,
  );
  doc.text(buyerIntroLines, marginLeft, currentY);
  currentY += buyerIntroLines.length * 5 + 5;

  const partiesText = doc.splitTextToSize(
    "The Parties agree to be bound by the Terms and Conditions attached hereto.",
    contentWidth,
  );
  doc.text(partiesText, marginLeft, currentY);
  currentY += partiesText.length * 5 + 8;

  doc.text(`Signed on this day of ${todayFormatted}`, marginLeft, currentY);
  currentY += 10;

  // Signature lines
  const sigLineLength = 60;
  doc.setFont("helvetica", "bold");
  doc.text(`Name: ${primaryBuyerName}`, marginLeft, currentY);
  currentY += 6;
  doc.line(marginLeft, currentY, marginLeft + sigLineLength, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("THE BUYER", marginLeft, currentY);
  currentY += 10;

  doc.setFont("helvetica", "bold");
  doc.text("For BOX PARK 3", marginLeft, currentY);
  currentY += 5;
  doc.text("Name: Mr. MUHAMMAD AMRAN ZIA", marginLeft, currentY);
  currentY += 6;
  doc.line(marginLeft, currentY, marginLeft + sigLineLength, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("THE SELLER", marginLeft, currentY);
  currentY += 12;

  // Witness lines
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("WITNESS NO.1", marginLeft, currentY);
  doc.text("WITNESS NO.2", pageWidth / 2 + 10, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Name:", marginLeft, currentY);
  doc.line(
    marginLeft + 12,
    currentY,
    marginLeft + 12 + sigLineLength,
    currentY,
  );
  doc.text("Name:", pageWidth / 2 + 10, currentY);
  doc.line(
    pageWidth / 2 + 22,
    currentY,
    pageWidth / 2 + 22 + sigLineLength,
    currentY,
  );

  // ── Page 2: Payment Schedule ───────────────────────────────────────────────
  doc.addPage();

  doc.addImage(logoData, "JPEG", 2, -5, 60, 60, undefined, "FAST");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("PAYMENT SCHEDULE", pageWidth / 2, 32, { align: "center" });

  currentY = 45;

  // Unit info table
  doc.autoTable({
    startY: currentY,
    body: [
      ["UNIT NO.", propertyInformation.UNIT_NO || "—"],
      ["FLOOR:", propertyInformation.PROPERTY_FLOOR || "—"],
      ["SIZE:", `${propertyInformation.GROSS_AREA || "—"} SQ/FT`],
      [
        "RATE:",
        formatCurrency(
          Number((propertyInformation.PRICE_PER_SQFT || "0").replace(/,/g, "")),
        ),
      ],
      ["TYPE:", propertyInformation.PROPERTY_TYPE || "—"],
      ["PROJECT:", propertyInformation.PROJECT || "—"],
    ],
    theme: "grid",
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { cellWidth: 40, fontStyle: "bold", fillColor: [240, 240, 240] },
      1: { cellWidth: 100 },
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    },
  });

  currentY += 8;

  // Notes
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("NOTE:", marginLeft, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  const notes = [
    "• If the buyer wishes to take an earlier handover, he/she will be required to clear all of the outstanding payments before taking the unit's handover.",
    "• Please refer to clause 4.4 of this agreement for the banking details to settle your installment payments, and for the email address to share the payment(s) proof and for any payments related queries.",
  ];
  for (const note of notes) {
    const noteLines = doc.splitTextToSize(note, contentWidth);
    doc.text(noteLines, marginLeft, currentY);
    currentY += noteLines.length * 4.5 + 2;
  }

  currentY += 5;

  // ── Payment plan table (same logic as booking form) ──────────────────────
  const totalPaymentPlanUnits = paymentTermInformation.PAYMENT_PLAN_MONTHS;
  const rawString = paymentInformation.PAYMENT_START_DATE;
  const ballonPayments = paymentInformation.BALLON_PAYMENT;

  const planType = paymentTermInformation.PAYMENT_PLAN;
  const isFullPlan = planType === "Full";
  const isQuarterly = planType === "Quarterly";
  const isBiannual = planType === "Biannual";

  const bookingPrice = Number(paymentInformation.BOOKING_PRICE);
  const downPayment = Number(paymentInformation.DOWN_PAYMENT_AMOUNT);
  const discountAmount = Number(paymentInformation.DISCOUNT_AMOUNT) || 0;
  const totalInstallmentAmount = Number(
    paymentTermInformation.INSTALLMENT_AMOUNT,
  );
  const possessionAmount =
    Number(paymentTermInformation.POSSESSION_AMOUNT) || 0;

  const ballonPaymentMap = {};
  let totalBalloonAmount = 0;
  ballonPayments.forEach((bp) => {
    const pos = Number(bp.position);
    const amt = Number(bp.amount);
    if (!ballonPaymentMap[pos]) ballonPaymentMap[pos] = [];
    ballonPaymentMap[pos].push(amt);
    totalBalloonAmount += amt;
  });

  const effectiveTotalUnits = isFullPlan ? 1 : totalPaymentPlanUnits;
  const perInstallmentAmount =
    effectiveTotalUnits > 0
      ? (totalInstallmentAmount - totalBalloonAmount) / effectiveTotalUnits
      : 0;

  const rowTypeLabel = isFullPlan ? "Full Payment" : "Instalment";

  let monthMultiplier = isQuarterly ? 3 : isBiannual ? 6 : 1;

  let startDate;
  if (rawString && rawString.length >= 10) {
    startDate = new Date(rawString.substring(0, 10));
  } else {
    startDate = new Date();
  }

  function toPercent(amt) {
    return bookingPrice > 0
      ? parseFloat(((amt / bookingPrice) * 100).toFixed(2))
      : 0;
  }

  const tableBody = [];
  let totalPercentage = 0;
  let totalAmount = 0;
  let balloonCounter = 0;

  // Down payment row
  const downPaymentPercent = toPercent(downPayment);
  totalPercentage += downPaymentPercent;
  totalAmount += downPayment;
  tableBody.push([
    {
      content: paymentInformation.ON_DOWN_PAYMENT_DATE
        ? formatToReadableDate(paymentInformation.ON_DOWN_PAYMENT_DATE)
        : "—",
      styles: { halign: "center" },
    },
    { content: "Down Payment", styles: { halign: "left" } },
    {
      content: `${downPaymentPercent.toFixed(2)}%`,
      styles: { halign: "center" },
    },
    { content: formatCurrency(downPayment), styles: { halign: "right" } },
  ]);

  // Discount row
  if (discountAmount > 0) {
    const discountPercent = toPercent(discountAmount);
    tableBody.push([
      { content: "—", styles: { halign: "center" } },
      {
        content: "Discount",
        styles: { halign: "left", textColor: [0, 150, 0] },
      },
      {
        content: `-${discountPercent.toFixed(2)}%`,
        styles: { halign: "center", textColor: [0, 150, 0] },
      },
      {
        content: `-${formatCurrency(discountAmount)}`,
        styles: { halign: "right", textColor: [0, 150, 0] },
      },
    ]);
  }

  // Installment rows
  for (let i = 0; i < effectiveTotalUnits; i++) {
    const index = i + 1;
    const rowDate = getInstallmentDate(startDate, i * monthMultiplier);
    const installPercent = toPercent(perInstallmentAmount);
    totalPercentage += installPercent;
    totalAmount += perInstallmentAmount;

    tableBody.push([
      { content: rowDate, styles: { halign: "center" } },
      {
        content: `${getOrdinal(index)} ${rowTypeLabel}`,
        styles: { halign: "left" },
      },
      {
        content: `${installPercent.toFixed(2)}%`,
        styles: { halign: "center" },
      },
      {
        content: formatCurrency(perInstallmentAmount),
        styles: { halign: "right" },
      },
    ]);

    if (ballonPaymentMap[index]) {
      ballonPaymentMap[index].forEach((balloonAmt) => {
        balloonCounter++;
        const balloonPercent = toPercent(balloonAmt);
        totalPercentage += balloonPercent;
        totalAmount += balloonAmt;
        tableBody.push([
          { content: rowDate, styles: { halign: "center" } },
          {
            content: `${getOrdinal(balloonCounter)} Balloon Payment`,
            styles: { halign: "left" },
          },
          {
            content: `${balloonPercent.toFixed(2)}%`,
            styles: { halign: "center" },
          },
          { content: formatCurrency(balloonAmt), styles: { halign: "right" } },
        ]);
      });
    }
  }

  // Possession row
  if (possessionAmount > 0) {
    const possessionPercent = toPercent(possessionAmount);
    totalPercentage += possessionPercent;
    totalAmount += possessionAmount;
    tableBody.push([
      {
        content: paymentInformation.ON_POSESSION_DATE
          ? formatToReadableDate(paymentInformation.ON_POSESSION_DATE)
          : "—",
        styles: { halign: "center" },
      },
      { content: "Possession", styles: { halign: "left" } },
      {
        content: `${possessionPercent.toFixed(2)}%`,
        styles: { halign: "center" },
      },
      {
        content: formatCurrency(possessionAmount),
        styles: { halign: "right" },
      },
    ]);
  }

  // Total row
  tableBody.push([
    {
      content: "Total",
      colSpan: 2,
      styles: {
        fontStyle: "bold",
        halign: "center",
        fillColor: [240, 240, 240],
      },
    },
    {
      content: `${Math.round(totalPercentage)}%`,
      styles: {
        fontStyle: "bold",
        halign: "center",
        fillColor: [240, 240, 240],
      },
    },
    {
      content: formatCurrency(totalAmount),
      styles: {
        fontStyle: "bold",
        halign: "right",
        fillColor: [240, 240, 240],
      },
    },
  ]);

  doc.autoTable({
    startY: currentY,
    head: [["DATE", "INSTALLMENTS", "PAYMENT %", "INSTALLMENT AMOUNT"]],
    body: tableBody,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2,
      valign: "middle",
      lineWidth: 0.1,
      lineColor: [200, 200, 200],
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      fontStyle: "bold",
      lineWidth: 0.1,
    },
    columnStyles: {
      0: { cellWidth: 35, halign: "center" },
      1: { cellWidth: 65, halign: "left" },
      2: { cellWidth: 30, halign: "center" },
      3: { cellWidth: 35, halign: "right" },
    },
    didDrawPage: (data) => {
      currentY = data.cursor.y;
    },
  });

  currentY += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Buyer's Signature:", marginLeft, currentY);
  const bsw = doc.getTextWidth("Buyer's Signature:");
  doc.line(marginLeft + bsw + 3, currentY, marginLeft + bsw + 43, currentY);

  doc.text("Seller's Signature:", col2X, currentY);
  const ssw = doc.getTextWidth("Seller's Signature:");
  doc.line(col2X + ssw + 3, currentY, col2X + ssw + 43, currentY);

  // ── Pages 3+: SPA Clauses ─────────────────────────────────────────────────
  doc.addPage();

  doc.addImage(logoData, "JPEG", 2, -5, 60, 60, undefined, "FAST");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("TERMS AND CONDITIONS", pageWidth / 2, 32, { align: "center" });

  currentY = 42;

  // Draw project / unit reference
  drawRow(doc, currentY, [
    { label: "Project:", value: propertyInformation.PROJECT, x: marginLeft },
    { label: "Unit No:", value: propertyInformation.UNIT_NO, x: col2X },
  ]);
  currentY += 10;

  doc.setLineWidth(0.3);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 5;

  const cw = contentWidth; // shorthand

  // ── CLAUSE 1: The Project ─────────────────────────────────────────────────
  currentY = renderClause(
    doc,
    1,
    "THE PROJECT",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause1Subs = [
    [
      "1.1",
      `The Buyer acknowledges and understands that the Seller is the Seller of the Project by the name of BOX PARK 3 and Bahria Town Pvt. Ltd is Master Developer of the Master Community in which the property is located. The plots in the Master Community shall be developed into homogeneous commercial, leisure and retail complexes with certain facilities and amenities to be shared. The Seller will develop the Plot into a homogeneous, multi-use Commercial and retail complex with certain shared facilities, parking and amenities.`,
    ],
    [
      "1.2",
      `The Project consists of Commercial Units/Shops purely for commercial purpose for the personal use of the Buyer or to be leased out by the same, subject, at all times to the conditions of usage and tenancy laid out in this agreement and any conditions imposed by the Property Manager.`,
    ],
    [
      "1.3",
      `The Buyer acknowledges and understands that the Master Developers shall remain owner of the residual land in the Master Community and that for the proper and convenient management, administration, maintenance and control of the Master Community, mutually beneficial restrictions are imposed on all the properties in the Master Community and on the Master Developers under the declaration which establishes a mutually beneficial scheme for the management, administration, maintenance and control of the Master Community.`,
    ],
    [
      "1.4",
      `The Buyer acknowledges and understands that for the proper and convenient management of the Project, the Seller will appoint an independent Property Management firm or company, herein referred to as the "Property Manager" which shall be formed or employed and shall be deemed to be operationally established at the Project from the date on which any person other than the Seller becomes an Owner of a Property in the Project provided that at this point in time the Project has been completed in full.`,
    ],
    [
      "1.5",
      `The Property Manager shall be responsible for the maintenance, upkeep and renovation of all common use areas within the project, as well as enforcement of all relevant by-laws along with the management of the Project, and for such purpose shall have the full management, administration, maintenance and control of the Project. The Buyer acknowledges and agrees to comply completely with the Property Manager.`,
    ],
    [
      "1.6",
      `The Buyer hereby agrees and understands that the Buyer, his heirs, successors-in-title, permitted successors or assignees, the Seller, and the Property Manager forming part of the Master Community as well as other property owners shall be bound by the Declaration of Adherence. The Buyer acknowledges that the declaration is subject to amendment as the Master Developer in its absolute discretion deems fit.`,
    ],
  ];

  for (const [ref, body] of clause1Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (let li = 0; li < lines.length; li++) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(lines[li], marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }

  // Disclaimers sub-section
  if (currentY > pageHeight - bottomMargin - 10) {
    doc.addPage();
    currentY = 20;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("DISCLAIMERS", marginLeft, currentY);
  currentY += 6;

  const disclaimers = [
    "The Seller, its Project Manager or their consultants shall not be responsible for any physical obstructions within the Master Community or Plot or Property.",
    "All matters pertaining to the usage, running, maintenance, upkeep and renovation etc. shall be the domain of the Property Manager/Management Firm, and the Buyer shall at all times abide by the regulations/directions notified by the Manager from time to time.",
  ];
  for (const d of disclaimers) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const dLines = doc.splitTextToSize("• " + d, cw);
    for (const l of dLines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(l, marginLeft + 3, currentY);
      currentY += 4.5;
    }
    currentY += 1;
  }
  currentY += 3;

  // ── CLAUSE 2: The Sale ───────────────────────────────────────────────────
  currentY = renderClause(
    doc,
    2,
    "THE SALE",
    `The Seller hereby sells to the Buyer who hereby purchases the property in accordance and agreement with the terms and conditions contained in this Agreement as well as the Summarized Agreement of which the terms contained herein, along with all schedules appended hereto, shall form an integral part.`,
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── CLAUSE 3: Purchase Price and Payment ──────────────────────────────────
  currentY = renderClause(
    doc,
    3,
    "PURCHASE PRICE AND PAYMENT",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause3Subs = [
    [
      "3.1",
      "Only one application form can be used for booking of one unit only. Additionally, Seller is the Sole Entity authorized to issue such bookings and recording such sales.",
    ],
    [
      "3.2",
      "The Buyer undertakes to ensure that the Property Reservation Fee and on-going installments shall be paid in Pakistani Rupees (PKR) and any shortfall in payment due to the fluctuation in case of the currency exchange rate shall be on the Buyer's account and shall be immediately rectified by the Buyer.",
    ],
    [
      "3.3",
      `All Down payments should be made according to type and size of the unit in the booking/sales office located on the site, as per schedule of payments through bank draft/pay order/cheque in the favor of "PREMIER CHOICE" with consent of the Seller.`,
    ],
    [
      "3.4",
      "All consequent installments will be made in favor of developer's account i.e. BOX PARK 3, i.e. the Seller, for which bank account details are mentioned below:\n\nBank Name: BANK AL FALAH\nAccount Title: Premier Choice\nAccount No: 55695001825626\nIBAN: PK81ALFH5569005001825626\nBranch code: 5569 | Swift Code: ALFHPKKA\nBranch Address: IBG-Bahria Town Branch Islamabad\nPayment proofs / queries: collections@pcirealestate.com",
    ],
    [
      "3.5",
      "Any and all payments from the Buyer will only be considered as completed once the Seller has issued a receipt voucher against the payment and furnished a receipt copy to the Buyer.",
    ],
    [
      "3.6",
      "The purchase price of the Property is contingent upon the current market conditions and the costs associated with the development or construction of the Property. The Seller reserves the right to reevaluate the purchase price in the event that costs increase due to unforeseeable circumstances. The Seller will provide the Buyer with written notice of any such reevaluation, which shall be deemed accepted by the Buyer if not disputed within 30 days of such notice.",
    ],
    [
      "3.7",
      "The Buyer must pay each installment of the purchase price on or before the dates stipulated in the Payment Schedule. If the Master Developer accelerates or changes the handing over date, the Seller reserves the right to accelerate or change the Payment Schedule accordingly.",
    ],
    [
      "3.8",
      "In the case of late payment, the late payment will only be accepted subject to the payment of a late payment fee/surcharge at the rate of 0.1% of the amount overdue per day, with the monthly late payment fee/surcharge being 3.0% of the amount overdue.",
    ],
    [
      "3.9",
      "Should the Buyer default or fail to pay due installment(s) (along with their accrued late fee as per Clause 3.8 above) within sixty (60) days of payment(s) due date, the Seller reserves the right to cancel the allotment of the Buyer.",
    ],
  ];

  for (const [ref, body] of clause3Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 4: Possession and Risk ────────────────────────────────────────
  currentY = renderClause(
    doc,
    4,
    "POSSESSION AND RISK",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause4Subs = [
    [
      "4.1",
      "The Anticipated Completion Date represents the date upon which it is presently expected that the Property will be ready for occupation. The Seller reserves the right to extend the Anticipated Completion Date.",
    ],
    [
      "4.2",
      "The Seller retains and reserves the right at all times to make any changes in designs and specifications to the Project as required by governing bodies, the master developer or the licensing entity.",
    ],
    [
      "4.3",
      "Buyer is bound to submit the original receipt whenever required and particularly at the time of transfer/handing over the possession to Buyer by the Seller.",
    ],
    [
      "4.4",
      "All common passages in the building, services/amenities and the landscaped areas shall neither be constructed upon nor inappropriately utilized and rented out by the Buyer but will be exclusively used for the commercial purpose they are meant for.",
    ],
    [
      "4.5",
      "The buyer or their respective unit tenant is liable to pay the relevant club/service charges along with any other maintenance charges for the maintenance and upkeep of the property on a per month basis as defined by the Property Manager.",
    ],
    [
      "4.6",
      "The property rights of the exterior walls of BOX PARK 3 will rest with the management including different types of colors, shades and designs on the exterior of the building. No projections/hooks/nails etc. will be allowed to be fixed on the exterior walls of the building.",
    ],
    [
      "4.7",
      "Seller is the sole entity with the right to approve or implement any structural or design changes at the Project.",
    ],
    [
      "4.8",
      "The vacant possession and occupation of a unit shall be given to and taken by the respective Buyer on the handing over date. The Seller shall be entitled to decline to handover possession if the Buyer fails to make payments referred to in Clause 3 or has failed to comply with any other provisions of this Agreement.",
    ],
  ];

  for (const [ref, body] of clause4Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 5: Governing Laws ──────────────────────────────────────────────
  currentY = renderClause(
    doc,
    5,
    "GOVERNING LAWS AND JURISDICTION",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause5Subs = [
    [
      "5.1",
      "In the event of any dispute or difference arising between the Parties out of or relating to this Agreement, the Parties shall use their best endeavors to amicably settle such dispute or difference within a period of 30 (thirty) days. If they do not reach such solution, the dispute shall be finally settled by arbitration in accordance with the Rules of the Master Developer.",
    ],
    [
      "5.2",
      "The arbitration shall be carried out before a tribunal consisting of 3 (three) arbitrators. Within 30 days' notice of demand for arbitration, each party shall select its arbitrator. The two arbitrators so selected shall select a third arbitrator within 30 days. In the event of failure, the Master Developer shall appoint the third arbitrator.",
    ],
    [
      "5.3",
      "The place of arbitration shall be the city of Islamabad, Pakistan. The arbitration proceedings and award shall be conducted and written in the English language with the applicable law being the Arbitration Act 1940, or any other law for the time being in force.",
    ],
    [
      "5.4",
      "The arbitration award shall be final and binding on both Parties and not subject to any appeal. Any monetary award shall be made payable in PKR free of any tax or charge/deduction. The jurisdiction of the court is hereby expressly excluded save to the extent that a matter may be referred to arbitration as agreed hereinabove.",
    ],
    [
      "5.5",
      "The award of the arbitration shall be the sole and exclusive remedy between the Parties regarding any and all claims and counterclaims, and any relief not claimed by a party shall be deemed to be abandoned.",
    ],
  ];

  for (const [ref, body] of clause5Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 6: Notices ────────────────────────────────────────────────────
  currentY = renderClause(
    doc,
    6,
    "NOTICES",
    `Any notice given under this Agreement shall be in writing in English and shall be served by delivering it personally or sending it by courier or electronic means. Any such notice shall be deemed to have been received: (i) if delivered personally, at the time of delivery; (ii) in the case of courier, on the date of delivery; (iii) in the case of electronic transmission, at the recorded time of transmission; (iv) in case of registered mail, the day of posting.`,
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── CLAUSE 7: Buyer's Covenants ───────────────────────────────────────────
  currentY = renderClause(
    doc,
    7,
    "BUYER'S COVENANTS",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause7Subs = [
    [
      "7.1",
      "Apart from the purchase price of the unit the Buyer acknowledges that he/she will also pay documentation charges for leases if any, connection and meter charges of electricity, water, Gas or other utilities for the Units where applicable.",
    ],
    [
      "7.2",
      "Transfer of property rights of the Unit will be subject to the policy of management at the time of the request for which the managing entity shall issue approval or disapproval in writing.",
    ],
    [
      "7.3",
      "The Buyer shall comply with and abide by the rules, regulations, by laws, orders and/or directions that may be issued by BOX PARK 3 and Government Authorities/Agencies/Departments from time to time.",
    ],
    [
      "7.4",
      "The Buyer's physical and digital addresses shall be deemed to be those that the Buyer has provided in the application form. The Buyer shall intimate to the management of BOX PARK 3 of any change in his/her digital and physical addresses.",
    ],
    [
      "7.5",
      "Commencing from the date of first notice that the unit is ready for use and occupation, the Buyer and Owner shall be liable to bear and pay all ongoing taxes, CAM (Common area maintenance charges), property management charges or society charges as levied by any concerned authority.",
    ],
    [
      "7.6",
      "The Property Manager shall be responsible for the maintenance, management, upkeep and custodianship of all common areas within and without the Project. The Buyer shall execute and be bound by the terms of the Management Agreement.",
    ],
    [
      "7.7",
      "The possession of the unit will rest with the Seller and shall be delivered to the Buyer only upon full payment for the Unit's purchase price with payments made on or before their respective due dates stipulated on the Buyer's payment plan.",
    ],
    [
      "7.8",
      "The Buyer of a Unit acknowledges that if he/she sells or rents out the said unit to a third party, the Third-Party Contract would be a personal contract between Buyer and the third party and that the Master Developer will assume no liability to the third party.",
    ],
    [
      "7.9",
      "Should the Buyer wish to let or rent his/her Unit, they may do so subject to the third-party tenant/occupier being bound by the terms of usage and the Management Agreement with the Property Manager, and the Buyer will only utilize the standard lease terms approved by the Seller.",
    ],
  ];

  for (const [ref, body] of clause7Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 8: Adjustments ────────────────────────────────────────────────
  currentY = renderClause(
    doc,
    8,
    "ADJUSTMENTS",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause8Subs = [
    [
      "8.1",
      "The Buyer shall be solely liable for all taxes, rates assessments, utilities and/or other charges that may be levied by any Governmental, quasi-Governmental, Master Developer, Property Manager and local authorities on the Project.",
    ],
    [
      "8.2",
      "Excess charges, if any, will be levied under extremely unavoidable circumstances for which the Buyers shall be taken into confidence prior to the levy.",
    ],
  ];

  for (const [ref, body] of clause8Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 9: Covenants Governing Usage and Tenancy ──────────────────────
  currentY = renderClause(
    doc,
    9,
    "COVENANTS GOVERNING USAGE AND TENANCY",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause9Subs = [
    [
      "9.1",
      "The usage of the premises/units shall be exclusively in accordance with their function and classification i.e. for commercial purpose. Furthermore, the Buyer hereby agrees that the premises/unit shall only be used for the establishment, operation and/or usage of recognized local, national and/or multi-national brands; or brands/outlets approved and/or recognized by the seller or the Property Manager.",
    ],
    [
      "9.2",
      "All units shall be let-out in accordance to approved tenancy guidelines/approved standard tenancy terms and regulations as may be notified by either the Seller or the Property Manager from time to time.",
    ],
    [
      "9.3",
      "The Seller shall lease commercial units only in accordance with the minimum tenancy requirements laid down by the Property Manager or the Seller.",
    ],
    [
      "9.4",
      "The Seller or the Property Manager reserves the right to take-on the management of leased-out commercial units, whereby they shall be responsible for the leasing-out of the unit against which they may charge a fee.",
    ],
    [
      "9.5",
      "Transfer of property rights of the Unit will be subject to the policy of management prevailing at the time of the request and shall only be deemed approved when such request is approved in writing.",
    ],
    [
      "9.6",
      "All common areas shall remain the exclusive property and in the exclusive usage of the Seller or the Property Manager, who shall be entitled to make use of the same which may include the establishment of stalls, vestibules, kiosks, vending machines etc., as well as any forms of publication and/or advertisement.",
    ],
  ];

  for (const [ref, body] of clause9Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 10: Transfer of Title ─────────────────────────────────────────
  currentY = renderClause(
    doc,
    10,
    "TRANSFER OF TITLE",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause10Subs = [
    [
      "10.1",
      "Provided the Buyer has fulfilled his obligations under the terms of this Agreement, the Seller shall endeavour to transfer a clear and unencumbered title in respect of the Project to the Buyer on or after the Handover Date.",
    ],
    [
      "10.2",
      "It is the Buyer's responsibility to procure the possession and title of the Property purchased from the Master Developers. The Buyer shall be responsible for all type of taxes/fees/charges/expenses payable to the Master Developers and on account of Bahria Town Pvt. Ltd.",
    ],
    [
      "10.3",
      "A transfer fee shall be applicable upon the Buyer at the time of transfer of a unit and will be calculated according to size and specification of unit by the transferring authority.",
    ],
    [
      "10.4",
      "Except with the prior written Approval of BOX PARK 3 the Buyer cannot transfer his/her right of the unit by sale, abnormal lease and mortgage of such rights to any authorized loan giving agency, bank or any other financial institution.",
    ],
    [
      "10.5",
      "Except with the prior written Approval of BOX PARK 3 and prior to the payment of at least 50% of the purchase price to the Seller, the Buyer cannot resell or offer for sale for any monetary or physical benefit with regards to their respective purchased unit.",
    ],
    [
      "10.6",
      "If the Buyer sells the Property at any time prior to the procurement of the title deed, the Buyer shall pay the Seller an administrative fee of three percent (3%) calculated on the higher amount of either the sale price or the original Purchase Price.",
    ],
  ];

  for (const [ref, body] of clause10Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 11: Seller's General Covenants ────────────────────────────────
  currentY = renderClause(
    doc,
    11,
    "SELLER'S GENERAL COVENANTS",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause11Subs = [
    [
      "11.1",
      "The Seller undertakes that it shall take all reasonable steps necessary to ensure that the project is completed on the Anticipated Completion Date or as soon as possible after the anticipated date.",
    ],
    [
      "11.2",
      "The Seller undertakes to cause the Property to be built substantially in accordance with the drawing, in proper and workmanlike manner and in accordance with good building practice, with good and suitable materials.",
    ],
    [
      "11.3",
      "The Seller shall give the Buyer notice in writing of the Completion Date and the handing over date which shall only be deemed to have been determined when such general notice has been given on the Seller's website or in writing directly to the Buyer.",
    ],
    [
      "11.4",
      "The Seller will endeavor to appoint a Property Manager that is capable of efficiently and effectively managing and maintaining the Project after completion and during operation at its independent discretion.",
    ],
  ];

  for (const [ref, body] of clause11Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 12: General Stipulations ──────────────────────────────────────
  currentY = renderClause(
    doc,
    12,
    "GENERAL STIPULATIONS",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause12Subs = [
    [
      "12.1",
      "The terms of this Agreement shall not be varied in any way, shape or form without the express approval of the Seller, and no such variation shall be valid unless the same is executed in writing and signed by the Parties or their authorized representatives.",
    ],
    [
      "12.2",
      "The Buyer may not assign or transfer any of the rights accruing under this Agreement to any third party without the express written consent of the Seller.",
    ],
    [
      "12.3",
      "No concession or other indulgence granted by the Seller to the Buyer whether in respect of time for payment or otherwise shall be deemed to be a waiver of its rights in terms of this Agreement.",
    ],
    [
      "12.4",
      "Where the Buyer is more than one person, those persons are jointly and severally liable in respect of the obligation undertaken by them under this Agreement.",
    ],
    [
      "12.5",
      "This Agreement and the accompanying Summarized Agreement together constitute the entirety of the terms agreed between the parties relating to the subject matter of this Agreement and supersedes all previous verbal or written agreements and negotiations between the parties.",
    ],
    [
      "12.6",
      "The Buyer acknowledges that in agreeing to enter into this Agreement, the Buyer has not relied on any representations, warranties or other assurances made by or on behalf of the Seller before the signature of this Agreement except those set out herein.",
    ],
    [
      "12.7",
      "The Buyer may, subject to the prior written approval of the Seller, avail a mortgage or Islamic Shirkat-O-Muzarbat to enable the Buyer and successors-in-title to purchase the Property.",
    ],
  ];

  for (const [ref, body] of clause12Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 13: Copies of Agreement ───────────────────────────────────────
  currentY = renderClause(
    doc,
    13,
    "COPIES OF THE AGREEMENT",
    "The parties have executed this Agreement in two (2) originals signed by both parties and equally distributed between them. The Schedules attached hereto and stamped and signed shall be deemed an integral part of this Agreement.",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── CLAUSE 14: Default and Termination ───────────────────────────────────
  currentY = renderClause(
    doc,
    14,
    "DEFAULT AND TERMINATION / CANCELLATION",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause14Subs = [
    [
      "14.1",
      "If the Buyer: (i) Cancels or withdraws from this Agreement; or (ii) Is insolvent or is under the process of liquidation; or (iii) Defaults or fails to abide by the payment schedule — the Seller shall give the Buyer at most one instance of a thirty (30) days' notice in writing calling on the Buyer to remedy such default. If the Buyer fails to comply, the Seller shall be entitled to terminate this Agreement and cancel the allotment.",
    ],
    [
      "14.2",
      "In case of termination, the Seller may claim compensation in an amount of not less than twenty-five (25) percent of the total Purchase Price as pre-estimated liquidated damages. The Buyer shall surrender all original documents and correspondence under the Agreement including the Agreement itself.",
    ],
    [
      "14.3",
      "Notwithstanding Clause 14.1, the Seller may retain all payments previously made by the Buyer subject to at least twenty-five percent (25%) on account of the Purchase Price up to the date of termination to meet the Seller's claim for damages.",
    ],
    [
      "14.4",
      "In the event of cancellation, all payments made up till the date of cancellation shall be refunded by the Seller in PKR after a period of one year from the date of cancellation, subject to a deduction of twenty-five percent (25%) of the amount so received. Any amount paid towards processing fees shall be non-refundable.",
    ],
  ];

  for (const [ref, body] of clause14Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 15: Effective Date ────────────────────────────────────────────
  currentY = renderClause(
    doc,
    15,
    "EFFECTIVE DATE",
    "This Agreement shall be effective and binding upon the parties from the date first above appearing. Unless terminated earlier, this Agreement shall survive the Completion Date insofar as any rights and obligations contained herein are of continuing effect.",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── CLAUSE 16: Managing Agent ─────────────────────────────────────────────
  currentY = renderClause(
    doc,
    16,
    "MANAGING AGENT",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause16Subs = [
    [
      "16.1",
      "The Seller shall have the power from time to time to appoint a Property Manager to control, manage, maintain and administer the Project and Common Use Facilities including the power to collect Service Charges, Property Management Charges, Franchise Charges, and other facility charges. Any default or delay in payment of such charges may result in the termination of common use facilities, access, or any other building and project provisions.",
    ],
    [
      "16.2",
      "The Property Manager may club CAM, property management charges, facilities maintenance and expenses, facility related taxes, and other operational Project expenses under a property management and facilities charge so as to more efficiently manage the Project for the collective benefit for all Owners and Tenants.",
    ],
  ];

  for (const [ref, body] of clause16Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 17: Utilities ─────────────────────────────────────────────────
  currentY = renderClause(
    doc,
    17,
    "UTILITIES",
    "",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  const clause17Subs = [
    [
      "17.1",
      "Every Unit, and by extension its Owner or occupier, shall be responsible for the payment of all fees and charges pertaining to maintenance and utilities utilized within the Unit, including (but not limited to) water, electricity, gas, chilled water, telecommunications and any other Utilities required in connection with his/her Unit.",
    ],
    [
      "17.2",
      "Each Owner of a unit delegates onto the Property Manager the decision to acquire facilities from the Master Developer or other providers to ensure continual satisfaction of standards of BOX PARK 3 including, but not limited to, Security, Maintenance, Beautification etc.",
    ],
    [
      "17.3",
      "No advertisements or publicity material shall be displayed on the Common Use Facilities, Plot or Unit without the prior explicitly written permission of the Seller.",
    ],
    [
      "17.4",
      "Neither the Master Community nor the Seller shall be liable for any injury or loss or damage of any description which any Owner or Occupier may sustain, physically or to his or their property, directly or indirectly, in respect of Common Use Facilities or in the Plot or Units.",
    ],
  ];

  for (const [ref, body] of clause17Subs) {
    if (currentY > pageHeight - bottomMargin - 10) {
      doc.addPage();
      currentY = 20;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    const refW = doc.getTextWidth(ref + "  ");
    doc.text(ref, marginLeft, currentY);
    doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(body, cw - refW - 2);
    for (const line of lines) {
      if (currentY > pageHeight - bottomMargin) {
        doc.addPage();
        currentY = 20;
      }
      doc.text(line, marginLeft + refW, currentY);
      currentY += 4.5;
    }
    currentY += 2;
  }
  currentY += 2;

  // ── CLAUSE 18: Force Majeure ─────────────────────────────────────────────
  currentY = renderClause(
    doc,
    18,
    "FORCE MAJEURE",
    `Neither party shall be considered to be in default or breach of an obligation under this Agreement if performance of the obligation is prevented or delayed by any Force Majeure Event, provided that the affected Party gives to the other Party a written notice within thirty (30) days of such an event. However, an event of Force Majeure shall not excuse a failure by a party to make a payment as and when it falls due. A "Force Majeure" is any event beyond the reasonable control of the affected party including (but not limited to) strikes, lockouts, fires, contamination, natural disasters, acts of God, war, terrorism, and other hostilities, invasion, sabotage, public disorders, and any action by or inaction of a Government or Governmental or juridical authority.`,
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── CLAUSE 19: Confidentiality ───────────────────────────────────────────
  currentY = renderClause(
    doc,
    19,
    "CONFIDENTIALITY",
    "The Seller and Buyer agree that either Party will not directly or indirectly make use or disclose to any other person (except as may be necessary to comply with any statutory obligation or order of any court) any confidential information relating to or belonging to the other Party which comes into its possession as a consequence of this Agreement. Confidential information shall include but not be restricted to matters of technical or financial nature, financial position and sources of both Parties including the sale consideration agreed between the parties and any concessions granted by the Seller.",
    marginLeft,
    currentY,
    pageHeight,
    bottomMargin,
    cw,
  );

  // ── Final signature page ──────────────────────────────────────────────────
  if (currentY > pageHeight - 60) {
    doc.addPage();
    currentY = 30;
  } else {
    currentY += 10;
  }

  doc.setLineWidth(0.3);
  doc.line(marginLeft, currentY, pageWidth - marginRight, currentY);
  currentY += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("AGREED AND ACCEPTED", pageWidth / 2, currentY, { align: "center" });
  currentY += 10;

  // Buyer signature block
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(`Buyer Name: ${primaryBuyerName}`, marginLeft, currentY);
  currentY += 6;
  doc.text("Buyer's Signature:", marginLeft, currentY);
  const bsFinalW = doc.getTextWidth("Buyer's Signature:");
  doc.line(
    marginLeft + bsFinalW + 3,
    currentY,
    marginLeft + bsFinalW + 63,
    currentY,
  );
  currentY += 6;
  doc.text("Buyer's Thumbprint (CNIC):", marginLeft, currentY);
  const btW = doc.getTextWidth("Buyer's Thumbprint (CNIC):");
  doc.line(marginLeft + btW + 3, currentY, marginLeft + btW + 43, currentY);
  currentY += 12;

  // Seller signature block
  doc.text("For BOX PARK 3", marginLeft, currentY);
  currentY += 5;
  doc.text("Name: Mr. MUHAMMAD AMRAN ZIA", marginLeft, currentY);
  currentY += 6;
  doc.text("Seller's Signature:", marginLeft, currentY);
  const ssFinalW = doc.getTextWidth("Seller's Signature:");
  doc.line(
    marginLeft + ssFinalW + 3,
    currentY,
    marginLeft + ssFinalW + 63,
    currentY,
  );
  currentY += 12;

  // Witness block
  doc.setFont("helvetica", "bold");
  doc.text("WITNESS NO.1", marginLeft, currentY);
  doc.text("WITNESS NO.2", pageWidth / 2 + 10, currentY);
  currentY += 5;
  doc.setFont("helvetica", "normal");
  doc.text("Name:", marginLeft, currentY);
  doc.line(marginLeft + 12, currentY, marginLeft + 12 + 55, currentY);
  doc.text("Name:", pageWidth / 2 + 10, currentY);
  doc.line(pageWidth / 2 + 22, currentY, pageWidth / 2 + 22 + 55, currentY);

  return doc;
};
