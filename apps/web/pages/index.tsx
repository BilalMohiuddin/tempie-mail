import { useState, useEffect } from 'react';
import Head from 'next/head';

interface Session {
  sessionId: string;
  email: string;
  expiresAt: string;
}

interface Message {
  id: string;
  from: string;
  to: string;
  subject: string;
  receivedAt: string;
}

interface MessageDetail extends Message {
  textBody: string;
  htmlBody: string;
}

export default function Home() {
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<MessageDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create session on page load
  useEffect(() => {
    createSession();
  }, []);

  // Poll for new messages every 5 seconds
  useEffect(() => {
    if (!session) return;

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [session]);

  const createSession = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const sessionData = await response.json();
      setSession(sessionData);
      
      // Store session in localStorage for persistence
      localStorage.setItem('tempiemail_session', JSON.stringify(sessionData));
      
      // Fetch initial messages
      await fetchMessages();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async () => {
    if (!session) return;

    try {
      const response = await fetch(`/api/sessions/${session.sessionId}/messages`);
      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
    }
  };

  const fetchMessageDetail = async (messageId: string) => {
    try {
      const response = await fetch(`/api/messages/${messageId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch message details');
      }

      const messageDetail = await response.json();
      setSelectedMessage(messageDetail);
    } catch (err) {
      console.error('Failed to fetch message details:', err);
    }
  };

  const generateNewEmail = async () => {
    if (!session) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/sessions/${session.sessionId}/regenerate`, {
        method: 'POST',
        body: JSON.stringify({}),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to generate new email');
      }

      const newSession = await response.json();
      setSession(newSession);
      
      // Update localStorage
      localStorage.setItem('tempiemail_session', JSON.stringify(newSession));
      
      // Clear messages and selected message
      setMessages([]);
      setSelectedMessage(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate new email');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (loading && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Creating your temporary email...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">⚠️ Error: {error}</div>
          <button 
            onClick={createSession}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>TempiEmail - Disposable Email Service</title>
        <meta name="description" content="Temporary disposable email service" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 text-gray-900">
        <div className="max-w-6xl mx-auto p-6">
          <h1 className="text-3xl font-bold mb-6">TempiEmail</h1>
          
          {/* Email Display */}
          <div className="bg-white border rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500 mb-1">Your temporary email</div>
                <div className="text-xl font-mono text-blue-600">{session?.email}</div>
                <div className="text-xs text-gray-400 mt-1">
                  Expires: {session ? formatDate(session.expiresAt) : ''}
                </div>
              </div>
              <button 
                onClick={generateNewEmail}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Generating...' : 'Generate new email'}
              </button>
            </div>
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Inbox */}
            <div className="lg:col-span-1 bg-white border rounded-lg p-4 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Inbox</h2>
                <span className="text-sm text-gray-500">{messages.length} messages</span>
              </div>
              
              {messages.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">📧</div>
                  <p>No messages yet</p>
                  <p className="text-sm">Share your email address to receive emails</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      onClick={() => fetchMessageDetail(message.id)}
                      className={`p-3 border rounded cursor-pointer hover:bg-gray-50 ${
                        selectedMessage?.id === message.id ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="font-medium text-sm truncate">{message.subject || '(No Subject)'}</div>
                      <div className="text-xs text-gray-500 truncate">{message.from}</div>
                      <div className="text-xs text-gray-400">{formatDate(message.receivedAt)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Message Content */}
            <div className="lg:col-span-2 bg-white border rounded-lg p-6 shadow-sm">
              {selectedMessage ? (
                <div>
                  <div className="border-b pb-4 mb-4">
                    <h3 className="text-lg font-semibold">{selectedMessage.subject || '(No Subject)'}</h3>
                    <div className="text-sm text-gray-600 mt-2">
                      <div><strong>From:</strong> {selectedMessage.from}</div>
                      <div><strong>To:</strong> {selectedMessage.to}</div>
                      <div><strong>Date:</strong> {formatDate(selectedMessage.receivedAt)}</div>
                    </div>
                  </div>
                  
                  <div className="prose max-w-none">
                    {selectedMessage.htmlBody ? (
                      <div dangerouslySetInnerHTML={{ __html: selectedMessage.htmlBody }} />
                    ) : (
                      <pre className="whitespace-pre-wrap font-sans">{selectedMessage.textBody}</pre>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="text-4xl mb-4">👆</div>
                  <p className="text-lg">Select a message to view</p>
                  <p className="text-sm">Click on any message in the inbox to read it</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}