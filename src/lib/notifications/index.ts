export type SendResult = { ok: boolean; providerMessageId?: string; error?: string };

export type LeadNotificationInput = {
  channel: "KAKAO_ALIMTALK" | "EMAIL";
  to: string;
  projectName: string;
  leadName: string;
  leadPhone: string;
  unitType?: string;
  inquiry?: string;
  submittedAt: string;
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
    console.info("[sandbox-notify] lead", { channel: input.channel, to: redact(input.to), projectName: input.projectName });
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
