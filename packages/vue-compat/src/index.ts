import { compile } from '@vue/compiler-dom'
import { registerRuntimeCompiler } from '@vue/runtime-core'

function compileToFunction(template: string, options?: any) {
    const { code } = compile(template, options)
    const render = new Function(code)()
    return render
}

// 注册编译器函数
registerRuntimeCompiler(compileToFunction)

export { compileToFunction as compile }
