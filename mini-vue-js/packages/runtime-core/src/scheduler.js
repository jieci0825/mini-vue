// 采用 set 结构，实现对任务的自动去重
const jobQueue = new Set()
const p = Promise.resolve()

// 表示是否正在刷新任务队列
let isFlushing = false

export function nextTick(fn) {
  return fn ? p.then(fn) : p
}

/**
 * 刷新任务队列
 */
export function flushJob() {
  if (isFlushing) return
  // 因为是微任务队列，所以这个地方只需要被调用一次即可，调用一次将这个微任务加入到时间队列即可
  // 不用管 queuePreFlushCbs 方法会添加执行多少次，加多少个任务
  isFlushing = true
  p.then(() => {
    jobQueue.forEach(job => job())
  }).finally(() => {
    isFlushing = false
    jobQueue.clear()
  })
}

/**
 * 将任务放到队列中
 * @param {Function} job
 */
export function queuePreFlushCbs(job) {
  jobQueue.add(job)
  flushJob()
}
