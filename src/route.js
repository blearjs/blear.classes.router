/**
 * Route
 * @author ydr.me
 * @create 2018-03-07 10:16
 * @update 2018-03-07 10:16
 */


'use strict';

var Class = require('blear.classes.class');
var object = require('blear.utils.object');
var time = require('blear.utils.time');
var url = require('blear.utils.url');
var array = require('blear.utils.array');
var typeis = require('blear.utils.typeis');

var nextTick = time.nextTick;
var routeId = 0;

var Route = Class.extend({
    className: 'Route',
    constructor: function (navigator, strict, ignoreCase) {
        var the = this;

        Route.parent(the);
        the[_navigator] = navigator;
        the[_strict] = strict;
        the[_ignoreCase] = ignoreCase;
        the.id = routeId++;
        the.meta = {};
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
     * 匹配路径
     * @param path
     * @returns {boolean|object|array}
     */
    match: function (path) {
        var the = this;
        var matched = false;
        var pathname = the.pathname;

        // 具名路径
        if (path) {
            switch (typeis(path)) {
                case 'string':
                    matched = url.matchPath(pathname, path, {
                        strict: the[_strict],
                        ignoreCase: the[_ignoreCase]
                    });
                    break;

                case 'regexp':
                    var matches = pathname.match(path);

                    if (matches) {
                        matched = array.from(matches);
                    }
                    break;
            }
        }
        // 匿名路径
        else {
            matched = true;
        }

        return matched;
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
var _strict = sole();
var _ignoreCase = sole();

module.exports = Route;
