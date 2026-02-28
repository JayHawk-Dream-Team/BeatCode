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

1. JS heavy run: sieve prime count up to 300000
2. Python heavy run: modular sum of squares up to 2000000
3. C++ heavy run: sieve prime count up to 500000
4. Judge endpoint correctness with multiple Python testcases
5. Small parallel run burst to check concurrent request handling
