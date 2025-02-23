import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { emailId } = await request.json();

    if (!emailId) {
      return NextResponse.json(
        { error: 'Email ID is required' },
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

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Get the current labels
    const message = await gmail.users.messages.get({
      userId: 'me',
      id: emailId,
      format: 'minimal'
    });

    const currentLabels = message.data.labelIds || [];
    
    // Remove the UNREAD label if it exists
    if (currentLabels.includes('UNREAD')) {
      await gmail.users.messages.modify({
        userId: 'me',
        id: emailId,
        requestBody: {
          removeLabelIds: ['UNREAD']
        }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error marking email as read:', error.message);
    console.error('Error details:', error.response?.data || error);
    return NextResponse.json(
      { error: `Failed to mark email as read: ${error.message}` },
      { status: 500 }
    );
  }
} 