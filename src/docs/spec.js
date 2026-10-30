const { route, ok, fail, described, buildSpec } = require("./builder");

// ---------------------------------------------------------------- samples
const USER_ID = "3f6c2a8e-1b7d-4c55-9e2a-6f1d0b9c7a41";
const PRODUCT_ID = "prd_6a1f0c2e";
const DATE = "2026-10-15T09:30:00.000Z";

const PROFILE = {
  _id: USER_ID,
  email: "ada.obi@example.com",
  phoneNumber: "08012345678",
  firstName: "Ada",
  lastName: "Obi",
  displayName: "Ada Obi",
  gender: "female",
  imageUrl: null,
  isVerified: true,
  isPhoneVerified: true,
  isActive: true,
  role: "User",
  level: "Starter",
  totalTransacted: 125000,
  referredBy: null,
  notification: { pushNotification: true, offers: false, reward: true },
  createdAt: DATE,
  updatedAt: DATE,
};

const ADDRESS = {
  _id: "a7d2c9b4-5e61-4f0a-8c3d-2b1e9f7a6c50",
  userId: USER_ID,
  line1: "12 Admiralty Way",
  line2: "Lekki Phase 1",
  city: "Lagos",
  state: "Lagos",
  country: "Nigeria",
  zipCode: "105102",
  phone_number: "08012345678",
  isDefault: true,
  createdAt: DATE,
  updatedAt: DATE,
};

const PRODUCT_SUMMARY = {
  _id: PRODUCT_ID,
  title: "Leather Tote Bag",
  sku: "JT-BAG-0001",
  price: 45000,
  brand: "Jamestown",
  category_id: "cat_bags",
  category: "Bags",
  subcategory: "Totes",
  imageUrls: ["https://res.cloudinary.com/jamestown/image/upload/tote.jpg"],
  variants: [{ name: "Colour", value: "Brown", qty: 12 }],
};

const PRODUCT = {
  ...PRODUCT_SUMMARY,
  gender: "Unisex",
  description: "Full-grain leather tote with inner zip pocket.",
  stock: 12,
  isDeleted: false,
  created_at: DATE,
  updated_at: DATE,
};

const CART_ITEM = {
  _id: "ci_91b2",
  cartId: "cart_4c1e",
  productId: PRODUCT_ID,
  quantity: 2,
  price: { $numberDecimal: "45000" },
  subtotal: 90000,
  product: PRODUCT_SUMMARY,
  created_at: DATE,
  updated_at: DATE,
};

const ORDER = {
  _id: "ord_5b7e2c",
  userId: USER_ID,
  items: [{ productId: PRODUCT_ID, quantity: 2, unitPrice: 45000, subtotal: 90000 }],
  total: 90000,
  status: "confirmed",
  checkoutRef: "CHK-20261015-7F3A",
  createdAt: DATE,
  updatedAt: DATE,
};

const SHIPMENT = {
  _id: "shp_2d9a",
  customerUserId: USER_ID,
  receiver: {
    name: "Chidi Okafor",
    phoneNumber: "08098765432",
    email: "chidi@example.com",
    pickupLocation: "Ikeja City Mall, Lagos",
  },
  pkg: { category: "Electronics", type: "Box", weight: 2.5, quantity: 1, description: "Laptop" },
  payment: { deliveryFee: 8500, isPaid: false },
  shipmentStatus: "awaiting_payment",
  createdAt: DATE,
  updatedAt: DATE,
};

const DROPOFF = {
  _id: "drp_7c31",
  customerUserId: USER_ID,
  user: { firstName: "Ada", lastName: "Obi", email: "ada.obi@example.com" },
  pickup: { address: "Jamestown hub, Yaba" },
  courier: "DHL",
  trackingNumber: "1Z999AA10123456784",
  file: "https://res.cloudinary.com/jamestown/image/upload/drop-off/receipt.jpg",
  deliveryFee: 0,
  isPaid: false,
  paid: false,
  status: "pending",
  createdAt: DATE,
  updatedAt: DATE,
};

const SERVER_ERROR = fail("Internal Server Error");
const NO_TOKEN = {
  auth: false,
  message: "Access Denied, No token provided.",
  error: "Access Denied",
};
const FORBIDDEN_INTERNAL = { error: "Forbidden" };

// ---------------------------------------------------------------- routes
const routes = [
  // ---------------------------------------------------------- Auth
  route("post", "/auth/signup", {
    tag: "Auth",
    auth: "none",
    summary: "Create an account",
    description:
      "Creates the user and emails a verification OTP. Once the email is verified (`/auth/verify/phone-number`), " +
      "a phone OTP is texted to the user (see `/auth/phone/*`); phone verification is required before login issues a token.\n\n" +
      "`phoneNumber` must be 11 digits starting with 070, 080, 081, 090 or 091. `+234…`/`234…` are normalised to `0…`.\n\n" +
      "`referralCode` can also be passed as the `?ref=` query string.",
    body: {
      firstName: "Ada",
      lastName: "Obi",
      email: "ada.obi@example.com",
      phoneNumber: "08012345678",
      password: "S3cure!pass",
      gender: "female",
      referralCode: "K7Q2M9XD",
    },
    required: ["firstName", "lastName", "email", "phoneNumber", "password", "gender"],
    query: { ref: { example: "K7Q2M9XD", description: "Referral code (alternative to body)" } },
    responses: {
      200: ok("success", {}),
      400: described(
        "Invalid phone number or duplicate account",
        fail("Phone number must be 11 digits and start with 070, 080, 081, 090, 091"),
      ),
      500: fail("server error"),
    },
  }),
  route("post", "/auth/login", {
    tag: "Auth",
    auth: "none",
    summary: "Log in",
    description:
      "Returns a JWT valid for 1 hour.\n\n" +
      "- Email not verified: `requiresVerification: true`, no token.\n" +
      "- Phone not verified (after a correct password): `requiresPhoneVerification: true`, no token, and an SMS code is sent " +
      "(`otpSent: false` if one went out in the last minute). Complete it with `POST /auth/phone/verify`, then log in again.\n\n" +
      "Phone-verification response (HTTP 200): `{ status: \"success\", message: \"Phone verification required\", data: " +
      "{ isPhoneVerified: false, requiresPhoneVerification: true, phoneNumber: \"08012345678\", email: \"ada.obi@example.com\", otpSent: true } }`",
    body: { email: "ada.obi@example.com", password: "S3cure!pass" },
    required: ["email", "password"],
    responses: {
      200: described(
        "Token issued (or verification required)",
        ok("success", {
          email: "ada.obi@example.com",
          phoneNumber: "08012345678",
          isVerified: true,
          is_user: true,
          token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjNmNmMy…",
          token_type: "jwt",
          expiresIn: 3600,
          isGen: true,
        }),
      ),
      400: fail("Wrong Credentials", null),
      403: fail("Account disabled"),
    },
  }),
  route("post", "/auth/verify/phone-number", {
    tag: "Auth",
    auth: "none",
    summary: "Verify account with the sign-up (email) OTP",
    description:
      "Despite the name, this checks the OTP emailed at sign-up and marks the email verified. It then texts the phone OTP " +
      "(via the configured SMS provider, Sendar by default); finish with `POST /auth/phone/verify`.",
    body: { phoneNumber: "08012345678", otp: "482913" },
    required: ["phoneNumber", "otp"],
    responses: {
      200: ok("User verified", {
        isVerified: true,
        isPhoneVerified: false,
        requiresPhoneVerification: true,
        phoneNumber: "08012345678",
        otpSent: true,
      }),
      400: fail("User not found", null),
    },
  }),
  route("post", "/auth/phone/send-otp", {
    tag: "Auth",
    auth: "none",
    summary: "Resend the phone verification SMS",
    description:
      "Sent by SMS through the configured provider (Sendar by default). Only for accounts whose email is verified. Codes expire after 10 minutes; " +
      "one request per 60 seconds per number. The response is the same whether or not the number exists.",
    body: { phoneNumber: "08012345678" },
    required: ["phoneNumber"],
    responses: {
      200: ok("If the number exists, an OTP has been sent"),
      400: fail("Phone number already verified"),
      429: fail("Please wait before requesting another OTP", { retryAfterSeconds: 42 }),
      503: fail("We couldn't send the SMS right now. Please try again shortly."),
    },
  }),
  route("post", "/auth/phone/verify", {
    tag: "Auth",
    auth: "none",
    summary: "Confirm the SMS OTP",
    description: "5 wrong attempts invalidate the code; request a new one.",
    body: { phoneNumber: "08012345678", otp: "731004" },
    required: ["phoneNumber", "otp"],
    responses: {
      200: ok("Phone number verified"),
      400: fail("Invalid or expired OTP"),
      429: fail("Too many attempts. Please request a new OTP."),
    },
  }),
  route("post", "/auth/resend/otp", {
    tag: "Auth",
    auth: "none",
    summary: "Resend the account verification OTP (email)",
    body: { email: "ada.obi@example.com", phoneNumber: "08012345678" },
    responses: { 200: ok("success", {}), 400: fail("Unable to verify number", null) },
  }),
  route("post", "/auth/send/reset/password/otp", {
    tag: "Auth",
    auth: "none",
    summary: "Email a password-reset OTP",
    description: "OTP expires in 30 minutes. Same response whether or not the email exists.",
    body: { email: "ada.obi@example.com" },
    required: ["email"],
    responses: { 200: ok("Opt has been sent to your mail.") },
  }),
  route("post", "/auth/verify/otp", {
    tag: "Auth",
    auth: "none",
    summary: "Verify the password-reset OTP",
    body: { email: "ada.obi@example.com", otp: "551203" },
    required: ["email", "otp"],
    responses: {
      200: ok("OTP verified successfully."),
      400: fail("Invalid OTP. Please try again."),
    },
  }),
  route("patch", "/auth/reset/password", {
    tag: "Auth",
    auth: "none",
    summary: "Set a new password (after /auth/verify/otp)",
    body: { email: "ada.obi@example.com", newPassword: "N3w!pass2026" },
    required: ["email", "newPassword"],
    responses: {
      200: ok("Password reset successfully."),
      403: fail("OTP not verified. You cannot reset your password."),
      404: fail("User not found."),
    },
  }),
  route("patch", "/auth/pin/create", {
    tag: "Auth",
    summary: "Create the transaction PIN",
    body: { pin: "1234" },
    required: ["pin"],
    responses: {
      200: ok("PIN created successfully", {}),
      400: fail("PIN must be 4 to 6 digits", null),
      403: NO_TOKEN,
    },
  }),
  route("patch", "/auth/reset-pin", {
    tag: "Auth",
    summary: "Change the transaction PIN",
    body: { oldPin: "1234", newPin: "908172" },
    required: ["oldPin", "newPin"],
    responses: {
      200: ok("PIN reset successfully"),
      400: fail("newPin must be 4 to 6 digits"),
      401: fail("Invalid current PIN"),
    },
  }),
  route("get", "/auth/has-pin", {
    tag: "Auth",
    summary: "Whether the user has set a PIN",
    responses: { 200: ok("OK", { hasPin: true }), 404: fail("User not found") },
  }),

  // ---------------------------------------------------------- Profile
  route("get", "/user/profile", {
    tag: "Profile",
    summary: "Current user's profile",
    responses: { 200: ok("success", PROFILE), 403: NO_TOKEN },
  }),
  route("get", "/user/search", {
    tag: "Profile",
    summary: "Search users (for transfers / money requests)",
    query: { query: { example: "ada", required: true, description: "Name, email or phone" } },
    responses: {
      200: ok("Users found", [
        { _id: USER_ID, firstName: "Ada", lastName: "Obi", email: "ada.obi@example.com", phoneNumber: "08012345678" },
      ]),
      400: fail("Search query is required"),
      404: fail("No users found matching your query"),
    },
  }),
  route("post", "/user/fcm-token", {
    tag: "Profile",
    summary: "Register a device for push notifications",
    description:
      "Send `platform` so admin pushes can target Android/iOS. A token is moved off any other account it was registered to.",
    body: { fcmToken: "dGVzdC1mY20tdG9rZW46QVBBOTFiRXY…", platform: "android" },
    required: ["fcmToken"],
    responses: {
      200: ok("FCM token updated successfully"),
      400: fail("FCM token is required"),
    },
  }),
  route("post", "/user/fcm-token/remove", {
    tag: "Profile",
    summary: "Unregister a device (e.g. on logout)",
    body: { fcmToken: "dGVzdC1mY20tdG9rZW46QVBBOTFiRXY…" },
    required: ["fcmToken"],
    responses: { 200: ok("FCM token removed successfully"), 404: fail("User not found") },
  }),
  route("patch", "/user/delivery-address", {
    tag: "Profile",
    summary: "Set the default delivery address",
    body: {
      phoneNumber: "08012345678",
      address: "12 Admiralty Way, Lekki Phase 1",
      country: "Nigeria",
      city: "Lagos",
      state: "Lagos",
      zipCode: "105102",
      note: "Call on arrival",
    },
    required: ["phoneNumber", "address", "country"],
    responses: { 200: ok("Delivery address updated successfully") },
  }),
  route("patch", "/user/notification", {
    tag: "Profile",
    summary: "Update notification preferences",
    body: { pushNotification: true, offers: false, reward: true },
    responses: { 200: ok("Delivery address updated successfully") },
  }),
  route("post", "/user/request-delete", {
    tag: "Profile",
    auth: "none",
    summary: "Request account deletion (emails an OTP)",
    body: { email: "ada.obi@example.com" },
    required: ["email"],
    responses: { 200: ok("success", null), 400: fail("Account has been deleted", null) },
  }),
  route("post", "/user/delete-profile", {
    tag: "Profile",
    auth: "none",
    summary: "Confirm account deletion with the OTP",
    body: { email: "ada.obi@example.com", otp: "640118" },
    required: ["email", "otp"],
    responses: { 200: ok("success", null), 400: fail("Invalid OTP sent", null) },
  }),

  // ---------------------------------------------------------- Referral
  route("get", "/referral/link", {
    tag: "Referral",
    summary: "The user's referral link",
    responses: {
      200: ok("Referral link fetched successfully", {
        referralLink: "https://jamestown.ng/register?ref=K7Q2M9XD",
        referralsCount: 4,
      }),
    },
  }),
  route("get", "/referral/count", {
    tag: "Referral",
    summary: "How many users this user referred",
    responses: { 200: ok("Referred users fetched successfully", { referralCount: 4 }) },
  }),

  // ---------------------------------------------------------- Addresses
  route("get", "/user/address", {
    tag: "Addresses",
    summary: "List saved addresses",
    responses: { 200: ok("Addresses fetched", [ADDRESS]) },
  }),
  route("get", "/user/address/:id", {
    tag: "Addresses",
    summary: "Get one address",
    responses: { 200: ok("Address fetched", ADDRESS), 404: fail("Address not found") },
  }),
  route("post", "/user/address", {
    tag: "Addresses",
    summary: "Add an address",
    body: {
      line1: "12 Admiralty Way",
      line2: "Lekki Phase 1",
      city: "Lagos",
      state: "Lagos",
      country: "Nigeria",
      zipCode: "105102",
      phone_number: "08012345678",
      isDefault: true,
    },
    required: ["line1", "city", "country"],
    responses: { 201: ok("Address created", ADDRESS), 400: fail("line1: Path `line1` is required.") },
  }),
  route("patch", "/user/address/:id", {
    tag: "Addresses",
    summary: "Update an address",
    body: { line2: "Block C, Flat 4", isDefault: true },
    responses: { 200: ok("Address updated", ADDRESS), 404: fail("Address not found") },
  }),
  route("delete", "/user/address/:id", {
    tag: "Addresses",
    summary: "Delete an address",
    responses: { 200: ok("Address deleted", {}), 404: fail("Address not found") },
  }),

  // ---------------------------------------------------------- Shop
  route("get", "/products", {
    tag: "Shop",
    summary: "List products",
    query: {
      page: 1,
      limit: 20,
      search: { example: "tote" },
      category: { example: "Bags" },
    },
    responses: {
      200: ok("Products fetched", { products: [PRODUCT], page: 1, pages: 1, total: 1 }),
      500: fail("Failed to fetch products"),
    },
  }),
  route("get", "/products/:id", {
    tag: "Shop",
    summary: "Get a product",
    params: { id: PRODUCT_ID },
    responses: { 200: ok("Product fetched", PRODUCT), 404: fail("Failed to fetch product") },
  }),
  route("get", "/products/:id/metrics", {
    tag: "Shop",
    auth: "none",
    summary: "Product views / likes / rating",
    params: { id: PRODUCT_ID },
    responses: {
      200: ok("Product metrics fetched", {
        productId: PRODUCT_ID,
        rating: { average: 4.6, count: 12 },
        sales: { totalSold: 64, revenue: 2880000 },
        data: { average_rating: "4.6", totat_sold: "64" },
      }),
    },
  }),
  route("get", "/products/:id/share", {
    tag: "Shop",
    summary: "Shareable product link with the user's referral code",
    params: { id: PRODUCT_ID },
    responses: {
      200: ok("Share link generated", {
        url: `https://jamestown.ng/shop/item/${PRODUCT_ID}?ref=K7Q2M9XD`,
        refCode: "K7Q2M9XD",
        socials: {
          raw: `https://jamestown.ng/shop/item/${PRODUCT_ID}?ref=K7Q2M9XD`,
          whatsapp: "https://api.whatsapp.com/send?text=Check%20this%20out…",
          twitter: "https://twitter.com/intent/tweet?text=Check%20this%20out…",
          facebook: "https://www.facebook.com/sharer/sharer.php?u=…",
          linkedin: "https://www.linkedin.com/sharing/share-offsite/?url=…",
        },
      }),
      404: fail("Product not found"),
    },
  }),
  route("get", "/category", {
    tag: "Shop",
    auth: "none",
    summary: "List categories",
    responses: {
      200: ok("Categories fetched", [
        { _id: "cat_bags", name: "Bags", description: "Bags and totes", subcategory: ["Totes", "Backpacks"], imageUrls: [] },
      ]),
    },
  }),
  route("get", "/category/:id", {
    tag: "Shop",
    auth: "none",
    summary: "Get a category",
    params: { id: "cat_bags" },
    responses: {
      200: ok("Category fetched", { _id: "cat_bags", name: "Bags", subcategory: ["Totes", "Backpacks"] }),
    },
  }),

  // ---------------------------------------------------------- Cart & orders
  route("get", "/user/cart", {
    tag: "Cart & orders",
    summary: "Current cart with product details and total",
    responses: {
      200: ok("Cart fetched", {
        cart: { _id: "cart_4c1e", userId: USER_ID, isActive: true, items: [CART_ITEM] },
        total: 90000,
      }),
    },
  }),
  route("post", "/user/cart/items", {
    tag: "Cart & orders",
    summary: "Add items to the cart",
    description: "Send a single item, or `{ items: [...] }` for several. Existing items are incremented.",
    body: { items: [{ productId: PRODUCT_ID, quantity: 2 }] },
    responses: { 201: ok("Items added", [CART_ITEM]) },
  }),
  route("patch", "/user/cart/items/:id", {
    tag: "Cart & orders",
    summary: "Set an item's quantity",
    params: { id: "ci_91b2" },
    body: { quantity: 3 },
    required: ["quantity"],
    responses: { 200: ok("Item updated", { ...CART_ITEM, quantity: 3 }) },
  }),
  route("patch", "/user/cart/items/:id/reduce", {
    tag: "Cart & orders",
    summary: "Reduce an item's quantity",
    params: { id: "ci_91b2" },
    query: { by: { example: 1, description: "Amount to subtract (default 1)" } },
    responses: { 200: ok("Item quantity reduced", { ...CART_ITEM, quantity: 1 }) },
  }),
  route("delete", "/user/cart/items/:id", {
    tag: "Cart & orders",
    summary: "Remove an item",
    params: { id: "ci_91b2" },
    responses: { 200: ok("Item removed", {}) },
  }),
  route("delete", "/user/cart", {
    tag: "Cart & orders",
    summary: "Empty the cart",
    responses: { 200: ok("Cart cleared", {}) },
  }),
  route("get", "/user/cart/total", {
    tag: "Cart & orders",
    summary: "Number of items in the cart",
    responses: { 200: ok("Total items fetched", { totalItems: 2 }) },
  }),
  route("post", "/user/cart/checkout", {
    tag: "Cart & orders",
    summary: "Pay for the cart from the wallet",
    body: { pin: "1234" },
    required: ["pin"],
    responses: {
      200: ok("Checkout successful", {
        orderId: ORDER._id,
        reference: "9c1e4b7a2f6d4e0b8a3c5d71",
        items: ORDER.items,
        charged: 90000,
        remainingBalance: 35000,
        timestamp: DATE,
      }),
      400: fail("PIN is required"),
      401: fail("Invalid PIN"),
    },
  }),
  route("get", "/user/orders", {
    tag: "Cart & orders",
    summary: "List the user's orders",
    responses: { 200: ok("Orders fetched", [ORDER]) },
  }),
  route("get", "/user/orders/:id", {
    tag: "Cart & orders",
    summary: "Get an order",
    params: { id: ORDER._id },
    responses: { 200: ok("Order fetched", ORDER), 404: fail("Order not found") },
  }),

  // ---------------------------------------------------------- Likes, wishlist, ratings
  route("get", "/user/likes", {
    tag: "Likes, wishlist & ratings",
    summary: "Liked products",
    responses: { 200: ok("Liked products fetched", [PRODUCT_SUMMARY]) },
  }),
  route("post", "/user/likes/:productId", {
    tag: "Likes, wishlist & ratings",
    summary: "Like a product",
    params: { productId: PRODUCT_ID },
    responses: { 201: ok("Product liked", {}) },
  }),
  route("delete", "/user/likes/:productId", {
    tag: "Likes, wishlist & ratings",
    summary: "Unlike a product",
    params: { productId: PRODUCT_ID },
    responses: { 200: ok("Product unliked", {}) },
  }),
  route("get", "/user/wishlist", {
    tag: "Likes, wishlist & ratings",
    summary: "Wishlist",
    responses: { 200: ok("Wishlist fetched", [PRODUCT_SUMMARY]) },
  }),
  route("post", "/user/wishlist", {
    tag: "Likes, wishlist & ratings",
    summary: "Add to wishlist",
    body: { productId: PRODUCT_ID },
    required: ["productId"],
    responses: { 201: ok("Added to wishlist", {}), 400: fail("productId required") },
  }),
  route("delete", "/user/wishlist/:productId", {
    tag: "Likes, wishlist & ratings",
    summary: "Remove from wishlist",
    params: { productId: PRODUCT_ID },
    responses: { 200: ok("Removed from wishlist", {}) },
  }),
  route("get", "/user/ratings/:productId", {
    tag: "Likes, wishlist & ratings",
    summary: "Ratings for a product",
    params: { productId: PRODUCT_ID },
    responses: {
      200: ok("Ratings fetched", [
        { _id: "rt_11", userId: USER_ID, productId: PRODUCT_ID, rating: 5, review: "Great quality", created_at: DATE },
      ]),
    },
  }),
  route("post", "/user/ratings/:productId", {
    tag: "Likes, wishlist & ratings",
    summary: "Rate a product (one rating per user, updates if repeated)",
    params: { productId: PRODUCT_ID },
    body: { rating: 5, review: "Great quality" },
    required: ["rating"],
    responses: {
      201: ok("Rating saved", { _id: "rt_11", userId: USER_ID, productId: PRODUCT_ID, rating: 5, review: "Great quality" }),
    },
  }),
  route("get", "/user/ratings/summary/:productId", {
    tag: "Likes, wishlist & ratings",
    auth: "none",
    summary: "Average rating for a product",
    params: { productId: PRODUCT_ID },
    responses: { 200: ok("Rating summary", { productId: PRODUCT_ID, count: 12, average: 4.6, histogram: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 8 } }) },
  }),
  route("get", "/user/ratings/summary", {
    tag: "Likes, wishlist & ratings",
    auth: "none",
    summary: "Average ratings for several products",
    query: { product_ids: { example: `${PRODUCT_ID},prd_77b0`, required: true, description: "Comma-separated" } },
    responses: {
      200: ok("Rating summaries", [{ productId: PRODUCT_ID, count: 12, average: 4.6, histogram: { 1: 0, 2: 0, 3: 1, 4: 3, 5: 8 } }]),
      400: fail("product_ids is required"),
    },
  }),

  // ---------------------------------------------------------- Shipping
  route("get", "/user/rates/shipping", {
    tag: "Shipping",
    summary: "Shipping rate quote",
    query: {
      category: { example: "Electronics", required: true },
      country: { example: "United Kingdom", required: true },
      weight: { example: 2.5, required: true },
      product: { example: "Laptop" },
    },
    responses: {
      200: ok("Shipping rates fetched", [
        { _id: "rate_ship_1", type: "shipping", name: "Express", country: "United Kingdom", category: "Electronics", product: "Laptop", range: { min: 0, max: 5 }, rate: 8500 },
      ]),
      400: fail("category, country and weight are required"),
      404: fail("No available rate at the moment"),
    },
  }),
  route("get", "/user/rates/shipping/categories", {
    tag: "Shipping",
    summary: "Shipping categories (optionally with products)",
    query: { country: "United Kingdom", state: { example: "" }, region: { example: "" }, includeProducts: { example: "true" } },
    responses: {
      200: ok("Shipping categories fetched", ["Electronics", "Documents", "Clothing"]),
    },
  }),
  route("get", "/user/rates/shipping/products", {
    tag: "Shipping",
    summary: "Products within a shipping category",
    query: { category: { example: "Electronics", required: true }, country: "United Kingdom" },
    responses: { 200: ok("Shipping products fetched", ["Laptop", "Phone", "Tablet"]) },
  }),
  route("post", "/user/shipping", {
    tag: "Shipping",
    summary: "Book a shipment",
    body: {
      receiverName: "Chidi Okafor",
      receiverPhone: "08098765432",
      receiverEmail: "chidi@example.com",
      receiverPickupLocation: "Ikeja City Mall, Lagos",
      packageCategory: "Electronics",
      packageType: "Box",
      packageWeight: 2.5,
      packageQuantity: 1,
      packageDescription: "Laptop",
      total: 8500,
    },
    required: ["receiverName", "receiverPhone", "receiverEmail", "packageCategory", "packageType", "packageWeight", "packageQuantity"],
    responses: { 201: ok("Shipment created.", SHIPMENT), 400: fail("Could not create shipment") },
  }),
  route("get", "/user/shipping", {
    tag: "Shipping",
    summary: "List the user's shipments",
    query: { page: 1, limit: 20, status: { example: "awaiting_payment" }, category: { example: "" }, search: { example: "" } },
    responses: { 200: ok("Shipments fetched", { page: 1, limit: 20, total: 1, shipments: [SHIPMENT] }) },
  }),
  route("get", "/user/shipping/:id", {
    tag: "Shipping",
    summary: "Get a shipment",
    params: { id: SHIPMENT._id },
    responses: { 200: ok("Shipment fetched", SHIPMENT), 404: fail("Shipment not found") },
  }),
  route("post", "/user/shipments/:id/pay", {
    tag: "Shipping",
    summary: "Pay a shipment's delivery fee from the wallet",
    params: { id: SHIPMENT._id },
    body: { pin: "1234" },
    required: ["pin"],
    responses: {
      200: ok("Shipment paid", { shipment: { ...SHIPMENT, payment: { deliveryFee: 8500, isPaid: true }, shipmentStatus: "pending" } }),
      400: fail("Shipment is not ready for payment"),
      401: fail("Invalid PIN"),
      403: fail("Forbidden"),
      404: fail("Shipment not found"),
    },
  }),
  route("post", "/user/shipping/drop-off", {
    tag: "Shipping",
    summary: "Register a drop-off (multipart, with receipt photo)",
    form: { courier: "DHL", trackingNumber: "1Z999AA10123456784", pickup: "Jamestown hub, Yaba", pin: "1234", file: "<file>" },
    required: ["courier", "trackingNumber", "pin"],
    responses: {
      201: ok("Drop Off created", DROPOFF),
      400: fail("Tracking Number is required"),
      401: fail("Invalid PIN"),
    },
  }),
  route("get", "/user/shipping/drop-off", {
    tag: "Shipping",
    summary: "List the user's drop-offs",
    responses: { 200: ok("Dropoffs fetched", [DROPOFF]) },
  }),
  route("post", "/user/shipments/drop-off/:id/pay", {
    tag: "Shipping",
    summary: "Pay a drop-off's delivery fee from the wallet",
    params: { id: DROPOFF._id },
    body: { pin: "1234" },
    required: ["pin"],
    responses: {
      200: ok("Drop off paid", { dropoff: { ...DROPOFF, deliveryFee: 6000, isPaid: true, paid: true } }),
      400: fail("Drop off is not ready for payment"),
      401: fail("Invalid PIN"),
      404: fail("Drop off not found"),
    },
  }),

  // ---------------------------------------------------------- Waitlist
  route("post", "/waitlist", {
    tag: "Waitlist",
    auth: "none",
    summary: "Join the waitlist",
    query: { referralCode: { example: "WL-4F2A9C" } },
    body: { firstName: "Ada", email: "ada.obi@example.com" },
    required: ["firstName", "email"],
    responses: {
      200: ok("User added to waitlist successfully", {
        newUser: { _id: "wl_1", firstName: "Ada", email: "ada.obi@example.com", referralCode: "WL-9B1D3E", rank: 214 },
        referralLink: "https://jamestown.ng/waitlist?referralCode=WL-9B1D3E",
      }),
      400: fail("This email already exists on the waitlist"),
    },
  }),
  route("post", "/waitlist/check-spot", {
    tag: "Waitlist",
    auth: "none",
    summary: "Check waitlist position",
    body: { email: "ada.obi@example.com" },
    required: ["email"],
    responses: {
      200: ok("Waitlist spot checked successfully", {
        email: "ada.obi@example.com",
        rank: 214,
        points: 30,
        message: "There are 213 person(s) ahead of you on the waitlist.",
        referralCode: "WL-9B1D3E",
      }),
      404: fail("Email not found on the waitlist."),
    },
  }),

  // ---------------------------------------------------------- Internal
  route("post", "/internal/users/verify-pin", {
    tag: "Internal",
    auth: "internal",
    summary: "Check a user's PIN (used by the wallet service)",
    body: { userId: USER_ID, pin: "1234" },
    required: ["userId", "pin"],
    responses: { 200: ok("Pin verified"), 401: fail("Invalid pin"), 403: FORBIDDEN_INTERNAL },
  }),
  route("get", "/internal/users/count", {
    tag: "Internal",
    auth: "internal",
    summary: "User and referral counts",
    responses: { 200: ok("OK", { count: 5821, referrals: 734 }) },
  }),
  route("post", "/internal/users/batch", {
    tag: "Internal",
    auth: "internal",
    summary: "Look up several users by id",
    description: "Not wrapped in the standard envelope.",
    body: { ids: [USER_ID] },
    required: ["ids"],
    responses: {
      200: { users: { [USER_ID]: { _id: USER_ID, firstName: "Ada", lastName: "Obi", email: "ada.obi@example.com", phoneNumber: "08012345678" } } },
      400: { error: "ids required" },
    },
  }),
  route("get", "/internal/users/:id", {
    tag: "Internal",
    auth: "internal",
    summary: "Get a user by id",
    description: "Not wrapped in the standard envelope.",
    params: { id: USER_ID },
    responses: {
      200: { _id: USER_ID, firstName: "Ada", lastName: "Obi", email: "ada.obi@example.com", phoneNumber: "08012345678" },
      404: { error: "Not found" },
    },
  }),
  route("patch", "/internal/users/:id/status", {
    tag: "Internal",
    auth: "internal",
    summary: "Activate / deactivate a user",
    params: { id: USER_ID },
    body: { isActive: false },
    required: ["isActive"],
    responses: { 200: ok("OK", { _id: USER_ID, isActive: false }), 400: fail("isActive (boolean) is required") },
  }),
  route("post", "/internal/users/:id/watchlist-flag", {
    tag: "Internal",
    auth: "internal",
    summary: "Flag a user from the BVN watchlist and deactivate the account",
    params: { id: USER_ID },
    body: { entryId: "8c1f2e3d-4b5a-4c6d-9e8f-0a1b2c3d4e5f", bvnLast4: "0001", reason: "Reported by bank" },
    responses: {
      200: ok("OK", {
        _id: USER_ID,
        firstName: "Ada",
        lastName: "Obi",
        email: "ada.obi@example.com",
        phoneNumber: "08012345678",
        isActive: false,
        watchlistFlag: { flagged: true, entryId: "8c1f2e3d-4b5a-4c6d-9e8f-0a1b2c3d4e5f", bvnLast4: "0001", reason: "Reported by bank", flaggedAt: DATE },
        createdAt: DATE,
      }),
      404: fail("Not found"),
    },
  }),
  route("post", "/internal/users/:id/duplicate-bvn-flag", {
    tag: "Internal",
    auth: "internal",
    summary: "Deactivate an account whose BVN is also on another account",
    description: "`keptUserId` is the account that keeps the BVN. The flag stays if the account is reactivated.",
    params: { id: USER_ID },
    body: { keptUserId: "0b7f3c2a-1d4e-4f5a-8b6c-7d8e9f0a1b2c", bvnLast4: "0001" },
    responses: {
      200: ok("OK", {
        _id: USER_ID,
        firstName: "Ada",
        lastName: "Obi",
        email: "ada.obi@example.com",
        phoneNumber: "08012345678",
        isActive: false,
        duplicateBvnFlag: { flagged: true, keptUserId: "0b7f3c2a-1d4e-4f5a-8b6c-7d8e9f0a1b2c", bvnLast4: "0001", flaggedAt: DATE },
        createdAt: DATE,
      }),
      404: fail("Not found"),
    },
  }),
  route("get", "/internal/referrals/signups", {
    tag: "Internal",
    auth: "internal",
    summary: "Referred users who signed up at or after `since`, oldest first (wallet service referral rewards)",
    query: { since: { example: "2026-10-22T00:00:00.000Z", required: true }, limit: { example: 500, description: "max 1000" } },
    responses: {
      200: ok("OK", { signups: [{ userId: USER_ID, referrerId: "0b7f3c2a-1d4e-4f5a-8b6c-7d8e9f0a1b2c", createdAt: DATE }] }),
      400: fail("since (ISO date) is required"),
    },
  }),
  route("get", "/internal/referrals/:id/referred", {
    tag: "Internal",
    auth: "internal",
    summary: "A page of the users someone referred, newest first",
    params: { id: USER_ID },
    query: { page: 1, limit: { example: 20, description: "max 100" } },
    responses: {
      200: ok("OK", { page: 1, limit: 20, total: 1, users: [{ _id: "0b7f3c2a-1d4e-4f5a-8b6c-7d8e9f0a1b2c", firstName: "Ada", lastName: "Obi", createdAt: DATE }] }),
    },
  }),
  route("get", "/internal/users/:id/status", {
    tag: "Internal",
    auth: "internal",
    summary: "Whether a user's account may be used (for other services' auth checks)",
    params: { id: USER_ID },
    responses: {
      200: ok("OK", { _id: USER_ID, isActive: false, isDeleted: false, watchlistFlagged: true }),
      404: fail("Not found"),
    },
  }),
  route("patch", "/internal/users/:id/risk", {
    tag: "Internal",
    auth: "internal",
    summary: "Set or clear a manual risk level",
    description: "`level: \"auto\"` (or null) clears the override.",
    params: { id: USER_ID },
    body: { level: "high", note: "Chargeback reported by bank", setBy: "ops@jamestown.ng" },
    required: ["level"],
    responses: {
      200: ok("OK", { _id: USER_ID, riskOverride: { level: "high", note: "Chargeback reported by bank", setBy: "ops@jamestown.ng", setAt: DATE } }),
      400: fail("level must be low, medium, high or auto"),
    },
  }),
  route("get", "/internal/users/email-recipients", {
    tag: "Internal",
    auth: "internal",
    summary: "Email campaign recipients (cursor paginated)",
    description: "Excludes deleted/deactivated users and users who opted out of emails. Pass `next` back as `after`.",
    query: {
      audience: { example: "all", enum: ["all", "verified", "unverified", "phone_verified"] },
      limit: 500,
      after: { example: "" },
    },
    responses: {
      200: ok("OK", {
        recipients: [{ _id: USER_ID, email: "ada.obi@example.com", firstName: "Ada", lastName: "Obi" }],
        next: USER_ID,
      }),
    },
  }),
  route("get", "/internal/users/email-recipients/count", {
    tag: "Internal",
    auth: "internal",
    summary: "Count email campaign recipients",
    query: { audience: { example: "verified", enum: ["all", "verified", "unverified", "phone_verified"] } },
    responses: { 200: ok("OK", { count: 4310 }) },
  }),
  route("post", "/internal/push/send", {
    tag: "Internal",
    auth: "internal",
    summary: "Send a push notification",
    description:
      "Targets `userIds`, or everyone with `all: true`. `platforms` limits to android/ios. " +
      "`skipped: true` means Firebase is not configured (FIREBASE_SERVICE_ACCOUNT).",
    body: {
      userIds: [USER_ID],
      all: false,
      platforms: ["android", "ios"],
      title: "Deposit received",
      body: "₦25,000 has been added to your wallet.",
      data: { type: "deposit", reference: "PP-20261015-81" },
    },
    required: ["title", "body"],
    responses: {
      200: ok("OK", { targeted: 2, success: 2, failure: 0, skipped: false, pruned: 0 }),
      400: fail("userIds or all=true is required"),
    },
  }),
  route("post", "/internal/sms/test", {
    tag: "Internal",
    auth: "internal",
    summary: "Send a test SMS",
    description:
      "Sends `message` (or a default test text) to `phoneNumber` through the SMS provider set in SMS_PROVIDER. " +
      "Pass `provider` (sendar, africastalking, twilio, termii, log) to try a different one without changing the env. " +
      "With twilio, `message` is ignored: Twilio Verify texts one of its own verification codes. " +
      "A 502 carries the provider's rejection reason.",
    body: { phoneNumber: "08012345678", message: "Hello from Jamestown", provider: "sendar" },
    required: ["phoneNumber"],
    responses: {
      200: ok("SMS sent", {
        phoneNumber: "08012345678",
        provider: "sendar",
        status: "sent",
        messageId: "4b1331d1-1ec2-4f5d-8b17-5c64ad8609ae",
      }),
      400: fail("Phone number must be 11 digits and start with 070, 080, 081, 090, 091"),
      502: fail("Sendar rejected the message (HTTP 401): Invalid or revoked API key", { phoneNumber: "08012345678" }),
    },
  }),
  route("get", "/internal/customers", {
    tag: "Internal",
    auth: "internal",
    summary: "List customers (admin)",
    query: {
      page: 1,
      limit: 10,
      search: { example: "ada" },
      verified: { example: "1", enum: ["1", "0"] },
      active: { example: "1", enum: ["1", "0"] },
    },
    responses: {
      200: ok("OK", {
        page: 1,
        limit: 10,
        total: 1,
        customers: [
          {
            _id: USER_ID,
            firstName: "Ada",
            lastName: "Obi",
            email: "ada.obi@example.com",
            phoneNumber: "08012345678",
            isVerified: true,
            isPhoneVerified: true,
            isActive: true,
            createdAt: DATE,
            referredBy: null,
            riskOverride: null,
            referralsCount: 4,
            location: "Lagos, Lagos",
          },
        ],
      }),
    },
  }),
  route("get", "/internal/customers/metrics", {
    tag: "Internal",
    auth: "internal",
    summary: "Customer growth metrics",
    query: { windowDays: 30 },
    responses: {
      200: ok("OK", {
        cards: { totalCustomers: 5821, newCustomers: 412, returningCustomers: 1290, conversionRate: 22 },
        series: [{ year: 2026, month: 10, label: "Oct", newCustomers: 412, returningCustomers: 230 }],
      }),
    },
  }),
  route("get", "/internal/customers/:id/overview", {
    tag: "Internal",
    auth: "internal",
    summary: "Customer profile overview (admin)",
    params: { id: USER_ID },
    responses: {
      200: ok("OK", {
        profile: {
          _id: USER_ID,
          firstName: "Ada",
          lastName: "Obi",
          email: "ada.obi@example.com",
          phoneNumber: "08012345678",
          isVerified: true,
          isPhoneVerified: true,
          phoneVerifiedAt: DATE,
          isActive: true,
          createdAt: DATE,
          imageUrl: null,
          referredBy: null,
          riskOverride: null,
          referralsCount: 4,
        },
        location: "Lagos, Lagos",
        ordersCount: 3,
      }),
      404: fail("Not found"),
    },
  }),
  route("get", "/internal/orders/by-user", {
    tag: "Internal",
    auth: "internal",
    summary: "A user's orders",
    query: { userId: { example: USER_ID, required: true }, page: 1, limit: 10, status: { example: "confirmed" } },
    responses: { 200: ok("OK", { page: 1, limit: 10, total: 1, orders: [ORDER] }), 400: fail("userId is required") },
  }),
  route("get", "/internal/orders/latest", {
    tag: "Internal",
    auth: "internal",
    summary: "Latest orders",
    query: { limit: 6 },
    responses: { 200: ok("OK", [{ ...ORDER, userId: { _id: USER_ID, firstName: "Ada", lastName: "Obi", email: "ada.obi@example.com" } }]) },
  }),
  route("get", "/internal/orders/metrics", {
    tag: "Internal",
    auth: "internal",
    summary: "Order totals",
    responses: { 200: ok("OK", { totalOrders: 820, productSold: 1460, nairaVolume: 18450000 }) },
  }),
  route("get", "/internal/orders/top-products", {
    tag: "Internal",
    auth: "internal",
    summary: "Best-selling products",
    query: { limit: 3 },
    responses: { 200: ok("OK", [{ _id: PRODUCT_ID, sold: 64, revenue: 2880000 }]) },
  }),
  route("get", "/internal/orders/sales-data", {
    tag: "Internal",
    auth: "internal",
    summary: "Monthly sales series",
    query: { months: 6 },
    responses: {
      200: ok("OK", {
        data: [{ year: 2026, month: 10, label: "Oct", units: 120, revenue: 5400000, orders: 88 }],
        momUnitsPct: 12,
      }),
    },
  }),
  route("get", "/internal/orders/summary", {
    tag: "Internal",
    auth: "internal",
    summary: "Order summary cards",
    responses: { 200: ok("OK", { totalOrders: 820, completedOrders: 790, gmvGross: 18450000, gmvNet: 17900000 }) },
  }),
  route("get", "/internal/orders/chart", {
    tag: "Internal",
    auth: "internal",
    summary: "Orders per month",
    query: { months: 12 },
    responses: {
      200: ok("OK", { series: [{ year: 2026, month: 10, label: "Oct", totalOrders: 88, completedOrders: 80, gmv: 5400000 }] }),
    },
  }),
  route("get", "/internal/orders/admin-list", {
    tag: "Internal",
    auth: "internal",
    summary: "All orders (admin)",
    query: { page: 1, limit: 20, status: { example: "confirmed" }, q: { example: "CHK-2026" }, from: { example: "2026-10-01" }, to: { example: "2026-10-31" } },
    responses: { 200: ok("OK", { page: 1, limit: 20, total: 1, orders: [ORDER] }) },
  }),
  route("get", "/internal/orders/:id", {
    tag: "Internal",
    auth: "internal",
    summary: "Get any order",
    params: { id: ORDER._id },
    responses: { 200: ok("OK", ORDER), 404: fail("Order not found") },
  }),
  route("get", "/internal/addresses", {
    tag: "Internal",
    auth: "internal",
    summary: "List addresses",
    query: { id: { example: USER_ID }, city: { example: "Lagos" } },
    responses: { 200: ok("OK", [ADDRESS]) },
  }),
  route("post", "/internal/addresses", {
    tag: "Internal",
    auth: "internal",
    summary: "Create an address",
    body: { userId: USER_ID, line1: "12 Admiralty Way", city: "Lagos", state: "Lagos", country: "Nigeria" },
    responses: { 200: ok("OK", ADDRESS) },
  }),
  route("patch", "/internal/addresses/:id", {
    tag: "Internal",
    auth: "internal",
    summary: "Update an address",
    params: { id: ADDRESS._id },
    body: { line2: "Block C, Flat 4" },
    responses: { 200: ok("OK", ADDRESS), 404: fail("Address not found") },
  }),
];

const tags = [
  { name: "Auth", description: "Sign up, login, OTPs, phone verification, PIN" },
  { name: "Profile" },
  { name: "Referral" },
  { name: "Addresses" },
  { name: "Shop" },
  { name: "Cart & orders" },
  { name: "Likes, wishlist & ratings" },
  { name: "Shipping" },
  { name: "Waitlist" },
  { name: "Internal", description: "Service-to-service only. Requires the `x-internal-key` header." },
];

module.exports = () =>
  buildSpec({
    info: {
      title: "Jamestown User Service",
      version: "1.0.0",
      description:
        "Accounts, auth, profile, shop, cart, shipping and referrals.\n\n" +
        "**Auth:** call `POST /auth/login`, then click **Authorize** and paste the `token` (Bearer). " +
        "Tokens expire after 1 hour.\n\n" +
        "Responses use `{ status, message, data }` unless noted.\n\n" +
        "**Blocked accounts:** any authenticated endpoint returns 403 `{ auth: false, message: \"Account disabled\" }` " +
        "(or `\"Account restricted. Please contact support.\"` for BVN watchlist matches) once an account is deactivated, " +
        "even with a still-valid token. Changes apply within 15 seconds.",
    },
    tags,
    routes,
  });
