import { Middleware, Router } from "https://deno.land/x/oak@v9.0.0/mod.ts";


class Consumer {

}

export const useChannels: Middleware = async (context, next) => {
    return await next();
}