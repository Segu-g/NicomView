import { readPsd, Layer } from 'ag-psd'

export interface PsdLayer {
  path: string
  name: string
  canvas: HTMLCanvasElement | null
  left: number
  top: number
  opacity: number
  isGroup: boolean
  forceVisible: boolean
  isRadio: boolean
  hidden: boolean
}

export interface PsdData {
  width: number
  height: number
  layers: PsdLayer[]
}

function parseName(raw: string): { name: string; forceVisible: boolean; isRadio: boolean } {
  let name = raw
  let forceVisible = false
  let isRadio = false

  if (name.startsWith('!')) {
    forceVisible = true
    name = name.slice(1)
  } else if (name.startsWith('*')) {
    isRadio = true
    name = name.slice(1)
  }

  return { name, forceVisible, isRadio }
}

function flattenLayers(layers: Layer[], parentPath: string, parentHidden: boolean): PsdLayer[] {
  const result: PsdLayer[] = []

  for (const layer of layers) {
    const rawName = layer.name ?? ''
    const { name, forceVisible, isRadio } = parseName(rawName)
    const path = parentPath ? `${parentPath}/${name}` : name
    const isGroup = !!(layer.children && layer.children.length > 0)
    const hidden = parentHidden || !!(layer.hidden)

    result.push({
      path,
      name,
      canvas: layer.canvas ?? null,
      left: layer.left ?? 0,
      top: layer.top ?? 0,
      opacity: layer.opacity ?? 1,
      isGroup,
      forceVisible,
      isRadio,
      hidden,
    })

    if (layer.children) {
      result.push(...flattenLayers(layer.children, path, hidden))
    }
  }

  return result
}

export async function loadPsd(url: string): Promise<PsdData> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to fetch PSD: ${response.status} ${response.statusText}`)
  }
  const buffer = await response.arrayBuffer()
  const psd = readPsd(buffer)

  const layers = psd.children ? flattenLayers(psd.children, '', false) : []

  return {
    width: psd.width,
    height: psd.height,
    layers,
  }
}

export function getLeafLayers(data: PsdData): PsdLayer[] {
  return data.layers.filter((l) => !l.isGroup && l.canvas !== null)
}
