import { NextResponse } from "next/server";

/**
 * Health check endpoint for the Demo Applications API Server.
 *
 * This endpoint provides basic service health information and can be used by:
 * - Load balancers for health checks
 * - Monitoring systems for uptime tracking
 * - Deployment pipelines for readiness verification
 *
 * @returns {NextResponse} JSON response with service status and timestamp
 *
 * @example
 * GET /
 * Response: {"status":"ok","timestamp":"2025-01-08T10:30:00.000Z","service":"demo-apps-api"}
 */
export async function GET() {
  return NextResponse.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    service: "demo-apps-api",
  });
}
