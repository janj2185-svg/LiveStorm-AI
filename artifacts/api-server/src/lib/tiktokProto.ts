/**
 * Minimal protobuf decoders for TikTok LIVE WebSocket messages.
 *
 * Uses `pbf` v5 (PbfReader) instead of `protobufjs` — protobufjs is entirely
 * blocked by Replit's supply-chain security firewall across all versions.
 *
 * Field numbers match TikTok's publicly known webcast protobuf schema.
 * Unknown/future fields are silently skipped by pbf's auto-skip behaviour.
 */

import { PbfReader } from "pbf";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TikTokUser {
  uniqueId: string;
  nickname: string;
}

export interface WebcastInnerMessage {
  method: string;
  payload: Uint8Array;
  msgId: number;
}

export interface WebcastResponse {
  messages: WebcastInnerMessage[];
  cursor: string;
  needAck: boolean;
  internalExt: string;
  wsParam?: { name: string; value: string };
}

// ── Internal field readers ────────────────────────────────────────────────────

function readTikTokUserFields(tag: number, user: TikTokUser, pbf: PbfReader): void {
  if (tag === 3) user.nickname = pbf.readString();
  else if (tag === 38) user.uniqueId = pbf.readString();
}

function readInnerMessageFields(tag: number, msg: WebcastInnerMessage, pbf: PbfReader): void {
  if (tag === 1) msg.method = pbf.readString();
  else if (tag === 2) msg.payload = pbf.readBytes();
  else if (tag === 3) msg.msgId = pbf.readVarint(true);
}

function readWsParamFields(tag: number, param: { name: string; value: string }, pbf: PbfReader): void {
  if (tag === 1) param.name = pbf.readString();
  else if (tag === 2) param.value = pbf.readString();
}

// ── Public decoders ───────────────────────────────────────────────────────────

export function decodeWebcastResponse(data: Uint8Array): WebcastResponse {
  const pbf = new PbfReader(data);
  return pbf.readFields<WebcastResponse>((tag, resp, pbf) => {
    if (tag === 1) {
      resp.messages.push(
        pbf.readMessage<WebcastInnerMessage>(readInnerMessageFields, {
          method: "",
          payload: new Uint8Array(0),
          msgId: 0,
        }),
      );
    } else if (tag === 2) {
      resp.cursor = pbf.readString();
    } else if (tag === 7) {
      resp.wsParam = pbf.readMessage<{ name: string; value: string }>(readWsParamFields, {
        name: "imprp",
        value: "",
      });
    } else if (tag === 9) {
      resp.needAck = pbf.readBoolean();
    } else if (tag === 10) {
      resp.internalExt = pbf.readString();
    }
  }, { messages: [], cursor: "", needAck: false, internalExt: "" });
}

export function decodeChatMessage(data: Uint8Array): { user: TikTokUser; comment: string } {
  const pbf = new PbfReader(data);
  return pbf.readFields<{ user: TikTokUser; comment: string }>((tag, obj, pbf) => {
    if (tag === 2) obj.user = pbf.readMessage<TikTokUser>(readTikTokUserFields, { uniqueId: "", nickname: "" });
    else if (tag === 3) obj.comment = pbf.readString();
  }, { user: { uniqueId: "", nickname: "" }, comment: "" });
}

export function decodeGiftMessage(data: Uint8Array): {
  user: TikTokUser;
  giftName: string;
  diamondCount: number;
  repeatCount: number;
  repeatEnd: boolean;
} {
  const result = {
    user: { uniqueId: "", nickname: "" } as TikTokUser,
    giftName: "Gift",
    diamondCount: 0,
    repeatCount: 1,
    repeatEnd: false,
  };
  const pbf = new PbfReader(data);
  pbf.readFields((tag, _obj, pbf) => {
    if (tag === 2) {
      result.user = pbf.readMessage<TikTokUser>(readTikTokUserFields, { uniqueId: "", nickname: "" });
    } else if (tag === 9) {
      result.repeatCount = pbf.readVarint();
    } else if (tag === 10) {
      result.repeatEnd = pbf.readVarint() === 1;
    } else if (tag === 15) {
      pbf.readMessage((tag, _g, pbf) => {
        if (tag === 5) result.diamondCount = pbf.readVarint();
        else if (tag === 16) result.giftName = pbf.readString();
      }, {});
    }
  }, {});
  return result;
}

export function decodeLikeMessage(data: Uint8Array): { user: TikTokUser; count: number; total: number } {
  const pbf = new PbfReader(data);
  return pbf.readFields<{ user: TikTokUser; count: number; total: number }>((tag, obj, pbf) => {
    if (tag === 2) obj.count = pbf.readVarint(true);
    else if (tag === 3) obj.total = pbf.readVarint(true);
    else if (tag === 5) obj.user = pbf.readMessage<TikTokUser>(readTikTokUserFields, { uniqueId: "", nickname: "" });
  }, { user: { uniqueId: "", nickname: "" }, count: 0, total: 0 });
}

export function decodeSocialMessage(data: Uint8Array): { user: TikTokUser; displayType: string } {
  const pbf = new PbfReader(data);
  return pbf.readFields<{ user: TikTokUser; displayType: string }>((tag, obj, pbf) => {
    if (tag === 2) obj.user = pbf.readMessage<TikTokUser>(readTikTokUserFields, { uniqueId: "", nickname: "" });
    else if (tag === 8) obj.displayType = pbf.readString();
  }, { user: { uniqueId: "", nickname: "" }, displayType: "" });
}

export function decodeMemberMessage(data: Uint8Array): { user: TikTokUser; actionId: number } {
  const pbf = new PbfReader(data);
  return pbf.readFields<{ user: TikTokUser; actionId: number }>((tag, obj, pbf) => {
    if (tag === 2) obj.user = pbf.readMessage<TikTokUser>(readTikTokUserFields, { uniqueId: "", nickname: "" });
    else if (tag === 10) obj.actionId = pbf.readVarint();
  }, { user: { uniqueId: "", nickname: "" }, actionId: 0 });
}

export function decodeRoomUserSeqMessage(data: Uint8Array): { viewerCount: number } {
  const pbf = new PbfReader(data);
  return pbf.readFields<{ viewerCount: number }>((tag, obj, pbf) => {
    if (tag === 3) obj.viewerCount = pbf.readVarint(true);
  }, { viewerCount: 0 });
}
