import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';

function decodeBase64(str: string) {
  // Handle both URL-safe and standard Base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
}

function getEmailBody(payload: any): string {
  if (!payload) return '';

  // If the message has parts (multipart email)
  if (payload.parts) {
    // Look for HTML part first
    const htmlPart = payload.parts.find((part: any) => part.mimeType === 'text/html');
    if (htmlPart) {
      return decodeBase64(htmlPart.body.data || '');
    }
    // Fall back to text part
    const textPart = payload.parts.find((part: any) => part.mimeType === 'text/plain');
    if (textPart) {
      return decodeBase64(textPart.body.data || '');
    }
    // Recursively check nested parts
    for (const part of payload.parts) {
      const body = getEmailBody(part);
      if (body) return body;
    }
  }

  // If the message is simple (no parts)
  if (payload.body && payload.body.data) {
    return decodeBase64(payload.body.data);
  }

  return '';
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Search for marketing emails (adjust the query as needed)
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'category:promotions OR label:^smartlabel_marketing OR subject:(unsubscribe OR newsletter OR offer OR sale OR discount)',
      maxResults: 100,
    });

    const messages = response.data.messages || [];
    const emailDetails = await Promise.all(
      messages.map(async (message) => {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        const headers = email.data.payload?.headers;
        return {
          id: message.id,
          from: headers?.find(h => h.name === 'From')?.value,
          subject: headers?.find(h => h.name === 'Subject')?.value,
          date: headers?.find(h => h.name === 'Date')?.value,
          body: getEmailBody(email.data.payload),
          snippet: email.data.snippet,
        };
      })
    );

    return NextResponse.json({ emails: emailDetails });
  } catch (error: any) {
    console.error('Error scanning emails:', error.message);
    console.error('Error details:', error.response?.data || error);
    return NextResponse.json(
      { error: `Failed to scan emails: ${error.message}` },
      { status: 500 }
    );
  }
} 