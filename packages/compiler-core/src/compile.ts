import { baseParse } from './parse'

export function baseCompile(template: string, options) {
    const ast = baseParse(template)
    console.log('输出 ast', JSON.stringify(ast, null, 2))
    return {}
}
