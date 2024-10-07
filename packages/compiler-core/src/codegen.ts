import { helperNameMap } from './runtimeHelpers'

function createCodegenContext(ast) {
    const context = {
        code: '',
        runtimeGlobalName: 'MiniVue', // 全局变量名
        source: ast.loc.source, // 源码
        indentLevel: 0, // 缩进层级
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
        context.code += '\n' + ' '.repeat(n)
    }

    return context
}

export function generate(ast) {
    const context = createCodegenContext(ast)

    const { push, newline, indent, deindent } = context
}
