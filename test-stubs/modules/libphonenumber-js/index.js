export function parsePhoneNumberFromString(value) {
  if (value == null) {
    return undefined;
  }

  const digits = String(value).replace(/[^0-9+]/g, "");
  if (!digits) {
    return undefined;
  }

  return {
    isValid: () => true,
    formatInternational: () => digits.startsWith("+") ? digits : `+${digits}`,
  };
}
