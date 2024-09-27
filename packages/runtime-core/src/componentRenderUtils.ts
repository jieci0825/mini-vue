import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { ComponentInstance } from './component'
import { isObject } from '@vue/shared'
import { createVNode, Text } from './vnode'

export function renderComponentRoot(instance: ComponentInstance) {
    const { vnode, render } = instance

    let result

    try {
        if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            result = normalizeVNode(render())
        }
    } catch (error) {
        console.error(error)
    }

    return result
}

export function normalizeVNode(child) {
    if (isObject(child)) {
        return cloneIfMounted(child)
    } else {
        return createVNode(Text, null, String(child))
    }
}

export function cloneIfMounted(child) {
    return child
}
