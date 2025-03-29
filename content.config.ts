import { defineCollection, defineContentConfig, z } from '@nuxt/content'

export default defineContentConfig({
  collections: {
    content: defineCollection({
      type: 'page',
      source: '**/*.md',
      schema: z.object({
        // corresponding schema applied
        // https://content.nuxt.com/docs/collections/types#schema-overrides
        path: z.string(),
        title: z.string(),
        description: z.string(),
        seo: z
          .intersection(
            z.object({
              title: z.string().optional(),
              description: z.string().optional(),
              meta: z.array(z.record(z.string(), z.any())).optional(),
              link: z.array(z.record(z.string(), z.any())).optional(),
            }),
            z.record(z.string(), z.any()),
          )
          .optional()
          .default({}),
        body: z.object({
          type: z.string(),
          children: z.any(),
          toc: z.any(),
        }),
        navigation: z
          .union([
            z.boolean(),
            z.object({
              title: z.string(),
              description: z.string(),
              icon: z.string(),
            }),
          ])
          .default(true),

        // Content schema
        cover: z.string(),
        alt: z.string(),
        ogImage: z.string(),
        tags: z.array(z.string()),
        category: z.string(),
        publishedAt: z.date(),
        editedAt: z.date(),
        published: z.boolean(),
        wordCount: z.number(),
      }),
    }),
  },
})
