# Frontend Integration Guide: Judge System

This guide explains how to integrate the new function-based judge system into the Playground component and other frontend code.

## Overview

The judge system is now ready to handle:
1. **Function-based submissions** (LeetCode-style) with structured test cases
2. **Per-test result feedback** with detailed error information
3. **Multi-language support** (JavaScript, Python, C++)

## Key Types to Import

```typescript
// From src/utils/types/judge.ts
import {
  JudgeResponse,
  JudgeTestResult,
  JudgeFunctionMetadata,
  JudgeTestCase
} from "@/utils/types/judge";

// From src/utils/types/problem.ts
import { Problem } from "@/utils/types/problem";

// From src/utils/codePreprocessor.ts
import { validateFunctionPresence } from "@/utils/codePreprocessor";
```

## Updated Playground Component

### Step 1: Update handleRun Method

Current behavior with stdin/stdout:
```typescript
const handleRun = async () => {
  setRunning(true);
  try {
    const response = await fetch("/api/judge/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language,
        code: userCode,
        stdin: testCases[activeTestCaseId]?.input || "",
      }),
    });
    // ... handle response
  }
};
```

**Updated** with judge metadata support:
```typescript
const handleRun = async () => {
  setRunning(true);
  try {
    // If problem has judge metadata, use function-based invocation
    if (problem.judgeMetadata) {
      // Validate function is present
      if (!validateFunctionPresence(userCode, problem.judgeMetadata.name, language)) {
        toast.error(`Function "${problem.judgeMetadata.name}" not found in code`, {
          position: "top-center",
          autoClose: 3000,
          theme: "dark",
        });
        setRunning(false);
        return;
      }

      const response = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code: userCode,
          metadata: problem.judgeMetadata,
        }),
      });

      const data = await response.json() as JudgeResponse;

      if (!response.ok) {
        throw new Error(data.message || "Run request failed");
      }

      // Display per-test results
      displayJudgeResults(data);
    } else {
      // Fallback to legacy stdin/stdout mode
      const response = await fetch("/api/judge/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code: userCode,
          stdin: testCases[activeTestCaseId]?.input || "",
        }),
      });

      const data = await response.json();
      if (data.exitCode === 0) {
        toast.success("Code ran successfully", {
          position: "top-center",
          autoClose: 2500,
          theme: "dark",
        });
      } else {
        toast.error(data.stderr || "Runtime or compile error", {
          position: "top-center",
          autoClose: 3500,
          theme: "dark",
        });
      }
    }
  } catch (error: any) {
    toast.error(error.message || "Unable to run code", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
  } finally {
    setRunning(false);
  }
};
```

### Step 2: Create Helper to Display Judge Results

Add a new helper function to Playground:
```typescript
const displayJudgeResults = (response: JudgeResponse) => {
  const { status, testResults, message } = response;

  if (status === "accepted") {
    toast.success("All tests passed! 🎉", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
  } else if (status === "compilation_error") {
    toast.error("Compilation Error", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
    console.error("Compilation errors:", testResults);
  } else if (status === "runtime_error") {
    // Show which test case failed
    const failedTest = testResults.find((r) => !r.passed);
    const errorMsg = failedTest?.error || "Runtime error";
    toast.error(`Runtime Error (Test ${failedTest?.testIndex}): ${errorMsg}`, {
      position: "top-center",
      autoClose: 3500,
      theme: "dark",
    });
  } else if (status === "wrong_answer") {
    // Show which test case failed and why
    const failedTest = testResults.find((r) => !r.passed);
    if (failedTest) {
      const passedCount = testResults.filter((r) => r.passed).length;
      toast.error(
        `Wrong Answer on Test ${failedTest.testIndex + 1}\nPassed: ${passedCount}/${testResults.length}`,
        {
          position: "top-center",
          autoClose: 3500,
          theme: "dark",
        }
      );
    }
  } else if (status === "timeout") {
    toast.error("Execution Timeout - Solution too slow", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
  }
};
```

### Step 3: Update handleSubmit Method

Current behavior:
```typescript
const handleSubmit = async () => {
  if (!user) {
    toast.error("Please login to submit your code", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
    return;
  }
  
  if (testCases.length === 0) {
    toast.error("No test cases configured for this problem yet.", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
    return;
  }

  setSubmitting(true);

  try {
    // Extract function...
    // Validate with handler...
  }
};
```

**Updated** with judge server submission:
```typescript
const handleSubmit = async () => {
  if (!user) {
    toast.error("Please login to submit your code", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
    return;
  }

  setSubmitting(true);

  try {
    if (problem.judgeMetadata) {
      // Use judge server for function-based submission
      if (!validateFunctionPresence(userCode, problem.judgeMetadata.name, language)) {
        toast.error(`Function "${problem.judgeMetadata.name}" not found in code`, {
          position: "top-center",
          autoClose: 3000,
          theme: "dark",
        });
        setSubmitting(false);
        return;
      }

      const response = await fetch("/api/judge/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          language,
          code: userCode,
          metadata: problem.judgeMetadata,
        }),
      });

      const data = await response.json() as JudgeResponse;

      if (!response.ok) {
        throw new Error(data.message || "Submission failed");
      }

      // Check if all tests passed
      if (data.status === "accepted") {
        // Update Firestore with solved problem
        const docRef = doc(firestore, "users", user.uid);
        await updateDoc(docRef, {
          solvedProblems: arrayUnion(pid),
        });

        setSuccess(true);
        setSolved(true);
        toast.success("Congratulations! Problem solved! 🎉", {
          position: "top-center",
          autoClose: 3000,
          theme: "dark",
        });
      } else {
        // Display failure details
        const passedCount = data.testResults.filter((r) => r.passed).length;
        const totalCount = data.testResults.length;
        
        toast.error(
          `${passedCount}/${totalCount} tests passed\n${data.message}`,
          {
            position: "top-center",
            autoClose: 3500,
            theme: "dark",
          }
        );

        // Optionally highlight the first failing test
        const firstFailure = data.testResults.findIndex((r) => !r.passed);
        if (firstFailure >= 0) {
          setActiveTestCaseId(firstFailure);
        }
      }
    } else {
      // Fallback to legacy handler-based validation
      const result = new Function(`return (${problem.handlerFunction})`)()(userFn);
      
      if (result) {
        const docRef = doc(firestore, "users", user.uid);
        await updateDoc(docRef, {
          solvedProblems: arrayUnion(pid),
        });

        setSuccess(true);
        setSolved(true);
        toast.success("Congratulations! Problem solved! 🎉", {
          position: "top-center",
          autoClose: 3000,
          theme: "dark",
        });
      }
    }
  } catch (error: any) {
    toast.error(error.message || "Error submitting code", {
      position: "top-center",
      autoClose: 3000,
      theme: "dark",
    });
  } finally {
    setSubmitting(false);
  }
};
```

## EditorFooter Updates

The footer should display different information based on judge response:

```typescript
// Before: Only showed pass/fail from local handler

// After: Show per-test results
interface EditorFooterProps {
  judgeResponse?: JudgeResponse;
  // ... other props
}

export const EditorFooter: React.FC<EditorFooterProps> = ({ judgeResponse, ...props }) => {
  if (judgeResponse) {
    const passCount = judgeResponse.testResults.filter((r) => r.passed).length;
    const totalCount = judgeResponse.testResults.length;

    return (
      <div className="footer">
        <p className={passCount === totalCount ? "success" : "error"}>
          {passCount}/{totalCount} tests passed
        </p>
        {judgeResponse.executionTime && (
          <p>Execution time: {judgeResponse.executionTime}ms</p>
        )}
        {judgeResponse.memory && (
          <p>Memory used: {(judgeResponse.memory / 1024).toFixed(2)}KB</p>
        )}
      </div>
    );
  }

  // Existing footer rendering...
};
```

## State Management Update

Consider adding new state to Playground for judge results:

```typescript
const [judgeResponse, setJudgeResponse] = useState<JudgeResponse | null>(null);

// In handleRun and handleSubmit, set this state with the response
// Use it to display detailed test results
```

## Example: Complete Integration

Here's what a full submission flow looks like:

```typescript
// 1. User submits code
handleSubmit()
  ↓
// 2. Validate function exists
validateFunctionPresence(code, "twoSum", "javascript")
  ↓
// 3. Send to judge API
POST /api/judge/submit {
  language: "javascript",
  code: userCode,
  metadata: {
    name: "twoSum",
    testCases: [
      { args: [[2, 7, 11, 15], 9], expected: [0, 1] },
      { args: [[3, 2, 4], 6], expected: [1, 2] },
      { args: [[3, 3], 6], expected: [0, 1] }
    ]
  }
}
  ↓
// 4. Judge server processes
// - Compile JavaScript code
// - Invoke twoSum(nums, target) for each test case
// - Compare results
  ↓
// 5. Server responds
JudgeResponse {
  status: "accepted" | "wrong_answer" | "compilation_error" | "runtime_error",
  testResults: [
    { testIndex: 0, passed: true },
    { testIndex: 1, passed: true },
    { testIndex: 2, passed: true }
  ],
  message: "All tests passed"
}
  ↓
// 6. Frontend displays results
displayJudgeResults(response)
// If accepted, update Firestore and show success toast
```

## Error Handling Scenarios

### Function Not Found
```typescript
// Error message from API:
// { error: 'Function "twoSum" not found in submitted code' }

// Frontend already validates before sending:
if (!validateFunctionPresence(code, "twoSum", "javascript")) {
  toast.error("Function \"twoSum\" not found in code");
  return;
}
```

### Compilation Error
```typescript
// Response from server:
{
  status: "compilation_error",
  testResults: [
    { testIndex: 0, passed: false, error: "Unexpected token )" }
  ]
}

// Frontend displays:
toast.error("Compilation Error: Unexpected token )");
```

### Wrong Answer
```typescript
// Response from server:
{
  status: "wrong_answer",
  testResults: [
    { testIndex: 0, passed: true },
    { testIndex: 1, passed: false, expected: [1, 2], actual: [1, 1] },
    { testIndex: 2, passed: true }
  ]
}

// Frontend displays:
toast.error("Wrong Answer on Test 2\nPassed: 2/3");
// Optionally show expected vs actual
```

## Testing the Integration

1. **Enable Debug Logging**
   ```typescript
   const response = await fetch("/api/judge/submit", ...);
   console.log("Judge response:", await response.json());
   ```

2. **Test with Simple Problem**
   - Start with "Two Sum" which has judge metadata
   - Submit correct solution
   - Verify "accepted" status returned

3. **Test Error Cases**
   - Missing function
   - Wrong function name
   - Compilation error (syntax)
   - Wrong answer (logic error)

4. **Check Network Activity**
   - Open DevTools Network tab
   - Watch /api/judge/submit requests
   - Verify request body includes metadata
   - Inspect response format

## Backwards Compatibility

For problems without `judgeMetadata`:
- System falls back to local handler validation
- `problem.handlerFunction` is still evaluated
- Existing experience unchanged

## Migration Timeline

### Phase 1 (Current)
- ✅ Judge system infrastructure ready
- ✅ All problems have judge metadata
- [ ] Frontend integration (your task)
- [ ] Judge server backend integration

### Phase 2
- Update EditorFooter to show per-test results
- Add test case details display
- Implement performance metrics display

### Phase 3
- Load test cases from Firebase
- Support custom comparators
- Add debugging features

## Support & Questions

For issues or questions about the judge system:
1. Check [JUDGE_SYSTEM.md](./JUDGE_SYSTEM.md) for architecture details
2. Check [JUDGE_IMPLEMENTATION_SUMMARY.md](./JUDGE_IMPLEMENTATION_SUMMARY.md) for file changes
3. Review judge type definitions in `src/utils/types/judge.ts`
4. Check problem examples in `src/utils/problems/two-sum.ts`
