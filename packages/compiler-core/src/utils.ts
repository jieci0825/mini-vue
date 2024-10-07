import { NodeTypes, TextNode, InterpolationNode } from './ast'

export function isText(value: any): value is TextNode | InterpolationNode {
    return value.type === NodeTypes.TEXT || value.type === NodeTypes.INTERPOLATION
}
