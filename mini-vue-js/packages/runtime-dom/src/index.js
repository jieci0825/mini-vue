import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'

const rendererOptions = nodeOps

let renderer

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const render = (...args) => {
  ensureRenderer().render(...args)
}
