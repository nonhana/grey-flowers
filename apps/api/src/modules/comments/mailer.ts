import { Resend } from 'resend';

import type { ApiEnvironment } from '@/env.js';

/**
 * 站点名/站点址：API 不可 import 主站 #shared/data/meta，改为模块常量
 * （与 env.ts 中 productionOrigins 的硬编码同源同例），可选 env 覆盖不在此列。
 */
const SITE_NAME = 'GreyFlowers';
const SITE_URL = 'https://caelum.moe';

interface MailContext {
  receiverEmail: string;
  receiverName?: string;
  replierName: string;
  commentContent: string;
  repliedContent?: string;
  pagePath: string;
  siteUrl?: string;
}

/**
 * 评论回复邮件。环境键为 `HANA_MAIL_ENABLE`（与 .env.example / deploy 一致）；
 * Resend 客户端按需惰性初始化；发送失败由调用方 best-effort 吞错，不阻断评论/通知主流程。
 */
export class CommentMailer {
  private readonly mailEnable: boolean;
  private resendClient: Resend | null = null;

  constructor(private readonly environment: ApiEnvironment) {
    this.mailEnable = environment.HANA_MAIL_ENABLE === 'true';
  }

  private getResend(): Resend | null {
    if (!this.mailEnable) return null;
    const apiKey = this.environment.RESEND_API_KEY;
    if (!apiKey) return null;
    if (!this.resendClient) this.resendClient = new Resend(apiKey);
    return this.resendClient;
  }

  private escapeHtml(str: string) {
    if (!str) return '';
    return str
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  private renderHtml(ctx: MailContext) {
    const siteName = SITE_NAME;
    const siteUrl = ctx.siteUrl || SITE_URL;
    const pageUrl = `${siteUrl}${ctx.pagePath}`;
    const title = `你在 ${siteName} 的评论有新回复`;

    const colors = {
      pageBg: '#f0f9ff', // hanaBlue.50
      cardBg: '#ffffff',
      text: '#374151', // hanaBlue.800
      title: '#2e64d7', // hanaBlue.600
      link: '#3b82f6', // hanaBlue.500 (DEFAULT)
      quoteBg: '#eff6ff', // hanaBlue.100
      quoteBorder: '#3b82f6', // hanaBlue.500
      footerText: '#4b5563', // hanaBlue.700
      divider: '#e5e7eb',
    };

    const styles = {
      body: `margin: 0; padding: 0; width: 100%; background-color: ${colors.pageBg};`,
      emailContainer: `max-width: 600px; margin: 0 auto;`,
      card: `background-color: ${colors.cardBg}; margin: 40px auto; padding: 32px; border-radius: 8px;`,
      h1: `color: ${colors.title}; font-size: 24px; font-weight: 600; margin: 0 0 24px;`,
      p: `margin: 0 0 16px;`,
      strong: `font-weight: 600;`,
      quote: `margin: 16px 0; padding: 16px; background-color: ${colors.quoteBg}; border-left: 4px solid ${colors.quoteBorder};`,
      quoteP: `margin: 0; font-style: italic;`,
      button: `display: inline-block; background-color: ${colors.link}; color: #ffffff; font-size: 16px; font-weight: 500; text-decoration: none; padding: 14px 28px; border-radius: 6px;`,
      hr: `margin: 32px 0; border: none; border-top: 1px solid ${colors.divider};`,
      footer: `font-size: 12px; color: ${colors.footerText}; text-align: center;`,
    };

    const fontFamily = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'`;

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${this.escapeHtml(title)}</title>
  <style>
    body { font-family: ${fontFamily}; color: ${colors.text}; line-height: 1.6; }
  </style>
</head>
<body style="${styles.body}">
  <!--[if mso | IE]>
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" align="center" style="width: 600px;">
    <tr>
      <td style="line-height: 0px; font-size: 0px; mso-line-height-rule: exactly;">
  <![endif]-->
  <div style="${styles.emailContainer}">
    <div style="${styles.card}">
      <h1 style="${styles.h1}">${this.escapeHtml(title)}</h1>
      <p style="${styles.p}">Hi${ctx.receiverName ? `，<strong style="${styles.strong}">${this.escapeHtml(ctx.receiverName)}</strong>` : ''}：</p>
      <p style="${styles.p}">
        <strong style="${styles.strong}">${this.escapeHtml(ctx.replierName)}</strong> 刚刚回复了你的评论：
      </p>

      ${
        ctx.repliedContent
          ? `
      <!-- Original Comment Block -->
      <div style="${styles.quote}">
        <p style="${styles.quoteP}">${this.escapeHtml(ctx.repliedContent)}</p>
      </div>
      `
          : ''
      }

      <p style="${styles.p}">Ta 的回复内容：</p>

      <!-- New Reply Block -->
      <div style="${styles.quote}">
        <p style="${styles.quoteP}">${this.escapeHtml(ctx.commentContent)}</p>
      </div>

      <p style="${styles.p}">点击下方按钮查看详情并继续交流：</p>

      <!-- CTA Button -->
      <a href="${pageUrl}#comments" target="_blank" style="${styles.button}">
        前往查看回复
      </a>

      <hr style="${styles.hr}"/>

      <div style="${styles.footer}">
        <p style="margin: 0 0 4px;">这是一封来自 <a href="${siteUrl}" target="_blank" style="color: ${colors.footerText};">${siteName}</a> 的自动通知邮件，请勿直接回复。</p>
      </div>
    </div>
  </div>
  <!--[if mso | IE]>
      </td>
    </tr>
  </table>
  <![endif]-->
</body>
</html>
  `;
  }

  async sendCommentReplyMail(ctx: MailContext) {
    const resend = this.getResend();
    if (!resend) {
      return { skipped: true };
    }

    const from =
      this.environment.RESEND_FROM || 'GreyFlowers <no-reply@caelum.moe>';
    const subject = '你的评论有新回复 | GreyFlowers';
    const html = this.renderHtml(ctx);

    const { data, error } = await resend.emails.send({
      from,
      to: ctx.receiverEmail,
      subject,
      html,
    });

    if (error) {
      throw new Error('Comment reply mail send failed', { cause: error });
    }

    return { skipped: false, messageId: data?.id };
  }
}

export type { MailContext };
