export interface ArticleListQuery {
  page?: string
  pageSize?: string
  tag?: string
  category?: string
  publishedAtMonth?: string
}

export interface ArticleFilterQuery {
  tag?: string
  category?: string
  publishedAtMonth?: string
}
