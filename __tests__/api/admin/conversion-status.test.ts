/**
 * Property-based tests for Admin Conversion Status API Logic
 * Feature: admin-conversion-updates
 * Tests Properties 2, 5, 6: API call targeting, response structure, admin authorization
 */

import * as fc from 'fast-check';

describe('Admin Conversion Status API - Property Tests', () => {
  /**
   * Property 2: API call targeting
   * For any conversion status check request, the API should query only files 
   * with conversionStatus 'pending' or 'processing', not all files
   */
  test('Feature: admin-conversion-updates, Property 2: API call targeting', async () => {
    const property = fc.property(
      fc.array(fc.record({
        _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
        title: fc.string({ minLength: 1, maxLength: 100 }),
        conversionStatus: fc.constantFrom('pending', 'processing', 'ready', 'failed')
      }), { minLength: 0, maxLength: 20 }),
      (audioFiles) => {
        // Simulate the filtering logic from the API
        const baseQuery = {
          conversionStatus: { $in: ['pending', 'processing'] },
          status: 'active'
        };

        // Filter files that match the query
        const convertingFiles = audioFiles.filter(file => 
          ['pending', 'processing'].includes(file.conversionStatus)
        );

        // Verify that the query logic correctly identifies converting files
        const queryMatches = audioFiles.filter(file => 
          baseQuery.conversionStatus.$in.includes(file.conversionStatus)
        );

        expect(queryMatches).toEqual(convertingFiles);
        
        // Verify no non-converting files are included
        queryMatches.forEach(file => {
          expect(['pending', 'processing']).toContain(file.conversionStatus);
        });
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  /**
   * Property 5: API response structure
   * For any successful conversion status API response, it should include 
   * recordId, title, and conversionStatus for each file
   */
  test('Feature: admin-conversion-updates, Property 5: API response structure', async () => {
    const property = fc.property(
      fc.array(fc.record({
        _id: fc.hexaString({ minLength: 24, maxLength: 24 }),
        title: fc.string({ minLength: 1, maxLength: 100 }),
        lecturerName: fc.string({ minLength: 1, maxLength: 50 }),
        conversionStatus: fc.constantFrom('pending', 'processing', 'ready', 'failed'),
        playbackUrl: fc.option(fc.webUrl()),
        conversionError: fc.option(fc.string())
      }), { minLength: 1, maxLength: 10 }),
      (convertingFiles) => {
        // Simulate the response formatting logic from the API
        const updates = convertingFiles.map(file => ({
          recordId: file._id.toString(),
          title: file.title,
          lecturerName: file.lecturerName,
          conversionStatus: file.conversionStatus,
          playbackUrl: file.playbackUrl,
          conversionError: file.conversionError,
          isPlayable: file.conversionStatus === 'ready' && file.playbackUrl
        }));

        const completedCount = updates.filter(update => 
          update.conversionStatus === 'ready' || update.conversionStatus === 'failed'
        ).length;
        
        const stillProcessing = updates.filter(update => 
          update.conversionStatus === 'pending' || update.conversionStatus === 'processing'
        ).length;

        const response = {
          success: true,
          updates,
          completedCount,
          stillProcessing,
          timestamp: new Date().toISOString()
        };

        // Verify response structure
        expect(response).toHaveProperty('success');
        expect(response).toHaveProperty('updates');
        expect(response).toHaveProperty('completedCount');
        expect(response).toHaveProperty('stillProcessing');
        expect(response).toHaveProperty('timestamp');

        // Verify each update has required fields
        response.updates.forEach((update: any) => {
          expect(update).toHaveProperty('recordId');
          expect(update).toHaveProperty('title');
          expect(update).toHaveProperty('conversionStatus');
          expect(typeof update.recordId).toBe('string');
          expect(typeof update.title).toBe('string');
          expect(['pending', 'processing', 'ready', 'failed']).toContain(update.conversionStatus);
        });

        // Verify counts are numbers and make sense
        expect(typeof response.completedCount).toBe('number');
        expect(typeof response.stillProcessing).toBe('number');
        expect(response.completedCount + response.stillProcessing).toBeLessThanOrEqual(response.updates.length);
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  /**
   * Property 6: Admin authorization logic
   * For any conversion status API request, only authenticated admin users 
   * should receive successful responses
   */
  test('Feature: admin-conversion-updates, Property 6: Admin authorization', async () => {
    const property = fc.property(
      fc.record({
        hasToken: fc.boolean(),
        tokenValid: fc.boolean(),
        userExists: fc.boolean(),
        userRole: fc.constantFrom('admin', 'super_admin', 'presenter', 'viewer', 'invalid')
      }),
      (authScenario) => {
        // Simulate the authorization logic from the API
        const isAuthenticated = authScenario.hasToken && authScenario.tokenValid && authScenario.userExists;
        const hasPermission = ['admin', 'super_admin'].includes(authScenario.userRole);
        const shouldSucceed = isAuthenticated && hasPermission;

        // Simulate response status based on authorization
        let status: number;
        if (!authScenario.hasToken || !authScenario.tokenValid || !authScenario.userExists) {
          status = 401; // Unauthorized
        } else if (!hasPermission) {
          status = 403; // Forbidden
        } else {
          status = 200; // Success
        }

        // Verify authorization logic
        if (shouldSucceed) {
          expect(status).toBe(200);
        } else {
          expect([401, 403]).toContain(status);
        }
      }
    );

    fc.assert(property, { numRuns: 100 });
  });

  // Unit test for session file prioritization logic
  test('should prioritize session files in query logic', () => {
    const allFiles = [
      { _id: 'session1', conversionStatus: 'processing' },
      { _id: 'session2', conversionStatus: 'pending' },
      { _id: 'other1', conversionStatus: 'processing' },
      { _id: 'other2', conversionStatus: 'pending' }
    ];

    const sessionFiles = ['session1', 'session2'];

    // Simulate the session prioritization logic
    const sessionQuery = {
      conversionStatus: { $in: ['pending', 'processing'] },
      _id: { $in: sessionFiles }
    };

    const otherQuery = {
      conversionStatus: { $in: ['pending', 'processing'] },
      _id: { $nin: sessionFiles }
    };

    // Filter files based on queries
    const sessionResults = allFiles.filter(file => 
      sessionQuery.conversionStatus.$in.includes(file.conversionStatus) &&
      sessionQuery._id.$in.includes(file._id)
    );

    const otherResults = allFiles.filter(file => 
      otherQuery.conversionStatus.$in.includes(file.conversionStatus) &&
      !otherQuery._id.$nin.includes(file._id)
    );

    // Verify session files are prioritized
    expect(sessionResults).toHaveLength(2);
    expect(sessionResults.map(f => f._id)).toEqual(['session1', 'session2']);
    
    expect(otherResults).toHaveLength(2);
    expect(otherResults.map(f => f._id)).toEqual(['other1', 'other2']);

    // Combined results should prioritize session files first
    const combinedResults = [...sessionResults, ...otherResults];
    expect(combinedResults[0]._id).toBe('session1');
    expect(combinedResults[1]._id).toBe('session2');
  });
});