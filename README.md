![grey-flowers](https://static-r2.caelum.moe/grey-flowers.webp)

# Grey Flowers

Even in a gray world, flowers bloom as usual.

## Tech Stack

Built with:

- [Nuxt3](https://nuxt.com)
- [Vue3](https://vuejs.org)
- [Nuxt Content2](https://content.nuxt.com)
- [TailwindCSS](https://tailwindcss.com)
- [Prisma](https://prisma.io)
- [PostgreSQL](https://postgresql.org)

## 邮件通知（评论被回复）

可选功能：当用户评论被回复时发送邮件提醒。

1. 复制 `.env.example` 到 `.env` 并配置以下变量：

```bash
HANA_MAIL_ENABLE=true
HANA_SMTP_HOST=smtp.example.com
HANA_SMTP_PORT=465
HANA_SMTP_USER=your_smtp_user
HANA_SMTP_PASS=your_smtp_password_or_app_password
# 可选
HANA_MAIL_FROM="GreyFlowers <no-reply@example.com>"
```

常见提供商：
- Gmail: host=smtp.gmail.com port=465（需 App Password）
- Outlook: host=smtp.office365.com port=587
- QQ 邮箱: host=smtp.qq.com port=465（需授权码）

2. 服务器端会在创建“站内消息”时自动触发邮件发送（接口：`/api/user/send-message`）。若未配置或关闭，将静默跳过，不影响接口响应。
