/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as addresses from "../addresses.js";
import type * as admin from "../admin.js";
import type * as brands from "../brands.js";
import type * as categories from "../categories.js";
import type * as files from "../files.js";
import type * as imageActions from "../imageActions.js";
import type * as models from "../models.js";
import type * as order_items from "../order_items.js";
import type * as orders from "../orders.js";
import type * as product_images from "../product_images.js";
import type * as products from "../products.js";
import type * as promotions from "../promotions.js";
import type * as reviews from "../reviews.js";
import type * as settings from "../settings.js";
import type * as users from "../users.js";
import type * as variants from "../variants.js";
import type * as wishlists from "../wishlists.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  addresses: typeof addresses;
  admin: typeof admin;
  brands: typeof brands;
  categories: typeof categories;
  files: typeof files;
  imageActions: typeof imageActions;
  models: typeof models;
  order_items: typeof order_items;
  orders: typeof orders;
  product_images: typeof product_images;
  products: typeof products;
  promotions: typeof promotions;
  reviews: typeof reviews;
  settings: typeof settings;
  users: typeof users;
  variants: typeof variants;
  wishlists: typeof wishlists;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
