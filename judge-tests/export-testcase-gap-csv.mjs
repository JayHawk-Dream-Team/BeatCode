#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const defaultTarget = 10;
const targetArg = process.argv.find((arg) => arg.startsWith("--target="));
const outArg = process.argv.find((arg) => arg.startsWith("--out="));

const target = targetArg ? Number(targetArg.split("=")[1]) : defaultTarget;
if (!Number.isFinite(target) || target < 0) {
  console.error("Invalid --target value. Use a non-negative number.");
  process.exit(2);
}

const projectRoot = process.cwd();
const outPath = outArg
  ? path.resolve(projectRoot, outArg.split("=")[1])
  : path.resolve(projectRoot, "judge-tests/testcase-gap-report.csv");
const envPath = path.join(projectRoot, ".env.local");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const idx = line.indexOf("=");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['\"]|['\"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function getFirebaseConfigFromEnv() {
  const required = [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
    "NEXT_PUBLIC_FIREBASE_APP_ID",
  ];

  const missing = required.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  return {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };
}

function countFromDocFields(data) {
  const candidates = [
    data.examples,
    data.testCases,
    data.testcases,
    data.tests,
    data.visibleTests,
    data.hiddenTests,
  ];

  let maxCount = 0;
  for (const entry of candidates) {
    if (Array.isArray(entry)) maxCount = Math.max(maxCount, entry.length);
  }

  if (data.testCases && typeof data.testCases === "object" && !Array.isArray(data.testCases)) {
    const fromNested = [data.testCases.visible, data.testCases.hidden]
      .filter(Array.isArray)
      .reduce((acc, arr) => acc + arr.length, 0);
    maxCount = Math.max(maxCount, fromNested);
  }

  return maxCount;
}

async function countSubcollectionCases(db, questionId) {
  const subNames = ["testcases", "tests", "cases"];
  let maxCount = 0;

  for (const subName of subNames) {
    try {
      const snap = await getDocs(collection(db, "questions", questionId, subName));
      maxCount = Math.max(maxCount, snap.size);
    } catch {
      // Ignore missing/unauthorized subcollection reads.
    }
  }

  return maxCount;
}

function toCsvValue(value) {
  const stringValue = String(value ?? "");
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

async function main() {
  loadEnvFile(envPath);

  const config = getFirebaseConfigFromEnv();
  const app = getApps().length ? getApp() : initializeApp(config);
  const db = getFirestore(app);

  const questionsSnap = await getDocs(collection(db, "questions"));
  const rows = [];

  for (const questionDoc of questionsSnap.docs) {
    const data = questionDoc.data();
    const docCount = countFromDocFields(data);
    const subCount = await countSubcollectionCases(db, questionDoc.id);
    const currentCount = Math.max(docCount, subCount);
    const shortfall = Math.max(0, target - currentCount);

    rows.push({
      questionDocId: questionDoc.id,
      leetcodeId: data.id ?? "",
      title: data.title ?? "",
      currentCount,
      target,
      shortfall,
    });
  }

  rows.sort((a, b) => {
    if (b.shortfall !== a.shortfall) return b.shortfall - a.shortfall;
    if (a.currentCount !== b.currentCount) return a.currentCount - b.currentCount;
    return String(a.leetcodeId).localeCompare(String(b.leetcodeId), undefined, { numeric: true });
  });

  const header = ["questionDocId", "leetcodeId", "title", "currentCount", "target", "shortfall"];
  const lines = [header.join(",")];
  for (const row of rows) {
    lines.push(
      [
        toCsvValue(row.questionDocId),
        toCsvValue(row.leetcodeId),
        toCsvValue(row.title),
        toCsvValue(row.currentCount),
        toCsvValue(row.target),
        toCsvValue(row.shortfall),
      ].join(",")
    );
  }

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, `${lines.join("\n")}\n`, "utf8");

  const withGap = rows.filter((r) => r.shortfall > 0).length;
  const noGap = rows.length - withGap;

  console.log("\nCSV gap report generated");
  console.log("------------------------");
  console.log(`output:                 ${path.relative(projectRoot, outPath)}`);
  console.log(`questions scanned:      ${rows.length}`);
  console.log(`target per question:    ${target}`);
  console.log(`questions with gap:     ${withGap}`);
  console.log(`questions meeting goal: ${noGap}`);
}

main().catch((error) => {
  console.error("Failed to generate testcase gap CSV.");
  console.error(String(error?.message || error));
  process.exit(1);
});
