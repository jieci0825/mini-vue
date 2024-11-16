import { ref } from '@vue/reactivity'
import { extend, isFunction } from '@vue/shared'
import { h } from './h'
import { Fragment } from './vnode'

interface AsyncComponentOptions {
    loader: () => Promise<any> // 加载组件的函数
    loadingComponent?: any // 加载中的组件
    errorComponent?: any // 加载失败的组件
    delay?: number // 延迟显示 loadingComponent 的时间，即如果这个加载的资源在 delay 时间内加载完成，则不会显示 loadingComponent
    timeout?: number // 加载超时时间
    onError?: (retry: Function, fail: Function, retries: number) => void // 错误处理函数
}

type options = AsyncComponentOptions | (() => Promise<any>)

export function defineAsyncComponent(options: options) {
    if (isFunction(options)) {
        options = {
            loader: options
        }
    } else {
        options = extend(
            {
                loadingComponent: null,
                dealy: 0,
                timeout: 0,
                errorComponent: null
            },
            options
        )
    }

    // 返回一个组件
    return {
        name: 'AsyncComponentWrapper',
        setup() {
            const { loader, timeout, delay, onError } = options
            // 要展示的内容组件
            let InnerComp = null

            // 是否加载完成
            const loaded = ref(false)
            // 定义 error，当错误发生时，用来存储错误对象
            const error = ref(null)
            // 一个标志，代表是否正在加载，默认为 false
            let loading = ref(false)

            let loadingTimer: any = null

            if (delay) {
                // 如果配置项中存在 delay，则开启一个定时器计时，当延迟到时后将 loading.value 设置为 true
                //  - 即这段时间内，如果组件加载完成，则不会显示 loadingComponent
                loadingTimer = setTimeout(() => {
                    loading.value = true
                }, delay)
            } else {
                // 如果没有，则直接标记为加载中
                loading.value = true
            }

            // 记录重试次数
            let retries = 0
            // 封装 load 函数来实现错误重试和处理
            function load() {
                //  * 这里可以选择针对发生超时错误时，就不进行后续处理
                // 这里不需要捕获成功的情况
                return (
                    loader()
                        // 捕获加载器的错误
                        .catch(err => {
                            // 如果用户指定了 onError 回调，则将控制权交给用户
                            if (onError) {
                                // 利用一个新的 promise 来控制成功还是失败
                                //  - 这样当调用 retry 或 fail 时，可以控制 promise 的状态
                                //  - 而这个状态就会后续使用 load 的链式调用所捕获
                                return new Promise((resolve, reject) => {
                                    // 封装重试函数
                                    const retry = () => {
                                        retries++
                                        // 递归调用 load 函数，开启下一次重试
                                        resolve(load())
                                    }
                                    // 封装失败函数
                                    const fail = () => reject(err)

                                    // 调用 onError 函数，将重试和失败函数传递给用户
                                    onError(retry, fail, retries)
                                })
                            } else {
                                // 如果用户没有指定 onError 回调，则默认抛出错误
                                throw err
                            }
                        })
                )
            }

            // 调用封装的 load 函数，等待组件加载完成
            load()
                .then(c => {
                    // 如果已经发生了超时错误，则不在进行后续处理
                    //  - 但在 Vue 源码中是还会继续更新
                    if (error.value) return
                    InnerComp = c
                    loaded.value = true
                })
                .catch(err => {
                    // 如果已经发生了超时错误，则不在进行后续处理
                    if (error.value) return
                    // 如果没有超时错误，实在加载的过程中发生了错误，则将错误对象赋值给 error.value
                    error.value = err
                })
                .finally(() => {
                    // 完成后，无论成功还是失败，都将 loading.value 重置为 false
                    //  - 即 loadingComponent 不再显示
                    loading.value = false
                    // 无论加载成功还是失败，都清除定时器
                    clearTimeout(loadingTimer)
                })

            let timer: any = null
            if (timeout) {
                timer = setTimeout(() => {
                    // 超时后创建一个错误对象，并复制给 error.value
                    const err = new Error(
                        `加载异步组件超时：${options.timeout}ms.`
                    )
                    error.value = err
                    timer = null
                }, timeout)
            }

            // todo: 组件卸载的时候清除定时器

            return () => {
                // 加载完成且成功渲染加载完成的组件
                if (loaded.value) {
                    return h(InnerComp)
                }
                // 加载失败且传递了加载失败的组件，则渲染加载失败的组件
                else if (error.value && options.errorComponent) {
                    // 并且错误的信息通过 props 传递出去
                    return h(options.errorComponent, { error: error.value })
                }
                // 如果异步组件正在加载，并且用户指定了 Loading 组件，则渲染 Loading 组件
                else if (loading.value && options.loadingComponent) {
                    return h(options.loadingComponent)
                }
                // 如果以上条件都不满足，则返回一个占位组件
                return h(Fragment, [])
            }
        }
    }
}
