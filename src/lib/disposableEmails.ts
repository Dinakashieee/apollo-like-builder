// Common disposable / throwaway email domains. Not exhaustive, but covers the
// usual suspects we see in B2B signup spam and bogus lead imports.
const DISPOSABLE_DOMAINS: ReadonlySet<string> = new Set([
  "mailinator.com", "10minutemail.com", "10minutemail.net", "guerrillamail.com",
  "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz", "guerrillamail.de",
  "sharklasers.com", "grr.la", "spam4.me", "tempmail.com", "temp-mail.org",
  "temp-mail.io", "tempmailo.com", "throwawaymail.com", "trashmail.com",
  "trashmail.de", "trashmail.io", "trashmail.net", "yopmail.com", "yopmail.fr",
  "yopmail.net", "dispostable.com", "fakeinbox.com", "getairmail.com",
  "getnada.com", "nada.email", "moakt.com", "tutye.com", "maildrop.cc",
  "mintemail.com", "mohmal.com", "spambox.us", "spambog.com", "spambog.de",
  "anonbox.net", "mytrashmail.com", "tempinbox.com", "emailondeck.com",
  "boun.cr", "deadaddress.com", "mailcatch.com", "spamgourmet.com",
  "spamgourmet.net", "spamgourmet.org", "incognitomail.com", "incognitomail.net",
  "incognitomail.org", "jetable.org", "mailnesia.com", "mailnull.com",
  "mt2015.com", "mvrht.net", "nwldx.com", "objectmail.com", "rcpt.at",
  "sogetthis.com", "spamfree.eu", "tagyourself.com", "thanksnospam.info",
  "thisisnotmyrealemail.com", "trbvm.com", "weg-werf-email.de", "wegwerfmail.de",
  "wegwerfmail.net", "wegwerfmail.org", "wh4f.org", "yopmail.org", "z0d.eu",
  "zoemail.com", "zoemail.net", "zoemail.org", "0wnd.net", "0wnd.org",
  "burnermail.io", "fakemail.net", "fakemailgenerator.com", "fakermail.com",
  "luxusmail.org", "mvrht.com", "mailtemp.info", "smailpro.com", "tmail.ws",
  "tmailinator.com", "tmpmail.org", "instantemailaddress.com", "haribu.com",
  "33mail.com", "vomoto.com", "spam.la", "byom.de", "binkmail.com",
]);

export function emailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0 || at === email.length - 1) return null;
  return email.slice(at + 1).trim().toLowerCase();
}

export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return DISPOSABLE_DOMAINS.has(domain);
}
