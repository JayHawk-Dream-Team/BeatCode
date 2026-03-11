#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const projectRoot = process.cwd();
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

loadEnvFile(envPath);

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
  console.error("Missing required env vars:", missing.join(", "));
  console.error("Fill .env.local and rerun.");
  process.exit(2);
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

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

async function countSubcollection(questionId) {
  const subNames = ["testcases", "tests", "cases"];
  let maxCount = 0;

  for (const subName of subNames) {
    try {
      const snap = await getDocs(collection(db, "questions", questionId, subName));
      maxCount = Math.max(maxCount, snap.size);
    } catch {
      // Ignore missing/unauthorized subcollection reads and continue.
    }
  }

  return maxCount;
}

async function main() {
  try {
    const questionsSnap = await getDocs(collection(db, "questions"));
    const totalQuestions = questionsSnap.size;

    if (!totalQuestions) {
      console.log("No documents found in questions collection.");
      return;
    }

    let withAnyCases = 0;
    let zeroCases = 0;
    let minCases = Number.POSITIVE_INFINITY;
    let maxCases = 0;
    let totalCases = 0;
    const belowTen = [];

    for (const docSnap of questionsSnap.docs) {
      const data = docSnap.data();
      const fromDoc = countFromDocFields(data);
      const fromSub = await countSubcollection(docSnap.id);
      const count = Math.max(fromDoc, fromSub);

      totalCases += count;
      minCases = Math.min(minCases, count);
      maxCases = Math.max(maxCases, count);

      if (count > 0) withAnyCases += 1;
      else zeroCases += 1;

      if (count < 10) belowTen.push({ id: docSnap.id, count });
    }

    const avgCases = totalCases / totalQuestions;

    console.log("\nFirestore testcase verification");
    console.log("--------------------------------");
    console.log(`questions total:        ${totalQuestions}`);
    console.log(`questions with cases:   ${withAnyCases}`);
    console.log(`questions with 0 cases: ${zeroCases}`);
    console.log(`total inferred cases:   ${totalCases}`);
    console.log(`min/avg/max per q:      ${minCases} / ${avgCases.toFixed(2)} / ${maxCases}`);

    if (belowTen.length) {
      console.log(`\nQuestions with <10 inferred cases (${belowTen.length}):`);
      for (const item of belowTen.slice(0, 30)) {
        console.log(`- ${item.id}: ${item.count}`);
      }
      if (belowTen.length > 30) {
        console.log(`...and ${belowTen.length - 30} more`);
      }
    }

    console.log("\nDone.");
  } catch (error) {
    console.error("Failed to verify Firestore testcases.");
    console.error(String(error?.message || error));
    process.exit(1);
  }
}

main();
