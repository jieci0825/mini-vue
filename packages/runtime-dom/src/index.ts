import { createRenderer } from '@vue/runtime-core'
import { extend } from '@vue/shared'
import { patchProp } from './patchProp'
import { nodeOps } from './nodeOps'

const rendererOptions = extend({ patchProp }, nodeOps)

let renderer

function ensureRenderer() {
    return renderer || (renderer = createRenderer(rendererOptions))
}

export const render = (...args: any[]) => {
    ensureRenderer().render(...args)
}
