import { IResolvers } from '@graphql-tools/utils';
import AiResponseHistory, { IAiResponseHistoryDocument } from '../../../models/AiResponseHistory';
import mongoose from 'mongoose';
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

      return await AiResponseHistory.find({ User: userId }).sort({ updatedAt: -1 });

    },


    getAiChatById: async (_: unknown, { chatId }: GetChatArgs) => {

      const chat = await AiResponseHistory.findById(chatId);

      if (!chat) throw new Error('Chat not found');

      return chat;
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


    appendMessage: async (_: unknown, { chatId, message }: AppendMessageArgs): Promise<IAiResponseHistoryDocument> => {

      const chat = await AiResponseHistory.findById(chatId);

      if (!chat) throw new Error('Chat not found');

      // Add the new message with a timestamp

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
    searchChat: async (_: unknown, { userId, query }: { userId: string, query: string }) => {


      const oid = new mongoose.Types.ObjectId(userId);
      const qEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // escape user input
      const regexObj = { $regex: qEscaped, $options: "i" };

      const result = await AiResponseHistory.aggregate([
        // 1) match docs where either the chat name matches OR any message field contains the query
        {
          $match: {
            User: oid,
            $or: [
              { name: regexObj },
              { "Messages.content": regexObj },
              { "Messages.selectedText": regexObj }
            ]
          }
        },

        // 2) flatten messages into individual docs
        { $unwind: "$Messages" },

        // 3) keep only the message-level matches (so we don't return messages that don't match)
        {
          $match: {
            $or: [
              { "Messages.content": regexObj },
              { "Messages.selectedText": regexObj }
            ]
          }
        },

        // 4) project the shape you wanted and detect which field matched
        {
          $project: {
            _id: 1,
            name: 1,
            role: "$Messages.role",
            timestamp: "$Messages.timestamp",
            // detect match (use $regexMatch with $literal to be safe)
            contentMatched: {
              $regexMatch: { input: "$Messages.content", regex: { $literal: qEscaped }, options: "i" }
            },
            selectedMatched: {
              $regexMatch: { input: "$Messages.selectedText", regex: { $literal: qEscaped }, options: "i" }
            },
            content: "$Messages.content",
            selectedText: "$Messages.selectedText"
          }
        },

        // 5) final shaping to pick which field matched
        {
          $project: {
            _id: 1,
            name: 1,
            role: 1,
            timestamp: 1,
            matchedField: {
              $cond: [
                "$contentMatched",
                "content",
                { $cond: ["$selectedMatched", "selectedText", null] }
              ]
            },
            matchedLine: {
              $cond: [
                "$contentMatched",
                "$content",
                "$selectedText"
              ]
            }
          }
        },

        // 6) drop anything with no match (defensive)
        { $match: { matchedField: { $ne: null } } }
      ]);

      return result;
    }
  },
};

export default Airesolvers;
