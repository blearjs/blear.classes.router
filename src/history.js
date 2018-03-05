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
     * @returns {History}
     */
    forward: function (item) {
        var the = this;

        // 删除当前游标之后的历史记录
        if (the.length - 1 > the.active) {
            the.list.splice(the.active, the.length - the.active - 1);
        }

        the.list.push(wrap(item));
        the.active++;
        the.length++;
        return the;
    },

    /**
     * 后退
     * @returns {*}
     */
    backward: function () {
        var the = this;
        return the.list[--the.active];
    },

    /**
     * 替换
     * @param item
     */
    replace: function (item) {
        var the = this;
        the.list[the.active] = wrap(item);
    },

    /**
     * 根据索引值获取项目
     * @param index
     * @returns {*}
     */
    getItem: function (index) {
        return this.list[index];
    },

    /**
     * 销毁
     */
    destroy: function () {
        this.list = null;
    }
});


module.exports = History;

// =========================

/**
 * 包装
 * @param item
 * @returns {*}
 */
function wrap(item) {
    var timeStamp = Date.now();
    item.historyId = id++;
    item.timeStamp = item.timestamp = timeStamp;
    return item;
}

