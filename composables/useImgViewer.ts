export default function useImgViewer(imgRef: Ref<HTMLImageElement | null>) {
  const maskRef = ref<HTMLDivElement | null>(null)
  const imgCopyRef = ref<HTMLImageElement | null>(null)

  const {
    handleWheel,
    handleTouchStart,
    handleDblclick,
    handleMouseDown,
    initMover,
  } = useTransformer(imgCopyRef)

  const generateMask = (cb: () => void): void => {
    const mask = document.createElement('div')
    setStyles(mask, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      backgroundColor: 'black',
      opacity: '0',
      zIndex: '999',
      transition: 'all 0.5s',
    })

    document.body.appendChild(mask)

    requestAnimationFrame(() => {
      setStyles(mask, { opacity: '0.1' })
    })

    mask.onclick = cb
    maskRef.value = mask
  }

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
      transition: 'all 0.5s',
      cursor: 'grab',
    })

    document.body.appendChild(img)

    setTimeout(() => {
      setStyles(img, { transition: 'none' })
    }, 500)

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

  const clearDOM = () => {
    if (maskRef.value && imgCopyRef.value && imgRef.value) {
      setStyles(maskRef.value, { opacity: '0' })
      setStyles(imgCopyRef.value, { transition: 'all 0.5s' })

      const rect = imgRef.value.getBoundingClientRect()
      const scrollX = window.scrollX || document.documentElement.scrollLeft
      const scrollY = window.scrollY || document.documentElement.scrollTop
      const imgAspectRatio = rect.width / rect.height
      const windowAspectRatio = window.innerWidth / window.innerHeight

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
      }, 500)
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
