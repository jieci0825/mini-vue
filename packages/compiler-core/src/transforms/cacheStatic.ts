import { NodeTypes, RootNode } from '../ast'

/**
 * 判断是否是单元素根节点
 */
export function isSingleElementRoot(root: RootNode, child) {
    const { children } = root
    return children.length === 1 && child.type === NodeTypes.ELEMENT
}
