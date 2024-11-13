import { NodeTypes, RootNode } from '../ast'

/**
 * 判断是否是单元素根节点
 */
export function isSingleElementRoot(root: RootNode) {
    return (
        root.type === NodeTypes.ROOT &&
        root.children.length === 1 &&
        root.children[0].type === NodeTypes.ELEMENT
    )
}
