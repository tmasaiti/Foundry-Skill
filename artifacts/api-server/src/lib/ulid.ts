import { randomBytes } from "crypto";

const ENCODING = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const ENCODING_LEN = ENCODING.length;
const TIME_LEN = 10;
const RANDOM_LEN = 16;

function encodeTime(now: number, len: number): string {
  let str = "";
  let t = now;
  for (let i = len - 1; i >= 0; i--) {
    const mod = t % ENCODING_LEN;
    str = ENCODING[mod] + str;
    t = Math.floor(t / ENCODING_LEN);
  }
  return str;
}

function encodeRandom(len: number): string {
  const bytes = randomBytes(Math.ceil(len * 5 / 8));
  let str = "";
  let bitsBuffer = 0;
  let bitsInBuffer = 0;
  let byteIdx = 0;

  for (let i = 0; i < len; i++) {
    if (bitsInBuffer < 5) {
      bitsBuffer = (bitsBuffer << 8) | bytes[byteIdx++];
      bitsInBuffer += 8;
    }
    bitsInBuffer -= 5;
    str += ENCODING[(bitsBuffer >> bitsInBuffer) & 0x1f];
  }

  return str;
}

function ulid(): string {
  return encodeTime(Date.now(), TIME_LEN) + encodeRandom(RANDOM_LEN);
}

export function makeId(prefix: string): string {
  return `${prefix}_${ulid()}`;
}
