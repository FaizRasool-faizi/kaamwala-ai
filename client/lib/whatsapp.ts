import type { ProviderOption } from "@/store/useOrchestratorStore";

export type BookingWhatsAppInput = {
  expert: Pick<ProviderOption, "name" | "phone">;
  customerName: string;
  dateLabel: string;
  timeLabel: string;
  service: string;
  bookingId: string;
};

export function normalizeWhatsAppNumber(phone: string, defaultCountryCode = "92"): string {
  let digits = String(phone || "").replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0") && digits.length === 11) {
    return `${defaultCountryCode}${digits.slice(1)}`;
  }

  if (digits.length === 10 && !digits.startsWith(defaultCountryCode)) {
    return `${defaultCountryCode}${digits}`;
  }

  return digits;
}

export function isValidWhatsAppNumber(phone: string): boolean {
  const normalized = normalizeWhatsAppNumber(phone);
  return /^\d{11,15}$/.test(normalized);
}

export function buildBookingWhatsAppMessage(input: BookingWhatsAppInput): string {
  return [
    `Hi ${input.expert.name},`,
    "",
    "I want to book a consultation.",
    "",
    "Booking Details:",
    `- User Name: ${input.customerName}`,
    `- Date: ${input.dateLabel}`,
    `- Time: ${input.timeLabel}`,
    `- Service: ${input.service}`,
    `- Booking ID: ${input.bookingId}`,
  ].join("\n");
}

export function buildWhatsAppUrl(input: BookingWhatsAppInput): string {
  const phone = normalizeWhatsAppNumber(input.expert.phone || "");
  const message = buildBookingWhatsAppMessage(input);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

export function buildWhatsAppFallbackUrl(input: BookingWhatsAppInput): string {
  const message = buildBookingWhatsAppMessage(input);
  return `https://web.whatsapp.com/send?phone=${normalizeWhatsAppNumber(
    input.expert.phone || ""
  )}&text=${encodeURIComponent(message)}`;
}
