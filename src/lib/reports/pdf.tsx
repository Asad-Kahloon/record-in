import "server-only";

import {
  Circle,
  Defs,
  Document,
  Font,
  G,
  LinearGradient,
  Page,
  Path,
  Rect,
  Stop,
  StyleSheet,
  Svg,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { formatDate } from "@/lib/dates";
import type { ReportData, ReportLine, ShareRow } from "@/lib/reports/data";

// Whole words only — a money report should never hyphenate a name or a number.
Font.registerHyphenationCallback((word) => [word]);

const C = {
  brand: "#5b4fd6",
  brandTint: "#eeecfb",
  ink: "#16151d",
  muted: "#5d5c6a",
  faint: "#8a8996",
  line: "#e4e2ee",
  zebra: "#f8f7fc",
  income: "#0d7a55",
  expense: "#b5440f",
  warning: "#8f5d00",
  critical: "#c4302f",
};

// The built-in PDF fonts can only draw Windows-1252 text; swap the few common
// characters they lack and mark anything else, rather than print garbage.
const WIN_ANSI_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";
function safe(text: string | null | undefined): string {
  return (text ?? "")
    // Intl puts narrow / thin spaces in times and numbers; the PDF font has plain ones.
    .replace(/[ -​  ]/g, " ")
    .replace(/−/g, "-")
    .replace(/→/g, "->")
    .replace(/≈/g, "~")
    .replace(/[^\u0000-ÿ]/g, (ch) => (WIN_ANSI_EXTRA.includes(ch) ? ch : "?"));
}

function moneyFormatter(locale: string) {
  const cache = new Map<string, Intl.NumberFormat>();
  return (value: number, currency: string) => {
    let f = cache.get(currency);
    if (!f) {
      const symbol = new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 2 });
      // Symbols outside the PDF font (₹, ৳, ₺ …) fall back to the currency code.
      const sample = symbol.format(1);
      f = safe(sample) === sample ? symbol : new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay: "code", maximumFractionDigits: 2 });
      cache.set(currency, f);
    }
    return safe(f.format(Number.isFinite(value) ? value : 0));
  };
}

const s = StyleSheet.create({
  page: { paddingTop: 92, paddingBottom: 64, paddingHorizontal: 36, fontFamily: "Helvetica", fontSize: 9, color: C.ink },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 68,
    paddingHorizontal: 36,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 2,
    borderBottomColor: C.brand,
    backgroundColor: "#ffffff",
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  brandName: { fontFamily: "Helvetica-Bold", fontSize: 16, color: C.brand },
  brandTag: { fontSize: 8, color: C.muted, marginTop: 1 },
  headerRight: { alignItems: "flex-end" },
  headerTitle: { fontFamily: "Helvetica-Bold", fontSize: 10 },
  headerPeriod: { fontSize: 8, color: C.muted, marginTop: 2 },
  watermark: {
    position: "absolute",
    top: 330,
    left: 70,
    right: 70,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    transform: "rotate(-28deg)",
    opacity: 0.07,
  },
  watermarkText: { fontFamily: "Helvetica-Bold", fontSize: 76, color: C.brand },
  footer: {
    position: "absolute",
    bottom: 24,
    left: 36,
    right: 36,
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: C.line,
    paddingTop: 8,
    fontSize: 7.5,
    color: C.muted,
  },
  title: { fontFamily: "Helvetica-Bold", fontSize: 22, letterSpacing: -0.4 },
  subtitle: { fontSize: 11, color: C.muted, marginTop: 3 },
  meta: { fontSize: 8.5, color: C.faint, marginTop: 6 },
  section: { marginTop: 22 },
  sectionTitle: { fontFamily: "Helvetica-Bold", fontSize: 13, marginBottom: 2 },
  sectionNote: { fontSize: 8.5, color: C.muted, marginBottom: 8 },
  cards: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  card: { width: "48.8%", borderWidth: 0.75, borderColor: C.line, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 11 },
  cardLabel: { fontSize: 8, color: C.muted },
  cardValue: { fontFamily: "Helvetica-Bold", fontSize: 14, marginTop: 3 },
  table: { borderWidth: 0.75, borderColor: C.line, borderRadius: 6 },
  thead: { flexDirection: "row", backgroundColor: C.brandTint, borderBottomWidth: 1, borderBottomColor: C.brand },
  th: { fontFamily: "Helvetica-Bold", fontSize: 8, color: C.brand, paddingVertical: 6, paddingHorizontal: 6 },
  tr: { flexDirection: "row", borderBottomWidth: 0.5, borderBottomColor: C.line },
  td: { fontSize: 8.5, paddingVertical: 5, paddingHorizontal: 6 },
  small: { fontSize: 7, color: C.faint, marginTop: 1 },
  empty: { fontSize: 9, color: C.muted, paddingVertical: 10, paddingHorizontal: 8 },
  bar: { height: 5, borderRadius: 3, backgroundColor: C.brandTint, marginTop: 3 },
  barFill: { height: 5, borderRadius: 3, backgroundColor: C.brand },
  totals: { flexDirection: "row", justifyContent: "flex-end", gap: 18, marginTop: 6 },
  closing: {
    marginTop: 28,
    padding: 14,
    borderRadius: 10,
    backgroundColor: C.brandTint,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
});

function Logo({ size }: { size: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <LinearGradient id="brand" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#9085e9" />
          <Stop offset="1" stopColor="#5a4bd1" />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="24" height="24" rx="5.3" ry="5.3" fill="url(#brand)" />
      <G transform="translate(4.8 4.8) scale(0.6)">
        <Circle cx="12" cy="12" r="8.5" fill="none" stroke="#120d33" strokeWidth={2.2} />
        <Path d="M12 7.5v6.5" fill="none" stroke="#120d33" strokeWidth={2.2} strokeLinecap="round" />
        <Path d="m8.75 10.75 3.25 3.25 3.25-3.25" fill="none" stroke="#120d33" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
      </G>
    </Svg>
  );
}

/** Outline of the mark for the page watermark. SVG ignores a parent's opacity, so it carries its own. */
function WatermarkMark({ size }: { size: number }) {
  const stroke = { stroke: C.brand, strokeOpacity: 0.09, strokeWidth: 1.6, fill: "none" } as const;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx="12" cy="12" r="8.5" {...stroke} />
      <Path d="M12 7.5v6.5" {...stroke} strokeLinecap="round" />
      <Path d="m8.75 10.75 3.25 3.25 3.25-3.25" {...stroke} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

type Col = { label: string; width: string; align?: "left" | "right" };

function Table({ cols, rows, empty }: { cols: Col[]; rows: React.ReactNode[][]; empty?: string }) {
  return (
    <View style={s.table}>
      <View style={s.thead} fixed={false}>
        {cols.map((c) => (
          <Text key={c.label} style={[s.th, { width: c.width, textAlign: c.align ?? "left" }]}>
            {c.label}
          </Text>
        ))}
      </View>
      {rows.length === 0 ? (
        <Text style={s.empty}>{empty ?? "Nothing recorded in this period."}</Text>
      ) : (
        rows.map((cells, r) => (
          <View key={r} style={[s.tr, r % 2 === 1 ? { backgroundColor: C.zebra } : {}]} wrap={false}>
            {cells.map((cell, i) => (
              <View key={i} style={[s.td, { width: cols[i].width, alignItems: cols[i].align === "right" ? "flex-end" : "flex-start" }]}>
                {typeof cell === "string" ? <Text>{safe(cell)}</Text> : cell}
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      {/* The heading never ends a page alone: it moves over with the start of its table. */}
      <View wrap={false} minPresenceAhead={70}>
        <Text style={s.sectionTitle}>{safe(title)}</Text>
        {note ? <Text style={s.sectionNote}>{safe(note)}</Text> : <View style={{ height: 6 }} />}
      </View>
      {children}
    </View>
  );
}

function ReportDocument({ data }: { data: ReportData }) {
  const money = moneyFormatter(data.locale);
  const date = (iso: string) => safe(formatDate(iso, data.locale, { day: "numeric", month: "short", year: "numeric" }));
  const single = data.currency !== null;
  // Non-breaking spaces keep the phone number on one line.
  const contact = data.brand.phone.replace(/ /g, "\u00a0");

  // Amount in the owner's main currency, with what was actually typed underneath when it differs.
  const amount = (l: ReportLine, color?: string) => (
    <View style={{ alignItems: "flex-end" }}>
      <Text style={[{ fontFamily: "Helvetica-Bold" }, color ? { color } : {}]}>{money(l.base, l.baseCurrency)}</Text>
      {l.currency !== l.baseCurrency ? <Text style={s.small}>{money(l.amount, l.currency)}</Text> : null}
    </View>
  );
  const kindColor = (kind: string) =>
    kind === "income" || kind === "borrowed" || kind === "received_back" || kind === "saving_returned" ? C.income : C.expense;
  const shareTable = (rows: ShareRow[], label: string) => (
    <Table
      cols={[
        { label, width: "40%" },
        { label: "Share", width: "26%" },
        { label: "Entries", width: "12%", align: "right" },
        { label: "Spent", width: "22%", align: "right" },
      ]}
      rows={rows.map((r) => [
        r.name,
        <View key="bar" style={{ width: "100%" }}>
          <Text style={{ fontSize: 8, color: C.muted }}>{`${(r.share * 100).toFixed(1)}%`}</Text>
          <View style={s.bar}>
            <View style={[s.barFill, { width: `${Math.max(2, Math.min(100, r.share * 100))}%` }]} />
          </View>
        </View>,
        String(r.count),
        money(r.total, data.currency ?? "USD"),
      ])}
    />
  );

  return (
    <Document
      title={safe(`${data.brand.name} ${data.title} - ${data.period}`)}
      author={data.brand.name}
      creator={data.brand.name}
      producer={data.brand.name}
      subject={safe(`${data.title} for ${data.who}`)}
      keywords={`${data.brand.name}, ${data.brand.phone}`}
      language="en"
    >
      <Page size="A4" style={s.page} wrap>
        {/* Every page: watermark, header and footer. */}
        <View style={s.watermark} fixed>
          <WatermarkMark size={92} />
          <Text style={s.watermarkText}>{data.brand.name}</Text>
        </View>
        <View style={s.header} fixed>
          <View style={s.brandRow}>
            <Logo size={30} />
            <View>
              <Text style={s.brandName}>{data.brand.name}</Text>
              <Text style={s.brandTag}>{data.brand.tagline}</Text>
            </View>
          </View>
          <View style={s.headerRight}>
            <Text style={s.headerTitle}>{safe(data.title)}</Text>
            <Text style={s.headerPeriod}>{safe(data.period)}</Text>
          </View>
        </View>
        <View style={s.footer} fixed>
          <Text>{`${data.brand.name}  ·  ${contact}`}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>

        <Text style={s.title}>{safe(data.title)}</Text>
        <Text style={s.subtitle}>{safe(data.period)}</Text>
        <Text style={s.meta}>
          {safe(`Prepared for ${data.who}${data.whoDetail ? ` (${data.whoDetail})` : ""}  ·  Generated ${data.generatedAt}`)}
        </Text>

        <Section title="Summary" note={single ? `All amounts in ${data.currency}` : "Each account in its own main currency"}>
          {data.accounts ? (
            <Table
              cols={[
                { label: "Account", width: "40%" },
                { label: "Income", width: "20%", align: "right" },
                { label: "Expenses", width: "20%", align: "right" },
                { label: "Net", width: "20%", align: "right" },
              ]}
              rows={data.accounts.map((a) => [
                <View key="who">
                  <Text>{safe(a.name)}</Text>
                  <Text style={s.small}>{safe(a.email)}</Text>
                </View>,
                money(a.income, a.currency),
                money(a.expenses, a.currency),
                money(a.net, a.currency),
              ])}
              empty="No income or expenses in this period."
            />
          ) : (
            <View style={s.cards}>
              {data.summary.map((f) => (
                <View key={f.label} style={s.card} wrap={false}>
                  <Text style={s.cardLabel}>{safe(f.label)}</Text>
                  <Text
                    style={[
                      s.cardValue,
                      f.tone === "income" ? { color: C.income } : f.tone === "expense" ? { color: C.expense } : f.tone === "brand" ? { color: C.brand } : {},
                    ]}
                  >
                    {f.kind === "money" ? money(f.value, data.currency ?? "USD") : String(f.value)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </Section>

        <Section title="Income & expenses" note={`${data.entries.length} entries, oldest first`}>
          <Table
            cols={
              single
                ? [
                    { label: "Date", width: "13%" },
                    { label: "Type", width: "10%" },
                    { label: "Category / source", width: "19%" },
                    { label: "Description", width: "29%" },
                    { label: "Method", width: "10%" },
                    { label: "Amount", width: "19%", align: "right" },
                  ]
                : [
                    { label: "Account", width: "17%" },
                    { label: "Date", width: "13%" },
                    { label: "Type", width: "10%" },
                    { label: "Category / source", width: "17%" },
                    { label: "Description", width: "24%" },
                    { label: "Amount", width: "19%", align: "right" },
                  ]
            }
            rows={data.entries.map((l) => [
              ...(single ? [] : [l.account ?? ""]),
              date(l.date),
              <Text key="k" style={{ color: kindColor(l.kind) }}>{l.kindLabel}</Text>,
              l.label,
              l.description,
              ...(single ? [l.method ?? ""] : []),
              amount(l, kindColor(l.kind)),
            ])}
          />
          {single && data.entries.length ? (
            <View style={s.totals}>
              <Text>
                <Text style={{ color: C.muted }}>Total income  </Text>
                <Text style={{ fontFamily: "Helvetica-Bold", color: C.income }}>
                  {money(data.entries.filter((l) => l.kind === "income").reduce((t, l) => t + l.base, 0), data.currency ?? "USD")}
                </Text>
              </Text>
              <Text>
                <Text style={{ color: C.muted }}>Total expenses  </Text>
                <Text style={{ fontFamily: "Helvetica-Bold", color: C.expense }}>
                  {money(data.entries.filter((l) => l.kind === "expense").reduce((t, l) => t + l.base, 0), data.currency ?? "USD")}
                </Text>
              </Text>
            </View>
          ) : null}
        </Section>

        {data.sections.has("categories") ? (
          <Section title="Spending by category">{shareTable(data.categories, "Category")}</Section>
        ) : null}

        {data.sections.has("methods") ? <Section title="Payment methods">{shareTable(data.methods, "Method")}</Section> : null}

        {data.sections.has("budgets") ? (
          <Section title="Budgets" note="Each limit against what was spent this month">
            <Table
              cols={[
                { label: "Budget", width: "30%" },
                { label: "Limit", width: "18%", align: "right" },
                { label: "Spent", width: "18%", align: "right" },
                { label: "Left", width: "18%", align: "right" },
                { label: "Status", width: "16%" },
              ]}
              rows={data.budgets.map((b) => [
                b.name,
                money(b.limit, data.currency ?? "USD"),
                money(b.spent, data.currency ?? "USD"),
                money(b.left, data.currency ?? "USD"),
                <Text key="st" style={{ color: b.status === "over" ? C.critical : b.status === "close" ? C.warning : C.income }}>
                  {`${b.status === "over" ? "Over budget" : b.status === "close" ? "Close to limit" : "On track"} (${Math.round(b.ratio * 100)}%)`}
                </Text>,
              ])}
              empty="No budgets set."
            />
          </Section>
        ) : null}

        {data.sections.has("debts") ? (
          <Section title="Borrow & lend" note="Kept apart from income and expenses">
            {data.owed ? (
              <View style={[s.cards, { marginBottom: 8 }]}>
                <View style={s.card}>
                  <Text style={s.cardLabel}>Owed to you now</Text>
                  <Text style={[s.cardValue, { color: C.income }]}>{money(data.owed.owedToYou, data.currency ?? "USD")}</Text>
                </View>
                <View style={s.card}>
                  <Text style={s.cardLabel}>You owe now</Text>
                  <Text style={[s.cardValue, { color: C.expense }]}>{money(data.owed.youOwe, data.currency ?? "USD")}</Text>
                </View>
              </View>
            ) : null}
            <Table
              cols={[
                ...(single ? [] : [{ label: "Account", width: "16%" }]),
                { label: "Date", width: single ? "13%" : "12%" },
                { label: "Type", width: "12%" },
                { label: "Person", width: single ? "18%" : "14%" },
                { label: "Note", width: single ? "20%" : "14%" },
                { label: "Status", width: "18%" },
                { label: "Amount", width: single ? "19%" : "14%", align: "right" },
              ]}
              rows={data.debts.map((l) => [
                ...(single ? [] : [l.account ?? ""]),
                date(l.date),
                <Text key="k" style={{ color: kindColor(l.kind) }}>{l.kindLabel}</Text>,
                l.label,
                l.description,
                l.status ?? "",
                amount(l),
              ])}
            />
          </Section>
        ) : null}

        {data.sections.has("savings") ? (
          <Section title="Savings aims" note="Money set aside in aims, and taken back">
            <Table
              cols={[
                ...(single ? [] : [{ label: "Account", width: "18%" }]),
                { label: "Date", width: "15%" },
                { label: "Type", width: "14%" },
                { label: "Aim", width: single ? "26%" : "20%" },
                { label: "Note", width: single ? "26%" : "15%" },
                { label: "Amount", width: single ? "19%" : "18%", align: "right" },
              ]}
              rows={data.savings.map((l) => [
                ...(single ? [] : [l.account ?? ""]),
                date(l.date),
                l.kindLabel,
                l.label,
                l.description,
                amount(l),
              ])}
            />
          </Section>
        ) : null}

        <View style={s.closing} wrap={false}>
          <Logo size={34} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 11, color: C.brand }}>
              {`Made with ${data.brand.name} - ${data.brand.tagline}`}
            </Text>
            <Text style={{ fontSize: 8.5, color: C.muted, marginTop: 3 }}>
              {`For business enquiries, partnerships or ${data.brand.name} for your team, get in touch:`}
            </Text>
            <Text style={{ fontFamily: "Helvetica-Bold", fontSize: 9.5, color: C.ink, marginTop: 3 }}>{contact}</Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}

export function renderReportPdf(data: ReportData): Promise<Buffer> {
  return renderToBuffer(<ReportDocument data={data} />);
}
