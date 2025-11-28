/**
 * Test Odoo Connection Utility
 * Helper functions to test Odoo API connectivity
 */

import { authService } from '../services/authService';
import { odooService } from '../services/odooService';
import { getOdooConfig, validateConfig } from '../config/odooConfig';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test Odoo configuration
 */
export async function testConfiguration(): Promise<ConnectionTestResult> {
  try {
    const config = getOdooConfig();
    const validation = validateConfig(config);

    if (!validation.valid) {
      return {
        success: false,
        message: 'Configuration validation failed',
        details: {
          errors: validation.errors,
          config,
        },
      };
    }

    return {
      success: true,
      message: 'Configuration is valid',
      details: {
        url: config.url,
        database: config.database,
        protocol: config.protocol,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Configuration test failed',
      details: {
        error: error.message,
      },
    };
  }
}

/**
 * Test Odoo authentication
 */
export async function testAuthentication(
  username: string,
  password: string,
  database?: string
): Promise<ConnectionTestResult> {
  try {
    const session = await authService.login({
      username,
      password,
      database,
    });

    return {
      success: true,
      message: 'Authentication successful',
      details: {
        uid: session.uid,
        database: session.database,
        username: session.username,
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'Authentication failed',
      details: {
        error: error.message,
      },
    };
  }
}

/**
 * Test Odoo API connection (search operation)
 */
export async function testAPIConnection(model: string = 'res.partner'): Promise<ConnectionTestResult> {
  try {
    if (!authService.isAuthenticated()) {
      return {
        success: false,
        message: 'Not authenticated. Please login first.',
      };
    }

    // Try to search for records (limit to 5)
    const results = await odooService.search(model, [], ['id']);

    return {
      success: true,
      message: 'API connection successful',
      details: {
        model,
        recordCount: results.length,
        sampleRecords: results.slice(0, 3),
      },
    };
  } catch (error: any) {
    return {
      success: false,
      message: 'API connection test failed',
      details: {
        error: error.message,
        model,
      },
    };
  }
}

/**
 * Run full connection test suite
 */
export async function runFullConnectionTest(
  credentials?: { username: string; password: string; database?: string }
): Promise<{
  configuration: ConnectionTestResult;
  authentication?: ConnectionTestResult;
  apiConnection?: ConnectionTestResult;
}> {
  const results: any = {};

  // Test 1: Configuration
  results.configuration = await testConfiguration();

  // Test 2: Authentication (if credentials provided)
  if (credentials?.username && credentials?.password) {
    results.authentication = await testAuthentication(
      credentials.username,
      credentials.password,
      credentials.database
    );
  }

  // Test 3: API Connection (if authenticated)
  if (authService.isAuthenticated()) {
    results.apiConnection = await testAPIConnection();
  }

  return results;
}

/**
 * Display connection test results in console
 */
export function displayTestResults(results: {
  configuration: ConnectionTestResult;
  authentication?: ConnectionTestResult;
  apiConnection?: ConnectionTestResult;
}): void {
  console.log('=== Odoo Connection Test Results ===\n');

  // Configuration
  console.log('1. Configuration Test:');
  console.log(`   Status: ${results.configuration.success ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   Message: ${results.configuration.message}`);
  if (results.configuration.details) {
    console.log(`   Details:`, results.configuration.details);
  }
  console.log('');

  // Authentication
  if (results.authentication) {
    console.log('2. Authentication Test:');
    console.log(`   Status: ${results.authentication.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${results.authentication.message}`);
    if (results.authentication.details) {
      console.log(`   Details:`, results.authentication.details);
    }
    console.log('');
  }

  // API Connection
  if (results.apiConnection) {
    console.log('3. API Connection Test:');
    console.log(`   Status: ${results.apiConnection.success ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`   Message: ${results.apiConnection.message}`);
    if (results.apiConnection.details) {
      console.log(`   Details:`, results.apiConnection.details);
    }
    console.log('');
  }

  console.log('=== End of Test Results ===');
}

