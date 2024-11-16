import { VNode } from '../vnode'

const isTeleport = Symbol('__v_isTeleport')

export const TeleportImpl = {
    [isTeleport]: true,
    process(oldVNode: VNode, newVNode: VNode, internals) {
        const { mountChildren, patchChildren, move } = internals

        if (!oldVNode) {
            // 根据 teleport 的 to 属性，获取目标容器
            //  - 默认为 body
            const target =
                document.querySelector(newVNode.props.to) || document.body
            if (target) {
                mountChildren(newVNode.children, target)
            }
        } else {
            // 更新儿子内容变化-不涉及容器
            patchChildren(oldVNode, newVNode, internals)

            // 传送位置发生了变化
            if (newVNode.props.to !== oldVNode.props.to) {
                const nextTarget =
                    document.querySelector(newVNode.props.to) || document.body

                // 将孩子移走
                const children = newVNode.children
                for (let i = 0; i < children.length; i++) {
                    const child = children[i]
                    move(child, nextTarget)
                }
            }
        }
    }
}

export function isTeleportComponent(type) {
    return !!type && type[isTeleport]
}
