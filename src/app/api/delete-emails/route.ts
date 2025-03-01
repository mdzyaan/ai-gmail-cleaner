import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated', code: 'UNAUTHENTICATED' }, { status: 401 });
    }

    const { emailIds } = await request.json();

    if (!Array.isArray(emailIds) || emailIds.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or empty email IDs', code: 'INVALID_REQUEST' },
        { status: 400 }
      );
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    try {
      const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

      // Delete emails in batches to avoid rate limits
      const batchSize = 10;
      for (let i = 0; i < emailIds.length; i += batchSize) {
        const batch = emailIds.slice(i, i + batchSize);
        await Promise.all(
          batch.map((id) =>
            gmail.users.messages.trash({
              userId: 'me',
              id,
            })
          )
        );
      }

      return NextResponse.json({ success: true, deletedCount: emailIds.length });
    } catch (error: any) {
      if (error.response?.status === 401 || error.message.includes('invalid_grant')) {
        return NextResponse.json({ error: 'Session expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
      }
      throw error;
    }
  } catch (error: any) {
    console.error('Error deleting emails:', error.message);
    console.error('Error details:', error.response?.data || error);
    
    if (error.response?.status === 401 || error.message.includes('invalid_grant')) {
      return NextResponse.json({ error: 'Session expired', code: 'TOKEN_EXPIRED' }, { status: 401 });
    }
    
    return NextResponse.json(
      { error: `Failed to delete emails: ${error.message}`, code: 'UNKNOWN_ERROR' },
      { status: 500 }
    );
  }
} 