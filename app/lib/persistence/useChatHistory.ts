import { useLoaderData, useNavigate, useSearchParams } from '@remix-run/react';
import { useState, useEffect, useCallback } from 'react';
import { atom } from 'nanostores';
import { generateId, type JSONValue, type Message } from 'ai';
import { toast } from 'react-toastify';
import { workbenchStore } from '~/lib/stores/workbench';
import { logStore } from '~/lib/stores/logs'; // Import logStore
import {
  getMessages,
  getNextId,
  getUrlId,
  openDatabase,
  setMessages,
  duplicateChat,
  createChatFromMessages,
  type IChatMetadata,
} from './db';
import type { FileMap } from '~/lib/stores/files';
import type { Snapshot } from './types';
import { webcontainer } from '~/lib/webcontainer';
import { createCommandsMessage, detectProjectCommands } from '~/utils/projectCommands';
import type { ContextAnnotation } from '~/types/context';
import { chatMessagesStore } from '~/lib/stores/chatMessagesStore'; // Import the new store

export interface ChatHistoryItem {
  id: string;
  urlId?: string;
  description?: string;
  messages: Message[];
  timestamp: string;
  metadata?: IChatMetadata;
}

const persistenceEnabled = !import.meta.env.VITE_DISABLE_PERSISTENCE;

// Initialize db as undefined, will be set in useEffect
export let db: IDBDatabase | undefined;

// Only initialize on client side
if (typeof window !== 'undefined' && persistenceEnabled) {
  openDatabase()
    .then((database) => {
      if (database) {
        db = database;
      } else {
        console.warn('Failed to initialize database: database is undefined');
      }
    })
    .catch((error) => {
      console.error('Failed to initialize database:', error);
    });
}

export const chatId = atom<string | undefined>(undefined);
export const description = atom<string | undefined>(undefined);
export const chatMetadata = atom<IChatMetadata | undefined>(undefined);
export function useChatHistory() {
  const navigate = useNavigate();
  const { id: mixedId } = useLoaderData<{ id?: string }>();
  const [searchParams] = useSearchParams();

  const [archivedMessages, setArchivedMessages] = useState<Message[]>([]);
  const [ready, setReady] = useState<boolean>(false);
  const [urlId, setUrlId] = useState<string | undefined>();

  useEffect(() => {
    if (!db) {
      setReady(true);

      if (persistenceEnabled) {
        const error = new Error('Chat persistence is unavailable');
        logStore.logError('Chat persistence initialization failed', error);
        toast.error('Chat persistence is unavailable');
      }

      return;
    }

    if (mixedId) {
      getMessages(db, mixedId)
        .then(async (storedMessages) => {
          console.log('Loading chat with ID:', mixedId);
          console.log('Stored messages:', storedMessages);

          let loadedMessages: Message[] = [];

          if (storedMessages && storedMessages.messages.length > 0) {
            const snapshotStr = localStorage.getItem(`snapshot:${mixedId}`);
            const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} };
            const summary = snapshot.summary;

            const rewindId = searchParams.get('rewindTo');
            let startingIdx = -1;
            const endingIdx = rewindId
              ? storedMessages.messages.findIndex((m) => m.id === rewindId) + 1
              : storedMessages.messages.length;
            const snapshotIndex = storedMessages.messages.findIndex((m) => m.id === snapshot.chatIndex);

            if (snapshotIndex >= 0 && snapshotIndex < endingIdx) {
              startingIdx = snapshotIndex;
            }

            if (snapshotIndex > 0 && storedMessages.messages[snapshotIndex].id == rewindId) {
              startingIdx = -1;
            }

            let filteredMessages = storedMessages.messages.slice(startingIdx + 1, endingIdx);
            let archivedMessages: Message[] = [];

            if (startingIdx >= 0) {
              archivedMessages = storedMessages.messages.slice(0, startingIdx + 1);
            }

            setArchivedMessages(archivedMessages);

            if (startingIdx > 0) {
              const files = Object.entries(snapshot?.files || {})
                .map(([key, value]) => {
                  if (value?.type !== 'file') {
                    return null;
                  }

                  return {
                    content: value.content,
                    path: key,
                  };
                })
                .filter((x) => !!x);
              const projectCommands = await detectProjectCommands(files);
              const commands = createCommandsMessage(projectCommands);

              filteredMessages = [
                {
                  id: generateId(),
                  role: 'user',
                  content: `Restore project from snapshot
                  `,
                  annotations: ['no-store', 'hidden'],
                },
                {
                  id: storedMessages.messages[snapshotIndex].id,
                  role: 'assistant',
                  content: ` 📦 Chat Restored from snapshot, You can revert this message to load the full chat history
                  <boltArtifact id="imported-files" title="Project Files Snapshot" type="bundled">
                  ${Object.entries(snapshot?.files || {})
                    .filter((x) => !x[0].endsWith('lock.json'))
                    .map(([key, value]) => {
                      if (value?.type === 'file') {
                        return `
                      <boltAction type="file" filePath="${key}">
${value.content}
                      </boltAction>
                      `;
                      } else {
                        return ``;
                      }
                    })
                    .join('\n')}
                  </boltArtifact>
                  `,
                  annotations: [
                    'no-store',
                    ...(summary
                      ? [
                          {
                            chatId: storedMessages.messages[snapshotIndex].id,
                            type: 'chatSummary',
                            summary,
                          } satisfies ContextAnnotation,
                        ]
                      : []),
                  ],
                },
                ...(commands !== null
                  ? [
                      {
                        id: `${storedMessages.messages[snapshotIndex].id}-2`,
                        role: 'user' as const,
                        content: `setup project`,
                        annotations: ['no-store', 'hidden'],
                      },
                      {
                        ...commands,
                        id: `${storedMessages.messages[snapshotIndex].id}-3`,
                        annotations: [
                          'no-store',
                          ...(commands.annotations || []),
                          ...(summary
                            ? [
                                {
                                  chatId: `${storedMessages.messages[snapshotIndex].id}-3`,
                                  type: 'chatSummary',
                                  summary,
                                } satisfies ContextAnnotation,
                              ]
                            : []),
                        ],
                      },
                    ]
                  : []),
                ...filteredMessages,
              ];
              restoreSnapshot(mixedId);
            }

            setArchivedMessages(archivedMessages);

            chatMessagesStore.set(filteredMessages);
            loadedMessages = filteredMessages;

            chatId.set(storedMessages.id);
            setUrlId(storedMessages.urlId);
            description.set(storedMessages.description);
            chatMetadata.set(storedMessages.metadata);
          } else {
            console.error('No messages found for chat ID:', mixedId);
            chatMessagesStore.set([]);
            navigate('/', { replace: true });
          }

          setReady(true);

          if (commands !== null) {
            const commandsMessages: Message[] = [
              {
                id: `${storedMessages.messages[snapshotIndex].id}-2`,
                role: 'user' as const,
                content: `setup project`,
                annotations: ['no-store', 'hidden'],
              },
              {
                ...commands,
                id: `${storedMessages.messages[snapshotIndex].id}-3`,
                annotations: [
                  'no-store',
                  ...(commands.annotations || []),
                  ...(summary
                    ? [
                        {
                          chatId: `${storedMessages.messages[snapshotIndex].id}-3`,
                          type: 'chatSummary',
                          summary,
                        } satisfies ContextAnnotation,
                      ]
                    : []),
                ],
              },
            ];
            chatMessagesStore.set([...loadedMessages, ...commandsMessages]);
          }
        })
        .catch((error) => {
          console.error('Error loading chat:', error);
          logStore.logError('Failed to load chat messages', error);
          toast.error('Failed to load chat: ' + error.message);
        });
    } else {
      chatMessagesStore.set([]);
      setReady(true);

      if (db) {
        getNextId(db)
          .then((newId) => {
            chatId.set(newId);
          })
          .catch((error) => {
            console.error('Failed to generate new chat ID:', error);
          });
      }
    }
  }, [mixedId, navigate, searchParams]);

  const takeSnapshot = useCallback(
    async (chatIdx: string, files: FileMap, _chatId?: string | undefined, chatSummary?: string) => {
      const id = _chatId || chatId;

      if (!id) {
        return;
      }

      const snapshot: Snapshot = {
        chatIndex: chatIdx,
        files,
        summary: chatSummary,
      };
      localStorage.setItem(`snapshot:${id}`, JSON.stringify(snapshot));
    },
    [chatId],
  );

  const restoreSnapshot = useCallback(async (id: string) => {
    const snapshotStr = localStorage.getItem(`snapshot:${id}`);
    const container = await webcontainer;

    // if (snapshotStr)setSnapshot(JSON.parse(snapshotStr));
    const snapshot: Snapshot = snapshotStr ? JSON.parse(snapshotStr) : { chatIndex: 0, files: {} };

    if (!snapshot?.files) {
      return;
    }

    Object.entries(snapshot.files).forEach(async ([key, value]) => {
      if (key.startsWith(container.workdir)) {
        key = key.replace(container.workdir, '');
      }

      if (value?.type === 'folder') {
        await container.fs.mkdir(key, { recursive: true });
      }
    });
    Object.entries(snapshot.files).forEach(async ([key, value]) => {
      if (value?.type === 'file') {
        if (key.startsWith(container.workdir)) {
          key = key.replace(container.workdir, '');
        }

        await container.fs.writeFile(key, value.content, { encoding: value.isBinary ? undefined : 'utf8' });
      } else {
      }
    });

    // workbenchStore.files.setKey(snapshot?.files)
  }, []);

  return {
    ready: !mixedId || ready,
    updateChatMestaData: async (metadata: IChatMetadata) => {
      const id = chatId.get();

      if (!db || !id) {
        return;
      }

      try {
        await setMessages(db, id, chatMessagesStore.get(), urlId, description.get(), undefined, metadata);
        chatMetadata.set(metadata);
      } catch (error) {
        toast.error('Failed to update chat metadata');
        console.error(error);
      }
    },
    storeMessageHistory: async (messagesToStore: Message[]) => {
      if (!db) {
        return;
      }

      const messagesWithoutNoStore = messagesToStore.filter((m) => !m.annotations?.includes('no-store'));

      chatMessagesStore.set(messagesWithoutNoStore);

      if (messagesWithoutNoStore.length === 0) {
        return;
      }

      const { firstArtifact } = workbenchStore;
      const _urlId = urlId;

      let chatSummary: string | undefined = undefined;
      const lastMessage = messagesWithoutNoStore[messagesWithoutNoStore.length - 1];

      if (lastMessage.role === 'assistant') {
        const annotations = lastMessage.annotations as JSONValue[];
        const filteredAnnotations = (annotations?.filter(
          (annotation: JSONValue) =>
            annotation && typeof annotation === 'object' && Object.keys(annotation).includes('type'),
        ) || []) as { type: string; value: any } & { [key: string]: any }[];

        if (filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')) {
          chatSummary = filteredAnnotations.find((annotation) => annotation.type === 'chatSummary')?.summary;
        }
      }

      takeSnapshot(
        messagesWithoutNoStore[messagesWithoutNoStore.length - 1].id,
        workbenchStore.files.get(),
        _urlId,
        chatSummary,
      );

      if (!description.get() && firstArtifact?.title) {
        description.set(firstArtifact?.title);
      }

      let currentChatId = chatId.get();

      if (chatMessagesStore.get().length === 0 && !currentChatId) {
        currentChatId = await getNextId(db);
        chatId.set(currentChatId);

        if (!urlId) {
          navigateChat(currentChatId);
        }
      }

      if (!currentChatId) {
        console.error('No valid chat ID available');
        return;
      }

      await setMessages(
        db,
        currentChatId,
        [...archivedMessages, ...chatMessagesStore.get()],
        urlId,
        description.get(),
        undefined,
        chatMetadata.get(),
      );
    },
    duplicateCurrentChat: async (listItemId: string) => {
      if (!db || (!mixedId && !listItemId)) {
        return;
      }

      try {
        const newId = await duplicateChat(db, mixedId || listItemId);

        // navigate(`/chat/${newId}`);
        toast.success('Chat duplicated successfully');
      } catch (error) {
        toast.error('Failed to duplicate chat');
        console.log(error);
      }
    },
    importChat: async (description: string, messages: Message[], metadata?: IChatMetadata) => {
      if (!db) {
        return;
      }

      try {
        const newId = await createChatFromMessages(db, description, messages, metadata);
        window.location.href = `/chat/${newId}`;
        toast.success('Chat imported successfully');
      } catch (error) {
        if (error instanceof Error) {
          toast.error('Failed to import chat: ' + error.message);
        } else {
          toast.error('Failed to import chat');
        }
      }
    },
    exportChat: async (id = urlId) => {
      if (!db || !id) {
        return;
      }

      const chat = await getMessages(db, id);
      const chatData = {
        messages: chat.messages,
        description: chat.description,
        exportDate: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}

function navigateChat(nextId: string) {
  /**
   * FIXME: Using the intended navigate function causes a rerender for <Chat /> that breaks the app.
   *
   * `navigate(`/chat/${nextId}`, { replace: true });`
   */
  const url = new URL(window.location.href);
  url.pathname = `/chat/${nextId}`;

  window.history.replaceState({}, '', url);
}
