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

var Route = Class.extend({
    className: 'Route',
    constructor: function (options) {
        var the = this;

        the[_split] = options.split;
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
     * 解决查询参数
     * @param key
     * @param val
     * @returns {*}
     */
    resolveQuery: function (key, val) {
        return url.setQuery(this.href, key, val);
    },

    /**
     * 跳转
     * @param to
     */
    redirect: function (to) {
        var the = this;
        nextTick(function () {
            location.href = hashbang.set(the.resolve(to), the[_split]);
        });
    },

    /**
     * 重写
     * @param to
     */
    rewrite: function (to) {
        var the = this;
        nextTick(function () {
            location.replace(hashbang.set(the.resolve(to), the[_split]));
        });
    },

    /**
     * 设置查询参数
     * @param key
     * @param val
     */
    setQuery: function (key, val) {
        var the = this;
        nextTick(function () {
            location.replace(hashbang.setQuery(key, val, the[_split]));
        });
    },

    /**
     * 移除查询参数
     * @param key
     */
    removeQuery: function (key) {
        var the = this;
        nextTick(function () {
            location.replace(hashbang.removeQuery(key, the[_split]));
        });
    },

    /**
     * 销毁
     */
    destroy: function () {
        Route.invoke('destroy', this);
    }
});
var sole = Route.sole;
var _split = sole();

module.exports = Route;
