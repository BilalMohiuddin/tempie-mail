import { useState } from 'react';

export default function Home() {
  const [email, setEmail] = useState<string>('loading@tempiemail.com');

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-4">TempiEmail</h1>
        <div className="bg-white border rounded p-4 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-500">Your temporary email</div>
              <div className="text-xl font-mono">{email}</div>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded">Generate new email</button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="col-span-1 bg-white border rounded p-2">
            <div className="font-semibold mb-2">Inbox</div>
            <div className="text-sm text-gray-500">No messages yet.</div>
          </div>
          <div className="col-span-2 bg-white border rounded p-2">
            <div className="font-semibold mb-2">Message</div>
            <div className="text-sm text-gray-500">Select a message to view.</div>
          </div>
        </div>
      </div>
    </div>
  );
}
