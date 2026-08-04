import type { ContactService, RecordSightingResult } from "./types";

/** Never selected (contacts are Postgres-only); exists only to satisfy the
 *  interface in non-DB contexts. Throwing is safe - all callers wrap in try/catch. */
export class StubContactService implements ContactService {
  async recordSighting(): Promise<RecordSightingResult> {
    throw new Error("ContactService requires a database");
  }
}
