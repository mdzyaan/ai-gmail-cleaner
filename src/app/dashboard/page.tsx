'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';

interface EmailAnalysis {
  isMarketing: boolean;
  confidence: number;
  reason: string;
}

interface Email {
  id: string;
  from: string;
  subject: string;
  date: string;
  body: string;
  text: string;
  snippet: string;
  isRead: boolean;
  analysis?: EmailAnalysis;
}

export default function Dashboard() {
  const { data: session } = useSession();
  const router = useRouter();
  const [emails, setEmails] = useState<Email[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const EMAILS_PER_PAGE = 5;

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  const handleScan = async (isLoadMore: boolean = false) => {
    try {
      setLoading(true);
      const currentPage = isLoadMore ? page : 1;
      const response = await fetch(`/api/analyze-emails?page=${currentPage}&limit=${EMAILS_PER_PAGE}`);
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHENTICATED') {
          // Automatically sign out if the session is expired or invalid
          await signOut();
          return;
        }
        throw new Error(data.error || 'Failed to analyze emails');
      }
      
      if (data.emails) {
        if (!isLoadMore) {
          setEmails(data.emails);
          setPage(1);
          setExpandedEmail(null);
          setSelectedEmails(new Set());
        } else {
          const existingIds = new Set(emails.map(email => email.id));
          const newEmails = data.emails.filter((email: Email) => !existingIds.has(email.id));
          
          setEmails(prev => [...prev, ...newEmails]);
          setPage(prev => prev + 1);
          
          if (expandedEmail && !newEmails.some((email: Email) => email.id === expandedEmail)) {
            setExpandedEmail(null);
          }
        }
        
        setHasMore(data.emails.length === EMAILS_PER_PAGE);

        const marketingEmails = new Set<string>(
          data.emails
            .filter((email: Email) => email.analysis?.isMarketing)
            .map((email: Email) => email.id)
        );
        
        if (!isLoadMore) {
          setSelectedEmails(marketingEmails);
        } else {
          setSelectedEmails(prev => {
            const newSet = new Set(prev);
            Array.from(marketingEmails).forEach(id => newSet.add(id));
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error('Error scanning emails:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    handleScan(true);
  };

  const handleDelete = async () => {
    try {
      setDeleting(true);
      const emailIds = Array.from(selectedEmails);
      const response = await fetch('/api/delete-emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailIds }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHENTICATED') {
          // Automatically sign out if the session is expired or invalid
          await signOut();
          return;
        }
        throw new Error(data.error || 'Failed to delete emails');
      }
      
      if (data.success) {
        // Clear expanded email if it was deleted
        if (expandedEmail && selectedEmails.has(expandedEmail)) {
          setExpandedEmail(null);
        }

        // Remove deleted emails from the list
        setEmails(prevEmails => prevEmails.filter(email => !selectedEmails.has(email.id)));
        
        // Clear selection state
        setSelectedEmails(new Set());

        // Reset hasMore if we've deleted all emails
        if (emails.length === selectedEmails.size) {
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error deleting emails:', error);
    } finally {
      setDeleting(false);
    }
  };

  const toggleEmailSelection = (id: string) => {
    const newSelection = new Set(selectedEmails);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedEmails(newSelection);
  };

  const toggleEmailExpansion = (id: string) => {
    setExpandedEmail(expandedEmail === id ? null : id);
    // Mark as read when expanded
    if (expandedEmail !== id) {
      markAsRead(id);
    }
  };

  const markAsRead = async (emailId: string) => {
    try {
      const response = await fetch('/api/mark-as-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ emailId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHENTICATED') {
          // Automatically sign out if the session is expired or invalid
          await signOut();
          return;
        }
        throw new Error(data.error || 'Failed to mark email as read');
      }

      if (response.ok) {
        // Update local state only after successful API call
        setEmails(prevEmails => 
          prevEmails.map(email => 
            email.id === emailId ? { ...email, isRead: true } : email
          )
        );
      }
    } catch (error) {
      console.error('Error marking email as read:', error);
    }
  };

  const getGmailLink = (emailId: string) => {
    return `https://mail.google.com/mail/u/1/#all/${emailId}`;
  };

  if (!session) {
    return null;
  }

  return (
    <DashboardLayout>
      <div className="bg-gray-50">
        {/* Main Content */}
        <div className="p-4">
          <div className="mb-4 flex justify-end">
            <Button
              size="lg"
              onClick={() => handleScan(false)}
              disabled={loading}
            >
              {loading ? 'AI Analyzing...' : 'Analyze Recent Emails'}
            </Button>
          </div>

          {emails.length > 0 ? (
            <div className="grid grid-cols-12 bg-white rounded-lg shadow">
              {/* Left Column - Email List */}
              <div className="col-span-5 border-r border-gray-200 overflow-y-auto max-h-[calc(100vh-200px)]">
                <div className="p-4 border-b border-gray-200 sticky top-0 bg-white z-10">
                  <div className="flex justify-between items-center">
                    <h2 className="font-semibold text-gray-700">
                      Analyzed {emails.length} Emails
                      {emails.filter(e => !e.isRead).length > 0 && (
                        <span className="ml-2 text-sm text-blue-600">
                          ({emails.filter(e => !e.isRead).length} unread)
                        </span>
                      )}
                    </h2>
                    <Button
                      onClick={handleDelete}
                      disabled={selectedEmails.size === 0 || deleting}
                      variant="destructive"
                      size="sm"
                    >
                      {deleting ? 'Deleting...' : `Delete ${selectedEmails.size}`}
                    </Button>
                  </div>
                </div>
                <div className="divide-y divide-gray-200">
                  {emails.map((email, index) => (
                    <div
                      key={`${email.id}-${index}`}
                      className={`p-4 cursor-pointer transition-colors ${
                        expandedEmail === email.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                      }`}
                      onClick={() => toggleEmailExpansion(email.id)}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedEmails.has(email.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleEmailSelection(email.id);
                          }}
                          className="mt-1"
                        />
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              {!email.isRead && (
                                <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                              <p className={`truncate ${!email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                {email.from}
                              </p>
                            </div>
                            <p className="text-xs text-gray-500 whitespace-nowrap">
                              {new Date(email.date).toLocaleDateString()}
                            </p>
                          </div>
                          <p className={`text-sm truncate mt-1 ${!email.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                            {email.subject}
                          </p>
                          {email.analysis && (
                            <div className={`text-xs mt-1 ${
                              email.analysis.isMarketing ? 'text-red-600' : 'text-green-600'
                            }`}>
                              <span className="font-medium">
                                {Math.round(email.analysis.confidence * 100)}% confident:
                              </span>
                              <span className="ml-1 line-clamp-1">{email.analysis.reason}</span>
                            </div>
                          )}
                          <p className={`text-xs text-gray-500 mt-1 line-clamp-2 ${!email.isRead ? 'font-medium' : ''}`}>
                            {email.snippet}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {hasMore && emails.length > 0 && (
                    <div className="p-4 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleLoadMore}
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : 'Load More'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column - Email Content */}
              <div className="col-span-7">
                {expandedEmail ? (
                  <div className="h-full">
                    <div className="border-b border-gray-200 p-6 sticky top-0 bg-white z-10">
                      {emails.find(e => e.id === expandedEmail) && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-xl text-gray-900">
                              {emails.find(e => e.id === expandedEmail)?.subject}
                            </h2>
                            <div className="flex items-center gap-3">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => toggleEmailSelection(expandedEmail)}
                              >
                                {selectedEmails.has(expandedEmail) ? 'Unselect' : 'Select'}
                              </Button>
                              <a
                                href={getGmailLink(expandedEmail)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 text-sm flex items-center gap-1"
                              >
                                View in Gmail ↗
                              </a>
                            </div>
                          </div>
                          
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex items-start gap-4">
                              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold text-lg">
                                {emails.find(e => e.id === expandedEmail)?.from.charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {emails.find(e => e.id === expandedEmail)?.from}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {new Date(emails.find(e => e.id === expandedEmail)?.date || '').toLocaleString()}
                                    </p>
                                  </div>
                                  {emails.find(e => e.id === expandedEmail)?.analysis && (
                                    <div className={`text-sm px-3 py-1 rounded-full ${
                                      emails.find(e => e.id === expandedEmail)?.analysis?.isMarketing
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                    }`}>
                                      {emails.find(e => e.id === expandedEmail)?.analysis?.isMarketing
                                        ? 'Marketing'
                                        : 'Important'}
                                    </div>
                                  )}
                                </div>
                                <div className="mt-2 text-sm text-gray-600">
                                  <span className="font-medium">ID:</span> {expandedEmail}
                                </div>
                                {emails.find(e => e.id === expandedEmail)?.analysis && (
                                  <div className="mt-2 text-sm">
                                    <span className="font-medium">AI Analysis:</span>
                                    <span className="ml-2">
                                      {emails.find(e => e.id === expandedEmail)?.analysis?.reason}
                                      <span className="text-gray-500 ml-2">
                                        ({Math.round(emails.find(e => e.id === expandedEmail)?.analysis?.confidence || 0 * 100)}% confident)
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <base target="_blank">
                              <meta charset="utf-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1">
                              <style>
                                body {
                                  font-family: system-ui, -apple-system, sans-serif;
                                  line-height: 1.5;
                                  margin: 0;
                                  padding: 16px;
                                  color: #374151;
                                  font-size: 16px;
                                }
                                img {
                                  max-width: 100%;
                                  height: auto;
                                  display: block;
                                  margin: 1em 0;
                                }
                                a {
                                  color: #2563eb;
                                  text-decoration: none;
                                }
                                a:hover {
                                  text-decoration: underline;
                                }
                                table {
                                  max-width: 100%;
                                  border-collapse: collapse;
                                }
                                td, th {
                                  padding: 8px;
                                  border: 1px solid #e5e7eb;
                                }
                                p {
                                  margin: 1em 0;
                                }
                                pre, code {
                                  white-space: pre-wrap;
                                  word-wrap: break-word;
                                }
                                blockquote {
                                  margin: 1em 0;
                                  padding-left: 1em;
                                  border-left: 4px solid #e5e7eb;
                                  color: #6b7280;
                                }
                              </style>
                            </head>
                            <body>
                              ${emails.find(e => e.id === expandedEmail)?.body || 
                                `<div style="white-space: pre-wrap;">${emails.find(e => e.id === expandedEmail)?.text || ''}</div>`}
                            </body>
                          </html>
                        `}
                        className="w-full min-h-[calc(100vh-250px)] bg-white rounded border-none"
                        sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-gray-500">
                    Select an email to view its content
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="h-[calc(100vh-200px)] flex items-center justify-center text-gray-500 bg-white rounded-lg shadow">
              Click "Analyze Recent Emails" to start
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 