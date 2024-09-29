import { ShapeFlags } from 'packages/shared/src/shapFlags'
import { Comment, Fragment, isSameVNodeType, Text, VNode } from './vnode'
import { EMPTY_OBJ } from '@vue/shared'
import { type ComponentInstance, createComponentInstance, setupComponent } from './component'
import { ReactiveEffect } from 'packages/reactivity/src/effect'
import { queuePreFlushCbs } from './scheduler'
import { normalizeVNode, renderComponentRoot } from './componentRenderUtils'

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
    setText(el: CustomElement, text: string): void
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
    createTextNode(text: string): Text
    /**
     * 创建一个注释节点
     */
    createComment(text: string): Comment
    /**
     * 设置元素文本内容
     */
    setText(el: CustomElement, text: string): void
    /**
     * 移除元素
     */
    remove(el: CustomElement): void
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
        createTextNode: hostCreateTextNode,
        createComment: hostCreateComment,
        setText: hostSetText,
        insert: hostInsert,
        patchProp: hostPatchProp,
        remove: hostRemove
    } = options

    /**
     * 卸载元素
     */
    function unmount(vnode: VNode) {
        hostRemove(vnode.el)
    }

    /**
     * 更新Text
     */
    function patchTextNode(oldVNode: VNode, newVNode: VNode) {
        // 节点进行复用，只需要更新文本内容即可
        const el = (newVNode.el = oldVNode.el)
        if (oldVNode.children !== newVNode.children) {
            hostSetText(el, newVNode.children)
        }
    }

    /**
     * 挂载Text
     */
    function mountTextNode(vnode: VNode, container: CustomElement, anchor?: any) {
        const textNode = (vnode.el = hostCreateTextNode(vnode.children) as unknown as Element)
        hostInsert(textNode, container, anchor)
    }

    /**
     * 更新Comment
     */
    function patchCommentNode(oldVNode: VNode, newVNode: VNode) {
        const el = (newVNode.el = oldVNode.el)
        if (oldVNode.children !== newVNode.children) {
            hostSetText(el, newVNode.children)
        }
    }

    /**
     * 挂载Comment
     */
    function mountCommentNode(vnode: VNode, container: CustomElement, anchor?: any) {
        const commentNode = (vnode.el = hostCreateComment(vnode.children) as unknown as Element)
        hostInsert(commentNode, container, anchor)
    }

    /**
     * 挂载 children
     */
    function mountChildren(children: VNode[], container: CustomElement, anchor?: any) {
        // children 可能是数组也可能是字符串
        if (children && children.length) {
            for (let child of children) {
                // 标准化 vnode，如果是一个 string 也会被封装成 Text 类型的 vnode
                child = normalizeVNode(child)
                patch(null, child, container, anchor)
            }
        }
    }

    /**
     * 挂载元素
     */
    function mountElement(vnode: VNode, container: CustomElement, anchor?: any) {
        const { type, shapeFlag, props } = vnode

        // 1、创建元素
        const el = (vnode.el = hostCreateElement(type))
        // 2、处理 children 为文本节点的情况
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetText(el, vnode.children)
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
     * 挂载组件
     */
    function mountComponent(initialVNode: VNode, container: CustomElement, anchor?: any) {
        const instance = (initialVNode.component = createComponentInstance(initialVNode))

        // 在 setupComponent 主要进行 render 函数的绑定
        //  - 并且会在里面进行组件实例化和生命周期函数的处理等
        setupComponent(instance)

        // 触发实际的渲染，即render函数执行
        setupRenderEffect(instance, initialVNode, container, anchor)
    }

    function setupRenderEffect(
        instance: ComponentInstance,
        initialVNode: VNode,
        container: CustomElement,
        anchor?: any
    ) {
        // 组件的更新函数--组件 render 函数内数据变化，触发更新
        const componentUpdateFn = () => {
            // 为 false 表示初次挂载
            if (!instance.isMounted) {
                // 从这里将 beforeMount 和 mounted 函数取出进行调用
                const { beforeMount, mounted } = instance

                // 在组件被挂载之前调用
                if (beforeMount) {
                    // 由于之前这里被我们处理成了数组，所以这里需要调用数组中的每一个函数
                    for (const fn of beforeMount) {
                        fn.call(instance)
                    }
                }

                // 得到组件的渲染函数返回的 VNode
                //  - 这里是组件对象里面的 render 而非是渲染器里面的 render
                const subTree = (instance.subTree = renderComponentRoot(instance))
                // 执行挂载
                patch(null, subTree, container, anchor)

                // 在组件被挂载之后调用
                if (mounted) {
                    for (const fn of mounted) {
                        fn.call(instance)
                    }
                }

                initialVNode.el = subTree.el
                instance.isMounted = true
            } else {
                // todo 更新
            }
        }

        // 使用 effect 来包裹组件的更新函数
        const effect = (instance.effect = new ReactiveEffect(componentUpdateFn, () => {
            queuePreFlushCbs(update)
        }))

        function update() {
            effect.run()
        }
        instance.update = update
        // 手动触发第一次
        update()
    }

    /**
     * 处理节点的 prop
     */
    function patchProps(el: CustomElement, vnode: VNode, oldProps: any, newProps: any) {
        if (oldProps !== newProps) {
            // 进行新旧的 props 的属性值 对比
            for (const key in newProps) {
                const next = newProps[key]
                const prev = oldProps[key]
                // 如果新旧值不一样，则更新
                if (next !== prev) {
                    hostPatchProp(el, key, prev, next)
                }
            }

            if (oldProps !== EMPTY_OBJ) {
                // 新旧对比完成之后，在遍历一次 oldProps，如果 oldProps 中有，而 newProps 中没有，则说明是需要删除的
                // 比如：第一次节点有 class，第二次没有，则需要删除 class
                for (const key in oldProps) {
                    if (!newProps.hasOwnProperty(key)) {
                        hostPatchProp(el, key, oldProps[key], null)
                    }
                }
            }
        }
    }

    /**
     * 处理子节点
     */
    function patchChildren(oldVNode: VNode, newVNode: VNode, container: CustomElement, anchor?: any) {
        //获取旧节点的 children
        const c1 = oldVNode && oldVNode.children
        // 获取旧节点的 shapeFlag
        const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
        //获取新节点的 children
        const c2 = newVNode && newVNode.children
        const { shapeFlag } = newVNode

        // 进行不同状态的判断

        // 新节点的children是文本节点的分支
        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 如果旧节点的一个数组的，则将旧节点的 children 都卸载掉
            //  - 这里在 h 函数中进行了 children 的参数处理，如果 h(div,null,vnode) 会包装为 h(div,null,[vnode])
            //  - 所以如果不是数组，就是字符串
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // todo 卸载旧节点的 children
            }

            // 如果新旧节点的字符串内容不一样，则直接更新文本内容
            if (c1 !== c2) {
                hostSetText(container, c2)
            }
        }
        // 新节点的children不是一个文本节点的分支
        else {
            // 如果新节点和旧节点的children都是数组，则进行 diff 算法
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // todo diff 算法
                }
                // 新节点的 children 不是一个数组，也不是一个文本节点，则需要进行卸载，则卸载旧节点的 children
                else {
                    // todo 卸载旧节点的 children
                }
            }
            // 旧节点的 children 也不是数组的处理
            else {
                // 检测旧节点的children是否是一个文本节点，如果是则清空
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetText(container, '')
                }

                // 如果新节点是一个数组，则将新节点的 children 进行单独的挂载
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // todo 挂载新节点的 children
                }
            }
        }
    }

    /**
     *
     * @param oldVNode 旧的 vnode
     * @param newVNode 新的 vnode
     */
    function patchElement(oldVNode: VNode, newVNode: VNode) {
        // 将 dom 也保存到新的 vnode 中，方便后续对比
        const el = (newVNode.el = oldVNode.el)

        const oldProps = oldVNode.props || EMPTY_OBJ
        const newProps = newVNode.props || EMPTY_OBJ

        patchChildren(oldVNode, newVNode, el, null)

        patchProps(el, newVNode, oldProps, newProps)
    }

    /**
     * 处理Text
     */
    function processText(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountTextNode(newVNode, container, anchor)
        } else {
            patchTextNode(oldVNode, newVNode)
        }
    }

    /**
     * 处理Comment
     */
    function processComment(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountCommentNode(newVNode, container, anchor)
        } else {
            patchCommentNode(oldVNode, newVNode)
        }
    }

    /**
     * 处理 Fragment
     */
    function processFragment(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
        // 旧节点不存在则直接挂载
        if (oldVNode === null) {
            mountChildren(newVNode.children, container, anchor)
        } else {
            patchChildren(oldVNode, newVNode, container, anchor)
        }
    }

    /**
     * 处理元素
     */
    function processElement(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
        if (oldVNode === null) {
            // 如果 oldVNode 为 null，则表示需要执行挂载操作
            mountElement(newVNode, container, anchor)
        } else {
            // 如果 oldVNode 不为 null，则表示需要执行更新操作
            patchElement(oldVNode, newVNode)
        }
    }

    /**
     * 处理组件
     */
    function processComponent(oldVNode: VNode | null, newVNode: VNode, container: CustomElement, anchor?: any) {
        if (oldVNode === null) {
            // 如果 oldVNode 为 null，则表示需要执行挂载操作
            mountComponent(newVNode, container, anchor)
        } else {
            // todo patch
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

        // 若旧节点存在，且两个节点类型不一致，则卸载旧节点，在挂载新节点
        //  - 如果是组件，每次都是不同的组件对象，type 就是 render，所以类型一定不一致
        if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode)
            // 卸载后将 oldVNode 设置为 null，后续就会执行挂载操作
            oldVNode = null
        }

        // 根据 type 来判断如何处理
        const { type, shapeFlag } = newVNode

        switch (type) {
            case Text:
                processText(oldVNode, newVNode, container, anchor)
                break
            case Comment:
                processComment(oldVNode, newVNode, container, anchor)
                break
            case Fragment:
                processFragment(oldVNode, newVNode, container, anchor)
                break
            default:
                // 如果都不是，则分为元素和组件来处理
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
                    processComponent(oldVNode, newVNode, container, anchor)
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
            // 卸载容器里面的元素
            if (container._vnode) {
                unmount(container._vnode)
            }
        } else {
            // 如果不为 null，则进行 patch 操作
            //  - 实际比对的是一个根节点下面的所有vnode
            patch(container._vnode || null, vnode, container)
        }
        // 将本次的 vnode 作为下一次对比时旧的 vnode
        container._vnode = vnode
    }

    return {
        render
    }
}
