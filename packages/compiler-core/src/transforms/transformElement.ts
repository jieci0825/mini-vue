import { createObjectExpression, createVNodeCall, NodeTypes } from '../ast'
import { TransformContext } from '../transform'

export function transformElement(node, context: TransformContext) {
    return function postTransformElement() {
        node = context.currentNode
        if (node.type !== NodeTypes.ELEMENT) return

        const { tag } = node
        let vnodeTag = `"${tag}"`

        let propertries: any[] = []
        const props = node.props
        for (let i = 0; i < props.length; i++) {
            propertries.push({
                key: props[i].name,
                value: props[i].value.content
            })
        }

        // 创建属性表达式
        const propsExpression = propertries.length
            ? createObjectExpression(propertries)
            : null

        let childrenNode: any = null
        const children = node.children
        if (children.length === 1) {
            childrenNode = children[0]
        } else if (children.length > 1) {
            childrenNode = children
        }

        // * 核心处理就在于此，生成 codegenNode 属性
        node.codegenNode = createVNodeCall(
            context,
            vnodeTag,
            propsExpression,
            childrenNode
        )
    }
}
