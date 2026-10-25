import { v, ConvexError } from "convex/values";
import { internalAction, internalQuery, mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { isAdmin, requireAdmin } from "./lib/auth";
import { insertProduct } from "./lib/productSlug";
import { SITE_URL, emailButton, emailConfigured, emailLayout, escapeHtml, sendEmail } from "./lib/email";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/* ─── Product spreadsheet export / import ─── */

/** Every product as a spreadsheet row, with brand, model, variant and category by slug. */
export const exportProducts = query({
  args: {},
  handler: async (ctx) => {
    if (!(await isAdmin(ctx))) return [];
    const [products, brands, models, variants, categories] = await Promise.all([
      ctx.db.query("products").collect(),
      ctx.db.query("brands").collect(),
      ctx.db.query("models").collect(),
      ctx.db.query("variants").collect(),
      ctx.db.query("categories").collect(),
    ]);
    const slugOf = new Map<string, string>(
      [...brands, ...models, ...variants, ...categories].map((doc) => [doc._id, doc.slug]),
    );
    return products
      .sort((a, b) => a.sku.localeCompare(b.sku))
      .map((p) => ({
        sku: p.sku,
        name: p.name,
        partNumber: p.partNumber ?? "",
        price: p.price,
        originalPrice: p.originalPrice ?? "",
        stockQty: p.stockQty ?? 0,
        active: p.active === false ? "no" : "yes",
        brand: slugOf.get(p.brandId) ?? "",
        model: p.modelId ? slugOf.get(p.modelId) ?? "" : "",
        variant: p.variantId ? slugOf.get(p.variantId) ?? "" : "",
        category: slugOf.get(p.categoryId) ?? "",
        description: p.description ?? "",
      }));
  },
});

const rowValidator = v.object({
  sku: v.string(),
  name: v.optional(v.string()),
  partNumber: v.optional(v.string()),
  price: v.optional(v.string()),
  originalPrice: v.optional(v.string()),
  stockQty: v.optional(v.string()),
  active: v.optional(v.string()),
  brand: v.optional(v.string()),
  model: v.optional(v.string()),
  variant: v.optional(v.string()),
  category: v.optional(v.string()),
  description: v.optional(v.string()),
});
type Row = typeof rowValidator.type;

const blank = (value: string | undefined) => value === undefined || value.trim() === "";

function money(value: string | undefined, label: string) {
  if (blank(value)) return undefined;
  const n = Number(value!.replace(/[R\s,]/gi, ""));
  if (!Number.isFinite(n) || n < 0) throw new Error(`${label} "${value}" is not a valid amount`);
  return round2(n);
}

function wholeNumber(value: string | undefined, label: string) {
  if (blank(value)) return undefined;
  const n = Number(value);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} "${value}" must be a whole number`);
  return n;
}

function yesNo(value: string | undefined) {
  if (blank(value)) return undefined;
  const v = value!.trim().toLowerCase();
  if (["yes", "y", "true", "1", "active"].includes(v)) return true;
  if (["no", "n", "false", "0", "inactive"].includes(v)) return false;
  throw new Error(`Active must be yes or no, not "${value}"`);
}

const slugKey = (slug: string) => slug.trim().toLowerCase();
const brandBySlug = (ctx: QueryCtx, slug: string) =>
  ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", slugKey(slug))).first();
const modelBySlug = (ctx: QueryCtx, slug: string) =>
  ctx.db.query("models").withIndex("by_slug", (q) => q.eq("slug", slugKey(slug))).first();
const variantBySlug = (ctx: QueryCtx, slug: string) =>
  ctx.db.query("variants").withIndex("by_slug", (q) => q.eq("slug", slugKey(slug))).first();
const categoryBySlug = (ctx: QueryCtx, slug: string) =>
  ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", slugKey(slug))).first();

/** Works out what one spreadsheet row would change: an update to an existing product (by SKU) or a new product. */
async function planRow(ctx: QueryCtx, row: Row) {
  const sku = row.sku.trim();
  if (!sku) throw new Error("SKU is missing");
  const existing = await ctx.db.query("products").withIndex("by_sku", (q) => q.eq("sku", sku)).first();

  const changes: Partial<Doc<"products">> = {};
  if (!blank(row.name)) changes.name = row.name!.trim();
  if (!blank(row.partNumber)) changes.partNumber = row.partNumber!.trim();
  if (!blank(row.description)) changes.description = row.description!.trim();
  const price = money(row.price, "Price");
  if (price !== undefined) changes.price = price;
  const originalPrice = money(row.originalPrice, "Original price");
  if (originalPrice !== undefined) changes.originalPrice = originalPrice;
  const stockQty = wholeNumber(row.stockQty, "Stock");
  if (stockQty !== undefined) changes.stockQty = stockQty;
  const active = yesNo(row.active);
  if (active !== undefined) changes.active = active;

  if (!blank(row.brand)) {
    const brand = await brandBySlug(ctx, row.brand!);
    if (!brand) throw new Error(`No brand "${row.brand}"`);
    changes.brandId = brand._id;
  }
  if (!blank(row.model)) {
    const model = await modelBySlug(ctx, row.model!);
    if (!model) throw new Error(`No model "${row.model}"`);
    const brandId = changes.brandId ?? existing?.brandId;
    if (brandId && model.brandId !== brandId) throw new Error(`Model "${row.model}" belongs to a different brand`);
    changes.modelId = model._id;
  }
  if (!blank(row.variant)) {
    const variant = await variantBySlug(ctx, row.variant!);
    if (!variant) throw new Error(`No variant "${row.variant}"`);
    const modelId = changes.modelId ?? existing?.modelId;
    if (modelId && variant.modelId !== modelId) throw new Error(`Variant "${row.variant}" belongs to a different model`);
    changes.variantId = variant._id;
  }
  if (!blank(row.category)) {
    const category = await categoryBySlug(ctx, row.category!);
    if (!category) throw new Error(`No category "${row.category}"`);
    changes.categoryId = category._id;
  }

  if (existing) {
    const changed = Object.fromEntries(
      Object.entries(changes).filter(([key, value]) => existing[key as keyof Doc<"products">] !== value),
    ) as Partial<Doc<"products">>;
    return { kind: Object.keys(changed).length ? "update" as const : "unchanged" as const, sku, existing, changes: changed };
  }
  if (!changes.name || changes.price === undefined || !changes.brandId || !changes.categoryId) {
    throw new Error("A new product needs a name, price, brand and category");
  }
  return { kind: "create" as const, sku, existing: null, changes };
}

/**
 * Updates products from a spreadsheet, matched by SKU; rows with a new SKU
 * create a product. Blank cells leave a field as it is. With dryRun, nothing
 * is saved and the result says what would happen. Send at most 200 rows at a time.
 */
export const importProducts = mutation({
  args: { rows: v.array(rowValidator), dryRun: v.boolean(), firstRowNumber: v.optional(v.number()) },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (args.rows.length > 200) throw new ConvexError("Send at most 200 rows at a time");

    const result = { created: 0, updated: 0, unchanged: 0, errors: [] as Array<{ row: number; sku: string; message: string }> };
    const seen = new Set<string>();
    for (const [i, row] of args.rows.entries()) {
      const rowNumber = (args.firstRowNumber ?? 2) + i;
      try {
        if (seen.has(row.sku.trim())) throw new Error("This SKU appears more than once in the file");
        seen.add(row.sku.trim());
        const plan = await planRow(ctx, row);
        if (plan.kind === "unchanged") {
          result.unchanged++;
          continue;
        }
        if (!args.dryRun) await applyPlan(ctx, plan);
        result[plan.kind === "create" ? "created" : "updated"]++;
      } catch (error) {
        result.errors.push({ row: rowNumber, sku: row.sku, message: error instanceof Error ? error.message : String(error) });
      }
    }
    return result;
  },
});

async function applyPlan(ctx: MutationCtx, plan: Awaited<ReturnType<typeof planRow>>) {
  if (plan.kind === "update") {
    await ctx.db.patch(plan.existing!._id, plan.changes);
  } else if (plan.kind === "create") {
    const c = plan.changes;
    await insertProduct(ctx, {
      sku: plan.sku,
      name: c.name!,
      price: c.price!,
      brandId: c.brandId!,
      categoryId: c.categoryId!,
      modelId: c.modelId,
      variantId: c.variantId,
      partNumber: c.partNumber,
      description: c.description,
      originalPrice: c.originalPrice,
      stockQty: c.stockQty ?? 0,
      active: c.active ?? true,
    });
  }
}

/* ─── Sales report ─── */

const PAID = new Set(["paid", "processing", "shipped", "delivered"]);

/** Sales between two dates (paid orders, by the day they were paid). */
export const salesReport = query({
  args: { from: v.number(), to: v.number() },
  handler: async (ctx, args) => {
    if (!(await isAdmin(ctx))) return null;
    const orders = (await ctx.db.query("orders").collect()).filter((order) => {
      const paidAt = order.invoicedAt ?? order._creationTime;
      // Cancelled orders that had been paid still count, as refunds below.
      const paid = PAID.has(order.status) || (order.status === "cancelled" && order.invoiceNumber);
      return paid && paidAt >= args.from && paidAt < args.to;
    });

    const byProduct = new Map<string, { name: string; sku: string; quantity: number; revenue: number }>();
    const byCategory = new Map<string, { name: string; quantity: number; revenue: number }>();
    const categoryNames = new Map<Id<"categories">, string>();
    let subtotal = 0, discount = 0, shipping = 0, tax = 0, total = 0, refunded = 0, cancelled = 0;

    for (const order of orders) {
      if (order.status === "cancelled") {
        cancelled += order.total;
        continue;
      }
      subtotal += order.subtotal;
      discount += order.discount ?? 0;
      shipping += order.shipping;
      tax += order.tax;
      total += order.total;
      refunded += order.refundedTotal ?? 0;

      const items = await ctx.db.query("orderItems").withIndex("by_orderId", (q) => q.eq("orderId", order._id)).collect();
      for (const item of items) {
        const p = byProduct.get(item.productId) ?? { name: item.name, sku: item.sku, quantity: 0, revenue: 0 };
        p.quantity += item.quantity;
        p.revenue += item.total;
        byProduct.set(item.productId, p);

        const product = await ctx.db.get(item.productId);
        const categoryId = product?.categoryId;
        if (categoryId && !categoryNames.has(categoryId)) {
          categoryNames.set(categoryId, (await ctx.db.get(categoryId))?.name ?? "Unknown");
        }
        const key = categoryId ?? "none";
        const c = byCategory.get(key) ?? { name: categoryId ? categoryNames.get(categoryId)! : "Unknown", quantity: 0, revenue: 0 };
        c.quantity += item.quantity;
        c.revenue += item.total;
        byCategory.set(key, c);
      }
    }

    const sortByRevenue = <T extends { revenue: number }>(rows: T[]) =>
      rows.map((r) => ({ ...r, revenue: round2(r.revenue) })).sort((a, b) => b.revenue - a.revenue);

    return {
      orderCount: orders.filter((o) => o.status !== "cancelled").length,
      subtotal: round2(subtotal),
      discount: round2(discount),
      shipping: round2(shipping),
      tax: round2(tax),
      total: round2(total),
      refunded: round2(refunded + cancelled),
      net: round2(total - refunded),
      products: sortByRevenue([...byProduct.values()]),
      categories: sortByRevenue([...byCategory.values()]),
      orders: orders
        .sort((a, b) => (a.invoicedAt ?? a._creationTime) - (b.invoicedAt ?? b._creationTime))
        .map((o) => ({
          date: o.invoicedAt ?? o._creationTime,
          invoiceNumber: o.invoiceNumber ?? "",
          orderNumber: o._id.slice(-8).toUpperCase(),
          status: o.status,
          customer: o.shippingSnapshot?.name ?? o.guestEmail ?? "",
          company: o.billingCompany ?? "",
          subtotal: o.subtotal,
          discount: o.discount ?? 0,
          shipping: o.shipping,
          tax: o.tax,
          total: o.total,
          refunded: o.status === "cancelled" ? o.total : o.refundedTotal ?? 0,
        })),
    };
  },
});

/* ─── Low stock ─── */

export const LOW_STOCK_THRESHOLD = 5;

/** Active products with 5 or fewer left (out-of-stock ones first), with how many customers are waiting. */
async function lowStockRows(ctx: QueryCtx) {
  const products = await ctx.db.query("products").withIndex("by_active", (q) => q.eq("active", true)).collect();
  const low = products.filter((p) => (p.stockQty ?? 0) <= LOW_STOCK_THRESHOLD);
  const waiting = await ctx.db.query("stockAlerts").withIndex("by_notifiedAt", (q) => q.eq("notifiedAt", undefined)).collect();
  return low
    .map((p) => ({
      productId: p._id,
      name: p.name,
      sku: p.sku,
      stockQty: p.stockQty ?? 0,
      waiting: waiting.filter((a) => a.productId === p._id).length,
    }))
    .sort((a, b) => a.stockQty - b.stockQty || b.waiting - a.waiting || a.name.localeCompare(b.name));
}

export const lowStock = internalQuery({ args: {}, handler: lowStockRows });

export const lowStockList = query({
  args: {},
  handler: async (ctx) => ((await isAdmin(ctx)) ? await lowStockRows(ctx) : []),
});

export function lowStockEmail(rows: Array<{ name: string; sku: string; stockQty: number; waiting: number }>) {
  const out = rows.filter((r) => r.stockQty <= 0).length;
  const subject = `Stock report: ${out} out of stock, ${rows.length - out} running low`;
  const line = (r: (typeof rows)[number]) =>
    `${r.stockQty <= 0 ? "OUT" : `${r.stockQty} left`}: ${r.name} (${r.sku})${r.waiting ? `, ${r.waiting} waiting` : ""}`;
  const body = `
        <p style="font-size:18px;font-weight:bold;color:#111827;margin:0 0 16px">${escapeHtml(subject)}</p>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#111827">
          ${rows.map((r) => `<tr>
            <td style="padding:6px 0;border-bottom:1px solid #e5e7eb">${escapeHtml(r.name)}<br><span style="color:#6b7280">${escapeHtml(r.sku)}${r.waiting ? ` · ${r.waiting} customer${r.waiting === 1 ? "" : "s"} waiting` : ""}</span></td>
            <td style="padding:6px 0;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;font-weight:bold;color:${r.stockQty <= 0 ? "#dc2626" : "#111827"}">${r.stockQty <= 0 ? "Out of stock" : `${r.stockQty} left`}</td>
          </tr>`).join("")}
        </table>
        ${emailButton(`${SITE_URL}/admin/products`, "Open products")}`;
  return {
    subject,
    html: emailLayout(body, `Sent every morning when products have ${LOW_STOCK_THRESHOLD} or fewer in stock.`),
    text: [subject, "", ...rows.map(line), "", `${SITE_URL}/admin/products`].join("\n"),
  };
}

/** Run every morning: emails the shop the products that are out of stock or running low, if any. */
export const sendLowStockReport = internalAction({
  args: {},
  handler: async (ctx) => {
    const to = process.env.ORDER_NOTIFY_EMAIL;
    if (!emailConfigured() || !to) return { sent: false };
    const rows = await ctx.runQuery(internal.adminTools.lowStock, {});
    if (rows.length === 0) return { sent: false };
    const email = lowStockEmail(rows);
    const day = new Date().toISOString().slice(0, 10);
    const result = await sendEmail({
      to,
      subject: email.subject,
      html: email.html,
      text: email.text,
      idempotencyKey: `low-stock-${day}`,
      category: "low_stock",
    });
    if (!result.ok) throw new Error(`Low stock email failed: ${result.error}`);
    return { sent: true };
  },
});
