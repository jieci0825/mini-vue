# 区分vnode的类型

在前文中，我们进行了一个简单的打补丁的操作，但是这个操作是有一些前提的，比如新旧 vnode 描述的内容相同，比如首次渲染的 vnode 的 type 是一个 div，二次渲染时，这个 vnode 的 type 改为了一个 p，而这种类型都不同的 vnode，其实就没有打补丁的意义，毕竟元素标签都不同了。

而这种类型都不同的情况下，我们的操作就应该是卸载旧的 vnode，然后挂在新的 vnode，因此我们需要对 patch 函数进行一些调整，如下：

```javascript
function patch(n1, n2, container){
  // 如果 n1 存在，则对比 n1 和 n2 的类型
  if(n1 && n1.type !== n2.type){
    // 如果新旧节点都存在，且类型不一致，则先卸载 n1
    unmount(n1)
    // 将 n1 置空，则后续就会自动执行挂载操作，和首次渲染一样
    n1 = null
  }
  
  // 当前面这个前置条件判断完成之后，在执行后续的逻辑
  if(!n1){
    // 旧节点不存在则直接挂载
    mountElement(n2, contianer)
  } else {
    // 更新
  }
}
```

而一个 vnode 不仅仅可以描述普通标签，还可以用来描述组件，或者 Fragment 等，对于不同类型的 vnode，我们也都需要提供不同的挂载或者打补丁的方式，所以我们还需要继续修改 patch 函数，如下：

```javascript
function patch(n1, n2, container) {
  if (n1 && !isSameVNodeType(n1, n2)) {
    unmount(n1)
    n1 = null
  }

  // 经过前面的判断表示，n1 和 n2 是一个类型的节点
  const { type } = n2
  // 如果是字符串表示的是文本节点
  if (isString(type)) {
    if (!n1) {
      mountElement(n2, container)
    } else {
      // TODO 更新
    }
  }
  // 如果是对象表示是组件
  else if (isObject(type)) {
    // todo 处理组件
  } else {
    // TODO 处理其他情况
  }
}
```

