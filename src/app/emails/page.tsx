'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "@/components/ui/command"
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

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

interface Settings {
  emailFetchLimit: number;
  aiTemperature: number;
  autoDeleteThreshold: number;
  markAsReadOnOpen: boolean;
  showMarketingLabels: boolean;
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
  const [settings, setSettings] = useState<Settings>({
    emailFetchLimit: 5,
    aiTemperature: 0.7,
    autoDeleteThreshold: 0.9,
    markAsReadOnOpen: true,
    showMarketingLabels: true,
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSettings = localStorage.getItem('emailCleanupSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
  }, []);

  useEffect(() => {
    if (!session) {
      router.push('/login');
    }
  }, [session, router]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleScan = async (isLoadMore: boolean = false) => {
    try {
      setLoading(true);
      const currentPage = isLoadMore ? page : 1;
      const response = await fetch(
        `/api/analyze-emails?page=${currentPage}&limit=${settings.emailFetchLimit}&temperature=${settings.aiTemperature}`
      );
      const data = await response.json();
      
      if (!response.ok) {
        if (data.code === 'TOKEN_EXPIRED' || data.code === 'UNAUTHENTICATED') {
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
        
        setHasMore(data.emails.length === settings.emailFetchLimit);

        // Auto-select marketing emails based on confidence threshold
        const marketingEmails = new Set<string>(
          data.emails
            .filter((email: Email) => 
              email.analysis?.isMarketing && 
              email.analysis.confidence >= settings.autoDeleteThreshold
            )
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
    // Mark as read when expanded if the setting is enabled
    if (expandedEmail !== id && settings.markAsReadOnOpen) {
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
      <div className="bg-gray-50 min-h-screen">
        <div className="p-4">
          <div className="mb-4 flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">Email Analysis</h1>
            <Button
              size="lg"
              onClick={() => handleScan(false)}
              disabled={loading}
              className="min-w-[200px]"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  AI Analyzing...
                </>
              ) : (
                'Analyze Recent Emails'
              )}
            </Button>
          </div>

          {emails.length > 0 ? (
            <Card className="grid grid-cols-12">
              {/* Left Column - Email List */}
              <div className="col-span-5 border-r">
                <div className="p-4 border-b sticky top-0 bg-card z-10">
                  <div className="flex justify-between items-center">
                    <div>
                      <h2 className="font-semibold">
                        Analyzed {emails.length} Emails
                      </h2>
                      {emails.filter(e => !e.isRead).length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          {emails.filter(e => !e.isRead).length} unread
                        </p>
                      )}
                    </div>
                    <Button
                      onClick={handleDelete}
                      disabled={selectedEmails.size === 0 || deleting}
                      variant="destructive"
                      size="sm"
                    >
                      {deleting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Deleting...
                        </>
                      ) : (
                        `Delete ${selectedEmails.size}`
                      )}
                    </Button>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-250px)]">
                  {emails.map((email, index) => (
                    <div key={`${email.id}-${index}`}>
                      <div
                        className={cn(
                          "p-4 cursor-pointer transition-colors",
                          expandedEmail === email.id ? "bg-accent" : "hover:bg-accent/50"
                        )}
                        onClick={() => toggleEmailExpansion(email.id)}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={selectedEmails.has(email.id)}
                            onCheckedChange={(checked) => {
                              toggleEmailSelection(email.id);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="mt-1"
                          />
                          <div className="min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                {!email.isRead && (
                                  <div className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                                )}
                                <p className={cn(
                                  "truncate",
                                  !email.isRead ? "font-semibold" : "text-muted-foreground"
                                )}>
                                  {email.from}
                                </p>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-nowrap">
                                {new Date(email.date).toLocaleDateString()}
                              </p>
                            </div>
                            <p className={cn(
                              "text-sm truncate mt-1",
                              !email.isRead ? "font-semibold" : "text-muted-foreground"
                            )}>
                              {email.subject}
                            </p>
                            {email.analysis && settings.showMarketingLabels && (
                              <div className="mt-1">
                                <Badge variant={email.analysis.isMarketing ? "destructive" : "default"} className="text-xs">
                                  {Math.round(email.analysis.confidence * 100)}% {email.analysis.isMarketing ? "Marketing" : "Important"}
                                </Badge>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                                  {email.analysis.reason}
                                </p>
                              </div>
                            )}
                            <p className={cn(
                              "text-xs text-muted-foreground mt-1 line-clamp-2",
                              !email.isRead && "font-medium"
                            )}>
                              {email.snippet}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Separator />
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
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Loading...
                          </>
                        ) : (
                          'Load More'
                        )}
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Right Column - Email Content */}
              <div className="col-span-7">
                {expandedEmail ? (
                  <div className="h-full">
                    <div className="border-b p-6 sticky top-0 bg-card z-10">
                      {emails.find(e => e.id === expandedEmail) && (
                        <div>
                          <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-xl">
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
                          
                          <Card>
                            <CardContent className="p-4">
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground font-semibold text-lg">
                                  {emails.find(e => e.id === expandedEmail)?.from.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-4">
                                    <div>
                                      <p className="font-medium">
                                        {emails.find(e => e.id === expandedEmail)?.from}
                                      </p>
                                      <p className="text-sm text-muted-foreground">
                                        {new Date(emails.find(e => e.id === expandedEmail)?.date || '').toLocaleString()}
                                      </p>
                                    </div>
                                    {emails.find(e => e.id === expandedEmail)?.analysis && (
                                      <Badge variant={
                                        emails.find(e => e.id === expandedEmail)?.analysis?.isMarketing
                                          ? "destructive"
                                          : "default"
                                      }>
                                        {emails.find(e => e.id === expandedEmail)?.analysis?.isMarketing
                                          ? 'Marketing'
                                          : 'Important'}
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="mt-2 text-sm text-muted-foreground">
                                    <span className="font-medium">ID:</span> {expandedEmail}
                                  </div>
                                  {emails.find(e => e.id === expandedEmail)?.analysis && (
                                    <div className="mt-2 text-sm">
                                      <span className="font-medium">AI Analysis:</span>
                                      <span className="ml-2">
                                        {emails.find(e => e.id === expandedEmail)?.analysis?.reason}
                                        <span className="text-muted-foreground ml-2">
                                          ({Math.round(emails.find(e => e.id === expandedEmail)?.analysis?.confidence || 0 * 100)}% confident)
                                        </span>
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      )}
                    </div>
                    <ScrollArea className="h-[calc(100vh-350px)] p-6">
                      <Card>
                        <CardContent className="p-0">
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
                                      color: var(--foreground);
                                      font-size: 16px;
                                    }
                                    img {
                                      max-width: 100%;
                                      height: auto;
                                      display: block;
                                      margin: 1em 0;
                                    }
                                    a {
                                      color: hsl(221.2 83.2% 53.3%);
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
                                      border: 1px solid var(--border);
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
                                      border-left: 4px solid var(--border);
                                      color: var(--muted-foreground);
                                    }
                                  </style>
                                </head>
                                <body>
                                  ${emails.find(e => e.id === expandedEmail)?.body || 
                                    `<div style="white-space: pre-wrap;">${emails.find(e => e.id === expandedEmail)?.text || ''}</div>`}
                                </body>
                              </html>
                            `}
                            className="w-full min-h-[500px] bg-background rounded-md"
                            sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
                          />
                        </CardContent>
                      </Card>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    <div className="text-center">
                      <h3 className="text-lg font-medium">No Email Selected</h3>
                      <p className="text-sm">Select an email from the list to view its content</p>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card className="h-[calc(100vh-200px)]">
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <h3 className="text-lg font-medium">No Emails Analyzed</h3>
                  <p className="text-sm">Click "Analyze Recent Emails" to start</p>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
} 