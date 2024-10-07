import { createCompoundExpression, NodeTypes } from '../ast'
import { isText } from '../utils'

/**
 * 将相邻的文本节点和表达式合并成一个表达式
 * 例如: <div>你好，{{name}}</div>
 * 此例子中节点拆分如下：
 * 1. 你好：文本节点
 * 2. {{name}}：INTERPOLATION 表达式节点
 * 这两个节点在 render 函数中，需要被处理为 '你好' + _toDisplayString(_ctx.name)
 * 这个 + 操作符，就需要我们来处理
 * 处理结果如下：
 * children: [
 *    {TEXT 文本节点},
 *    “+” 操作符,
 *    {INTERPOLATION 表达式节点},
 * ]
 * 具体示例：
 * [
 *	 { type: 'text', content: 'Hello '},
 *	 { type: 'expression', content: 'name' },
 *	 { type: 'text', content: ' World' },
 *	 { type: 'div', content: ' 我是一个div' },
 *	 { type: 'text', content: ' 我是一个文本节点' },
 *	 { type: 'expression', content: ' 我是一个相邻的表达式'}
 * ]
 * 上述数组会被处理为：
 * [
    {
        "type": "COMPOUND_EXPRESSION",
        "children": [
            {"type": "text","content": "Hello "},
            " + ",
            {"type": "expression","content": "name"},
            " + ",
            {"type": "text","content": " World"}
        ]
    },
    {"type": "div","content": " 我是一个div"},
    {
        "type": "COMPOUND_EXPRESSION",
        "children": [
            {"type": "text","content": " 我是一个文本节点"},
            " + ",
            {"type": "expression","content": " 我是一个相邻的表达式"}
        ]
    }
]
 *  实现中间包含其他节点的情况，也能被正确处理
 */
export function transformText(node, context) {
    if (
        node.type === NodeTypes.ROOT ||
        node.type === NodeTypes.ELEMENT ||
        node.type === NodeTypes.FOR ||
        node.type === NodeTypes.IF_BRANCH
    ) {
        return () => {
            const children = node.children
            let currentContainer
            for (let i = 0; i < children.length; i++) {
                const child = children[i]
                if (isText(child)) {
                    for (let j = i + 1; j < children.length; j++) {
                        const next = children[j] // 下一个节点

                        if (!currentContainer) {
                            currentContainer = children[i] = createCompoundExpression([child])
                        }

                        if (isText(next)) {
                            // 合并相邻的文本节点
                            currentContainer.children.push(' + ', next)
                            // 这里删除之后，children.length 会变化，所以需要 j--，才能取到原来本次循环的下一个节点
                            children.splice(j, 1)
                            j--
                        } else {
                            // 不是文本节点则不合并-通过这个不合并，可以保证相邻文本节点之后若有其他节点，也会被正确的处理顺序
                            currentContainer = undefined
                            break
                        }
                    }
                }
            }
        }
    }
}
