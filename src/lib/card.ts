export function digitsOnly(value: string) {
  return value.replace(/\D/g, "");
}

export function formatCardNumber(value: string) {
  const digits = digitsOnly(value).slice(0, 19);
  if (digits.startsWith("34") || digits.startsWith("37")) {
    return digits.replace(/(\d{4})(\d{0,6})(\d{0,5})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    );
  }
  return digits.replace(/(\d{4})(?=\d)/g, "$1 ").trim();
}

export function luhnOk(num: string) {
  const digits = digitsOnly(num);
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let alt = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let n = Number(digits[i]);
    if (alt) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    alt = !alt;
  }
  return sum % 10 === 0;
}

export function cardBrand(num: string) {
  const digits = digitsOnly(num);
  if (/^4/.test(digits)) return "visa";
  if (/^3[47]/.test(digits)) return "amex";
  if (/^5[1-5]/.test(digits) || /^2[2-7]/.test(digits)) return "mastercard";
  if (/^6(?:011|5)/.test(digits)) return "discover";
  return "card";
}

export function expiryValid(month: number, year: number) {
  if (month < 1 || month > 12) return false;
  const now = new Date();
  const y = year < 100 ? 2000 + year : year;
  const exp = new Date(y, month, 1);
  return exp > now;
}

export type ParsedCard = {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
};

export function parseCardInput(input: {
  cardNumber: string;
  expMonth: number;
  expYear: number;
  cvc: string;
  cardholder: string;
  postal: string;
}): ParsedCard {
  const number = digitsOnly(input.cardNumber);
  if (!luhnOk(number)) throw new Error("That card number is not valid.");
  if (!expiryValid(input.expMonth, input.expYear)) {
    throw new Error("That card is expired.");
  }
  const amex = number.startsWith("34") || number.startsWith("37");
  const cvc = digitsOnly(input.cvc);
  if (amex ? cvc.length !== 4 : cvc.length !== 3) {
    throw new Error("Check the security code.");
  }
  if (input.cardholder.trim().length < 2) throw new Error("Name on card is required.");
  if (input.postal.trim().length < 3) throw new Error("Billing postal code is required.");
  return {
    brand: cardBrand(number),
    last4: number.slice(-4),
    expMonth: input.expMonth,
    expYear: input.expYear < 100 ? 2000 + input.expYear : input.expYear,
  };
}
