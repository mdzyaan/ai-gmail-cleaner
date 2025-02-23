# Gmail Marketing Email Cleaner

A Next.js application that helps you clean up your Gmail inbox by identifying and removing marketing and promotional emails using Google's Gmail API and OpenAI's GPT-3.5 for intelligent email analysis.

## Features

- **Authentication**
  - Secure OAuth2 authentication with Gmail
  - Automatic token refresh handling
  - Multi-account support (u/0, u/1, etc.)

- **Email Analysis**
  - AI-powered email classification using GPT-3.5
  - Confidence scoring for marketing detection
  - Detailed analysis reasoning for each email
  - Batch processing to avoid rate limits

- **Email Management**
  - View complete email content with HTML support
  - Read/unread status tracking
  - Batch delete selected emails
  - Pagination support with "Load More"
  - Automatic marking of emails as read when opened

- **User Interface**
  - Modern, responsive design with Tailwind CSS
  - Gmail-like interface
  - Email preview with snippets
  - Unread email indicators (blue dot)
  - Visual categorization (Marketing vs Important)
  - Rich text email rendering
  - Avatar display for senders

## Prerequisites

- Node.js 18+ and npm
- A Google Cloud Project with Gmail API enabled
- OAuth 2.0 credentials (Client ID and Client Secret)
- OpenAI API key for email analysis

## Setup

1. Clone the repository:
```bash
git clone https://github.com/mdzyaan/ai-gmail-cleaner.git
cd ai-gmail-clenaer
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env.local` file in the root directory with the following variables:
```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
OPENAI_API_KEY=your_openai_api_key
```

4. Get your Google OAuth credentials:
   - Go to the [Google Cloud Console](https://console.cloud.google.com)
   - Create a new project or select an existing one
   - Enable the Gmail API
   - Configure the OAuth consent screen
   - Create OAuth 2.0 credentials (Web application)
   - Add authorized redirect URIs:
     - http://localhost:3000/api/auth/callback/google (for development)
     - https://your-domain.com/api/auth/callback/google (for production)

5. Get your OpenAI API key:
   - Go to [OpenAI's platform](https://platform.openai.com)
   - Create an account or sign in
   - Navigate to API keys section
   - Create a new API key

6. Run the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Connect Gmail Account" to authenticate with Google
2. Grant necessary permissions when prompted
3. Click "Analyze Recent Emails" to scan your inbox
4. The application will:
   - Load emails in batches
   - Analyze them using AI
   - Display marketing confidence scores
   - Show analysis reasoning
5. You can:
   - Click on emails to view full content
   - Select multiple emails for deletion
   - Load more emails using pagination
   - View emails in Gmail directly

## Technical Details

### API Routes
- `/api/analyze-emails`: Fetches and analyzes emails with pagination
- `/api/delete-emails`: Handles batch deletion of emails
- `/api/mark-as-read`: Updates email read status
- `/api/auth/[...nextauth]`: Handles authentication

### Key Technologies
- [Next.js](https://nextjs.org/) 14 with App Router
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Gmail API](https://developers.google.com/gmail/api)
- [OpenAI API](https://platform.openai.com)

### Email Analysis
- Uses GPT-3.5-turbo for intelligent classification
- Analyzes sender, subject, and content
- Provides confidence scores and reasoning
- Processes emails in batches to manage API limits

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
