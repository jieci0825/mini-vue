import { isArray, isString, isSymbol } from '@vue/shared'
import {
    CompoundExpressionNode,
    InterpolationNode,
    NodeTypes,
    SimpleExpressionNode,
    TemplateChildNode,
    TextNode
} from './ast'
import {
    CREATE_ELEMENT_BLOCK,
    helperNameMap,
    OPEN_BLOCK,
    TO_DISPLAY_STRING
} from './runtimeHelpers'
import { getVNodeHelper } from './utils'

type CodegenNode = TemplateChildNode

export interface CodegenContext {
    code: string
    runtimeGlobalName: string
    source: string
    indentLevel: number
    isSSR: boolean
    helper(key: symbol): string
    push(code: string): void
    indent(): void
    deindent(): void
    newline(): void
}

function aliasHelper(s: symbol, gap: string = ':'): string {
    return `${helperNameMap[s]}${gap} _${helperNameMap[s]}`
}

function createCodegenContext(ast): CodegenContext {
    const context = {
        code: '',
        runtimeGlobalName: 'MiniVue', // 全局变量名
        source: ast?.loc?.source || '', // 源码
        indentLevel: 0, // 缩进层级
        isSSR: false, // 是否是SSR
        helper(key) {
            return `_${helperNameMap[key]}`
        },
        // 拼接
        push(code: string) {
            context.code += code
        },
        // 缩进
        indent(withoutNewLine = false) {
            if (!withoutNewLine) {
                _newLine(++context.indentLevel)
            } else {
                context.indentLevel++
            }
        },
        // 前进
        deindent(withoutNewLine = false) {
            // 是否换行
            if (!withoutNewLine) {
                _newLine(--context.indentLevel)
            } else {
                context.indentLevel--
            }
        },
        // 换行
        newline() {
            _newLine(context.indentLevel)
        }
    }

    function _newLine(n: number) {
        // 换行-repeat决定缩进多少个空格
        context.code += '\n' + '  '.repeat(n)
    }

    return context
}

export function generate(ast) {
    const context = createCodegenContext(ast)

    const { push, newline, indent, deindent } = context

    // 生成函数序言
    genFunctionPreabel(ast, context)

    const functionName = 'render'

    const args = ['_ctx', '_cache', '$props']

    push(`function ${functionName}(${args.join(', ')}) {`)
    indent()

    const helpers: any[] = []
    const importHelpers: any[] = []
    ast.helpers.forEach(helper => {
        helpers.push(aliasHelper(helper))
        importHelpers.push(aliasHelper(helper, ' as'))
    })

    if (helpers.length) {
        push(`const { ${helpers.join(', ')} } = ${context.runtimeGlobalName}`)
        newline()
    }

    // 生成函数体
    push('return ')
    // 检查ast的 codegenNode 属性
    if (ast?.codegenNode) {
        genNode(ast.codegenNode, context)
    } else {
        // 其他情况，则表示是空模板，返回 null
        push('null')
    }

    // 补全函数
    deindent()
    push('}')

    return {
        ast,
        code: context.code
    }
}

function genNode(node, context: CodegenContext) {
    if (isString(node)) {
        context.push(JSON.stringify(node))
        return
    }

    if (isSymbol(node)) {
        context.push(context.helper(node))
        return
    }

    switch (node.type) {
        case NodeTypes.TEXT:
            genText(node, context)
            break
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        case NodeTypes.ELEMENT:
            genNode(node.codegenNode, context)
            break
        case NodeTypes.VNODE_CALL:
            genVNodeCall(node, context)
            break
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context)
            break
        case NodeTypes.TEXT_CALL:
            genNode(node.codegenNode, context)
            break
        case NodeTypes.JS_CALL_EXPRESSION:
            genCallExpression(node, context)
            break
    }
}

function genCallExpression(node, context: CodegenContext) {
    const { push, helper } = context
    push(helper(node.callee))
    push('(')
    genNodeList(node.arguments, context)
    push(')')
}

function genCompoundExpression(node, context: CodegenContext) {
    for (let i = 0; i < node.children!.length; i++) {
        const child = node.children![i]
        if (isString(child)) {
            context.push(child)
        } else {
            genNode(child, context)
        }
    }
}

function genVNodeCall(node, context: CodegenContext) {
    const { push, helper } = context
    const { tag, props, children, isBlock } = node

    if (isBlock) {
        push(`(${helper(OPEN_BLOCK)}(), `)
    }

    push(helper(CREATE_ELEMENT_BLOCK) + `(`)

    genNodeList(genNullableArgs([tag, props, children]), context)

    push(`)`)

    if (isBlock) {
        push(')')
    }
}

function genNullableArgs(args) {
    let i = args.length
    while (i--) {
        if (args[i] != null) break
    }
    return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genNodeList(nodes, context: CodegenContext) {
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]

        if (isString(node)) {
            context.push(node)
        } else if (isArray(node)) {
            genNodeListAsArray(node, context)
        } else {
            genNode(node, context)
        }

        if (i < nodes.length - 1) {
            context.push(', ')
        }
    }
}

function genNodeListAsArray(nodes, context: CodegenContext) {
    context.push('[')
    genNodeList(nodes, context)
    context.push(']')
}

function genExpression(node, context: CodegenContext) {
    context.push(node.content)
}

function genInterpolation(node, context: CodegenContext) {
    const { helper, push } = context

    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(')')
}

function genText(node, context: CodegenContext) {
    const { push } = context
    push(JSON.stringify(node.content))
}

function genFunctionPreabel(ast, context) {
    const { push, newline, indent, deindent } = context

    // const helpers: any[] = []
    // const importHelpers: any[] = []
    // ast.helpers.forEach(helper => {
    //     helpers.push(aliasHelper(helper))
    //     importHelpers.push(aliasHelper(helper, ' as'))
    // })

    // if (helpers.length) {
    //     push(`const { ${helpers.join(', ')} } = ${context.runtimeGlobalName}`)
    //     newline()
    //     newline()
    // }

    // * 用于 new Function() 创建函数
    push('return ')
}
