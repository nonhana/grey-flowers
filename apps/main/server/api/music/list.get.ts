import { musicTrackSchema } from '@grey-flowers/contracts'
import { z } from 'zod'

const MAX_IDS = 20

const idsQuerySchema = z.object({
  ids: z.string()
    .transform(value => value.split(',').map(item => Number(item.trim())))
    .pipe(z.array(z.number().int().positive()).min(1).max(MAX_IDS)),
})

export default formattedEventHandler(async (event) => {
  const { ids } = parsePublicQuery(idsQuerySchema, getQuery(event))

  const tracks = await Promise.all([...new Set(ids)].map(async (id) => {
    try {
      return await apiGet(`/public/music/${id}`, undefined, musicTrackSchema)
    }
    catch (error) {
      if (isApiNotFound(error))
        return null
      throw error
    }
  }))

  return { payload: tracks.filter(track => track !== null) }
})
