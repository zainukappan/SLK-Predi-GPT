export type AccountIdentifier = { kind: "email" | "phone"; value: string };

export function normalizeAccountIdentifier(raw: string): AccountIdentifier {
  const value = raw.trim();
  if (value.includes("@")) {
    const email = value.toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)
      throw new Error("invalid");
    return { kind: "email", value: email };
  }
  let phone = value.replace(/[\s().-]/g, "");
  if (/^\d{10}$/.test(phone)) phone = "+91" + phone;
  if (phone.startsWith("00")) phone = "+" + phone.slice(2);
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) throw new Error("invalid");
  return { kind: "phone", value: phone };
}
