export function parseDate(input, referenceDate) {
  if (input == null) {
    return new Date();
  }

  const normalizedInput = String(input).trim();
  const ref = referenceDate ? new Date(referenceDate) : undefined;

  const tryDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed;
  };

  const parsedDirect = tryDate(normalizedInput);
  if (parsedDirect) {
    return parsedDirect;
  }

  if (/^today\s+/i.test(normalizedInput) && ref && !Number.isNaN(ref.getTime())) {
    const timePart = normalizedInput.replace(/^today\s+/i, "");
    const [hours, minutes] = timePart.split(":").map(Number);
    if (!Number.isNaN(hours) && !Number.isNaN(minutes)) {
      ref.setHours(hours, minutes, 0, 0);
      return ref;
    }
  }

  if (ref && !Number.isNaN(ref.getTime())) {
    return ref;
  }

  return new Date();
}
