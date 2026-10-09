import type { AdminLocale, Localized } from "./admin-locale";

export type AdminPasswordResetResult = {
  accepted?: boolean;
  emailSent?: boolean;
  deliveryError?: string;
};

export type AdminUsersNotice = {
  intent: "success" | "warning" | "danger";
  message: string;
};

const resetNoticeCopy: Localized<{
  sent: string;
  acceptedNoDelivery: string;
  notSent: string;
}> = {
  ru: {
    sent: "Ссылка сброса отправлена. Токен не показывается.",
    acceptedNoDelivery: "Запрос сброса принят, но доставка письма не подтверждена. Токен не показывается.",
    notSent: "Ссылка сброса не отправлена.",
  },
  en: {
    sent: "Reset link sent. The token is not displayed.",
    acceptedNoDelivery: "Reset request accepted, but email delivery was not confirmed. The token is not displayed.",
    notSent: "Reset link was not sent.",
  },
};

export function passwordResetNotice(result: AdminPasswordResetResult, locale: AdminLocale): AdminUsersNotice {
  const copy = resetNoticeCopy[locale];
  if (result.emailSent === true) return { intent: "success", message: copy.sent };
  if (result.accepted === true && !result.deliveryError) return { intent: "warning", message: copy.acceptedNoDelivery };
  return { intent: "danger", message: result.deliveryError ? `${copy.notSent} ${result.deliveryError}` : copy.notSent };
}
