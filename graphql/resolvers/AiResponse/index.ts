import { IResolvers } from '@graphql-tools/utils';
import AiResponseHistory ,{ IAiResponseHistoryDocument }  from '../../../models/AiResponseHistory';

import { Types } from 'mongoose';

interface MessageInput {
  role: 'user' | 'assistant';
  content: string;
  selectedText?: string | null;
  error?: boolean;
}

interface AddAiResponseArgs {
  userId: string;
  name?: string;
}

interface UpdateChatNameArgs {
  chatId: string;
  name: string;
}

interface AppendMessageArgs {
  chatId: string;
  message: MessageInput;
}

interface DeleteChatArgs {
  chatId: string;
}

interface GetChatArgs {
  chatId: string;
}

interface GetHistoryArgs {
  userId: string;
}

const Airesolvers: IResolvers = {
  Query: {
    getAiHistoryByUser: async (_: unknown, { userId }: GetHistoryArgs) => {
      console.log(userId)
      return await AiResponseHistory.find({ User: userId }).sort({ updatedAt: -1 });
      
    },
    getAiChatById: async (_: unknown, { chatId }: GetChatArgs) => {
      const Chat= await AiResponseHistory.findById(chatId);
      if (!Chat) throw new Error('Chat not found');
      return Chat;
    },
  },

  Mutation: {
    addAiResponse: async (_: unknown, { userId, name = 'New chat' }: AddAiResponseArgs): Promise<IAiResponseHistoryDocument> => {
      const newHistory = new AiResponseHistory({
        name,
        User: userId,
      });
      await newHistory.save();
      return newHistory;
    },

    updateChatName: async (_: unknown, { chatId, name }: UpdateChatNameArgs) => {
      return await AiResponseHistory.findByIdAndUpdate(
        chatId,
        { name },
        { new: true }
      );
    },

    appendMessage: async (_: unknown, { chatId, message }: AppendMessageArgs):Promise<IAiResponseHistoryDocument> => {
      const chat = await AiResponseHistory.findById(chatId);
      if (!chat) throw new Error('Chat not found');
      chat.Messages.push({
        ...message,
        timestamp: new Date(),
      });
      await chat.save();
      return chat;
    },

    deleteChat: async (_: unknown, { chatId }: DeleteChatArgs) => {
      const result = await AiResponseHistory.findByIdAndDelete(chatId);
      return !!result;
    },
  },
};

export default Airesolvers;
