#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore, collection, getDocs, doc, writeBatch, serverTimestamp } from "firebase/firestore";

const APPLY = process.argv.includes("--apply");
const OVERWRITE = process.argv.includes("--overwrite");

const projectRoot = process.cwd();
const envPath = path.join(projectRoot, ".env.local");
const sourcePath = path.join(projectRoot, "src/utils/problems/clean_problems.json");

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

function normalizeText(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\r\n/g, "\n")
    .trim();
}

function parseExamplesFromDescription(description) {
  const text = normalizeText(description);
  if (!text) return [];

  const blocks = [];
  const blockRegex = /Example\s+\d+:([\s\S]*?)(?=\n\s*Example\s+\d+:|\n\s*Constraints:|$)/gi;
  let match = null;

  while ((match = blockRegex.exec(text)) !== null) {
    blocks.push(match[1]);
  }

  const testcases = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    const inputMatch = block.match(/Input:\s*([\s\S]*?)(?=\n\s*Output:|$)/i);
    const outputMatch = block.match(/Output:\s*([\s\S]*?)(?=\n\s*Explanation:|\n\s*Note:|\n\s*Constraints:|\n\s*Example\s+\d+:|$)/i);

    if (!inputMatch || !outputMatch) continue;

    const input = normalizeText(inputMatch[1]);
    const expectedOutput = normalizeText(outputMatch[1]);

    if (!input || !expectedOutput) continue;

    testcases.push({
      id: `example-${index + 1}`,
      input,
      expectedOutput,
      isHidden: false,
      source: "clean_problems.description",
      exampleIndex: index + 1,
    });
  }

  return testcases;
}

function chunkArray(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) chunks.push(items.slice(i, i + size));
  return chunks;
}

async function main() {
  loadEnvFile(envPath);

  const config = getFirebaseConfigFromEnv();
  const app = getApps().length ? getApp() : initializeApp(config);
  const db = getFirestore(app);

  if (!fs.existsSync(sourcePath)) {
    throw new Error(`Source file not found: ${sourcePath}`);
  }

  const sourceItems = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const sourceByLeetcodeId = new Map();
  for (const item of sourceItems) {
    if (item && typeof item.id === "number") {
      sourceByLeetcodeId.set(item.id, item);
    }
  }

  const questionsSnap = await getDocs(collection(db, "questions"));
  const plannedWrites = [];
  let matchedQuestions = 0;
  let extractedCases = 0;
  let unmatchedQuestions = 0;
  const noExamples = [];

  for (const questionDoc of questionsSnap.docs) {
    const data = questionDoc.data();
    const leetcodeId = Number(data.id);

    if (!Number.isFinite(leetcodeId)) {
      unmatchedQuestions += 1;
      continue;
    }

    const source = sourceByLeetcodeId.get(leetcodeId);
    if (!source) {
      unmatchedQuestions += 1;
      continue;
    }

    matchedQuestions += 1;
    const parsed = parseExamplesFromDescription(source.description);

    if (parsed.length === 0) {
      noExamples.push({ questionDocId: questionDoc.id, leetcodeId, title: data.title || source.title || "" });
      continue;
    }

    extractedCases += parsed.length;

    for (const tc of parsed) {
      plannedWrites.push({
        ref: doc(db, "questions", questionDoc.id, "testcases", tc.id),
        data: {
          input: tc.input,
          expectedOutput: tc.expectedOutput,
          isHidden: tc.isHidden,
          source: tc.source,
          exampleIndex: tc.exampleIndex,
          leetcodeId,
          updatedAt: serverTimestamp(),
          ...(OVERWRITE ? {} : { createdAt: serverTimestamp() }),
        },
        overwrite: OVERWRITE,
      });
    }
  }

  console.log("\nSeed plan from clean_problems.json");
  console.log("---------------------------------");
  console.log(`questions scanned:           ${questionsSnap.size}`);
  console.log(`questions matched by id:     ${matchedQuestions}`);
  console.log(`questions unmatched by id:   ${unmatchedQuestions}`);
  console.log(`questions with 0 examples:   ${noExamples.length}`);
  console.log(`testcase docs planned:       ${plannedWrites.length}`);
  console.log(`total extracted examples:    ${extractedCases}`);
  console.log(`mode:                        ${APPLY ? "APPLY" : "DRY-RUN"}`);
  console.log(`overwrite existing docs:     ${OVERWRITE ? "YES" : "NO (merge)"}`);

  if (noExamples.length) {
    console.log("\nSample questions with no extracted examples:");
    for (const item of noExamples.slice(0, 10)) {
      console.log(`- ${item.questionDocId} (leetcodeId=${item.leetcodeId}) ${item.title}`);
    }
    if (noExamples.length > 10) {
      console.log(`...and ${noExamples.length - 10} more`);
    }
  }

  if (!APPLY) {
    console.log("\nDry-run only. Re-run with --apply to write to Firestore.");
    return;
  }

  if (plannedWrites.length === 0) {
    console.log("\nNo writes planned. Nothing to do.");
    return;
  }

  const writeChunks = chunkArray(plannedWrites, 450);
  for (let i = 0; i < writeChunks.length; i += 1) {
    const batch = writeBatch(db);
    for (const item of writeChunks[i]) {
      batch.set(item.ref, item.data, { merge: !item.overwrite });
    }
    await batch.commit();
    console.log(`Committed batch ${i + 1}/${writeChunks.length}`);
  }

  console.log("\nSeeding completed.");
}

main().catch((error) => {
  console.error("Failed to seed Firestore testcases.");
  console.error(String(error?.message || error));
  process.exit(1);
});
