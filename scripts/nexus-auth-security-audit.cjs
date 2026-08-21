const fs = require("fs");
const path = require("path");

const root = process.cwd();

const files = {
  auth: path.join(root, "src", "lib", "auth.ts"),
  middleware: path.join(root, "src", "middleware.ts"),
  request: path.join(
    root,
    "src",
    "app",
    "api",
    "auth",
    "password",
    "request",
    "route.ts",
  ),
  reset: path.join(
    root,
    "src",
    "app",
    "api",
    "auth",
    "password",
    "reset",
    "route.ts",
  ),
};

for (const [name, file] of Object.entries(files)) {
  if (!fs.existsSync(file)) {
    throw new Error(`Missing ${name}: ${file}`);
  }
}

const auth = fs.readFileSync(files.auth, "utf8");
const middleware = fs.readFileSync(files.middleware, "utf8");
const request = fs.readFileSync(files.request, "utf8");
const reset = fs.readFileSync(files.reset, "utf8");

const checks = {
  dangerousGoogleLinkingRemoved:
    !auth.includes("allowDangerousEmailAccountLinking: true"),
  googleIsExplicitOptIn:
    auth.includes('process.env.ENABLE_GOOGLE_AUTH === "true"'),
  providerApprovalGate:
    auth.includes('dbUser.status === "APPROVED"'),
  sessionShortened:
    auth.includes("maxAge: 12 * 60 * 60"),
  deepRedirectPreserved:
    auth.includes("return target.toString()"),
  middlewareReadsJwt:
    middleware.includes("getToken"),
  middlewareRequiresApproved:
    middleware.includes('token.status !== "APPROVED"'),
  adminRoleGate:
    middleware.includes('["OWNER", "ADMIN"].includes(role)'),
  managerConversionGate:
    middleware.includes('"MANAGER"'),
  passwordRequestHashesToken:
    request.includes('token: tokenHash'),
  passwordRequestDoesNotUseOriginAsBase:
    !request.includes('req.headers.get("origin")'),
  productionDoesNotReturnResetBearer:
    request.includes('process.env.NODE_ENV === "production"'),
  resetLooksUpHashedToken:
    reset.includes("const tokenHash = sha256(token)"),
  resetHasPasswordBounds:
    reset.includes("password.length < 8") && reset.includes("password.length > 128"),
  resetConsumesAllTokens:
    reset.includes("verificationToken.deleteMany"),
};

console.table(checks);

const failed = Object.entries(checks)
  .filter(([, ok]) => !ok)
  .map(([name]) => name);

if (failed.length) {
  console.error("\nAUTH SECURITY AUDIT FAILED:");
  for (const name of failed) console.error(" -", name);
  process.exitCode = 1;
} else {
  console.log("\nAUTH SECURITY AUDIT PASSED.");
  console.log(
    "NOTE: production password-reset email delivery is intentionally still pending STEP 8F.2.",
  );
}
