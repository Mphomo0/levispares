export default ({ deploymentType }) => ({
  providers: [
    {
      domain: deploymentType === "production"
        ? "https://clerk.levispares.co.za/"
        : "https://talented-dane-13.clerk.accounts.dev/",
      applicationID: "convex",
    },
  ],
});
