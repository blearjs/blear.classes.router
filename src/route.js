/**
 * Route
 * @author ydr.me
 * @create 2018-03-07 10:16
 * @update 2018-03-07 10:16
 */


'use strict';

var Class = require('blear.classes.class');
var hashbang = require('blear.core.hashbang');
var object = require('blear.utils.object');
var time = require('blear.utils.time');
var url = require('blear.utils.url');

var nextTick = time.nextTick;
var routeId = 0;

var Route = Class.extend({
    className: 'Route',
    constructor: function (navigator) {
        var the = this;

        Route.parent(the);
        the[_navigator] = navigator;
        the.id = routeId++;
        object.assign(the, hashbang.parse());
    },

    /**
     * 赋值
     * @param data
     */
    assign: function (data) {
        object.assign(this, data);
    },

    /**
     * 解决路径
     * @param to
     * @returns {*}
     */
    resolve: function (to) {
        return url.resolve(this.href, to);
    },

    /**
     * 跳转
     * @param to
     */
    redirect: function (to) {
        return this[_navigator].redirect(to);
    },

    /**
     * 重写
     * @param to
     */
    rewrite: function (to) {
        return this[_navigator].rewrite(to);
    },

    /**
     * 设置查询参数
     * @param key
     * @param val
     */
    setQuery: function (key, val) {
        return this[_navigator].setQuery(key, val);
    },

    /**
     * 移除查询参数
     * @param key
     */
    removeQuery: function (key) {
        return this[_navigator].removeQuery(key);
    },

    /**
     * 销毁
     */
    destroy: function () {
        Route.invoke('destroy', this);
    }
});
var sole = Route.sole;
var _navigator = sole();

module.exports = Route;
