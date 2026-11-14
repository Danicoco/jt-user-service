const disposableDomains = require("disposable-email-domains");
const disposableWildcards = require("disposable-email-domains/wildcard.json");

const EXACT = new Set(disposableDomains.map((d) => d.toLowerCase()));
// wildcard entries block the domain itself and every subdomain of it
const WILDCARD = new Set(disposableWildcards.map((d) => d.toLowerCase()));

const DISPOSABLE_EMAIL_MESSAGE =
  "Temporary or disposable email addresses are not allowed. Please use a permanent email address.";

function isDisposableEmail(email) {
  const str = String(email || "").trim().toLowerCase();
  const at = str.lastIndexOf("@");
  if (at === -1) return false;
  const domain = str.slice(at + 1).replace(/\.$/, "");
  if (!domain) return false;

  if (EXACT.has(domain)) return true;

  // check the domain and each parent domain against the wildcard list,
  // e.g. "x.y.example.com" -> "x.y.example.com", "y.example.com", "example.com"
  const parts = domain.split(".");
  for (let i = 0; i < parts.length - 1; i++) {
    if (WILDCARD.has(parts.slice(i).join("."))) return true;
  }
  return false;
}

module.exports = { isDisposableEmail, DISPOSABLE_EMAIL_MESSAGE };
