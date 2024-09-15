import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'

export default [
    {
        // 入口文件
        input: './packages/vue/src/index.ts',
        // 输出文件
        output: [
            // 导出一个自执行函数的vue.js，供浏览器使用
            {
                // 导出的文件地址
                file: './packages/vue/dist/mini-vue.js',
                // 格式
                format: 'iife',
                // 变量名
                name: 'MiniVue',
                // 源码地图
                sourcemap: true
            }
        ],
        // 插件
        plugins: [
            // 模块导入路径补全
            resolve(),
            // 转 commonjs 为 ESM
            commonjs(),
            // ts
            typescript({ sourceMap: true })
        ]
    }
]
