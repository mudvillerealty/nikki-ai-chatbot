import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DataStreamHandler } from '@/components/datastream-handler';
import { auth } from './(auth)/auth';

export default async function Page() {
  const session = await auth();

  const id = generateUUID();
  const cookieStore = cookies();
  const modelIdFromCookie = cookieStore.get('chat-model-id');

  // Fallback — show chat even if no session
  const showAsGuest = !session;

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={modelIdFromCookie?.value || DEFAULT_CHAT_MODEL.id}
        selectedVisibility="private"
        isReadonly={false}
        showAsGuest={showAsGuest}
        showBackButton={false}
        showShareButton={false}
      />
      <DataStreamHandler chatId={id} />
    </>
  );
}
