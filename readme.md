# blear.classes.router 前端路由类

[![npm module][npm-img]][npm-url]
[![build status][travis-img]][travis-url]
[![coverage][coveralls-img]][coveralls-url]

[travis-img]: https://img.shields.io/travis/blearjs/blear.classes.router/master.svg?maxAge=2592000&style=flat-square
[travis-url]: https://travis-ci.org/blearjs/blear.classes.router

[npm-img]: https://img.shields.io/npm/v/blear.classes.router.svg?maxAge=2592000&style=flat-square
[npm-url]: https://www.npmjs.com/package/blear.classes.router

[coveralls-img]: https://img.shields.io/coveralls/blearjs/blear.classes.router/master.svg?maxAge=2592000&style=flat-square
[coveralls-url]: https://coveralls.io/github/blearjs/blear.classes.router?branch=master




## 方法
- `#match(rule, callback())` 匹配一个同步控制器，规则可以是字符表达式、确定值、正则，规则匹配有先后顺序
- `#match(rule, callback(resolve))` 匹配一个异步控制器
- `#otherwise(callback(resolve))` 控制器可以是同步、异步，但只能有一个
- `#rewrite(path)` 重写当前 hash，但不会引起任何变化
- `#redirect(path)` 跳转指定 hash（可以是相对、绝对路径），建议页面的跳转操作都由这个方法来进行
- `#redirect(step)` 从当前记录点偏移，step 可以是正数、负数
- `#dropChange()` 放弃当前的路由变更


## 事件
- `beforeChange(router, next)` 路由变化之前
- `change(route, next)` 路由变化
- `beforeLoad()` 异步控制器加载之前
- `afterLoad()` 异步控制器加载之后
- `pushHistory(route)` 历史增长
- `rewriteHistory(route)` 重写历史
- `shiftHistory(route)` 放弃历史，历史长度过长
- `dropChange(path)` 放弃变更，当前正在切换、加载、跳转等条件时都是会放弃变更的


# 路由对象（Route 实例）
- `controller` 控制器
- `matched` 是否匹配到规则，true/false
- `path` 完整路径
- `pathname` 路径
- `query` 查询参数
- `params` 路径参数
- `data` 由上一个路由发送来的数据
- `state` 由路由类控制的状态
- `id` 路由id，同一个规则，同一个 id
- `index` 路由序号，自增
- `prev` 上一个路由
- `next` 下一个路由（上下只保留一个，防止循环引用）
- `rule` 既定的规则
- `rewriteList` 重写历史
- `send(data)` 向下一个路由发送数据
 
 