let currentInstance = null

export function setCurrentInstance(instance) {
  currentInstance = instance
}

export function onMounted(fn) {
  if (currentInstance) {
    // 将生命周期函数添加到 instance.mounted 数组中
    currentInstance.mounted.push(fn)
  } else {
    console.error('onMounted 函数只能在 setup 中调用')
  }
}

export function onUnmounted(fn) {
  if (currentInstance) {
    // 将生命周期函数添加到 instance.unmounted 数组中
    currentInstance.unmounted.push(fn)
  } else {
    console.error('onUnmounted 函数只能在 setup 中调用')
  }
}
