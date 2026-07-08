"use client";

/**
 * Client-boundary re-export for Droplet primitives used on the public
 * landing surface. `@dynamic-labs-sdk/droplet` ships without a
 * `"use client"` directive but its bundle evaluates React context at
 * module scope (via Radix), which crashes when imported directly from a
 * React Server Component. Importing through this shim turns each
 * component into a client reference, so the landing page, demo card,
 * and detail page all stay server components.
 */
export { Badge, Button, Card, CardContent } from "@dynamic-labs-sdk/droplet";
