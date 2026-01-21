import { NextResponse } from "next/server";
import { checkEnvironmentConfig, checkGatewayHealth } from "@/lib/utils/environment-checker";

/**
 * Debug Environment API
 * GET /api/debug/environment
 * 
 * Returns environment configuration for debugging
 * Only works in development or with admin authentication
 */
export async function GET() {
  try {
    // Only allow in development or with proper authentication
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: "Environment debug not available in production" },
        { status: 403 }
      );
    }

    const config = checkEnvironmentConfig();
    const gatewayHealth = await checkGatewayHealth();

    return NextResponse.json({
      ok: true,
      environment: config,
      gateway: {
        url: config.gatewayUrl,
        accessible: gatewayHealth.accessible,
        error: gatewayHealth.error
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Environment debug error:", error);
    
    return NextResponse.json(
      {
        ok: false,
        error: "Failed to check environment",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}