// 定义一个任务队列，采用 Set 数据结构，因为 Set 中的元素是唯一的，可以避免重复添加任务
const jobQueue = new Set()
// 创建一个 promise 实例，用于将任务添加到微任务队列
const p = Promise.resolve()

// 是否正在刷新队列
let isFlushing = false
// 刷新队列函数
function flushJob() {
  // 如果正在刷新队列，则不做任何处理
  if (isFlushing) return
  // 更改刷新状态
  isFlushing = true
  // 加入一个微任务
  p.then(() => {
    // 将 jobQueue 中的任务依次执行
    jobQueue.forEach(job => job())
  }).finally(() => {
    // 任务执行完毕后，重置 isFlushing 为 false
    isFlushing = false
  })
}

effect(
  () => {
    console.log(objProxy.a)
  },
  {
    scheduler(fn) {
      // 每次 objProxy.a 变化时，都会触发调度器
      //  - jobQueue 是一个 Set 结构，所以不管触发多少次，只会添加一次任务
      jobQueue.add(fn)

      // 调用 flushJob 函数，将任务添加到微任务队列
      flushJob()
    }
  }
)

objProxy.a++
objProxy.a++
