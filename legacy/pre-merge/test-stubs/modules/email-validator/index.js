export function validate(email) {
  return typeof email === "string" && email.includes("@");
}
