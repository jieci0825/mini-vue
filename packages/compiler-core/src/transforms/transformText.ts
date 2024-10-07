import { NodeTypes } from '../ast'

export function transformText(node, context) {
    if (
        node.type === NodeTypes.ROOT ||
        node.type === NodeTypes.ELEMENT ||
        node.type === NodeTypes.FOR ||
        node.type === NodeTypes.IF_BRANCH
    ) {
        return () => {}
    }
}
