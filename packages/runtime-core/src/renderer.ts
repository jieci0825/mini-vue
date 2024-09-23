import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { Comment, Fragment, Text, VNode } from './vnode'
import { patchProp } from 'packages/runtime-dom/src/patchProp'

export interface CustomElement extends Element {
    _vnode?: VNode
}

export interface RendererOptions {
    /**
     * 为指定的 el 的属性打补丁
     */
    patchProp(el: CustomElement, key: string, prevValue: any, nextValue: any): void
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
    // createText(text: string): Text
}

/**
 * 创建渲染器
 */
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

interface baseCreateRendererReturn {
    render: (vnode: VNode, container: CustomElement) => void
}

function baseCreateRenderer(options: RendererOptions): baseCreateRendererReturn {
    const {
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        insert: hostInsert,
        patchProp: hostPatchProp
    } = options

    /**
     * 挂载元素
     */
    function mountElement(vnode: VNode, container: CustomElement, anchor?: any) {
        const { type, shapeFlag, props } = vnode

        // 1、创建元素
        const el = (vnode.el = hostCreateElement(type))
        // 2、处理 children 为文本节点的情况
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, vnode.children)
        }
        // 3、处理 children 为数组的情况，也只会为数组，就算值传低了一个虚拟节点，也会被封装成数组，在 h 函数中处理了
        else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
            // todo 处理当前挂载元素子节点为数组的情况
        }
        // 4、设置元素属性
        if (props) {
            for (const key in props) {
                // 这里是挂在，所以上一个值是 null
                hostPatchProp(el, key, null, props[key])
            }
        }
        // 5、插入
        hostInsert(el, container, anchor)
    }

    /**
     * 处理元素
     */
    function processElement(oldValue: VNode | null, newValue: VNode, container: CustomElement, anchor?: any) {
        if (oldValue === null) {
            // 如果 oldValue 为 null，则表示需要执行挂载操作
            mountElement(newValue, container, anchor)
        } else {
            // 如果 oldValue 不为 null，则表示需要执行更新操作
            // todo updateElement
        }
    }

    /**
     * 打补丁
     * @param oldVNode 旧的 vnode
     * @param newVNode 新的 vnode
     * @param container 容器
     * @param anchor 锚点
     */
    function patch(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
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
                    processElement(oldVNode, newVNode, container, anchor)
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
    function render(vnode: VNode, container: CustomElement) {
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
