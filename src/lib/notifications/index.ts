import { appConfig } from "@/lib/config";

export type SendResult = { ok: boolean; providerMessageId?: string; error?: string };

/** 로컬이거나 메일 샌드박스일 때 초대·인증·재설정 링크를 관리자 UI에 돌려줍니다. */
export function shouldExposeSandboxLinks() {
  return appConfig.env === "local" || appConfig.emailProvider === "sandbox";
}

export type LeadNotificationInput = {
  channel: "KAKAO_ALIMTALK" | "EMAIL";
  to: string;
  projectName: string;
  leadName: string;
  leadPhone: string;
  unitType?: string;
  inquiry?: string;
  details?: string;
  submittedAt: string;
  purposeDisclaimer?: string;
};

export type ExpiryNotificationInput = {
  channel: "KAKAO_ALIMTALK" | "EMAIL";
  to: string;
  projectName: string;
  publicUrl: string;
  expiresAt: string;
  remainingDays: number;
};

export interface NotificationProvider {
  sendLeadNotification(input: LeadNotificationInput): Promise<SendResult>;
  sendExpiryNotification(input: ExpiryNotificationInput): Promise<SendResult>;
  sendInviteEmail(input: { to: string; inviteUrl: string; organizationName: string }): Promise<SendResult>;
  sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<SendResult>;
  sendRecipientVerify(input: { channel: "EMAIL" | "KAKAO_ALIMTALK"; to: string; verifyUrl: string }): Promise<SendResult>;
}

export class SandboxNotificationProvider implements NotificationProvider {
  async sendLeadNotification(input: LeadNotificationInput): Promise<SendResult> {
    console.info("[sandbox-notify] lead", {
      channel: input.channel,
      to: redact(input.to),
      projectName: input.projectName,
      purposeDisclaimer: input.purposeDisclaimer,
    });
    return { ok: true, providerMessageId: `sandbox-${Date.now()}` };
  }
  async sendExpiryNotification(input: ExpiryNotificationInput): Promise<SendResult> {
    console.info("[sandbox-notify] expiry", { channel: input.channel, to: redact(input.to), projectName: input.projectName });
    return { ok: true, providerMessageId: `sandbox-${Date.now()}` };
  }
  async sendInviteEmail(input: { to: string; inviteUrl: string; organizationName: string }): Promise<SendResult> {
    console.info("[sandbox-notify] invite", { to: redact(input.to), inviteUrl: input.inviteUrl });
    return { ok: true, providerMessageId: `sandbox-${Date.now()}` };
  }
  async sendPasswordResetEmail(input: { to: string; resetUrl: string }): Promise<SendResult> {
    console.info("[sandbox-notify] reset", { to: redact(input.to) });
    return { ok: true, providerMessageId: `sandbox-${Date.now()}` };
  }
  async sendRecipientVerify(input: { channel: "EMAIL" | "KAKAO_ALIMTALK"; to: string; verifyUrl: string }): Promise<SendResult> {
    console.info("[sandbox-notify] verify", { channel: input.channel, to: redact(input.to), verifyUrl: input.verifyUrl });
    return { ok: true, providerMessageId: `sandbox-${Date.now()}` };
  }
}

function redact(value: string) {
  if (value.includes("@")) {
    const [local, domain] = value.split("@");
    return `${local.slice(0, 1)}***@${domain}`;
  }
  return `${value.slice(0, 3)}****`;
}

export const notificationProvider: NotificationProvider = new SandboxNotificationProvider();
