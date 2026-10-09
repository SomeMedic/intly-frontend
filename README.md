# INTLY Frontend

Next.js App Router frontend for the INTLY product. Business data is read from the NestJS API at `/api/v1`; production UI must not silently substitute mock success data.

## Main commands

- `pnpm install`
- `pnpm dev`
- `pnpm typecheck`
- `pnpm build`

## Public integration points for feature agents

- API client: `src/services/api`
- SSE client: `src/services/sse`
- Shared domain types: `src/types`
- UI primitives: `src/components/ui`
- Product UI components: `src/components/intly`

Mocking is reserved for explicit development scenarios behind `NEXT_PUBLIC_ENABLE_MSW=true`.
