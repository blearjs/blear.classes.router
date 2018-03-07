/**
 * 历史管理
 * @author ydr.me
 * @create 2018-03-05 10:52
 * @update 2018-03-05 10:52
 */


'use strict';

var Class = require('blear.classes.class');

var id = 0;

var History = Class.extend({
    className: 'History',
    constructor: function () {
        var the = this;

        the.list = [];
        the.active = -1;
        the.length = 0;
    },

    /**
     * 前进
     * @param item
     * @returns {*}
     */
    forward: function (item) {
        var the = this;

        // 删除当前游标之后的历史记录
        if (the.length - 1 > the.active) {
            the.list.splice(the.active, the.length - the.active - 1);
        }

        the.list.push(the[_wrap](item));
        the.active++;
        the.length++;
        return item;
    },

    /**
     * 后退
     * @param item
     * @returns {*}
     */
    backward: function (item) {
        var the = this;

        if (the.active > 0) {
            var prev = the.list[the.active];
            item = the.list[--the.active];
            item.prev = prev;
        } else {
            // 主要用于，浏览器在刷新页面之后，浏览器历史栈还是保留的
            // 这时候返回页面需要用插入的方式进行
            the.list.unshift(the[_wrap](item));
            the.list[1].prev = item;
            item.prev = null;
            the.length++;
        }

        return item;
    },

    /**
     * 替换
     * @param item
     */
    replace: function (item) {
        var the = this;
        the.list[the.active] = the[_wrap](item);
        return item;
    },

    /**
     * 销毁
     */
    destroy: function () {
        this.list = null;
    }
});

var prop = History.prototype;
var sole = History.sole;
var _wrap = sole();

/**
 * 包装
 * @param item
 * @returns {*}
 */
prop[_wrap] = function (item) {
    var the = this;
    item.prev = the.list[the.active] || null;
    item.historyId = id++;
    item.timestamp = Date.now();
    return item;
};


module.exports = History;

// =========================

