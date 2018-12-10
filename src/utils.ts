
export function p<T>(fn: Function, context?: any): (...args: any[]) => Promise<T> {
    return function(...args: any[]) {
        context = context || this;
        return new Promise<T>((resolve, reject) => {
            fn.apply(context, [...args, (error: Error, result: any) => {
                if (error) return reject(error);
                else return (resolve(result));
            }]);
        });
    }
}