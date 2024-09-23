import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { Comment, Fragment, Text, VNode } from './vnode'

interface CustomElement extends Element {
    _vnode: VNode
}

export interface RendererOptions {
    /**
     * 为指定的 el 的属性打补丁
     */
    pathcProp(el: CustomElement, key: string, prevValue: any, nextValue: any): void
    /**
     * 未指定的 element 设置 text
     */
    setElementText(el: CustomElement, text: string): void
    /**
     * 将一个元素插入到父元素中，anchor 表示插入的位置，即：锚点
     */
    insert(el: CustomElement, parent: CustomElement, anchor?: any): void
    /**
     * 创建一个元素
     */
    createElement(tag: string): CustomElement
    /**
     * 创建一个文本节点
     */
    createText(text: string): Text
}

export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

interface baseCreateRendererReturn {
    render: (vnode: VNode, container: CustomElement) => void
}

function baseCreateRenderer(options: RendererOptions): baseCreateRendererReturn {
    /**
     * 打补丁
     * @param oldVNode 旧的 vnode
     * @param newVNode 新的 vnode
     * @param container 容器
     * @param anchor 锚点
     */
    const patch = (oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) => {
        if (oldVNode === newVNode) return

        // 根据 type 来判断如何处理
        const { type, shapeFlag } = newVNode

        switch (type) {
            case Text:
                // todo 处理文本节点
                break
            case Comment:
                // todo 处理注释节点
                break
            case Fragment:
                // todo 处理片段节点
                break
            default:
                // 如果都不是，则分为元素和组件来处理
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // todo 处理元素
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    // todo 处理组件
                }
        }
    }

    /**
     * 将vnode渲染到容器中
     * @param vnode vnode
     * @param container 挂载的容器
     */
    const render = (vnode: VNode, container: CustomElement) => {
        // 如果 vnode 为 null，则表示需要执行卸载操作
        if (vnode == null) {
            // todo 卸载容器里面的元素
        } else {
            // 如果不为 null，则进行 patch 操作
            patch(container._vnode || null, vnode, container)
        }
    }

    return {
        render
    }
}
