import { Consumer, Layer } from "../mod.ts";

export class BroadcastChannelLayer extends Layer {
  // consumerToChannels = new WeakMap<Consumer, BroadcastChannel[]>();
  groupNameToChannel = new Map<string, BroadcastChannel>();
  groupChannelListenerMap = new Map<string, (event: MessageEvent) => void>();
  groupNameToConsumers = new Map<string, Consumer[]>();
  // deno-lint-ignore require-await
  groupJoin = async (consumer: Consumer, groupName: string) => {
    this.getChannel(groupName);
    const existing = this.groupNameToConsumers.get(groupName);
    if (existing) {
      existing.push(consumer);
    } else {
      this.groupNameToConsumers.set(groupName, [consumer]);
    }
  };
  // deno-lint-ignore require-await
  groupLeave = async (consumer: Consumer, groupName: string) => {
    let consumers = this.groupNameToConsumers.get(groupName) || [];
    if (!consumers) {
      return
    }
    consumers = consumers.filter((c) => c !== consumer);
    this.groupNameToConsumers.set(groupName, consumers);
    if (!consumers.length) {
      const channel = this.groupNameToChannel.get(groupName)
      if (!channel) return;
      channel.removeEventListener(
        "message",
        this.getGroupChannelListner(groupName),
      );
      this.groupChannelListenerMap.delete(groupName);
      this.groupNameToChannel.delete(groupName);
      channel.close();
    }
  };
  // deno-lint-ignore require-await
  groupSend = async (groupName: string, message: string | Uint8Array) => {
    const channel = this.getChannel(groupName);
    channel.postMessage(message);
    channel.dispatchEvent(new MessageEvent("message", {data: message}))
  };
  private getChannel(groupName: string) {
    let channel = this.groupNameToChannel.get(groupName);
    if (!channel) {
      channel = new BroadcastChannel(groupName);
      this.groupNameToChannel.set(groupName, channel);
      channel.addEventListener(
        "message",
        this.getGroupChannelListner(groupName),
      );
    }
    return channel;
  }
  private getGroupChannelListner = (groupName: string) => {
    let listerner = this.groupChannelListenerMap.get(groupName);
    if (!listerner) {
      listerner = this.onChannelMessage.bind(this, groupName);
      this.groupChannelListenerMap.set(groupName, listerner);
    }
    return listerner;
  }
  private onChannelMessage = (groupName: string, event: MessageEvent) => {
    const { data } = event;
    const consumers = this.groupNameToConsumers.get(groupName) || [];
    consumers.forEach(async (consumer) => {
      await consumer.onGroupMessage(groupName, data);
    });
  };
}
