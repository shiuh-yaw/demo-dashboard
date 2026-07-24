/**
 * prismock-backed PrismaClient for service contract tests.
 *
 * prismock emulates most of Prisma (relations, include/select, where,
 * orderBy, cursor) but does NOT populate `@updatedAt` fields - they carry no
 * `@default`, and prismock has no middleware hook. Every model here orders
 * pagination by `updatedAt` and asserts bump semantics, so this wrapper stamps
 * the model's `@updatedAt` field with the current time on each write, reading
 * which field that is from the generated DMMF. `@default(now())` fields
 * (createdAt) are left to prismock, which handles them.
 */

import { Prisma, type PrismaClient } from "@dynamic-demos/db";
import { PrismockClient } from "prismock";

/** delegate name (camelCase model) -> its `@updatedAt` field, per the DMMF. */
const UPDATED_AT_FIELD: ReadonlyMap<string, string> = new Map(
  Prisma.dmmf.datamodel.models.flatMap((model) => {
    const field = model.fields.find((f) => f.isUpdatedAt);
    if (!field) return [];
    const delegate = model.name[0]!.toLowerCase() + model.name.slice(1);
    return [[delegate, field.name] as const];
  }),
);

const WRITE_OPS = new Set([
  "create",
  "update",
  "upsert",
  "createMany",
  "updateMany",
]);

function stamp(data: unknown, field: string): unknown {
  return data && typeof data === "object"
    ? { ...(data as Record<string, unknown>), [field]: new Date() }
    : data;
}

/** A fresh in-memory PrismaClient with faithful `updatedAt` write semantics. */
export function makePrismock(): PrismaClient {
  const client = new PrismockClient();
  return new Proxy(client, {
    get(target, prop, receiver) {
      const delegate = Reflect.get(target, prop, receiver);
      const field =
        typeof prop === "string" ? UPDATED_AT_FIELD.get(prop) : undefined;
      if (!field || typeof delegate !== "object" || delegate === null) {
        return delegate;
      }
      return new Proxy(delegate as Record<string, unknown>, {
        get(dTarget, op, dReceiver) {
          const fn = Reflect.get(dTarget, op, dReceiver);
          if (
            typeof op !== "string" ||
            !WRITE_OPS.has(op) ||
            typeof fn !== "function"
          ) {
            return fn;
          }
          return (args: Record<string, unknown> = {}) => {
            const next = { ...args };
            if (op === "upsert") {
              if (next.create) next.create = stamp(next.create, field);
              if (next.update) next.update = stamp(next.update, field);
            } else if (next.data) {
              next.data = stamp(next.data, field);
            }
            return (fn as (a: unknown) => unknown).call(dTarget, next);
          };
        },
      });
    },
  }) as unknown as PrismaClient;
}
