import { google } from 'googleapis';
import { getServerSession } from 'next-auth';
import { NextResponse } from 'next/server';
import { authOptions } from '../auth/[...nextauth]/route';
import OpenAI from 'openai';
import { GaxiosPromise } from 'googleapis-common';
import { gmail_v1 } from 'googleapis';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function decodeBase64(str: string) {
  if (!str) return '';
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  try {
    return Buffer.from(base64, 'base64').toString('utf-8');
  } catch (e) {
    return str;
  }
}

function getEmailBody(payload: gmail_v1.Schema$MessagePart | null): { html: string; text: string } {
  if (!payload) return { html: '', text: '' };

  let htmlContent = '';
  let textContent = '';

  function processPayload(part: gmail_v1.Schema$MessagePart) {
    if (!part) return;

    if (part.mimeType === 'text/html' && part.body?.data) {
      htmlContent = decodeBase64(part.body.data);
    }
    if (part.mimeType === 'text/plain' && part.body?.data) {
      textContent = decodeBase64(part.body.data);
    }

    // Recursively process parts
    if (part.parts) {
      part.parts.forEach(processPayload);
    }
  }

  processPayload(payload);

  // If no HTML content found, convert text content to HTML
  if (!htmlContent && textContent) {
    htmlContent = textContent.replace(/\n/g, '<br>');
  }

  // If no text content found but have HTML, create a text version
  if (!textContent && htmlContent) {
    textContent = htmlContent.replace(/<[^>]*>/g, '');
  }

  // If payload has direct body data but no content found yet
  if (!htmlContent && !textContent && payload.body?.data) {
    const content = decodeBase64(payload.body.data);
    if (payload.mimeType === 'text/html') {
      htmlContent = content;
      textContent = content.replace(/<[^>]*>/g, '');
    } else {
      textContent = content;
      htmlContent = content.replace(/\n/g, '<br>');
    }
  }

  return {
    html: htmlContent,
    text: textContent
  };
}

interface EmailData {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
  text: string;
  snippet: string;
  isRead: boolean;
}

async function analyzeEmail(email: EmailData) {
  try {
    const content = `
From: ${email.from || 'Unknown'}
Subject: ${email.subject || 'No Subject'}
Body: ${(email.text || '').substring(0, 1000)}
`;

    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are an email analyzer. Determine if an email is marketing/promotional/unnecessary or important. Consider factors like sender, subject, and content. Respond with a JSON object containing: isMarketing (boolean), confidence (0-1), and reason (string)."
        },
        {
          role: "user",
          content: content
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 150
    });

    const content_str = response.choices[0].message.content;
    return content_str ? JSON.parse(content_str) : {
      isMarketing: false,
      confidence: 0,
      reason: "Failed to analyze email"
    };
  } catch (error) {
    console.error('Error analyzing single email:', error);
    return {
      isMarketing: false,
      confidence: 0,
      reason: "Analysis failed"
    };
  }
}

async function processBatch(emails: EmailData[], batchSize: number = 2) {
  const results = [];
  for (let i = 0; i < emails.length; i += batchSize) {
    const batch = emails.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(async (email) => {
        try {
          const analysis = await analyzeEmail(email);
          return {
            ...email,
            analysis,
          };
        } catch (error) {
          console.error('Error processing email in batch:', error);
          return {
            ...email,
            analysis: {
              isMarketing: false,
              confidence: 0,
              reason: "Processing failed"
            }
          };
        }
      })
    );
    results.push(...batchResults);
    if (i + batchSize < emails.length) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between batches
    }
  }
  return results;
}

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get pagination parameters from URL
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '5');

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: session.accessToken,
    });

    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    
    // Get emails with pagination
    let messageList: gmail_v1.Schema$Message[] = [];
    let pageToken: string | undefined = undefined;

    // If we need to skip pages, fetch until we reach our target page
    for (let currentPage = 1; currentPage <= page; currentPage++) {
      const response: gmail_v1.Schema$ListMessagesResponse = (await gmail.users.messages.list({
        userId: 'me',
        maxResults: limit,
        pageToken: pageToken || undefined,
      })).data;

      if (currentPage === page) {
        messageList = response.messages || [];
        pageToken = response.nextPageToken || undefined;
      } else {
        pageToken = response.nextPageToken || undefined;
      }
    }
    
    // First, fetch all email details in parallel
    const emailDetailsPromises = messageList.map(async (message) => {
      try {
        const email = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        });

        const headers = email.data.payload?.headers;
        const bodyContent = getEmailBody(email.data.payload || null);
        const labelIds = email.data.labelIds || [];
        
        return {
          id: message.id!,
          from: headers?.find(h => h.name === 'From')?.value || 'Unknown',
          subject: headers?.find(h => h.name === 'Subject')?.value || 'No Subject',
          date: headers?.find(h => h.name === 'Date')?.value || new Date().toISOString(),
          body: bodyContent.html,
          text: bodyContent.text,
          snippet: email.data.snippet || '',
          isRead: !labelIds.includes('UNREAD'),
        };
      } catch (error) {
        console.error('Error fetching email details:', error);
        return null;
      }
    });

    const emailDetails = (await Promise.all(emailDetailsPromises)).filter((email): email is EmailData => email !== null);
    
    // Then process them in batches
    const analyzedEmails = await processBatch(emailDetails);

    return NextResponse.json({ 
      emails: analyzedEmails,
      nextPage: page + 1,
      hasMore: pageToken !== undefined
    });
  } catch (error: any) {
    console.error('Error analyzing emails:', error.message);
    console.error('Error details:', error.response?.data || error);
    return NextResponse.json(
      { error: `Failed to analyze emails: ${error.message}` },
      { status: 500 }
    );
  }
} 