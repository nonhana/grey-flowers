import nodemailer from 'nodemailer'
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

function getTransport() {
  if (!MAIL_ENABLE)
    return null
  const host = env.HANA_SMTP_HOST
  const port = env.HANA_SMTP_PORT ? Number(env.HANA_SMTP_PORT) : undefined
  const user = env.HANA_SMTP_USER
  const pass = env.HANA_SMTP_PASS
  if (!host || !port || !user || !pass)
    return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: { user, pass },
  })
}

function renderHtml(ctx: MailContext) {
  const site = ctx.siteUrl || seoData.mySite
  const pageUrl = `${site}${ctx.pagePath}`
  const title = '你在 GreyFlowers 的评论有新回复'
  return `
  <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, 'Apple Color Emoji', 'Segoe UI Emoji'; line-height: 1.6; color: #111;">
    <h2 style="margin: 0 0 12px;">${title}</h2>
    <p>Hi${ctx.receiverName ? `，${ctx.receiverName}` : ''}：</p>
    <p><strong>${ctx.replierName}</strong> 刚刚回复了你的评论：</p>
    ${ctx.repliedContent ? `<blockquote style="margin: 8px 0; padding: 8px 12px; background: #f6f8fa; border-left: 3px solid #3b82f6;">${escapeHtml(ctx.repliedContent)}</blockquote>` : ''}
    <p style="margin: 12px 0 4px;">Ta 的回复：</p>
    <blockquote style="margin: 8px 0; padding: 8px 12px; background: #f6f8fa; border-left: 3px solid #3b82f6;">${escapeHtml(ctx.commentContent)}</blockquote>
    <p>点击下方链接查看详情并继续交流：</p>
    <p><a href="${pageUrl}#comments" style="color: #2563eb;">${pageUrl}#comments</a></p>
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;"/>
    <p style="color:#6b7280; font-size: 12px;">这是一封自动通知邮件，请勿直接回复。若不想再接收此类提醒，请在站内消息设置中关闭（开发占位）。</p>
  </div>
  `
}

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function sendCommentReplyMail(ctx: MailContext) {
  const transport = getTransport()
  if (!transport) {
    // 未配置则静默跳过
    return { skipped: true }
  }

  const from = env.HANA_MAIL_FROM || `GreyFlowers <${env.HANA_SMTP_USER}>`
  const subject = '你的评论有新回复 | GreyFlowers'
  const html = renderHtml(ctx)

  const info = await transport.sendMail({
    from,
    to: ctx.receiverEmail,
    subject,
    html,
  })
  return { skipped: false, messageId: info.messageId }
}

export type { MailContext }
