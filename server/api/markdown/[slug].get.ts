import { getStaticMarkdownPage, isStaticMarkdownPageSlug } from '~/server/utils/markdown'

export default formattedEventHandler(async (event) => {
  const slug = getRouterParam(event, 'slug')

  if (!isStaticMarkdownPageSlug(slug)) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Markdown page not found',
    })
  }

  const payload = await getStaticMarkdownPage(slug)
  return { payload }
})
