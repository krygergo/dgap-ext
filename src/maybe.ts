export interface Maybe<T> {
    value?: T;
    error?: string;
    bind<U>(fun: (value: T) => Maybe<U>): Maybe<U>;
    bindAsync<U>(fun: (value: T) => Promise<Maybe<U>>): Promise<Maybe<U>>;
    map<U>(fun: (value: T) => U): Maybe<U>;
    mapAsync<U>(fun: (value: T) => Promise<U>): Promise<Maybe<U>>;
}

export function some<T>(value?: T, error?: string): Maybe<T> {
    return {
        value,
        bind(fun) {
            if (this.value === undefined) {
                error = this.error ? this.error : error;
                return some();
            }
            return fun(this.value);   
        },
        async bindAsync(fun) {
            if (this.value === undefined) {
                error = this.error ? this.error : error;
                return some();
            }
            return fun(this.value);   
        },
        map(fun) {
            if (this.value === undefined) {
                error = this.error ? this.error : error;
                return some();
            }
            return some(fun(this.value));
        },
        async mapAsync(fun) {
            if (this.value === undefined) {
                error = this.error ? this.error : error;
                return some();
            }
            return some(await fun(this.value));
        }
    };
}
