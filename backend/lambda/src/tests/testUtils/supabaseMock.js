import { vi } from "vitest";

// Supabase's query builder is "thenable" at every step — `.from(x).select(y)`,
// `.eq(...)`, `.single()` etc all return an object you can await directly, or
// keep chaining. This mock replicates that: each `.from(table)` call pops the
// next queued { data, error } response for that table (in call order) and
// resolves to it no matter how much further chaining happens first.
export function createSupabaseMock(responseQueues = {}, calls = []) {
  const queues = {};
  for (const [table, responses] of Object.entries(responseQueues)) {
    queues[table] = [...responses];
  }

  function makeBuilder(table) {
    const resolveNext = () => {
      const queue = queues[table];
      if (!queue || queue.length === 0) return { data: null, error: null };
      return queue.shift();
    };

    const builder = {
      select: vi.fn(() => builder),
      insert: vi.fn((payload) => {
        calls.push({ table, method: "insert", payload });
        return builder;
      }),
      upsert: vi.fn((payload) => {
        calls.push({ table, method: "upsert", payload });
        return builder;
      }),
      update: vi.fn((payload) => {
        calls.push({ table, method: "update", payload });
        return builder;
      }),
      delete: vi.fn(() => {
        calls.push({ table, method: "delete" });
        return builder;
      }),
      eq: vi.fn(() => builder),
      neq: vi.fn(() => builder),
      is: vi.fn(() => builder),
      in: vi.fn(() => builder),
      like: vi.fn(() => builder),
      or: vi.fn(() => builder),
      gte: vi.fn(() => builder),
      order: vi.fn(() => builder),
      limit: vi.fn(() => builder),
      single: vi.fn(() => builder),
      maybeSingle: vi.fn(() => builder),
      then: (resolve, reject) => Promise.resolve(resolveNext()).then(resolve, reject),
    };
    return builder;
  }

  const supabaseAdmin = {
    from: vi.fn((table) => makeBuilder(table)),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  };

  return { supabaseAdmin, calls };
}
