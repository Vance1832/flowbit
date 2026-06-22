// Country dial codes offered in the auth forms. Keep Myanmar first (primary market).
export const COUNTRY_CODE_OPTIONS: ReadonlyArray<{ label: string; value: string }> = [
  { label: "+95 Myanmar", value: "+95" },
  { label: "+66 Thailand", value: "+66" },
  { label: "+65 Singapore", value: "+65" },
];

export const DEFAULT_COUNTRY_CODE = "+95";

/**
 * Combine a dial code and a locally-typed number into the stored phone format
 * (`+<cc><number>`), mirroring the backend's normalization: strip non-digits
 * and drop a single leading zero.
 */
export function combinePhone(countryCode: string, rawNumber: string): string {
  let digits = rawNumber.replace(/\D/g, "");
  if (digits.startsWith("0")) {
    digits = digits.slice(1);
  }
  return `${countryCode}${digits}`;
}
