import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { auth } from './(auth)/auth'; // ✅ Make sure this matches your file path

export default async function Page() {
  const session = await auth();

  const id = generateUUID();
  const cookieStore = cookies();
  const modelIdFromCookie = cookieStore.get('chat-model');

  // Safe fallback: even if session is null, we keep rendering the chat
  const showAsGuest = !session;

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL}
        selectedVisibilityType="private"
        isReadonly={false}
        session={session}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
