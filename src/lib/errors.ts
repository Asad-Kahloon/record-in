// Turns Supabase errors into messages that are safe and helpful to show users.
// Messages we raise on purpose in SQL (see supabase/schema.sql) are shown as-is;
// anything unexpected is logged on the server and replaced with a generic line.

const FRIENDLY_DB_CODES = new Set(["P0001", "P0002", "42501", "28000"]);

interface ErrorLike {
  code?: string;
  message?: string;
  status?: number;
}

export function friendlyDbError(error: ErrorLike | null | undefined, fallback = "Something went wrong. Please try again.") {
  if (!error) return fallback;
  if (error.code && FRIENDLY_DB_CODES.has(error.code) && error.message) return error.message;
  if (error.code === "PGRST301" || error.code === "PGRST303") return "Your session has expired. Please sign in again.";
  if (error.code === "PGRST202") return "The database isn't set up yet. Run supabase/schema.sql in the SQL editor.";
  console.error("[db]", error.code, error.message);
  return fallback;
}

const AUTH_MESSAGES: Record<string, string> = {
  invalid_credentials: "Incorrect email or password.",
  email_not_confirmed: "Please confirm your email first — check your inbox for the link.",
  user_already_exists: "An account with this email already exists. Try signing in instead.",
  email_exists: "An account with this email already exists. Try signing in instead.",
  weak_password: "That password is too weak. Use at least 8 characters with letters and numbers.",
  same_password: "Your new password must be different from the current one.",
  over_request_rate_limit: "Too many attempts. Please wait a minute and try again.",
  over_email_send_rate_limit: "Too many emails sent. Please wait a few minutes and try again.",
  signup_disabled: "New sign-ups are currently closed.",
  user_banned: "This account has been blocked.",
  session_not_found: "Your session has expired. Please sign in again.",
  reauthentication_needed: "Please sign in again before changing your password.",
  validation_failed: "Please check the details you entered.",
};

export function friendlyAuthError(error: ErrorLike | null | undefined, fallback = "Couldn't complete that. Please try again.") {
  if (!error) return fallback;
  if (error.code && AUTH_MESSAGES[error.code]) return AUTH_MESSAGES[error.code];
  if (error.status === 429) return AUTH_MESSAGES.over_request_rate_limit;
  console.error("[auth]", error.code, error.message);
  return fallback;
}
