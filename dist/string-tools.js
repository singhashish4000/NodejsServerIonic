"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const stringTools = {
    isValidInt(value) {
        if (typeof (value) === 'number' || typeof (value) === 'string') {
            let res = value.toString().match(/^[-+]?\d+$/);
            return (res && (res.length > 0)) ? true : false;
        }
        else {
            return false;
        }
    }
};
exports.stringTools = stringTools;
//# sourceMappingURL=string-tools.js.map