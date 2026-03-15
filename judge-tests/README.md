# Judge Test Harness

Run a heavier set of integration checks against your deployed judge service.

## Prereqs

- Node 18+ (for built-in `fetch`)
- `JUDGE_URL` set, or pass URL as first arg

## Usage

```bash
node judge-tests/run-heavy-tests.mjs https://beatcode-judge-service-production.up.railway.app
```

or

```bash
JUDGE_URL=https://beatcode-judge-service-production.up.railway.app node judge-tests/run-heavy-tests.mjs
```

## What It Tests

1. Function-mode JS heavy run: sieve prime count up to 300000
2. Function-mode Python heavy run: modular sum of squares up to 2000000
3. Function-mode C++ heavy run: sieve prime count up to 500000
4. Function-mode C++ class Solution method run (Two Sum regression check)
5. Function-mode /judge correctness with multiple test cases
6. Small parallel function-mode run burst to check concurrent request handling

## Important note

The suite now requires function-mode support (`/run` and `/judge` with `functionName` + `args`).
If your judge service is still running a legacy stdin/stdout-only version, these tests will fail.


