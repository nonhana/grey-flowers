export interface ArticleListQuery {
  page?: string
  pageSize?: string
  tag?: string
  category?: string
  publishedAtMonth?: string
}

export interface ArticleCountQuery {
  tag?: string
  category?: string
  publishedAtMonth?: string
}
