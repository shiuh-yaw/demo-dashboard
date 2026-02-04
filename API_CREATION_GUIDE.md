# API Creation Guide

This guide explains how to create API routes using our standardized utilities and best practices for separating route handlers from business logic.

## Table of Contents

- [Overview](#overview)
- [Core Utilities](#core-utilities)
  - [CORS Options](#cors-options)
  - [Authentication (`withAuth`)](#authentication-withauth)
  - [Response Helpers](#response-helpers)
- [Route vs Handler Pattern](#route-vs-handler-pattern)
- [Examples](#examples)
  - [Public Route (No Auth)](#public-route-no-auth)
  - [Authenticated Route](#authenticated-route)
- [Best Practices](#best-practices)
- [Common Patterns](#common-patterns)

## Overview

Our API routes follow a consistent pattern that separates:
- **Route files** (`route.ts`): Handle HTTP concerns (request/response, CORS, auth middleware)
- **Handler files** (`handlers/*.ts`): Contain business logic (validation, service calls, data transformation)

This separation provides:
- ✅ Reusable handlers (can be called from multiple routes or background jobs)
- ✅ Clean route files (focused on HTTP concerns)
- ✅ Consistent error handling and response formatting
- ✅ Easy to understand and maintain

## Core Utilities

### CORS Options

**Location:** `@/lib/cors`

All API routes should export an `OPTIONS` handler for CORS preflight requests.

```typescript
import { OPTIONS as corsOptions } from "@/lib/cors";

export const OPTIONS = corsOptions;
```

**What it does:**
- Handles CORS preflight requests automatically
- Adds appropriate CORS headers to all responses
- Supports cross-origin requests from frontend applications

**When to use:**
- ✅ Always export `OPTIONS` in your route files
- ✅ The utility automatically adds CORS headers to responses

### Authentication (`withAuth`)

**Location:** `@/lib/dynamic/dynamic-auth`

Wrap route handlers that require authentication with `withAuth`.

```typescript
import { withAuth } from "@/lib/dynamic/dynamic-auth";

export const GET = withAuth(async (request, { user, params }) => {
  // `user` contains the authenticated Dynamic user
  // `params` contains route parameters (if any)
  return createResponse({ userId: user.sub });
});
```

**What it does:**
- Extracts JWT token from `Authorization` header or `dynamic_jwt` cookie
- Verifies the token using Dynamic's JWKS endpoint
- Extracts environment ID from `x-dynamic-environment-id` header
- Passes authenticated user to your handler
- Automatically adds CORS headers to responses

**Authentication Requirements:**
- `x-dynamic-environment-id` header must be present
- JWT token in `Authorization: Bearer <token>` header OR `dynamic_jwt` cookie

**User Object Structure:**
```typescript
type AuthenticatedUser = {
  sub: string;                    // User ID
  environment_id: string;         // Dynamic environment ID
  verified_credentials: Array<{   // User's verified wallets
    id: string;
    address: string;
    chain: string;
    format: string;
    wallet_name: string;
    wallet_provider: string;
  }>;
  email?: string;                 // User's email (if available)
};
```

**When to use:**
- ✅ Routes that require user authentication
- ✅ Routes that need to identify the calling user
- ❌ Public routes (widget endpoints, public configs)

### Response Helpers

**Location:** `@/lib/api-response`

#### `createResponse`

Creates a standardized success response with CORS headers.

```typescript
import { createResponse } from "@/lib/api-response";

// Success response (200)
return createResponse({ checkoutId: "123" });

// Created response (201)
return createResponse({ id: "456" }, 201);
```

**Response Format:**
```json
{
  "success": true,
  "data": { /* your data */ }
}
```

#### `handleApiError`

Centralized error handling that maps errors to appropriate HTTP responses.

```typescript
import { handleApiError } from "@/lib/api-response";

try {
  const result = await handleSomeOperation();
  return createResponse(result);
} catch (error) {
  return handleApiError(error, "context/operation");
}
```

**What it handles:**
- `ZodError`: Validation errors → 400 with field-level details
- `AppError` subclasses: Maps to appropriate status codes
  - `NotFoundError` → 404
  - `UnauthorizedError` → 401
  - `ForbiddenError` → 403
  - `ValidationError` → 400
  - `ConflictError` → 409
- Unknown errors → 500 with generic message

**Error Response Format:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",  // Optional
  "details": {           // For validation errors
    "field": ["error message"]
  }
}
```

## Route vs Handler Pattern

### Route File (`route.ts`)

**Responsibilities:**
- Export HTTP method handlers (`GET`, `POST`, etc.)
- Export `OPTIONS` for CORS
- Apply authentication middleware (`withAuth`)
- Parse request data (params, query, body)
- Call handler functions
- Handle errors with `handleApiError`
- Return responses with `createResponse`

**Should NOT contain:**
- Business logic
- Database queries
- Service calls
- Complex validation (use handlers)

### Handler File (`handlers/*.ts`)

**Responsibilities:**
- Business logic implementation
- Input validation (using Zod schemas)
- Service layer calls
- Data transformation
- Throwing appropriate errors (`NotFoundError`, `ValidationError`, etc.)

**Should NOT contain:**
- HTTP-specific code
- Request/Response objects
- CORS handling
- Authentication logic

## Examples

### Public Route (No Auth)

**Route:** `src/app/api/example/[id]/route.ts`

```typescript
import { NextRequest } from "next/server";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleGetExample } from "../handlers/get-example";
import type { ExampleParams } from "./types";

export const OPTIONS = corsOptions;

export async function GET(
  _request: NextRequest,
  { params }: { params: ExampleParams }
) {
  try {
    const { id } = await params;
    const result = await handleGetExample({ id });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "example/get");
  }
}
```

**Handler:** `src/app/api/example/handlers/get-example.ts`

```typescript
import { exampleService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema, exampleIdSchema } from "@/lib/validation";

export async function handleGetExample(rawInput: unknown) {
  const { id } = parseWithSchema(exampleIdSchema, rawInput);
  const result = await exampleService.get(id);
  if (!result) {
    throw new NotFoundError("Not found");
  }
  return result;
}
```

### Authenticated Route

**Route:** `src/app/api/example/[id]/update/route.ts`

```typescript
import { withAuth } from "@/lib/dynamic/dynamic-auth";
import { OPTIONS as corsOptions } from "@/lib/cors";
import { createResponse, handleApiError } from "@/lib/api-response";
import { handleUpdateExample } from "../../handlers/update-example";
import type { ExampleParams } from "../types";

export const OPTIONS = corsOptions;

export const POST = withAuth(
  async (request, { params }: { params: ExampleParams }) => {
    try {
      const { id } = await params;
      const body = await request.json();
      const result = await handleUpdateExample({ id, data: body });
      return createResponse(result);
    } catch (error) {
      return handleApiError(error, "example/update");
    }
  }
);
```

**Handler:** `src/app/api/example/handlers/update-example.ts`

```typescript
import { exampleService } from "@/lib/services";
import { NotFoundError } from "@/lib/errors";
import { parseWithSchema, updateExampleSchema } from "@/lib/validation";

export async function handleUpdateExample(rawInput: unknown) {
  const { id, data } = parseWithSchema(updateExampleSchema, rawInput);
  const existing = await exampleService.get(id);
  if (!existing) {
    throw new NotFoundError("Not found");
  }
  return await exampleService.update(id, data);
}
```

## Best Practices

### 1. Always Export OPTIONS

Every route file should export `OPTIONS` for CORS support:

```typescript
export const OPTIONS = corsOptions;
```

### 2. Use Context Strings for Error Handling

Always provide a context string to `handleApiError` for better debugging:

```typescript
// Good
return handleApiError(error, "checkouts/transactions/submit");

// Bad
return handleApiError(error);
```

### 3. Validate Input in Handlers

Use Zod schemas and `parseWithSchema` in handlers, not routes:

```typescript
// Handler (good)
export async function handleSomething(rawInput: unknown) {
  const { id, name } = parseWithSchema(someSchema, rawInput);
  // ...
}

// Route (bad - don't validate here)
export const POST = async (request) => {
  const body = await request.json();
  if (!body.id) {
    return createErrorResponse("id required", 400);
  }
  // ...
};
```

### 4. Throw Errors, Don't Return Them

Handlers should throw errors, routes catch and handle them:

```typescript
// Handler (good)
if (!resource) {
  throw new NotFoundError("Resource not found");
}

// Route (bad - don't return errors from handlers)
const result = await handleSomething();
if (result.error) {
  return createErrorResponse(result.error);
}
```

### 5. Use Appropriate Error Types

Use specific error classes from `@/lib/errors`:

```typescript
import {
  NotFoundError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  ConflictError,
} from "@/lib/errors";

// In handlers
throw new NotFoundError("Checkout not found");
throw new ValidationError("Invalid input");
throw new ForbiddenError("Insufficient permissions");
```

### 6. Keep Routes Thin

Routes should be thin wrappers around handlers:

```typescript
// Good - thin route
export const POST = withAuth(async (request, { params }) => {
  try {
    const { id } = await params;
    const body = await request.json();
    const result = await handleSomething({ id, ...body });
    return createResponse(result);
  } catch (error) {
    return handleApiError(error, "context/operation");
  }
});

// Bad - business logic in route
export const POST = withAuth(async (request, { params }) => {
  const { id } = await params;
  const checkout = await checkoutService.get(id);
  if (!checkout) {
    return createErrorResponse("Not found", 404);
  }
  // ... more business logic
});
```

### 7. Handle Async Params

In Next.js App Router, `params` is a Promise. Always await it:

```typescript
// Good
const { id } = await params;

// Bad
const { id } = params; // This is a Promise!
```

### 8. Use TypeScript Types for Params

Create type definitions for route params:

```typescript
// types.ts
export type CheckoutParams = Promise<{ id: string }>;
export type TransactionParams = Promise<{ id: string; txId: string }>;

// route.ts
import type { CheckoutParams } from "./types";

export async function GET(
  request: NextRequest,
  { params }: { params: CheckoutParams }
) {
  const { id } = await params;
  // ...
}
```

## Common Patterns

### Pattern 1: Public GET, Authenticated POST

```typescript
export const OPTIONS = corsOptions;

// Public GET
export async function GET(request, { params }) {
  // No auth required
}

// Authenticated POST
export const POST = withAuth(async (request, { params }) => {
  // Auth required
});
```

### Pattern 2: Query Parameter Parsing

```typescript
export const GET = withAuth(async (request, { params }) => {
  const url = new URL(request.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  const status = url.searchParams.get("status") || undefined;
  
  const result = await handleListSomething({
    page,
    status,
  });
  
  return createResponse(result);
});
```

### Pattern 3: Optional Body Parsing

```typescript
export async function POST(request, { params }) {
  // Handle missing/invalid JSON gracefully
  const body = await request.json().catch(() => ({}));
  
  const result = await handleSomething({
    ...body,
  });
  
  return createResponse(result);
}
```

### Pattern 4: Conditional Status Codes

```typescript
export async function POST(request, { params }) {
  const result = await handleCreateSomething(input);
  
  // Use 201 for created, 200 for existing
  return createResponse(result, result.created ? 201 : 200);
}
```

### Pattern 5: Accessing Authenticated User

```typescript
export const GET = withAuth(async (request, { user, params }) => {
  // Access user properties
  const userId = user.sub;
  const email = user.email;
  const wallets = user.verified_credentials;
  
  const result = await handleGetUserData({ userId });
  return createResponse(result);
});
```

## Summary

### Core Principles

- ✅ **Routes**: Handle HTTP concerns (CORS, auth, request parsing, error handling)
- ✅ **Handlers**: Contain business logic (validation, services, data transformation)
- ✅ **Always export OPTIONS** for CORS support
- ✅ **Use `withAuth`** for authenticated routes
- ✅ **Use `createResponse`** for success responses
- ✅ **Use `handleApiError`** for error handling
- ✅ **Throw errors** in handlers, catch in routes
- ✅ **Validate** using Zod schemas in handlers
- ✅ **Keep routes thin**, handlers focused

### Pattern Benefits

This pattern provides:
- **Consistency**: All APIs follow the same structure
- **Maintainability**: Clear separation of concerns
- **Reusability**: Handlers can be called from multiple routes or background jobs
- **Type Safety**: Zod validation ensures runtime type safety

This pattern ensures consistency and maintainability across all API routes, making it easy for engineering teams to understand and extend your prototypes.
