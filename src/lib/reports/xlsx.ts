import "server-only";

import ExcelJS from "exceljs";

import { logoPng, watermarkPng } from "@/lib/reports/brand-images";
import type { ReportData, ReportLine, ShareRow } from "@/lib/reports/data";

const BRAND = "FF5B4FD6";
const BRAND_TINT = "FFEEECFB";
const INK = "FF16151D";
const MUTED = "FF5D5C6A";
const LINE = "FFE4E2EE";
const INCOME = "FF0D7A55";
const EXPENSE = "FFB5440F";
const MONEY = "#,##0.00";
const DATE = "dd mmm yyyy";
const FIRST_ROW = 7;

type Column = { header: string; width: number; numFmt?: string; align?: "left" | "right" };

function toDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Logo, name, report title and contact on top of every sheet, plus watermark and print footer. */
function brandSheet(
  wb: ExcelJS.Workbook,
  data: ReportData,
  name: string,
  images: { logo: number; mark: number },
): ExcelJS.Worksheet {
  const ws = wb.addWorksheet(name, {
    properties: { tabColor: { argb: BRAND } },
    views: [{ showGridLines: false }],
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.6, header: 0.2, footer: 0.25 },
    },
    headerFooter: {
      oddFooter: `&L&8${data.brand.name} · ${data.brand.email} · ${data.brand.phone}&R&8Page &P of &N`,
      evenFooter: `&L&8${data.brand.name} · ${data.brand.email} · ${data.brand.phone}&R&8Page &P of &N`,
    },
  });
  ws.addBackgroundImage(images.mark);
  ws.addImage(images.logo, { tl: { col: 0.08, row: 0.25 }, ext: { width: 46, height: 46 } });

  const lines: { text: string; font: Partial<ExcelJS.Font>; height: number }[] = [
    { text: data.brand.name, font: { bold: true, size: 18, color: { argb: BRAND } }, height: 24 },
    { text: `${data.brand.tagline} · ${data.title} · ${data.period}`, font: { size: 10, color: { argb: INK } }, height: 16 },
    { text: `Contact: ${data.brand.email} · ${data.brand.phone}`, font: { size: 9, color: { argb: MUTED } }, height: 14 },
    {
      text: `Prepared for ${data.who}${data.whoDetail ? ` (${data.whoDetail})` : ""} · generated ${data.generatedAt}`,
      font: { size: 9, color: { argb: MUTED } },
      height: 14,
    },
  ];
  lines.forEach((line, i) => {
    const row = ws.getRow(i + 1);
    row.height = line.height;
    const cell = row.getCell(1);
    cell.value = line.text;
    cell.font = { name: "Calibri", ...line.font };
    cell.alignment = { indent: 6, vertical: "middle" };
  });
  return ws;
}

function sectionTitle(ws: ExcelJS.Worksheet, rowNumber: number, title: string, note?: string) {
  const row = ws.getRow(rowNumber);
  row.getCell(1).value = title;
  row.getCell(1).font = { bold: true, size: 13, color: { argb: INK } };
  row.height = 20;
  if (note) {
    row.getCell(2).value = note;
    row.getCell(2).font = { size: 9, italic: true, color: { argb: MUTED } };
  }
}

/** A filterable table with a branded header row; returns the next free row. */
function table(
  ws: ExcelJS.Worksheet,
  start: number,
  columns: Column[],
  rows: (string | number | Date | null)[][],
  options: { freeze?: boolean; filter?: boolean; empty?: string } = {},
): number {
  const header = ws.getRow(start);
  columns.forEach((c, i) => {
    const cell = header.getCell(i + 1);
    cell.value = c.header;
    cell.font = { bold: true, size: 10, color: { argb: BRAND } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: BRAND_TINT } };
    cell.alignment = { horizontal: c.align ?? "left", vertical: "middle" };
    cell.border = { bottom: { style: "thin", color: { argb: BRAND } } };
  });
  header.height = 18;

  if (rows.length === 0) {
    const cell = ws.getRow(start + 1).getCell(1);
    cell.value = options.empty ?? "Nothing recorded in this period.";
    cell.font = { italic: true, size: 10, color: { argb: MUTED } };
    return start + 3;
  }

  rows.forEach((values, r) => {
    const row = ws.getRow(start + 1 + r);
    values.forEach((value, i) => {
      const cell = row.getCell(i + 1);
      cell.value = value;
      const column = columns[i];
      if (value instanceof Date) cell.numFmt = DATE;
      else if (column?.numFmt) cell.numFmt = column.numFmt;
      cell.alignment = { horizontal: column?.align ?? (typeof value === "number" ? "right" : "left"), vertical: "top", wrapText: false };
      cell.border = { bottom: { style: "hair", color: { argb: LINE } } };
      cell.font = { size: 10, color: { argb: INK } };
    });
  });

  // Excel allows one filter per sheet, so only the big list tables get one.
  if (options.filter !== false) {
    ws.autoFilter = {
      from: { row: start, column: 1 },
      to: { row: start + rows.length, column: columns.length },
    };
  }
  if (options.freeze) ws.views = [{ state: "frozen", ySplit: start, showGridLines: false }];
  return start + rows.length + 3;
}

function widths(ws: ExcelJS.Worksheet, columns: Column[]) {
  columns.forEach((c, i) => (ws.getColumn(i + 1).width = c.width));
}

function lineColumns(data: ReportData, kind: "entries" | "debts" | "savings"): Column[] {
  const main = data.currency ? ` (${data.currency})` : "";
  const account: Column[] = data.currency ? [] : [{ header: "Account", width: 22 }];
  const middle: Column[] =
    kind === "entries"
      ? [
          { header: "Category / source", width: 22 },
          { header: "Description", width: 34 },
          { header: "Payment method", width: 15 },
        ]
      : kind === "debts"
        ? [
            { header: "Person", width: 22 },
            { header: "Note", width: 30 },
            { header: "Status", width: 30 },
          ]
        : [
            { header: "Aim", width: 22 },
            { header: "Note", width: 30 },
          ];
  return [
    ...account,
    { header: "Date", width: 13 },
    { header: "Type", width: 14 },
    ...middle,
    { header: "Amount", width: 14, numFmt: MONEY, align: "right" },
    { header: "Currency", width: 10 },
    { header: `In main currency${main}`, width: 20, numFmt: MONEY, align: "right" },
    ...(data.currency ? [] : [{ header: "Main currency", width: 14 } as Column]),
  ];
}

function lineValues(data: ReportData, l: ReportLine, kind: "entries" | "debts" | "savings") {
  const middle =
    kind === "entries"
      ? [l.label, l.description, l.method ?? ""]
      : kind === "debts"
        ? [l.label, l.description, l.status ?? ""]
        : [l.label, l.description];
  return [
    ...(data.currency ? [] : [l.account ?? ""]),
    toDate(l.date),
    l.kindLabel,
    ...middle,
    l.amount,
    l.currency,
    l.base,
    ...(data.currency ? [] : [l.baseCurrency]),
  ];
}

function shareRows(rows: ShareRow[]) {
  return rows.map((r) => [r.name, r.total, r.count, r.share]);
}

/** The report as an Excel workbook, one sheet per part. */
export async function renderReportXlsx(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = data.brand.name;
  wb.lastModifiedBy = data.brand.name;
  wb.company = `${data.brand.name} · ${data.brand.email} · ${data.brand.phone}`;
  wb.title = `${data.brand.name} ${data.title} · ${data.period}`;
  wb.subject = `${data.title} for ${data.who}`;
  wb.created = new Date();

  const [logo, mark] = await Promise.all([logoPng(160), watermarkPng()]);
  const images = {
    logo: wb.addImage({ buffer: logo as unknown as ExcelJS.Buffer, extension: "png" }),
    mark: wb.addImage({ buffer: mark as unknown as ExcelJS.Buffer, extension: "png" }),
  };
  const main = data.currency ? ` (${data.currency})` : "";

  // ── Summary sheet: totals plus the short breakdown tables ──
  const summary = brandSheet(wb, data, "Summary", images);
  widths(summary, [
    { header: "", width: 36 },
    { header: "", width: 18 },
    { header: "", width: 12 },
    { header: "", width: 12 },
    { header: "", width: 14 },
    { header: "", width: 14 },
  ]);
  let row = FIRST_ROW;
  sectionTitle(summary, row, "Summary", data.currency ? `Amounts in ${data.currency}` : "Each account in its own main currency");
  row += 1;

  if (data.accounts) {
    row = table(
      summary,
      row,
      [
        { header: "Account", width: 36 },
        { header: "Main currency", width: 18 },
        { header: "Income", width: 12, numFmt: MONEY, align: "right" },
        { header: "Expenses", width: 12, numFmt: MONEY, align: "right" },
        { header: "Net", width: 14, numFmt: MONEY, align: "right" },
      ],
      data.accounts.map((a) => [`${a.name}${a.email ? ` (${a.email})` : ""}`, a.currency, a.income, a.expenses, a.net]),
      { filter: false },
    );
  } else {
    for (const figure of data.summary) {
      const r = summary.getRow(row++);
      r.getCell(1).value = figure.label;
      r.getCell(1).font = { size: 10, color: { argb: MUTED } };
      r.getCell(2).value = figure.value;
      r.getCell(2).numFmt = figure.kind === "money" ? MONEY : "0";
      r.getCell(2).font = {
        bold: true,
        size: 11,
        color: { argb: figure.tone === "income" ? INCOME : figure.tone === "expense" ? EXPENSE : INK },
      };
      r.getCell(2).alignment = { horizontal: "right" };
      r.getCell(1).border = r.getCell(2).border = { bottom: { style: "hair", color: { argb: LINE } } };
    }
    row += 2;
  }

  if (data.sections.has("categories")) {
    sectionTitle(summary, row++, "Spending by category");
    row = table(
      summary,
      row,
      [
        { header: "Category", width: 36 },
        { header: `Spent${main}`, width: 18, numFmt: MONEY, align: "right" },
        { header: "Entries", width: 12, numFmt: "0", align: "right" },
        { header: "Share", width: 12, numFmt: "0.0%", align: "right" },
      ],
      shareRows(data.categories),
      { filter: false },
    );
  }
  if (data.sections.has("methods")) {
    sectionTitle(summary, row++, "Payment methods");
    row = table(
      summary,
      row,
      [
        { header: "Method", width: 36 },
        { header: `Spent${main}`, width: 18, numFmt: MONEY, align: "right" },
        { header: "Entries", width: 12, numFmt: "0", align: "right" },
        { header: "Share", width: 12, numFmt: "0.0%", align: "right" },
      ],
      shareRows(data.methods),
      { filter: false },
    );
  }
  if (data.sections.has("budgets")) {
    sectionTitle(summary, row++, "Budgets");
    row = table(
      summary,
      row,
      [
        { header: "Budget", width: 36 },
        { header: `Limit${main}`, width: 18, numFmt: MONEY, align: "right" },
        { header: "Spent", width: 12, numFmt: MONEY, align: "right" },
        { header: "Left", width: 12, numFmt: MONEY, align: "right" },
        { header: "Used", width: 14, numFmt: "0%", align: "right" },
        { header: "Status", width: 14 },
      ],
      data.budgets.map((b) => [
        b.name,
        b.limit,
        b.spent,
        b.left,
        b.ratio,
        b.status === "over" ? "Over budget" : b.status === "close" ? "Close to limit" : "On track",
      ]),
      { filter: false, empty: "No budgets set." },
    );
  }
  // ── One sheet per list ──
  const entryColumns = lineColumns(data, "entries");
  const entries = brandSheet(wb, data, "Income & expenses", images);
  widths(entries, entryColumns);
  sectionTitle(entries, FIRST_ROW, "Income & expenses", `${data.entries.length} entries, oldest first`);
  const afterEntries = table(
    entries,
    FIRST_ROW + 1,
    entryColumns,
    data.entries.map((l) => lineValues(data, l, "entries")),
    { freeze: true },
  );
  if (data.currency && data.entries.length) {
    const income = data.entries.filter((l) => l.kind === "income").reduce((s, l) => s + l.base, 0);
    const spent = data.entries.filter((l) => l.kind === "expense").reduce((s, l) => s + l.base, 0);
    const totals: [string, number, string][] = [
      ["Total income", income, INCOME],
      ["Total expenses", spent, EXPENSE],
    ];
    totals.forEach(([label, value, color], i) => {
      const r = entries.getRow(afterEntries - 2 + i);
      r.getCell(entryColumns.length - 1).value = label;
      r.getCell(entryColumns.length - 1).font = { bold: true, size: 10, color: { argb: MUTED } };
      r.getCell(entryColumns.length - 1).alignment = { horizontal: "right" };
      r.getCell(entryColumns.length).value = value;
      r.getCell(entryColumns.length).numFmt = MONEY;
      r.getCell(entryColumns.length).font = { bold: true, size: 10, color: { argb: color } };
    });
  }

  if (data.sections.has("debts")) {
    const debtColumns = lineColumns(data, "debts");
    const debts = brandSheet(wb, data, "Borrow & lend", images);
    widths(debts, debtColumns);
    let start = FIRST_ROW;
    sectionTitle(debts, start++, "Borrow & lend", "Kept apart from income and expenses");
    if (data.owed) {
      const owed: [string, number, string][] = [
        ["Owed to you now", data.owed.owedToYou, INCOME],
        ["You owe now", data.owed.youOwe, EXPENSE],
      ];
      for (const [label, value, color] of owed) {
        const r = debts.getRow(start++);
        r.getCell(1).value = label;
        r.getCell(1).font = { size: 10, color: { argb: MUTED } };
        r.getCell(2).value = value;
        r.getCell(2).numFmt = MONEY;
        r.getCell(2).font = { bold: true, size: 11, color: { argb: color } };
      }
      start += 1;
    }
    table(debts, start, debtColumns, data.debts.map((l) => lineValues(data, l, "debts")), { freeze: true });
  }

  if (data.sections.has("savings")) {
    const savingColumns = lineColumns(data, "savings");
    const savings = brandSheet(wb, data, "Savings aims", images);
    widths(savings, savingColumns);
    sectionTitle(savings, FIRST_ROW, "Savings aims", "Money set aside in aims, and taken back");
    table(savings, FIRST_ROW + 1, savingColumns, data.savings.map((l) => lineValues(data, l, "savings")), { freeze: true });
  }

  const buffer = await wb.xlsx.writeBuffer();
  return Buffer.from(buffer as ArrayBuffer);
}
