import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'
import readline from 'node:readline'

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

let articleTitle = ''
let filename = ''

rl.question('Enter the article title: ', (title) => {
  articleTitle = title
  rl.question('Enter the article filename: ', (file) => {
    filename = `${file.trim().replace(/ /g, '-').toLowerCase()}.md`
    rl.close()
  })
})

rl.on('close', () => {
  const articlesDir = path.resolve('content/articles')
  const files = fs.readdirSync(articlesDir)
  const id = files.length + 1
  filename = `${id}.${filename}`
  const newArticlePath = path.join(articlesDir, filename)

  const draftPath = path.resolve('scripts/draft.md')
  const draft = fs.readFileSync(draftPath, 'utf-8')
  const now = formatDate()
  const content = draft.replace(/\{\{ title \}\}/g, articleTitle).replace(/\{\{ date \}\}/g, now)

  fs.writeFileSync(newArticlePath, content)

  console.log(`New article created at ${newArticlePath}`)
})

function formatDate() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0') // 月份从0开始
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}
