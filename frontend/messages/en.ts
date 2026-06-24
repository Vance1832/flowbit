// English is the canonical message shape; every other locale must match it
// (enforced by `Messages = typeof en` in messages/index.ts). Use {var}
// placeholders for interpolation via the t() helper.
export const en = {
  common: {
    appName: "Flowbit",
    tagline: "Ledger & Settlement System",
    language: "Language",
  },
  login: {
    title: "Login",
    subtitle: "Sign in to your wallet, submit numbers, and track your results.",
    country: "Country",
    phone: "Phone",
    password: "Password",
    forgotPassword: "Forgot password?",
    signIn: "Login",
    signingIn: "Signing In...",
    needAccount: "Need an account?",
    register: "Register",
    authorizedNotice:
      "Authorized access only. Activity may be logged for security and audit purposes.",
    phonePasswordRequired: "Phone and password are required.",
    loginFailed: "Login failed.",
    twoFactorTitle: "Two-factor verification",
    twoFactorSubtitle: "Enter the 6-digit code we sent to finish signing in.",
    code: "Verification code",
    verify: "Verify & sign in",
    verifying: "Verifying...",
    backToLogin: "Back to login",
    enterCode: "Enter the verification code.",
    verificationFailed: "Verification failed.",
    codeSent: "A verification code has been sent to your registered contact.",
    codeSentDev: "A verification code has been sent. Dev code: {code}",
  },
};
