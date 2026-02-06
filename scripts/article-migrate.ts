/**
 * Article Content Migration Script
 *
 * 该脚本用于将 content/articles 目录下的 Markdown 文章内容
 * 迁移到数据库的 Article.content 字段中。
 *
 * 使用前确保：
 * 1. 已运行 `pnpm prisma:push` 同步数据库 schema
 * 2. 已运行 `pnpm prisma:generate` 生成 Prisma Client
 *
 * 使用方式：
 * pnpm tsx scripts/article-migrate.ts
 */

import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import { PrismaPg } from '@prisma/adapter-pg'
import { config } from 'dotenv'
import { PrismaClient } from '../prisma/generated/client'

// 加载环境变量
config()

// 初始化 Prisma Client
const connectionString = process.env.HANA_DATABASE_URL
if (!connectionString) {
  console.error('❌ 环境变量 HANA_DATABASE_URL 未设置')
  process.exit(1)
}

const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// 文章目录路径
const ARTICLES_DIR = path.resolve(process.cwd(), 'content/articles')

// Frontmatter 分隔符
const FRONTMATTER_DELIMITER = '---'

interface ParsedArticle {
  filename: string
  title: string | null
  content: string
}

/**
 * 解析 Markdown 文件，分离 frontmatter 和正文内容
 *
 * @param filePath 文件路径
 * @returns 解析后的文章对象
 */
function parseMarkdownFile(filePath: string): ParsedArticle {
  const filename = path.basename(filePath)
  const raw = fs.readFileSync(filePath, 'utf-8')

  // 查找 frontmatter 的起始和结束位置
  // Frontmatter 格式: 文件开头的 --- 和第二个 ---
  if (!raw.startsWith(FRONTMATTER_DELIMITER)) {
    // 没有 frontmatter，整个文件就是内容
    return {
      filename,
      title: null,
      content: raw,
    }
  }

  // 找到第二个 ---
  const secondDelimiterIndex = raw.indexOf(
    FRONTMATTER_DELIMITER,
    FRONTMATTER_DELIMITER.length,
  )

  if (secondDelimiterIndex === -1) {
    // 没有找到结束的 ---，整个文件就是内容
    return {
      filename,
      title: null,
      content: raw,
    }
  }

  // 提取 frontmatter 部分
  const frontmatterRaw = raw.slice(
    FRONTMATTER_DELIMITER.length,
    secondDelimiterIndex,
  )

  // 提取正文内容（去除 frontmatter 后的部分）
  // 需要跳过 frontmatter 结束的 --- 后面的换行符
  let contentStartIndex = secondDelimiterIndex + FRONTMATTER_DELIMITER.length

  // 跳过紧跟在 --- 后面的换行符（保持正文原始格式）
  if (raw[contentStartIndex] === '\n') {
    contentStartIndex++
  }
  else if (raw[contentStartIndex] === '\r' && raw[contentStartIndex + 1] === '\n') {
    contentStartIndex += 2
  }

  const content = raw.slice(contentStartIndex)

  // 解析 frontmatter 中的 title
  let title: string | null = null
  const lines = frontmatterRaw.split('\n')
  for (const line of lines) {
    if (line.startsWith('title:')) {
      title = line.slice('title:'.length).trim()
      // 移除可能的引号
      if ((title.startsWith('"') && title.endsWith('"'))
        || (title.startsWith('\'') && title.endsWith('\''))) {
        title = title.slice(1, -1)
      }
      break
    }
  }

  return {
    filename,
    title,
    content,
  }
}

/**
 * 获取所有文章文件路径
 */
function getArticleFiles(): string[] {
  const files = fs.readdirSync(ARTICLES_DIR)
  return files
    .filter(file => file.endsWith('.md'))
    .map(file => path.join(ARTICLES_DIR, file))
    .sort()
}

/**
 * 主迁移函数
 */
async function migrate() {
  console.log('🚀 开始文章内容迁移...\n')

  const articleFiles = getArticleFiles()
  console.log(`📁 发现 ${articleFiles.length} 篇文章\n`)

  let successCount = 0
  let skipCount = 0
  let errorCount = 0

  for (const filePath of articleFiles) {
    const parsed = parseMarkdownFile(filePath)

    if (!parsed.title) {
      console.log(`⚠️  [${parsed.filename}] 未找到 title，跳过`)
      skipCount++
      continue
    }

    try {
      // 根据 title 查找数据库中的文章
      const article = await prisma.article.findUnique({
        where: { title: parsed.title },
      })

      if (!article) {
        console.log(`⚠️  [${parsed.filename}] 未在数据库中找到 title="${parsed.title}"，跳过`)
        skipCount++
        continue
      }

      // 更新 content 字段
      await prisma.article.update({
        where: { id: article.id },
        data: { content: parsed.content },
      })

      console.log(`✅ [${parsed.filename}] 成功更新 -> "${parsed.title}"`)
      successCount++
    }
    catch (error) {
      console.error(`❌ [${parsed.filename}] 更新失败:`, error)
      errorCount++
    }
  }

  console.log('\n📊 迁移统计:')
  console.log(`   ✅ 成功: ${successCount}`)
  console.log(`   ⚠️  跳过: ${skipCount}`)
  console.log(`   ❌ 失败: ${errorCount}`)
  console.log(`   📁 总计: ${articleFiles.length}`)
}

// 执行迁移
migrate()
  .catch((error) => {
    console.error('❌ 迁移过程中发生错误:', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
    console.log('\n🔌 数据库连接已关闭')
  })
