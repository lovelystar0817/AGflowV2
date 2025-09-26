declare module 'chrono-node' {
  export function parseDate(input: string | null | undefined, referenceDate?: Date): Date;
}

declare module 'libphonenumber-js' {
  export function parsePhoneNumberFromString(phoneNumber: string, defaultCountry?: string): {
    isValid(): boolean;
    formatInternational(): string;
    getType(): string;
  } | undefined;
}

declare module 'email-validator' {
  export function validate(email: string): boolean;
}