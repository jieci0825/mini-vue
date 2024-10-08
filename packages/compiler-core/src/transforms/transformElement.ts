import { createVNodeCall, NodeTypes } from '../ast'
import { TransformContext } from '../transform'

export function transformElement(node, context: TransformContext) {
    return function postTransformElement() {
        node = context.currentNode
        if (node.type !== NodeTypes.ELEMENT) return

        const { tag } = node
        let vnodeTag = `"${tag}"`
        // todo props 暂不处理
        let vnodeProps = undefined
        let vnodeChildren = node.children

        // * 核心处理就在于此，生成 codegenNode 属性
        node.codegenNode = createVNodeCall(context, vnodeTag, vnodeProps, vnodeChildren)
    }
}
