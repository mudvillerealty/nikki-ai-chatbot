'use server';

import {
  and,
  asc,
  count,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lt,
  type SQL,
} from 'drizzle-orm';

import {
  user,
  chat,
  type User,
  document,
  type Suggestion,
  suggestion,
  message,
  vote,
  type DBMessage,
  type Chat,
} from './schema';

import type { ArtifactKind } from '@/components/artifact';
import { generateUUID } from '../utils';
import { generateHashedPassword } from './utils';

// ✅ Pull shared DB connection from index.ts
import { db } from './index';

export async function getUser(email: string): Promise<Array<User>> {
  return db.select().from(user).where(eq(user.email, email));
}

export async function createUser(email: string, password: string) {
  const hashedPassword = generateHashedPassword(password);
  return db.insert(user).values({ email, password: hashedPassword });
}

export async function createGuestUser() {
  const email = `guest-${Date.now()}`;
  const password = generateHashedPassword(generateUUID());

  return db.insert(user).values({ email, password }).returning({
    id: user.id,
    email: user.email,
  });
}

export async function saveChat({ id, userId, title }: { id: string; userId: string; title: string }) {
  return db.insert(chat).values({
    id,
    createdAt: new Date(),
    userId,
    title,
  });
}

export async function deleteChatById({ id }: { id: string }) {
  await db.delete(vote).where(eq(vote.chatId, id));
  await db.delete(message).where(eq(message.chatId, id));

  const [chatsDeleted] = await db
    .delete(chat)
    .where(eq(chat.id, id))
    .returning();
  return chatsDeleted;
}

export async function getChatsByUserId({
  id,
  limit,
  startingAfter,
  endingBefore,
}: {
  id: string;
  limit: number;
  startingAfter: string | null;
  endingBefore: string | null;
}) {
  const extendedLimit = limit + 1;
  const query = (whereCondition?: SQL<any>) =>
    db
      .select()
      .from(chat)
      .where(whereCondition ? and(whereCondition, eq(chat.userId, id)) : eq(chat.userId, id))
      .orderBy(desc(chat.createdAt))
      .limit(extendedLimit);

  let filteredChats: Array<Chat> = [];

  if (startingAfter) {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, startingAfter)).limit(1);
    if (!selectedChat) throw new Error(`Chat with id ${startingAfter} not found`);
    filteredChats = await query(gt(chat.createdAt, selectedChat.createdAt));
  } else if (endingBefore) {
    const [selectedChat] = await db.select().from(chat).where(eq(chat.id, endingBefore)).limit(1);
    if (!selectedChat) throw new Error(`Chat with id ${endingBefore} not found`);
    filteredChats = await query(lt(chat.createdAt, selectedChat.createdAt));
  } else {
    filteredChats = await query();
  }

  const hasMore = filteredChats.length > limit;
  return {
    chats: hasMore ? filteredChats.slice(0, limit) : filteredChats,
    hasMore,
  };
}

export async function getChatById({ id }: { id: string }) {
  const [chatResult] = await db.select().from(chat).where(eq(chat.id, id));
  return chatResult;
}

export async function saveMessages({ messages }: { messages: Array<DBMessage> }) {
  return db.insert(message).values(messages);
}

export async function getMessagesByChatId({ id }: { id: string }) {
  return db
    .select()
    .from(message)
    .where(eq(message.chatId, id))
    .orderBy(asc(message.createdAt));
}

export async function voteMessage({
  chatId,
  messageId,
  type,
}: {
  chatId: string;
  messageId: string;
  type: 'up' | 'down';
}) {
  const [existingVote] = await db.select().from(vote).where(eq(vote.messageId, messageId));

  if (existingVote) {
    return db.update(vote).set({ isUpvoted: type === 'up' }).where(
      and(eq(vote.messageId, messageId), eq(vote.chatId, chatId))
    );
  }

  return db.insert(vote).values({
    chatId,
    messageId,
    isUpvoted: type === 'up',
  });
}

export async function getVotesByChatId({ id }: { id: string }) {
  return db.select().from(vote).where(eq(vote.chatId, id));
}

export async function saveDocument({
  id,
  title,
  kind,
  content,
  userId,
}: {
  id: string;
  title: string;
  kind: ArtifactKind;
  content: string;
  userId: string;
}) {
  return db
    .insert(document)
    .values({
      id,
      title,
      kind,
      content,
      userId,
      createdAt: new Date(),
    })
    .returning();
}

export async function getDocumentsById({ id }: { id: string }) {
  return db.select().from(document).where(eq(document.id, id)).orderBy(asc(document.createdAt));
}

export async function getDocumentById({ id }: { id: string }) {
  const [doc] = await db
    .select()
    .from(document)
    .where(eq(document.id, id))
    .orderBy(desc(document.createdAt));
  return doc;
}

export async function deleteDocumentsByIdAfterTimestamp({
  id,
  timestamp,
}: {
  id: string;
  timestamp: Date;
}) {
  await db
    .delete(suggestion)
    .where(and(eq(suggestion.documentId, id), gt(suggestion.documentCreatedAt, timestamp)));

  return db
    .delete(document)
    .where(and(eq(document.id, id), gt(document.createdAt, timestamp)))
    .returning();
}

export async function saveSuggestions({ suggestions }: { suggestions: Array<Suggestion> }) {
  return db.insert(suggestion).values(suggestions);
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
  return db.select().from(suggestion).where(eq(suggestion.documentId, documentId));
}

export async function getMessageById({ id }: { id: string }) {
  return db.select().from(message).where(eq(message.id, id));
}

export async function deleteMessagesByChatIdAfterTimestamp({
  chatId,
  timestamp,
}: {
  chatId: string;
  timestamp: Date;
}) {
  const messagesToDelete = await db
    .select({ id: message.id })
    .from(message)
    .where(and(eq(message.chatId, chatId), gte(message.createdAt, timestamp)));

  const messageIds = messagesToDelete.map((m) => m.id);

  if (messageIds.length > 0) {
    await db.delete(vote).where(and(eq(vote.chatId, chatId), inArray(vote.messageId, messageIds)));
    return db.delete(message).where(and(eq(message.chatId, chatId), inArray(message.id, messageIds)));
  }
}

export async function updateChatVisiblityById({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: 'private' | 'public';
}) {
  return db.update(chat).set({ visibility }).where(eq(chat.id, chatId));
}

export async function getMessageCountByUserId({
  id,
  differenceInHours,
}: {
  id: string;
  differenceInHours: number;
}) {
  const windowStart = new Date(Date.now() - differenceInHours * 60 * 60 * 1000);

  const [stats] = await db
    .select({ count: count(message.id) })
    .from(message)
    .innerJoin(chat, eq(message.chatId, chat.id))
    .where(
      and(
        eq(chat.userId, id),
        gte(message.createdAt, windowStart),
        eq(message.role, 'user'),
      )
    );

  return stats?.count ?? 0;
}
