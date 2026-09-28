import { createInterface } from "node:readline";
import { pbkdf2Sync, randomBytes } from "node:crypto";

if (!process.stdin.isTTY || !process.stdout.isTTY) {
  console.error("Run this command in a terminal so the PIN can be entered privately.");
  process.exit(1);
}

const input = process.stdin;
const output = process.stdout;
const prompt = "Enter a new 6-digit team deletion PIN: ";
const pin = await new Promise((resolve, reject) => {
  const previousRawMode = input.isRaw;
  let value = "";
  output.write(prompt);
  input.setRawMode(true);
  input.resume();
  const finish = (error) => {
    input.off("data", onData);
    input.setRawMode(previousRawMode);
    input.pause();
    output.write("\n");
    error ? reject(error) : resolve(value);
  };
  const onData = (chunk) => {
    for (const character of chunk.toString("utf8")) {
      if (character === "\u0003") return finish(new Error("Cancelled."));
      if (character === "\r" || character === "\n") return finish();
      if ((character === "\u007f" || character === "\b") && value.length) {
        value = value.slice(0, -1);
        output.write("\b \b");
      } else if (/^\d$/.test(character) && value.length < 6) {
        value += character;
        output.write("*");
      }
    }
  };
  input.on("data", onData);
}).catch((error) => {
  console.error(error.message);
  process.exit(1);
});

if (!/^\d{6}$/.test(pin)) {
  console.error("The PIN must contain exactly 6 digits.");
  process.exit(1);
}

const salt = randomBytes(16);
const hash = pbkdf2Sync(pin, salt, 310_000, 32, "sha256");
console.log(`TEAM_DELETE_PIN_HASH=pbkdf2:sha256:310000:${salt.toString("hex")}:${hash.toString("hex")}`);
