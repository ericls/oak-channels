import {
  connect,
  Redis,
  RedisConnectOptions,
} from "https://deno.land/x/redis@v0.23.2/mod.ts";

import { Consumer } from "../mod.ts";
import { Layer } from "./index.ts";

const redis = await connect({
  hostname: "127.0.0.1",
  port: 6379,
});

export class RedisPubSubLayer extends Layer {
  #redis: Redis | null = null;
  #redisPromise: Promise<Redis> | null = null;
  constructor(private connectOptions: RedisConnectOptions) {
    super();
    this.ensureRedisConnection();
  }
  ensureRedisConnection = async () => {
    if (this.#redis) {
      return redis;
    }
    if (this.#redisPromise) {
      return await this.#redisPromise;
    }
    this.#redisPromise = connect(this.connectOptions);
  };
  groupJoin = async (consumer: Consumer, groupName: string) => {
    const redis = await this.ensureRedisConnection();
    redis?.psubscribe()
  };
  groupLeave = async (consumer: Consumer, groupName: string) => {
  };
  groupSend = async (
    groupName: string,
    message: string | Uint8Array,
  ) => {};
  removeConsumer = async () => {

  }
}
