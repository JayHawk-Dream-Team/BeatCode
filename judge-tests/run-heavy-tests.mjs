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

async function supportsFunctionMode() {
  const code = `function add(a, b) { return a + b; }`;
  const { status, data } = await post("/run", {
    language: "javascript",
    code,
    functionName: "add",
    args: [1, 2],
    timeoutMs: 5000,
  });
  return status === 200 && data.exitCode === 0 && String(data.stdout || "").trim() === "3";
}

async function run() {
  let failures = 0;
  const functionMode = await supportsFunctionMode();

  if (!functionMode) {
    fail("environment", "Judge server does not appear to support function-name/args mode; check if server_code is updated and deployed.");
  }

  // 1) JS heavy run (function-based mode)
  {
    const name = "run/javascript/sieve-300k";
    const code = `
function countPrimes(n) {
  const sieve = new Uint8Array(n + 1);
  sieve.fill(1);
  sieve[0] = 0;
  sieve[1] = 0;
  for (let i = 2; i * i <= n; i++) {
    if (!sieve[i]) continue;
    for (let j = i * i; j <= n; j += i) sieve[j] = 0;
  }
  let count = 0;
  for (let i = 2; i <= n; i++) if (sieve[i]) count++;
  return count;
}
`;
    const { status, data } = await post("/run", {
      language: "javascript",
      code,
      functionName: "countPrimes",
      args: [300000],
      timeoutMs: 5000,
    });
    if (functionMode && status === 200 && data.exitCode === 0 && data.stdout.trim() === "25997") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 2) Python heavy run (function-based mode)
  {
    const name = "run/python/sum-squares-2m";
    const code = `
MOD = 1_000_000_007

def sum_squares(limit):
    acc = 0
    for i in range(1, limit + 1):
        acc = (acc + i * i) % MOD
    return acc
`;
    const { status, data } = await post("/run", {
      language: "python",
      code,
      functionName: "sum_squares",
      args: [2000000],
      timeoutMs: 5000,
    });
    if (functionMode && status === 200 && data.exitCode === 0 && data.stdout.trim() === "319464") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 3) C++ heavy run (function-based mode)
  {
    const name = "run/cpp/sieve-500k";
    const code = `
#include <bits/stdc++.h>
using namespace std;

int sieveCount(int n) {
    vector<char> sieve(n + 1, 1);
    sieve[0] = sieve[1] = 0;
    for (int i = 2; i * i <= n; ++i) {
        if (!sieve[i]) continue;
        for (int j = i * i; j <= n; j += i) sieve[j] = 0;
    }
    int count = 0;
    for (int i = 2; i <= n; ++i) if (sieve[i]) ++count;
    return count;
}
`;
    const { status, data } = await post("/run", {
      language: "cpp",
      code,
      functionName: "sieveCount",
      args: [500000],
      timeoutMs: 5000,
    });
    if (functionMode && status === 200 && data.exitCode === 0 && data.stdout.trim() === "41538") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  
  // 4) C++ class-based method run (regression for wrapper return/declaration ordering)
  {
    const name = "run/cpp/class-solution-two-sum";
    const code = `
#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < (int)nums.size(); i++) {
            int complement = target - nums[i];
            if (seen.count(complement)) return {seen[complement], i};
            seen[nums[i]] = i;
        }
        return {};
    }
};
`;
    const { status, data } = await post("/run", {
      language: "cpp",
      code,
      functionName: "twoSum",
      args: [[2, 7, 11, 15], 9],
      timeoutMs: 5000,
    });
    if (functionMode && status === 200 && data.exitCode === 0 && data.stdout.trim() === "[0,1]") pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }
  // 5) /judge correctness (function-based mode)
  {
    const name = "judge/python/multi-case";
    const code = `
def sum_nums(nums):
    return sum(nums)
`;
    const testCases = [
      { args: [[1, 2, 3, 4]], expectedOutput: "10" },
      { args: [[100, 200, 300]], expectedOutput: "600" },
      { args: [[7, 8, 9, 10, 11]], expectedOutput: "45" },
    ];
    const { status, data } = await post("/judge", {
      language: "python",
      code,
      functionName: "sum_nums",
      testCases,
      timeoutMs: 5000,
    });
    if (functionMode && status === 200 && data.passed === true) pass(name);
    else {
      failures++;
      fail(name, JSON.stringify(data));
    }
  }

  // 6) Parallel burst
  {
    const name = "run/parallel-burst-x6";
    const code = `
function triangular(n) {
  let s = 0;
  for (let i = 1; i <= n; i++) s += i;
  return s;
}
`;
    const payload = {
      language: "javascript",
      code,
      functionName: "triangular",
      args: [200000],
      timeoutMs: 5000,
    };
    const results = await Promise.all(Array.from({ length: 6 }, () => post("/run", payload)));
    const allOk = functionMode && results.every((r) => r.status === 200 && r.data.exitCode === 0 && r.data.stdout.trim() === "20000100000");
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

