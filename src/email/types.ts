export interface EmailTemplate {
  subject: string;
  text: string;
  html: string;
}

export interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  text: string;
  html: string;
}

export type EmailSendResult =
  | {
      success: true;
    }
  | {
      success: false;
      error: string;
    };
