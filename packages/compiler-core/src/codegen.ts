import { isArray, isString } from '@vue/shared'
import { NodeTypes } from './ast'
import { helperNameMap } from './runtimeHelpers'
import { getVNodeHelper } from './utils'

function aliasHelper(s: symbol) {
    return `${helperNameMap[s]}: _${helperNameMap[s]}`
}

function createCodegenContext(ast) {
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

    // 缩进改回来
    deindent()
    // 补全函数体结束花括号
    push('}')

    return {
        ast,
        code: context.code
    }
}

function genNode(node, context) {
    switch (node.type) {
        case NodeTypes.VNODE_CALL:
            genVNodeCall(node, context)
            break
        case NodeTypes.TEXT:
            genText(node, context)
            break
    }
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

function getNodeList(nodes, context) {
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

function getNodeListAsArray(nodes, context) {
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
    return args.slice(0, i + 1).map(arg => arg || `null`)
}

function genText(node, context) {
    const { push } = context
    push(JSON.stringify(node.content))
}

// 生成前置代码
function genFunctionPreamble(context) {
    const { push, newline, indent, deindent, runtimeGlobalName } = context
    const VueBinding = runtimeGlobalName
    push(`const _Vue = ${VueBinding}\n`)
    newline()
    push(`return `)
}
