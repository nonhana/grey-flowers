import type { Ref } from 'vue'
import { ref } from 'vue'

export default function useImgViewer(
  imgRef: Ref<HTMLImageElement | null>, // 图片 DOM
  props: {
    imgUrl: string
    maskBgColor: string
    animationDuration: number
  },
) {
  const maskRef = ref<HTMLDivElement | null>(null) // 遮罩层 DOM
  const imgCopyRef = ref<HTMLImageElement | null>(null) // 大图 DOM

  const {
    handleWheel, // 绑 window
    handleTouchStart, // 绑 window
    handleDblclick, // 绑 imgCopyRef
    handleMouseDown, // 绑 imgCopyRef
    initMover,
  } = useTransformer(imgCopyRef)

  // 生成遮罩层
  const generateMask = (cb: () => void): void => {
    const mask = document.createElement('div')
    setStyles(mask, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0)',
      zIndex: '999',
      transition: `all ${props.animationDuration / 1000}s`,
    })

    document.body.appendChild(mask)

    requestAnimationFrame(() => {
      mask.style.backgroundColor = props.maskBgColor
    })

    mask.onclick = cb
    maskRef.value = mask
  }

  // 生成新的大图
  const generateNewImg = (): void => {
    if (!imgRef.value)
      return

    const img = document.createElement('img')
    img.src = imgRef.value.src
    img.draggable = false

    const rect = imgRef.value.getBoundingClientRect()
    const imgAspectRatio = rect.width / rect.height
    const windowAspectRatio = window.innerWidth / window.innerHeight
    const scrollX = window.scrollX || document.documentElement.scrollLeft
    const scrollY = window.scrollY || document.documentElement.scrollTop

    setStyles(img, {
      position: 'absolute',
      width: imgAspectRatio > windowAspectRatio ? `${rect.width}px` : 'auto',
      height: imgAspectRatio > windowAspectRatio ? 'auto' : `${rect.height}px`,
      objectFit: 'cover',
      top: `${rect.top + scrollY}px`,
      left: `${rect.left + scrollX}px`,
      zIndex: '1000',
      transition: `all ${props.animationDuration / 1000}s`,
      cursor: 'grab',
    })

    document.body.appendChild(img)

    setTimeout(() => {
      setStyles(img, { transition: 'none' })
    }, props.animationDuration)

    requestAnimationFrame(() => {
      setStyles(img, {
        width: imgAspectRatio > windowAspectRatio ? '80vw' : 'auto',
        height: imgAspectRatio > windowAspectRatio ? 'auto' : '80vh',
        top: `calc(50vh + ${scrollY}px)`,
        left: '50%',
        transform: 'translate(-50%, -50%)',
      })
    })

    img.ondblclick = handleDblclick
    img.onmousedown = handleMouseDown

    imgCopyRef.value = img
  }

  // 清除所有生成的 DOM
  const clearDOM = () => {
    if (maskRef.value && imgCopyRef.value && imgRef.value) {
      const rect = imgRef.value.getBoundingClientRect()
      const scrollX = window.scrollX || document.documentElement.scrollLeft
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const imgAspectRatio = rect.width / rect.height
      const windowAspectRatio = window.innerWidth / window.innerHeight

      maskRef.value.style.backgroundColor = 'rgba(0, 0, 0, 0)'

      setStyles(imgCopyRef.value, {
        transition: `all ${props.animationDuration / 1000}s`,
      })

      requestAnimationFrame(() => {
        setStyles(imgCopyRef.value!, {
          transform: 'none',
          width:
            imgAspectRatio > windowAspectRatio ? `${rect.width}px` : 'auto',
          height:
            imgAspectRatio > windowAspectRatio ? 'auto' : `${rect.height}px`,
          top: `${rect.top + scrollY}px`,
          left: `${rect.left + scrollX}px`,
        })
      })

      setTimeout(() => {
        maskRef.value?.remove()
        imgCopyRef.value?.remove()
        maskRef.value = null
        imgCopyRef.value = null
        initMover()
      }, props.animationDuration)
    }
  }

  return {
    generateMask,
    generateNewImg,
    clearDOM,
    handleWheel,
    handleTouchStart,
  }
}
