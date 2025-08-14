import { Resend } from 'resend'
import { seoData } from '~/data/meta'
import env from '~/server/env/dotenv'

interface MailContext {
  receiverEmail: string
  receiverName?: string
  replierName: string
  commentContent: string
  repliedContent?: string
  pagePath: string
  siteUrl?: string
}

const MAIL_ENABLE = env.HANA_MAIL_ENABLE === 'true'

let resendClient: Resend | null = null
function getResend() {
  if (!MAIL_ENABLE)
    return null
  const apiKey = env.RESEND_API_KEY
  if (!apiKey)
    return null
  if (!resendClient)
    resendClient = new Resend(apiKey)
  return resendClient
}

function escapeHtml(str: string) {
  if (!str)
    return ''
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function renderHtml(ctx: MailContext) {
  const siteName = seoData.siteName
  const siteUrl = ctx.siteUrl || seoData.mySite
  const pageUrl = `${siteUrl}${ctx.pagePath}`
  const title = `你在 ${siteName} 的评论有新回复`

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
  }

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
  }

  const fontFamily = `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji'`

  return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>${escapeHtml(title)}</title>
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
      <h1 style="${styles.h1}">${escapeHtml(title)}</h1>
      <p style="${styles.p}">Hi${ctx.receiverName ? `，<strong style="${styles.strong}">${escapeHtml(ctx.receiverName)}</strong>` : ''}：</p>
      <p style="${styles.p}">
        <strong style="${styles.strong}">${escapeHtml(ctx.replierName)}</strong> 刚刚回复了你的评论：
      </p>

      ${ctx.repliedContent
        ? `
      <!-- Original Comment Block -->
      <div style="${styles.quote}">
        <p style="${styles.quoteP}">${escapeHtml(ctx.repliedContent)}</p>
      </div>
      `
        : ''}

      <p style="${styles.p}">Ta 的回复内容：</p>

      <!-- New Reply Block -->
      <div style="${styles.quote}">
        <p style="${styles.quoteP}">${escapeHtml(ctx.commentContent)}</p>
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
  `
}

export async function sendCommentReplyMail(ctx: MailContext) {
  const resend = getResend()
  if (!resend) {
    return { skipped: true }
  }

  const from = env.RESEND_FROM || 'GreyFlowers <no-reply@caelum.moe>'
  const subject = '你的评论有新回复 | GreyFlowers'
  const html = renderHtml(ctx)

  const { data, error } = await resend.emails.send({
    from,
    to: ctx.receiverEmail,
    subject,
    html,
  })

  if (error)
    throw error

  return { skipped: false, messageId: data?.id }
}

export type { MailContext }
