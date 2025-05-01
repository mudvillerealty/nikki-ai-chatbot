'use client';

import { cookies } from 'next/headers';
import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from '../(auth)/auth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const session = await auth();

  if (!session || !session.user) {
    redirect('/api/auth/guest');
  }

  const id = generateUUID();

  const cookieStore = cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  const selectedModel = modelIdFromCookie?.value || DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={selectedModel}
        selectedVisibilityType="private"
        isReadonly={false}
        session={session}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
