"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function p(fn, context) {
    return function (...args) {
        context = context || this;
        return new Promise((resolve, reject) => {
            fn.apply(context, [...args, (error, result) => {
                    if (error)
                        return reject(error);
                    else
                        return (resolve(result));
                }]);
        });
    };
}
exports.p = p;
//# sourceMappingURL=utils.js.map