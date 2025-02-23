# Gmail Marketing Email Cleaner

A Next.js application that helps you clean up your Gmail inbox by identifying and removing marketing and promotional emails using Google's Gmail API.

## Features

- OAuth authentication with Google
- Scan inbox for marketing emails
- Batch delete selected emails
- Modern UI with Tailwind CSS and shadcn/ui
- Fully responsive design

## Prerequisites

- Node.js 18+ and npm
- A Google Cloud Project with Gmail API enabled
- OAuth 2.0 credentials (Client ID and Client Secret)

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd gmail-cleanup
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

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. Click "Connect Gmail Account" to authenticate with Google
2. Once connected, click "Scan Marketing Emails" to analyze your inbox
3. Select the emails you want to remove
4. Click "Delete Selected" to move them to trash

## Technology Stack

- [Next.js](https://nextjs.org/)
- [TypeScript](https://www.typescriptlang.org/)
- [Tailwind CSS](https://tailwindcss.com/)
- [shadcn/ui](https://ui.shadcn.com/)
- [NextAuth.js](https://next-auth.js.org/)
- [Gmail API](https://developers.google.com/gmail/api)

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details.
