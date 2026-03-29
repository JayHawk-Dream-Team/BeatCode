# Judge Server Integration Guide

## Overview

This document describes the new function-based judge system for BeatCode, which enables LeetCode-style function invocation where users implement a specific function rather than reading from stdin/stdout.

## Architecture

### Key Components

1. **Judge Types** (`src/utils/types/judge.ts`)
   - `JudgeTestCase`: Structured test case with function arguments and expected output
   - `JudgeFunctionMetadata`: Function metadata including name, test cases, and optional comparator
   - `JudgeRequest`: Request payload sent to judge server
   - `JudgeResponse`: Response from judge server with test results

2. **Problem Type Extension** (`src/utils/types/problem.ts`)
   - New optional field: `judgeMetadata?: JudgeFunctionMetadata`
   - Allows problems to define the required function signature and test cases

3. **Code Preprocessor** (`src/utils/codePreprocessor.ts`)
   - `preprocessCodeForJudge()`: Prepares code for submission
   - `validateFunctionPresence()`: Validates that required function exists in user code
   - `extractFunctionCode()`: Extracts function code (best-effort approach)

4. **Judge API Endpoints**
   - `/api/judge/run` - Test run endpoint with function-based support
   - `/api/judge/submit` - Final submission endpoint with structured test results

## Environment Configuration

Add to `.env.local`:
```
JUDGE_URL=https://beatcode-judge-service-production.up.railway.app
```

## Problem Setup

### Adding Judge Metadata to a Problem

Every problem should include `judgeMetadata` with structured test cases:

```typescript
import { JudgeFunctionMetadata } from "../types/judge";

const judgeMetadataExample: JudgeFunctionMetadata = {
  name: "functionName",
  testCases: [
    { args: [arg1, arg2], expected: expectedOutput },
    { args: [arg1, arg2], expected: expectedOutput },
  ],
  signature: "function functionName(param1: Type, param2: Type): ReturnType",
  comparator: "deep_equal", // optional, defaults to deep equality
};

export const exampleProblem: Problem = {
  // ... other fields ...
  judgeMetadata: judgeMetadataExample,
};
```

### Test Case Format

Test cases use an array of arguments and a single expected output:

```typescript
// Single argument
{ args: ["input"], expected: true }

// Multiple arguments
{ args: [[1, 2, 3], 6], expected: [0, 1] }

// Complex objects
{ args: [matrix, target], expected: true }
```

## Submission Flow

### Client-Side (Frontend)

1. User writes code in CodeMirror editor
2. User clicks "Run" or "Submit"
3. Payload constructed with:
   - `language`: "javascript" | "python" | "cpp"
   - `code`: User's submitted code
   - `metadata`: Problem's `judgeMetadata` (if available)

### API Endpoints (Backend)

#### `/api/judge/run` - Test Run
```typescript
// Request
{
  language: "javascript",
  code: userCode,
  metadata: judgeMetadata // for function-based invocation
}

// Response (example for 1 test passing, 1 failing)
{
  status: "wrong_answer",
  testResults: [
    { testIndex: 0, passed: true },
    { testIndex: 1, passed: false, expected: true, actual: false }
  ],
  message: "1 out of 2 tests passed"
}
```

#### `/api/judge/submit` - Final Submission
```typescript
// Request (same structure as /run)
{
  language: "javascript",
  code: userCode,
  metadata: judgeMetadata
}

// Response (detailed results)
{
  status: "accepted" | "wrong_answer" | "compilation_error" | "runtime_error" | "timeout",
  testResults: [...],
  message: "Execution successful",
  executionTime?: number,
  memory?: number
}
```

### Validation

Before submission, the system:
1. Validates that the required function is present in the code
2. Preprocesses the code (minimal cleanup, primarily passes through)
3. Sends to judge server for compilation and execution

## Judge Server Integration

### Expected Behavior

The judge server at `JUDGE_URL` should:

1. **Accept the JudgeRequest format**
   - Extract the function name from `metadata.name`
   - Load and compile the user's code
   - Create test case inputs from `metadata.testCases[].args`

2. **Function Invocation**
   - Invoke the identified function with test case arguments
   - Capture the return value

3. **Result Comparison**
   - Compare actual output with expected output
   - Use the optional `comparator` for custom comparison logic
   - Return detailed `JudgeResponse` with per-test results

### Example Judge Server Handler (Pseudo-code)

```javascript
// Pseudo-code for judge server /judge endpoint
function handleJudgeRequest(request) {
  const { language, code, metadata } = request;
  
  // Compile code
  const compiled = compileCode(code, language);
  
  // Run each test case
  const testResults = metadata.testCases.map((testCase, index) => {
    try {
      // Invoke function with test arguments
      const actual = compiled[metadata.name](...testCase.args);
      
      // Compare results
      const passed = compare(actual, testCase.expected, metadata.comparator);
      
      return {
        testIndex: index,
        passed,
        expected: testCase.expected,
        actual: passed ? undefined : actual
      };
    } catch (error) {
      return {
        testIndex: index,
        passed: false,
        error: error.message
      };
    }
  });
  
  // Determine overall status
  const status = testResults.every(r => r.passed) ? "accepted" : "wrong_answer";
  
  return {
    status,
    testResults,
    message: testResults.filter(r => r.passed).length + " tests passed"
  };
}
```

## Language-Specific Notes

### JavaScript
- Supports function declarations and arrow functions
- Test cases work directly with JavaScript objects

### Python
- Function definitions via `def keyword`
- Test cases use Python lists and objects
- May need type hints for complex types

### C++
- Function definitions with explicit return types
- Arrays and vectors serialized as JSON arrays
- Custom struct comparisons may require special handling

## Special Cases

### Linked Lists
Problems with linked lists use array representation for test cases:

```typescript
// Array format [1,2,3] represents ListNode(1)->ListNode(2)->ListNode(3)
{ args: [[1, 2, 3]], expected: [3, 2, 1] }
```

The judge server should:
1. Deserialize arrays to linked list nodes
2. Invoke the user's function with the linked list
3. Serialize the result back to an array for comparison

Specify `comparator: "serialize_linked_list"` in metadata.

### Tree Problems
Similar to linked lists, trees can use array representation (level-order or in-order):

```typescript
// Array format for binary tree
{ args: [[3, 9, 20, null, null, 15, 7]], expected: [[9], [3, 15], [20, 7]] }
```

## Error Handling

### Client-Side Validation
- Missing JUDGE_URL: "Judge service not configured"
- Function not found: "Function "functionName" not found in submitted code"
- Invalid language: "Invalid language. Must be javascript, python, or cpp"

### Server-Side Responses
- **Compilation Error**: status: "compilation_error", error message in testResults
- **Runtime Error**: status: "runtime_error", error message in each test
- **Wrong Answer**: status: "wrong_answer", expected vs actual in testResults
- **Timeout**: status: "timeout", executionTime may exceed limit

## Testing the System

### Manual Testing Steps

1. **Verify Environment**
   ```bash
   echo $JUDGE_URL
   # Should output: https://beatcode-judge-service-production.up.railway.app
   ```

2. **Test a Problem Submission**
   - Navigate to a problem with judge metadata (e.g., Two Sum)
   - Write a solution in the code editor
   - Click "Run" to test against the problem's test cases
   - Judge server should respond with test results

3. **Check API Logs**
   - Monitor `/api/judge/run` and `/api/judge/submit` requests
   - Verify the judge service is receiving the correct format

## Migration from stdin/stdout

### Old System (Still Supported)
```typescript
// Request without metadata
{
  language: "javascript",
  code: userCode,
  stdin: "5\n3"  // input piped to stdin
}
```

### New System (Function-Based)
```typescript
// Request with metadata
{
  language: "javascript",
  code: userCode,
  metadata: {
    name: "solution",
    testCases: [
      { args: [5, 3], expected: 8 }
    ]
  }
}
```

The `/api/judge/run` and `/api/judge/submit` endpoints **require metadata** for submission. Legacy stdin/stdout mode is still supported but deprecated for new problems.

## Future Enhancements

1. **Dynamic Test Cases from Firebase**
   - Load test cases directly from Firestore instead of static definitions
   - Reduces duplication between client and judge server

2. **Custom Comparators**
   - Support for approximate results (floating-point comparison)
   - Unordered collections (set comparison)
   - Normalized string comparison (whitespace-insensitive)

3. **Performance Metrics**
   - Track execution time and memory usage per test
   - Visualize performance in IDE

4. **Multi-File Submissions**
   - Support for multiple source files
   - Helper function imports

5. **Interactive Debugging**
   - Step through execution on failed test cases
   - Inspect intermediate variables
