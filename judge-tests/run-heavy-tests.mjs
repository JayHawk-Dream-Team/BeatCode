#!/usr/bin/env node

const baseUrl = (process.argv[2] || process.env.JUDGE_URL || "").replace(/\/$/, "");

if (!baseUrl) {
  console.error("Missing judge URL. Pass as arg or set JUDGE_URL.");
  process.exit(1);
}

async function post(path, payload) {
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = { nonJson: true };
  }
  return { status: res.status, data };
}

function pass(name) {
  console.log(`PASS  ${name}`);
}

function fail(name, detail) {
  console.error(`FAIL  ${name}`);
  if (detail) console.error(`      ${detail}`);
}

async function run() {
  let failures = 0;

  // 1) JS heavy run
  {
    const name = "run/javascript/sieve-300k";
    const code = `
const n = 300000;
const sieve = new Uint8Array(n + 1);
sieve.fill(1);
sieve[0] = 0; sieve[1] = 0;
for (let i = 2; i * i <= n; i++) {
  if (!sieve[i]) continue;
  for (let j = i * i; j <= n; j += i) sieve[j] = 0;
}
let count = 0;
for (let i = 2; i <= n; i++) if (sieve[i]) count++;
console.log(count);
`;
    const { status, data } = await post("/run", { language: "javascript", code, timeoutMs: 5000 });
    if (status === 200 && data.exitCode === 0 && data.stdout.trim() === "25997") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 2) Python heavy run
  {
    const name = "run/python/sum-squares-2m";
    const code = `
MOD = 1_000_000_007
acc = 0
for i in range(1, 2_000_001):
    acc = (acc + i * i) % MOD
print(acc)
`;
    const { status, data } = await post("/run", { language: "python", code, timeoutMs: 5000 });
    if (status === 200 && data.exitCode === 0 && data.stdout.trim() === "319464") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 3) C++ heavy run
  {
    const name = "run/cpp/sieve-500k";
    const code = `
#include <bits/stdc++.h>
using namespace std;
int main() {
    const int n = 500000;
    vector<char> sieve(n + 1, 1);
    sieve[0] = sieve[1] = 0;
    for (int i = 2; i * i <= n; ++i) {
        if (!sieve[i]) continue;
        for (int j = i * i; j <= n; j += i) sieve[j] = 0;
    }
    int count = 0;
    for (int i = 2; i <= n; ++i) if (sieve[i]) ++count;
    cout << count << "\\n";
    return 0;
}
`;
    const { status, data } = await post("/run", { language: "cpp", code, timeoutMs: 5000 });
    if (status === 200 && data.exitCode === 0 && data.stdout.trim() === "41538") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 4) /judge correctness
  {
    const name = "judge/python/multi-case";
    const code = `
import sys
nums = list(map(int, sys.stdin.read().split()))
print(sum(nums))
`;
    const testCases = [
      { input: "1 2 3 4", expectedOutput: "10" },
      { input: "100 200 300", expectedOutput: "600" },
      { input: "7 8 9 10 11", expectedOutput: "45" },
    ];
    const { status, data } = await post("/judge", { language: "python", code, testCases, timeoutMs: 5000 });
    if (status === 200 && data.passed === true) pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 5) Parallel burst
  {
    const name = "run/parallel-burst-x6";
    const code = `
const n = 200000;
let s = 0;
for (let i = 1; i <= n; i++) s += i;
console.log(s);
`;
    const payload = { language: "javascript", code, timeoutMs: 5000 };
    const results = await Promise.all(Array.from({ length: 6 }, () => post("/run", payload)));
    const allOk = results.every((r) => r.status === 200 && r.data.exitCode === 0 && r.data.stdout.trim() === "20000100000");
    if (allOk) pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(results.map((r) => r.data)));
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} test group(s) failed.`);
    process.exit(1);
  }

  console.log("\nAll heavy judge tests passed.");
}

run().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
