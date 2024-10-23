import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { extend } from '@vue/shared'
import { patchProp } from './patchProp'

const rendererOptions = extend({ patchProp }, nodeOps)

let renderer

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const render = (...args) => {
  ensureRenderer().render(...args)
}
