"use strict";

import Actions from "./actions";
import _Buffer from "./buffer";
import {isEmpty} from "./funcs";
import Selector from "./selector";
import Table from "./table";
import {off, on} from "./dom";
import {SheetClip} from "./lib/sheetclip";

export let _gOptions = {
    deselectOutTableClick: true,
    enableChanging: false,
    enableHotkeys: true,
    getCellFn: function (cell, coord) {
        return cell.innerText;
    },
    ignoreClass: 'tcs-ignore',
    ignoreTfoot: false,
    ignoreThead: false,
    //TODO: mergePasting: true,
    mergePastingGlue: ' ',
    mouseBlockSelection: true,
    onSelect: function (e, cell) { },
    onStartSelect: function (e, cell) { },
    onFinishSelect: function (e) { },
    selectIgnoreClass: true,
    selectClass: 'tcs-select',
    setCellFn: function (cell, data, coord) {
        cell.innerText = data;
    },
    tableClass: 'tcs',// class added to table
    //frozen option:  usingSizeMatrix: true, // !!! for tables with merged cells, enabling is mandatory. Shutdown optimizes performance for simple tables.
};

export default class TableCellSelector {
    enableChanging;
    enableHotkeys;
    obActions;
    obBuffer;
    obSelector;
    obTable;
    _onKeyDown = (e) => this.onKeyDown(e);

    constructor (table, options, buffer) {
        if (typeof options === "object") Object.assign(_gOptions, options);
        this.enableChanging = _gOptions.enableChanging;
        this.enableHotkeys = _gOptions.enableHotkeys;
        this.obSelector = new Selector(table);
        this.obTable = new Table(table, this.obSelector, this);
        this.obTable.onStartSelect = _gOptions.onStartSelect;
        this.obTable.onFinishSelect = _gOptions.onFinishSelect;
        this.obTable.onSelect = _gOptions.onSelect;
        this.obActions = new Actions(this.obSelector);
        this.obBuffer = buffer;
        on(document.body, "keydown", this._onKeyDown);
    }

    static get Buffer () {
        return _Buffer;
    }

    /**
     * clear ([c1 [, c2]])
     * @param c1 - starting position [0, 0]
     * @param c2 - end position [1, 1]
     * @returns {boolean}
     */
    clear (c1, c2) {
        if (c1 === undefined) {
            let coords = this.obSelector.getSelectedRectangleCoords();
            if (coords === false) return false;
            [c1, c2] = coords;
        }

        if (c2 !== undefined) [c1, c2] = this.normalizeCoords(c1, c2);
        else c2 = c1 = this.normalizeCoords(c1);

        this.obActions.clear(c1, c2);
        return true;
    }

    /**
     * copy ([c1 [, c2]])
     * @param c1 - starting position [0, 0]
     * @param c2 - end position [1, 1]
     * @returns {array[][] | false}
     */
    copy (c1, c2) {
        if (c1 === undefined) {
            let coords = this.obSelector.getSelectedRectangleCoords();
            if (coords === false) return false;
            [c1, c2] = coords;
        }

        if (c2 !== undefined) [c1, c2] = this.normalizeCoords(c1, c2);
        else c2 = c1 = this.normalizeCoords(c1);

        const data = this.obActions.copy(c1, c2);
        if (this.obBuffer instanceof _Buffer &&  data !== false) {
            let str = SheetClip.stringify(data);
            this.obBuffer.copy(str);
        }
        return data;
    }

    /**
     * cut ([c1 [, c2]])
     * @param c1 - starting position [0, 0]
     * @param c2 - end position [1, 1]
     * @returns {array[][] | false}
     */
    cut (c1, c2) {
        if (c1 === undefined) {
            let coords = this.obSelector.getSelectedRectangleCoords();
            if (isEmpty(coords)) return false;
            [c1, c2] = coords;
        }

        if (c2 !== undefined) [c1, c2] = this.normalizeCoords(c1, c2);
        else c2 = c1 = this.normalizeCoords(c1);

        const data = this.obActions.cut(c1, c2);
        if (this.obBuffer instanceof _Buffer && data !== false) {
            let str = SheetClip.stringify(data);
            this.obBuffer.copy(str);
        }
        return data;
    }

    /**
     *
     * @returns {number}
     */
    deselect () {
        return this.obSelector.deselectAll();
    }

    /**
     *
     * @returns {array[] | false}
     */
    getCoords () {
        return this.obSelector.getSelectedRectangleCoords();
    }

    /**
     * initialize or re-initialize the size matrix
     */
    initSizeMatrix () {
        this.obSelector.initSizeMatrix();
    }


    /**
     * (c1 [, c2])
     * @param c1
     * @param c2
     * @returns {array[][] or array[]}
     */
    normalizeCoords (c1, c2) {
        // normalize
        c1[0] = parseInt(c1[0]) || 0;
        c1[1] = parseInt(c1[1]) || 0;
        if (c2 === undefined) {
            return c1;
        } else {
            c2[0] = parseInt(c2[0]) || 0;
            c2[1] = parseInt(c2[1]) || 0;
            let temp;
            if (c1[0] > c2[0]) {
                temp = c2[0];
                c2[0] = c1[0];
                c1[0] = temp;
            }
            if (c1[1] > c2[1]) {
                temp = c2[1];
                c2[1] = c1[1];
                c1[1] = temp;
            }
            return [c1, c2];
        }

        // throw new Error("Invalid coordinate");
    }

    onKeyDown (e) {
        if (!this.enableHotkeys) return;
        e = e || window.event;
        var key = e.which || e.keyCode; // keyCode detection
        var ctrl = e.ctrlKey ? e.ctrlKey : (key === 17); // ctrl detection

        if (this.obTable.isMouse && ctrl) {
            switch (key) {
            case 65: // a
                e.preventDefault();
                this.selectAll();
                break;
            case 67: // c
                this.copy();
                break;
            case 86: // v
                if (!this.enableChanging) break;
                if (this.obBuffer instanceof _Buffer) {
                    this.obBuffer.paste((str) => {
                        this.paste(SheetClip.parse(str));
                    });
                }
                break;
            case 88: // x
                if (!this.enableChanging) break;
                this.cut();
                break;
            case 46: // delete
            case 8: // backspase
                if (!this.enableChanging) break;
                this.clear();
                break;
            }
        }
    }

    set onStartSelect (fn) {
        this.obTable.onStartSelect = fn;
    }
    set onSelect (fn) {
        this.obTable.onSelect = fn;
    }
    set onFinishSelect (fn) {
        this.obTable.onFinishSelect = fn;
    }

    /**
     * paste (data [, c1 [, c2]])
     * @param data - array[][]
     * @param c1 - starting position [0, 0]
     * @param c2 - end position [1, 1]
     */
    paste (data, c1, c2) {
        if (c1 === undefined) {
            let coords = this.obSelector.getSelectedRectangleCoords();
            if (coords === false) return false;
            c1 = this.normalizeCoords(coords[0]);
        } else if (c2 !== undefined) {
            [c1, c2] = this.normalizeCoords(c1, c2);
            [c1, c2] = this.obSelector.getRectangleCoords(c1, c2);
        }
        this.obActions.paste(data, c1, c2);
        return true;
    }

    /**
     * select (c1 [, c2])
     * @param c1 - starting position [0, 0]
     * @param c2 - end position [1, 1]
     * @returns {boolean}
     */
    select (c1, c2) {
        this.obSelector.deselectAll();
        if (c2 !== undefined) {
            [c1, c2] = this.normalizeCoords(c1, c2);
        } else {
            c1 = this.normalizeCoords(c1);
        }
        return this.obSelector.select(c1, c2);
    }

    /**
     *
     * @returns {number}
     */
    selectAll () {
        return this.obSelector.selectAll();
    }

    destroy () {
        off(document.body, "keydown", this._onKeyDown);
        this.deselect();
        this.obTable.destroy();

        delete
        this.obActions,
        this.obBuffer,
        this.obSelector,
        this.obTable,
        this;
    }
}

global.TableCellSelector = TableCellSelector;
