import { createRenderer } from '@vue/runtime-core'
import { extend, isString } from '@vue/shared'
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

export const createApp = (...args: any[]) => {
    const renderer = ensureRenderer()
    const app = renderer.createApp(...args)
    // 保存原有的mount方法
    const { mount } = app
    // 重写mount方法
    app.mount = (container: any) => {
        if (isString(container)) {
            container = document.querySelector(container)
        }

        if (!container) {
            throw new Error('rootContainer is not exist')
        }
        // 每次挂载前，先清空容器
        container.innerHTML = ''

        return mount(container)
    }
    return app
}
