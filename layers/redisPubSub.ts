import {
  connect,
  Redis,
  RedisConnectOptions,
  RedisSubscription,
} from "https://deno.land/x/redis@v0.23.2/mod.ts";

import { Consumer } from "../mod.ts";
import { Layer } from "./index.ts";
import { ConsumerGroupMap } from "./utils.ts";

export class RedisPubSubLayer extends Layer {
  #redis: Redis | null = null;
  #redisPromise: Promise<Redis> | null = null;
  #pubsubRedis: Redis | null = null;
  #pubsubRedisPromise: Promise<Redis> | null = null;
  #redisSubscription: RedisSubscription | null = null;
  consumerGroupMap = new ConsumerGroupMap();
  constructor(
    private connectOptions: RedisConnectOptions = {
      hostname: "127.0.0.1",
      port: "6379",
    },
    private prefix: string = "",
  ) {
    super();
    // this.connect();
    if (!this.prefix) {
      this.prefix = "default_partition";
    }
  }
  connect = () => {
    const task1 = this.ensureRedisConnection();
    const task2 = this.ensurePubsubRedisConnection();
    return Promise.all([task1, task2]);
  };
  disconnect = () => {
    this.#redis?.close();
    this.#pubsubRedis?.close();
  };
  ensureRedisConnection = async () => {
    if (this.#redis) {
      return this.#redis;
    }
    if (this.#redisPromise) {
      return await this.#redisPromise;
    }
    this.#redisPromise = connect(this.connectOptions);
    this.#redis = await this.#redisPromise;
    return this.#redis;
  };
  ensurePubsubRedisConnection = async () => {
    if (this.#pubsubRedis) {
      return this.#pubsubRedis;
    }
    if (this.#pubsubRedisPromise) {
      return await this.#pubsubRedisPromise;
    }
    this.#pubsubRedisPromise = new Promise((resolve) =>
      connect(this.connectOptions).then(async (redis) => {
        if (this.#redisSubscription) {
          throw new Error("duplicated sub");
        }
        this.#redisSubscription = await redis.psubscribe(
          `${this.patternPrefix}.*`,
        );
        this.receivePatternMessages();
        resolve(redis);
      })
    );
    this.#pubsubRedis = await this.#pubsubRedisPromise;
    return this.#pubsubRedis;
  };
  // deno-lint-ignore require-await
  groupJoin = async (consumer: Consumer, groupName: string) => {
    this.consumerGroupMap.join(consumer, groupName);
  };
  // deno-lint-ignore require-await
  groupLeave = async (consumer: Consumer, groupName: string) => {
    this.consumerGroupMap.leave(consumer, groupName);
  };
  groupSend = async (
    groupName: string,
    message: string | Uint8Array,
  ) => {
    if (!this.#redisSubscription) {
      throw new Error("Sending message before subscription is established");
    }
    if (message instanceof Uint8Array) {
      throw new Error(
        "Binary data is not supported in RedisPubSubLayer at the moment.",
      );
    }
    const redis = await this.ensureRedisConnection();
    await redis?.publish(this.encodeChannelName(groupName), message);
  };
  removeConsumer = async (consumer: Consumer) => {
    const groups = this.consumerGroupMap.consumerToGroups.get(consumer);
    if (!groups) return;
    for (const group of groups) {
      await this.groupLeave(consumer, group);
    }
  };
  private receivePatternMessages = async () => {
    const sub = this.#redisSubscription;
    if (!sub) throw new Error("No sub");
    try {
      for await (const { channel, message } of sub.receive()) {
        const groupName = this.decodeChannelName(channel);
        const consumers = this.consumerGroupMap.getConsumers(groupName);
        for (const consumer of consumers) {
          await consumer.onGroupMessage(groupName, message);
        }
      }
    } catch (error) {
      if (!(error instanceof Deno.errors.Interrupted)) { // like cancelled error in Python?
        throw error;
      }
    }
  };
  private encodeChannelName(groupName: string) {
    return `${this.patternPrefix}.${groupName}`;
  }
  private decodeChannelName(name: string) {
    return name.substr(this.patternPrefix.length + 1);
  }
  private get patternPrefix() {
    return `OAKCHANNELS.${this.prefix}`;
  }
}
