export interface OptimizedScreenshot {
  name: string
  dataUrl: string
  originalBytes: number
  storedBytes: number
  optimized: boolean
}

const MAX_DIMENSION = 2400
const TARGET_BYTES = 1_200_000
const PASSTHROUGH_BYTES = 700_000

const readFileAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('無法讀取截圖。'))
    reader.onerror = () => reject(new Error('無法讀取截圖。'))
    reader.readAsDataURL(file)
  })

const loadImage = (dataUrl: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('無法解析截圖。'))
    image.src = dataUrl
  })

const canvasBlob = (
  canvas: HTMLCanvasElement,
  quality: number,
): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      blob => blob ? resolve(blob) : reject(new Error('截圖壓縮失敗。')),
      'image/webp',
      quality,
    )
  })

const blobAsDataUrl = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => typeof reader.result === 'string'
      ? resolve(reader.result)
      : reject(new Error('截圖壓縮失敗。'))
    reader.onerror = () => reject(new Error('截圖壓縮失敗。'))
    reader.readAsDataURL(blob)
  })

const webpName = (fileName: string): string => {
  const base = fileName.replace(/\.[^.]+$/, '').trim() || 'chart'
  return `${base}.webp`
}

export const optimizeScreenshotFile = async (file: File): Promise<OptimizedScreenshot> => {
  const originalDataUrl = await readFileAsDataUrl(file)
  if (file.size <= PASSTHROUGH_BYTES) {
    return {
      name: file.name,
      dataUrl: originalDataUrl,
      originalBytes: file.size,
      storedBytes: file.size,
      optimized: false,
    }
  }

  try {
    const image = await loadImage(originalDataUrl)
    const scale = Math.min(1, MAX_DIMENSION / Math.max(image.naturalWidth, image.naturalHeight))
    let width = Math.max(1, Math.round(image.naturalWidth * scale))
    let height = Math.max(1, Math.round(image.naturalHeight * scale))
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d', { alpha: false })
    if (!context) throw new Error('瀏覽器不支援圖片壓縮。')

    let bestBlob: Blob | null = null
    for (const quality of [0.9, 0.82, 0.74]) {
      canvas.width = width
      canvas.height = height
      context.fillStyle = '#0a0a0a'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      const blob = await canvasBlob(canvas, quality)
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob
      if (blob.size <= TARGET_BYTES) break

      const shrink = Math.max(0.72, Math.sqrt(TARGET_BYTES / blob.size) * 0.96)
      width = Math.max(1, Math.round(width * shrink))
      height = Math.max(1, Math.round(height * shrink))
    }

    if (!bestBlob || bestBlob.size >= file.size) {
      return {
        name: file.name,
        dataUrl: originalDataUrl,
        originalBytes: file.size,
        storedBytes: file.size,
        optimized: false,
      }
    }

    return {
      name: webpName(file.name),
      dataUrl: await blobAsDataUrl(bestBlob),
      originalBytes: file.size,
      storedBytes: bestBlob.size,
      optimized: true,
    }
  }
  catch {
    return {
      name: file.name,
      dataUrl: originalDataUrl,
      originalBytes: file.size,
      storedBytes: file.size,
      optimized: false,
    }
  }
}
