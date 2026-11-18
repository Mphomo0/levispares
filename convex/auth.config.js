// Which Clerk instance's sign-ins Convex accepts. Production uses the live
// Clerk domain; a dev deployment sets CLERK_JWT_ISSUER_DOMAIN to the Clerk
// development instance (npx convex env set CLERK_JWT_ISSUER_DOMAIN ...), or
// every signed-in request from localhost is rejected as unauthenticated.
const authConfig = {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN || "https://clerk.levispares.co.za",
      applicationID: "convex",
    },
  ],
};

export default authConfig;
