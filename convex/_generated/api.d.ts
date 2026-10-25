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
import type * as adminTools from "../adminTools.js";
import type * as brands from "../brands.js";
import type * as cartReminders from "../cartReminders.js";
import type * as carts from "../carts.js";
import type * as categories from "../categories.js";
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as imageActions from "../imageActions.js";
import type * as invoices from "../invoices.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_cartEmail from "../lib/cartEmail.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_names from "../lib/names.js";
import type * as lib_orderAccess from "../lib/orderAccess.js";
import type * as lib_orderEmail from "../lib/orderEmail.js";
import type * as lib_partRequest from "../lib/partRequest.js";
import type * as lib_productSlug from "../lib/productSlug.js";
import type * as models from "../models.js";
import type * as orderEmails from "../orderEmails.js";
import type * as order_items from "../order_items.js";
import type * as orders from "../orders.js";
import type * as product_images from "../product_images.js";
import type * as products from "../products.js";
import type * as promotions from "../promotions.js";
import type * as returnEmails from "../returnEmails.js";
import type * as returns from "../returns.js";
import type * as reviews from "../reviews.js";
import type * as settings from "../settings.js";
import type * as stockAlerts from "../stockAlerts.js";
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
  adminTools: typeof adminTools;
  brands: typeof brands;
  cartReminders: typeof cartReminders;
  carts: typeof carts;
  categories: typeof categories;
  crons: typeof crons;
  files: typeof files;
  http: typeof http;
  imageActions: typeof imageActions;
  invoices: typeof invoices;
  "lib/auth": typeof lib_auth;
  "lib/cartEmail": typeof lib_cartEmail;
  "lib/email": typeof lib_email;
  "lib/names": typeof lib_names;
  "lib/orderAccess": typeof lib_orderAccess;
  "lib/orderEmail": typeof lib_orderEmail;
  "lib/partRequest": typeof lib_partRequest;
  "lib/productSlug": typeof lib_productSlug;
  models: typeof models;
  orderEmails: typeof orderEmails;
  order_items: typeof order_items;
  orders: typeof orders;
  product_images: typeof product_images;
  products: typeof products;
  promotions: typeof promotions;
  returnEmails: typeof returnEmails;
  returns: typeof returns;
  reviews: typeof reviews;
  settings: typeof settings;
  stockAlerts: typeof stockAlerts;
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
