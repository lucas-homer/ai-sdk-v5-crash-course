# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

This is an educational repository for learning AI SDK v5, structured as a comprehensive crash course with hands-on exercises. The course teaches how to build production-ready AI applications using the AI SDK v5 TypeScript library.

## Key Commands

### Running Exercises

```bash
# Interactive exercise selector (primary workflow)
pnpm dev

# Run specific exercise by number
pnpm exercise <exercise-number>
```

### Development

```bash
# Install dependencies
pnpm install

# Code formatting (Prettier is configured)
# No explicit format script - check for pre-commit hooks via Husky
```

### Testing

This repository does not have a centralized test suite. Individual exercises may contain test files (look for `.eval.ts` files in evals modules using `evalite` framework).

## Architecture

### Exercise Structure

Each exercise follows a consistent three-folder pattern:

- **`problem/`** - Starting point with TODOs for learners to implement
- **`solution/`** - Complete reference implementation
- **`explainer/`** - Additional context and deep dives (not all exercises have this)

### Module Organization

The codebase is organized into numbered modules in `exercises/`:

1. **01-ai-sdk-basics** - Core AI SDK fundamentals (`generateText`, `streamText`, system prompts, images, objects)
2. **02-llm-fundamentals** - LLM concepts (tokens, context windows, prompt caching)
3. **03-agents** - Tool calling, message parts, MCP integration
4. **04-persistence** - Chat persistence, database normalization, message validation
5. **05-context-engineering** - Prompting techniques, exemplars, retrieval, chain-of-thought
6. **06-evals** - Evaluation with `evalite`, LLM-as-a-judge, datasets, Langfuse integration
7. **07-streaming** - Custom data parts, message metadata, error handling
8. **08-agents-and-workflows** - Complex agent workflows
9. **09-advanced-patterns** - Advanced AI SDK patterns
10. **99-reference** - Reference material and examples

### Shared Utilities

The `shared/` directory contains common code:

- **`run-local-dev-server.ts`** - Local dev server that runs Vite (port 3000) + Hono API server (port 3001)
  - Frontend code lives in `client/` subdirectories
  - Backend code lives in `api/` subdirectories
  - Uses proxy to route `/api` requests to Hono server

### Import Aliases

Uses Node.js subpath imports:
```typescript
import { runLocalDevServer } from '#shared/run-local-dev-server.ts';
```
Defined in `package.json` under `"imports"` field.

## API Provider Configuration

The repository supports multiple AI providers. Configure via `.env` (copy from `.env.example`):

- **Google (Gemini)** - `GOOGLE_GENERATIVE_AI_API_KEY`
- **Anthropic (Claude)** - `ANTHROPIC_API_KEY`
- **OpenAI (GPT)** - `OPENAI_API_KEY`

Most exercises use Google Gemini models (e.g., `gemini-2.0-flash`, `gemini-2.5-flash`) by default, but can be swapped.

## Code Patterns

### AI SDK Usage Patterns

**Text Generation (Basic)**
```typescript
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';

const result = await generateText({
  model: google('gemini-2.0-flash'),
  prompt: 'Your prompt here',
});
```

**Streaming to UI**
```typescript
import { streamText, convertToModelMessages } from 'ai';

// In API handler
export const POST = async (req: Request): Promise<Response> => {
  const { messages } = await req.json();
  const result = streamText({
    model: google('gemini-2.5-flash'),
    messages: convertToModelMessages(messages),
  });
  return result.toUIMessageStreamResponse();
};
```

**Tool Calling**
```typescript
import { tool, stepCountIs } from 'ai';
import { z } from 'zod';

const tools = {
  toolName: tool({
    description: 'What the tool does',
    inputSchema: z.object({
      param: z.string().describe('Parameter description'),
    }),
    execute: async ({ param }) => {
      // Tool implementation
      return { result: 'value' };
    },
  }),
};

const result = streamText({
  model: google('gemini-2.5-flash'),
  messages: convertToModelMessages(messages),
  tools,
  stopWhen: stepCountIs(10), // Limit agent steps
});
```

### Frontend/Backend Split

UI exercises use a split architecture:
- **Frontend**: React 19 + TailwindCSS 4 + Vite in `client/` directory
  - Entry point: `root.tsx`
  - Reusable components: `components.tsx`
- **Backend**: Hono-based API routes in `api/` directory
  - Routes exported as HTTP method functions: `export const POST = async (req: Request) => { ... }`
- **Runner**: `main.ts` calls `runLocalDevServer({ root: import.meta.dirname })`

### Message Types

Two distinct message types exist in AI SDK v5:
- **`UIMessage[]`** - Used in frontend/API boundaries
- **`ModelMessage[]`** - Used with LLM providers
- Convert between them: `convertToModelMessages(uiMessages)`

## TypeScript Configuration

- **Target**: ES2022
- **Module**: NodeNext
- **Strict mode enabled** with `noUncheckedIndexedAccess` and `noImplicitOverride`
- **JSX**: React (not React JSX Transform)
- **No emit**: All files run via `tsx` or Vite

## Development Tools

- **Package Manager**: pnpm (version 9.12.3+)
- **Node Version**: 22 or higher required
- **TypeScript Runner**: `tsx` for running .ts files directly
- **Formatter**: Prettier with specific config (80 char line width → 65, single quotes, trailing commas)
- **Git Hooks**: Husky configured for pre-commit hooks

## Exercise Workflow Guidance

When working on exercises:

1. Always check the `problem/readme.md` for specific instructions
2. Look for `TODO` comments in code files - these mark implementation points
3. Reference `solution/` folder if stuck (each has working implementation)
4. For UI exercises, run `main.ts` in the exercise directory to start dev servers
5. Frontend runs on `localhost:3000`, API on `localhost:3001`
6. Check `99-reference/` module for detailed examples of AI SDK patterns

## Working with Evaluations

Exercises in `06-evals/` use the `evalite` framework:
- Eval files follow pattern: `*.eval.ts`
- Datasets often stored as CSV files
- Integration with Langfuse for observability

## Important Notes

- **No centralized build step** - exercises run independently via `tsx` or dev server
- **No linting configured** - no ESLint or type-check scripts in package.json
- **Sandboxed file system** in agent exercises - operations limited to exercise directory
- **Exercise numbers** in `pnpm exercise` command may differ from directory names (check exercise selector)
