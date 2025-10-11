import dayjs from 'dayjs'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { useZodVerify } from '~/server/composables/useZodVerify'

const verifySchema = z.object({
  title: z.string().min(1, { message: 'Title must not be empty' }).max(128, { message: 'Title must not exceed 128 characters' }),
  content: z.string().min(1, { message: 'Content must not be empty' }).max(2048, { message: 'Content must not exceed 2048 characters' }),
  images: z.array(z.string()).max(4, { message: 'Images must not exceed 10' }).optional(),
  music: z.array(
    z.object({
      title: z.string().min(1, 'Music title must not be empty'),
      src: z.url('Not a valid link'),
      seconds: z.number().min(1, 'Music cannot be without duration'),
      albumTitle: z.string().min(1, 'Music album title must not be empty'),
      albumCover: z.url('Not a valid link'),
      albumDescription: z.string().optional(),
    }),
  ).optional(),
})

export default formattedEventHandler(async (event) => {
  const body = await readBody(event)
  const { success, errorList, result } = useZodVerify(verifySchema, body)
  if (!success) {
    return {
      statusCode: 400,
      statusMessage: 'Invalid request body',
      error: errorList,
      success: false,
    }
  }

  const { title, content, images, music } = result

  const musicIds: number[] = []
  if (music) {
    for (const item of music) {
      let targetAlbum = await prisma.album.findFirst({
        where: {
          title: item.albumTitle,
        },
      })
      if (!targetAlbum) {
        targetAlbum = await prisma.album.create({
          data: {
            title: item.albumTitle,
            cover: item.albumCover,
            description: item.albumDescription,
          },
        })
      }
      const newMusic = await prisma.music.create({
        data: {
          title: item.title,
          src: item.src,
          seconds: item.seconds,
          albumId: targetAlbum.id,
        },
      })
      musicIds.push(newMusic.id)
    }
  }

  const newItem = await prisma.activity.create({
    data: {
      title,
      content,
      images,
      music: {
        connect: musicIds.map(id => ({ id })),
      },
    },
    select: {
      id: true,
      title: true,
      content: true,
      images: true,
      music: {
        select: {
          id: true,
          title: true,
          seconds: true,
          album: {
            select: {
              title: true,
              cover: true,
              description: true,
            },
          },
        },
      },
      publishedAt: true,
      editedAt: true,
    },
  })

  const formattedItem = {
    ...newItem!,
    commentCount: 0,
    publishedAt: dayjs(newItem!.publishedAt).format('YYYY-MM-DD HH:mm:ss'),
    editedAt: dayjs(newItem!.editedAt).format('YYYY-MM-DD HH:mm:ss'),
  }

  return { payload: formattedItem }
})
