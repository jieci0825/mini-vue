import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import alias from '@rollup/plugin-alias'
import path from 'path'

export default [
    {
        // 入口文件
        input: './packages/vue/src/index.js',
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
            alias({
                entries: [
                    {
                        find: /^@vue\/(.*)$/,
                        replacement: (match, p1) => {
                            return path.resolve(`packages/${p1}/src`)
                        }
                    }
                ]
            })
        ]
    }
]
