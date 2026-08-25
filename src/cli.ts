#!/usr/bin/env node
import { SnapshotCapture, printUsage } from "./capture.js";

const args = process.argv.slice(2);
if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
  printUsage();
  process.exit(args.length === 0 ? 1 : 0);
}

const cap = new SnapshotCapture();
cap.run(args).catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
