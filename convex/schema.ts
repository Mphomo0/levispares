import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Core tables
  brands: defineTable({
    name: v.string(),
    slug: v.string(),
    logo: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  models: defineTable({
    brandId: v.id("brands"),
    name: v.string(),
    yearFrom: v.optional(v.number()),
    yearTo: v.optional(v.number()),
    slug: v.string(),
    active: v.optional(v.boolean()),
  })
    .index("by_brandId", ["brandId"])
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  variants: defineTable({
    modelId: v.id("models"),
    variantType: v.union(
      v.literal("GVM"),
      v.literal("Engine"),
      v.literal("Chassis")
    ),
    variantValue: v.string(),
    slug: v.string(),
    active: v.optional(v.boolean()),
  })
    .index("by_modelId", ["modelId"])
    .index("by_slug", ["slug"])
    .index("by_variantType", ["variantType"])
    .index("by_active", ["active"]),

  categories: defineTable({
    parentId: v.optional(v.id("categories")),
    name: v.string(),
    slug: v.string(),
    image: v.optional(v.string()),
    icon: v.optional(v.string()),
    description: v.optional(v.string()),
    active: v.optional(v.boolean()),
  })
    .index("by_slug", ["slug"])
    .index("by_parentId", ["parentId"])
    .index("by_active", ["active"]),

  products: defineTable({
    brandId: v.id("brands"),
    modelId: v.id("models"),
    variantId: v.optional(v.id("variants")),
    categoryId: v.id("categories"),
    sku: v.string(),
    name: v.string(),
    partNumber: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.number(),
    stockQty: v.optional(v.number()),
    image: v.optional(v.string()),
    specs: v.optional(v.array(v.object({
      label: v.string(),
      value: v.string(),
    }))),
    active: v.optional(v.boolean()),
    totalSold: v.optional(v.number()),
  })
    .index("by_brandId", ["brandId"])
    .index("by_modelId", ["modelId"])
    .index("by_variantId", ["variantId"])
    .index("by_categoryId", ["categoryId"])
    .index("by_sku", ["sku"])
    .index("by_active", ["active"])
    .searchIndex("search_name_description", {
      searchField: "name",
      filterFields: ["description"],
    }),

  productImages: defineTable({
    productId: v.id("products"),
    url: v.string(),
    isPrimary: v.optional(v.boolean()),
    sortOrder: v.optional(v.number()),
  })
    .index("by_productId", ["productId"]),

  // User tables
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(),
    isActive: v.optional(v.boolean()),
  })
    .index("by_clerkId", ["clerkId"]),

  addresses: defineTable({
    userId: v.id("users"),
    type: v.union(v.literal("shipping"), v.literal("billing")),
    label: v.optional(v.string()),
    name: v.string(),
    street: v.string(),
    city: v.string(),
    province: v.optional(v.string()),
    postalCode: v.string(),
    country: v.string(),
    phone: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"])
    .index("by_type", ["type"]),

  // Order tables
  orders: defineTable({
    userId: v.id("users"),
    shippingAddressId: v.optional(v.id("addresses")),
    billingAddressId: v.optional(v.id("addresses")),
    status: v.union(
      v.literal("pending"),
      v.literal("paid"),
      v.literal("processing"),
      v.literal("shipped"),
      v.literal("delivered"),
      v.literal("cancelled")
    ),
    subtotal: v.number(),
    shipping: v.number(),
    tax: v.number(),
    discount: v.optional(v.number()),
    total: v.number(),
    paypalOrderId: v.optional(v.string()),
    notes: v.optional(v.string()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"]),

  orderItems: defineTable({
    orderId: v.id("orders"),
    productId: v.id("products"),
    name: v.string(),
    partNumber: v.optional(v.string()),
    sku: v.string(),
    price: v.number(),
    quantity: v.number(),
    total: v.number(),
  })
    .index("by_orderId", ["orderId"])
    .index("by_productId", ["productId"]),

  // Wishlist tables
  wishlists: defineTable({
    userId: v.id("users"),
    name: v.string(),
    isPublic: v.optional(v.boolean()),
  })
    .index("by_userId", ["userId"]),

  wishlistItems: defineTable({
    wishlistId: v.id("wishlists"),
    productId: v.id("products"),
  })
    .index("by_wishlistId", ["wishlistId"])
    .index("by_productId", ["productId"]),

  // Review tables
  reviews: defineTable({
    productId: v.id("products"),
    userId: v.id("users"),
    rating: v.number(),
    title: v.optional(v.string()),
    comment: v.optional(v.string()),
    verifiedPurchase: v.optional(v.boolean()),
  })
    .index("by_productId", ["productId"])
    .index("by_userId", ["userId"]),

  // Promotion tables
  promotions: defineTable({
    code: v.optional(v.string()),
    name: v.string(),
    type: v.union(
      v.literal("percentage"),
      v.literal("fixed"),
      v.literal("bogo")
    ),
    value: v.number(),
    minOrderValue: v.optional(v.number()),
    maxUses: v.optional(v.number()),
    usedCount: v.optional(v.number()),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    active: v.optional(v.boolean()),
  })
    .index("by_code", ["code"])
    .index("by_active", ["active"]),

  promotionProducts: defineTable({
    promotionId: v.id("promotions"),
    productId: v.optional(v.id("products")),
    categoryId: v.optional(v.id("categories")),
  })
    .index("by_promotionId", ["promotionId"])
    .index("by_productId", ["productId"])
    .index("by_categoryId", ["categoryId"]),

  // Settings table
  storeSettings: defineTable({
    key: v.string(),
    taxEnabled: v.optional(v.boolean()),
    taxRate: v.optional(v.number()),
    shippingRate: v.optional(v.number()),
    freeShippingThreshold: v.optional(v.number()),
  })
    .index("by_key", ["key"]),
});
