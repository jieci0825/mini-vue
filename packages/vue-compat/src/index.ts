import { compile } from '@vue/compiler-dom'

function compileToFunction(template: string, options?: any) {
    // const { code } = compile(template, options)
    // const render = new Function(code)()
    // return render

    return compile(template, options)
}

export { compileToFunction as compile }
