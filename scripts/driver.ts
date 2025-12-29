/**
 * Hall of Fame driver script
 *      -- run the script with --
 *  npx tsx scripts/driver.ts
 *
 * or with options:
 *
 *  npx tsx scripts/driver.ts --fast (ignores the delay time set)
 *
 * - Reads the deployer "mnemonic" from settings/Mainnet.toml
 * - Derives the account private key
 * - Interacts with the deployed mainnet contract:
 *     SP1GNDB8SXJ51GBMSVVXMWGTPRFHGSMWNNBEY25A4.halloffame
 * - Mode:
 *     auto: Randomly increments counter or submits a score
 * - Waits a random interval between each call:
 *     10m (default)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { STACKS_MAINNET } from "@stacks/network";
import {
  AnchorMode,
  PostConditionMode,
  makeContractCall,
  broadcastTransaction,
  fetchCallReadOnlyFunction,
  cvToString,
  uintCV,
  cvToJSON
} from "@stacks/transactions";
import { generateWallet, getStxAddress } from "@stacks/wallet-sdk";
import * as TOML from "toml";

type NetworkSettings = {
  network?: {
    name?: string;
    stacks_node_rpc_address?: string;
    deployment_fee_rate?: number;
  };
  accounts?: {
    deployer?: {
      mnemonic?: string;
    };
  };
};

// CONTRACT DETAILS
const CONTRACT_ADDRESS = "SP1GNDB8SXJ51GBMSVVXMWGTPRFHGSMWNNBEY25A4";
const CONTRACT_NAME = "halloffame";

// Function names
const FN_INCREMENT = "increment";
const FN_SUBMIT_SCORE = "submit-score";
const FN_GET_COUNTER = "get-counter";

// Reasonable default fee in microstacks for contract-call
const DEFAULT_FEE_USTX = 10000;

// Parse command-line arguments
const FAST = process.argv.includes("--fast");

// Random delay choices (milliseconds)
let DELAY_CHOICES_MS = [
  600_000, // 10 minutes (default interval)
];
if (FAST) {
  // Shorten delays for a quick smoke run
  DELAY_CHOICES_MS = [
    10_000, // 10 sec
    20_000, // 20 sec
    30_000, // 30 sec
  ];
}

// Helper to get current file dir (ESM-compatible)
function thisDirname(): string {
  const __filename = fileURLToPath(import.meta.url);
  return path.dirname(__filename);
}

async function readMainnetMnemonic(): Promise<string> {
  const baseDir = thisDirname();
  // Resolve ../settings/Mainnet.toml relative to this file
  const settingsPath = path.resolve(baseDir, "../settings/Mainnet.toml");

  try {
    const raw = await fs.readFile(settingsPath, "utf8");
    const parsed = TOML.parse(raw) as NetworkSettings;

    const mnemonic = parsed?.accounts?.deployer?.mnemonic;
    if (!mnemonic || mnemonic.includes("<YOUR PRIVATE MAINNET MNEMONIC HERE>")) {
      throw new Error(
        `Mnemonic not found in ${settingsPath}. Please set [accounts.deployer].mnemonic.`
      );
    }
    return mnemonic.trim();
  } catch (error) {
     console.error(`Error reading settings file at ${settingsPath}`);
     throw error;
  }
}

async function deriveSenderFromMnemonic(mnemonic: string) {
  const wallet = await generateWallet({
    secretKey: mnemonic,
    password: "",
  });
  const account = wallet.accounts[0];

  function normalizeSenderKey(key: string): string {
    let k = (key || "").trim();
    if (k.startsWith("0x") || k.startsWith("0X")) k = k.slice(2);
    return k;
  }

  const rawKey = account.stxPrivateKey || "";
  const senderKey = normalizeSenderKey(rawKey); 
  const senderAddress = getStxAddress({ account });

  console.log(
    `Derived sender key length: ${senderKey.length} hex chars (address: ${senderAddress})`
  );

  return { senderKey, senderAddress };
}

function pickRandomDelayMs(): number {
  const i = Math.floor(Math.random() * DELAY_CHOICES_MS.length);
  return DELAY_CHOICES_MS[i];
}

function delay(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    if (signal?.aborted) {
      clearTimeout(timer);
      return reject(new Error("aborted"));
    }
    signal?.addEventListener("abort", onAbort);
  });
}

async function readCounter(network: any, senderAddress: string) {
  const res = await fetchCallReadOnlyFunction({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName: FN_GET_COUNTER,
    functionArgs: [],
    network,
    senderAddress,
  });
  const json = cvToJSON(res);
  return json.value?.value || "0";
}

async function contractCall(
  network: any,
  senderKey: string,
  functionName: string,
  functionArgs: any[] = []
) {
  console.log(
    `Preparing contract-call tx for: ${functionName}${
      functionArgs.length > 0 ? " with args" : ""
    }`
  );
  
  const tx = await makeContractCall({
    contractAddress: CONTRACT_ADDRESS,
    contractName: CONTRACT_NAME,
    functionName,
    functionArgs,
    network,
    senderKey,
    fee: DEFAULT_FEE_USTX,
    postConditionMode: PostConditionMode.Allow,
  });

  try {
    const resp = await broadcastTransaction({ transaction: tx, network });
    const txid =
      typeof resp === "string"
        ? resp
        : (resp as any).txid || "unknown-txid";
    console.log(`Broadcast response for ${functionName}: ${txid}`);
    return txid;
  } catch (e: any) {
    const reason = e?.message || "unknown-error";
    throw new Error(`Broadcast failed for ${functionName}: ${reason}`);
  }
}

async function runAutoMode(
  network: any,
  senderKey: string,
  senderAddress: string,
  stopSignal: AbortSignal
) {
  console.log(
    "Running in AUTO mode: will interact every ~10 minutes (or faster with --fast)"
  );
  let keepRunning = true;
  let iteration = 0;

  stopSignal.addEventListener("abort", () => {
    keepRunning = false;
  });

  while (keepRunning) {
    iteration++;
    
    // 50/50 chance to increment or submit score
    const isIncrement = Math.random() > 0.5;
    const functionName = isIncrement ? FN_INCREMENT : FN_SUBMIT_SCORE;
    
    // Prepare args
    let args: any[] = [];
    if (!isIncrement) {
      // Random score between 100 and 1000
      const score = Math.floor(Math.random() * 900) + 100;
      args = [uintCV(score)];
      console.log(`Action: Submit Score (${score})`);
    } else {
      console.log(`Action: Increment Counter`);
    }

    const waitMs = pickRandomDelayMs();
    const seconds = Math.round(waitMs / 1000);
    const minutes = Math.round(seconds / 60);

    console.log(
      `Waiting ~${minutes > 0 ? minutes + "m" : seconds + "s"} before next call...`
    );

    try {
      await delay(waitMs, stopSignal);
    } catch {
      break;
    }

    console.log(`Calling ${functionName} (#${iteration})...`);
    
    let txid: string | null = null;
    try {
        txid = await contractCall(network, senderKey, functionName, args);
        console.log(`Broadcasted: ${txid}`);
    } catch (err) {
        console.warn(`Failed: ${(err as Error).message}`);
    }

    if (txid) {
      try {
        const count = await readCounter(network, senderAddress);
        console.log(`Current counter (read-only): ${count}`);
      } catch (re) {}
    }
  }
}

async function main() {
  console.log("Hall of Fame driver starting...");
  if (FAST) console.log("FAST mode enabled: shortened delays");

  // 1) Network
  const network = { ...STACKS_MAINNET, fetchFn: fetch };

  // 2) Load mnemonic and derive sender
  const mnemonic = await readMainnetMnemonic();
  const { senderKey, senderAddress } = await deriveSenderFromMnemonic(mnemonic);

  console.log(`Using sender address: ${senderAddress}`);
  console.log(`Target contract: ${CONTRACT_ADDRESS}.${CONTRACT_NAME} (mainnet)`);

  // 3) Continuous run
  const stopController = new AbortController();
  const stopSignal = stopController.signal;
  process.on("SIGINT", () => {
    console.log("\nReceived SIGINT. Stopping now...");
    stopController.abort();
  });

  await runAutoMode(network, senderKey, senderAddress, stopSignal);
  console.log("Driver stopped.");
}

// Run
main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
