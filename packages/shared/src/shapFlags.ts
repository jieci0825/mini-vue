export enum ShapeFlags {
    /**
     * 元素
     */
    ELEMENT = 1,
    /**
     * 函数组件
     */
    FUNCTIONAL_COMPONENT = 1 << 1, // 2
    /**
     * 有状态(响应数据)组件
     */
    STATEFUL_COMPONENT = 1 << 2, // 4
    /**
     * children 是文本节点
     */
    TEXT_CHILDREN = 1 << 3, // 8
    /**
     *  children 是数组
     */
    ARRAY_CHILDREN = 1 << 4, // 16
    /**
     * children 是插槽
     */
    SLOTS_CHILDREN = 1 << 5, // 32
    /**
     * teleport 内置组件
     */
    TELEPORT = 1 << 6, // 64
    /**
     * suspense 内置组件
     */
    SUSPENSE = 1 << 7, // 128
    /**
     * 组件是否需要缓存
     */
    COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8, // 256
    /**
     * 组件是否已经被缓存
     */
    COMPONENT_KEPT_ALIVE = 1 << 9, // 512
    /**
     * 组件
     */
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT // 6
}
