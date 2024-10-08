import { isArray, isString } from '@vue/shared'
import {
    CompoundExpressionNode,
    InterpolationNode,
    NodeTypes,
    SimpleExpressionNode,
    TemplateChildNode,
    TextNode
} from './ast'
import { helperNameMap, TO_DISPLAY_STRING } from './runtimeHelpers'
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

function aliasHelper(s: symbol) {
    return `${helperNameMap[s]}: _${helperNameMap[s]}`
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
        indent() {
            newLine(++context.indentLevel)
        },
        // 前进
        deindent() {
            newLine(--context.indentLevel)
        },
        // 换行
        newline() {
            newLine(context.indentLevel)
        }
    }

    function newLine(n: number) {
        // 换行-repeat决定缩进多少个空格
        context.code += '\n' + '  '.repeat(n)
    }

    return context
}

export function generate(ast) {
    const context = createCodegenContext(ast)

    const { push, newline, indent, deindent } = context

    genFunctionPreamble(context)

    const functionName = 'render'
    const args = ['_ctx', '_cache']
    const signature = args.join(', ')
    push(`function ${functionName}(${signature}) {`)

    // 缩进+换行
    indent()

    // 增加 with 语句，绑定默认上下文
    push('with (_ctx) {')
    indent()

    const hasHelpers = ast.helpers.length > 0
    if (hasHelpers) {
        push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = _Vue`)
        push('\n')
        newline()
    }

    push('return ')

    // 生成函数体
    if (ast.codegenNode) {
        genNode(ast.codegenNode, context)
    } else {
        push('null')
    }

    // 对应 with 语句
    deindent()
    push('}')

    // 缩进改回来
    deindent()
    // 补全函数体结束花括号
    push('}')

    return {
        ast,
        code: context.code
    }
}

function genNode(node, context: CodegenContext) {
    switch (node.type) {
        // 元素
        case NodeTypes.VNODE_CALL:
            genVNodeCall(node, context)
            break
        // 文本
        case NodeTypes.TEXT:
            genText(node, context)
            break
        // 插值语法
        case NodeTypes.INTERPOLATION:
            genInterpolation(node, context)
            break
        // 简单表达式
        case NodeTypes.SIMPLE_EXPRESSION:
            genExpression(node, context)
            break
        // 复合表达式
        case NodeTypes.COMPOUND_EXPRESSION:
            genCompoundExpression(node, context)
            break
        // 元素
        case NodeTypes.ELEMENT:
            console.log('处理 Element', node)
            genNode(node.codegenNode, context)
            break
    }
}

function genCompoundExpression(node: CompoundExpressionNode, context: CodegenContext) {
    // 对于复合表达式，所需要处理的就是它里面的 children
    const { children } = node
    for (let i = 0; i < children.length; i++) {
        const child = children[i]
        if (isString(child)) {
            context.push(child)
        } else {
            genNode(child, context)
        }
    }
}

function genExpression(node: SimpleExpressionNode, context: CodegenContext) {
    const { push } = context
    push(node.isStatic ? JSON.stringify(node.content) : node.content)
}

function genInterpolation(node: InterpolationNode, context: CodegenContext) {
    const { push, helper } = context

    // 生成函数调用
    push(`${helper(TO_DISPLAY_STRING)}(`)
    genNode(node.content, context)
    push(')')
}

function genVNodeCall(node, context) {
    const { push, isSSR, helper } = context
    const { tag, props, children, patchFlag, dynamicProps, directives, isBlock, disableTracking, isComponent } = node

    // 生成函数调用
    const callHelper = getVNodeHelper(isSSR, isComponent)
    push(`${helper(callHelper)}(`)

    // 处理参数
    const args = getNullableArgs([tag, props, children, patchFlag, dynamicProps])

    getNodeList(args, context)

    // 添加小括号，函数调用闭合
    push(')')
}

function getNodeList(nodes, context: CodegenContext) {
    const { push } = context
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i]
        // 字符串时
        if (isString(node)) {
            push(`${node}`)
        }
        // 数组时
        else if (isArray(node)) {
            getNodeListAsArray(node, context)
        }
        // 若为对象递归处理
        else {
            genNode(node, context)
        }
        // 生成参数逗号
        if (i !== nodes.length - 1) {
            push(', ')
        }
    }
}

function getNodeListAsArray(nodes, context: CodegenContext) {
    const { push } = context
    push('[')
    getNodeList(nodes, context)
    push(']')
}

function getNullableArgs(args: any[]) {
    // 遍历 args 去除有效的参数
    let i = args.length
    // 利用 while 循环，从末尾开始删除 undefined | null 的参数值
    while (i--) {
        if (args[i] != null) break
    }
    // 经过前面的 while 循环，i 的值就是最后一个不为 null 的参数的索引
    // 根据索引截取数组，并再次进行遍历，所有为假值的参数都用字符串 'null' 替换
    // 这样处理就可以实现类似 h('div', null, 'hello') 的效果
    return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genText(node, context: CodegenContext) {
    const { push } = context
    push(JSON.stringify(node.content))
}

// 生成前置代码
function genFunctionPreamble(context: CodegenContext) {
    const { push, newline, runtimeGlobalName } = context
    const VueBinding = runtimeGlobalName
    push(`const _Vue = ${VueBinding}\n`)
    newline()
    push(`return `)
}
