/**
 * POST /api/me/email - Set user email
 *
 * Body: { email: string | null }
 * Requires: Bearer token from Dynamic auth
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest, unauthorizedResponse } from '@/lib/auth/dynamicAuth';
import { getProfileByDynamicId, updateUserEmail } from '@/lib/services/userService';

export async function POST(request: NextRequest) {
  // Authenticate
  const authResult = await authenticateRequest(request);
  if (!authResult.success) {
    return unauthorizedResponse(authResult);
  }

  try {
    // Parse body
    const body = await request.json();
    const { email } = body;

    // Basic email validation (null is allowed to clear)
    if (email !== null && email !== undefined) {
      if (typeof email !== 'string') {
        return NextResponse.json(
          { success: false, error: 'Email must be a string or null' },
          { status: 400 }
        );
      }
      // Simple email format check (not comprehensive)
      if (email && !email.includes('@')) {
        return NextResponse.json(
          { success: false, error: 'Invalid email format' },
          { status: 400 }
        );
      }
    }

    // Get profile
    const profile = await getProfileByDynamicId(authResult.user.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Profile not found' },
        { status: 404 }
      );
    }

    // Update email
    await updateUserEmail(profile.id, email || null);

    return NextResponse.json({
      success: true,
      email: email || null,
    });
  } catch (error) {
    console.error('Error updating email:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update email' },
      { status: 500 }
    );
  }
}
