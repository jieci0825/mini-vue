import { NodeTypes } from '../ast'

export function transformExpression(node, context) {
    if (node.type === NodeTypes.INTERPOLATION) {
        const content = node.content.content

        // 直接改变当前 ast 中记录的内容
        node.content.content = '_ctx.' + content
    }
}
