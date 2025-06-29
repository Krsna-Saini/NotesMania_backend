// Import GraphQL resolver type definition
import { IResolvers } from '@graphql-tools/utils';
// Import the Mongoose model and its document interface
import AiResponseHistory, { IAiResponseHistoryDocument } from '../../../models/AiResponseHistory';
// Import Types for working with MongoDB ObjectId
import { Types } from 'mongoose';

// --------- TypeScript Interfaces for Arguments ---------

// Defines the shape of a single message object
interface MessageInput {
  role: 'user' | 'assistant';        
  content: string;                   
  selectedText?: string | null;     
  error?: boolean;                   
}

// Arguments for creating a new AI chat record
interface AddAiResponseArgs {
  userId: string;                    
  name?: string;                     
}

// Arguments for updating the name of a chat
interface UpdateChatNameArgs {
  chatId: string;                   
  name: string;                      
}

// Arguments for appending a message to an existing chat
interface AppendMessageArgs {
  chatId: string;                    
  message: MessageInput;           
}

// Arguments for deleting a chat
interface DeleteChatArgs {
  chatId: string;                   
}

// Arguments for retrieving a specific chat by ID
interface GetChatArgs {
  chatId: string;
}

// Arguments for retrieving all chat histories for a user
interface GetHistoryArgs {
  userId: string;
}

// --------- GraphQL Resolvers ---------

const Airesolvers: IResolvers = {
  Query: {
    /**
     * Fetch all AI chat histories for a specific user, sorted by last updated time
     */
    getAiHistoryByUser: async (_: unknown, { userId }: GetHistoryArgs) => {
      console.log(userId); // For debugging (can be removed in production)
      return await AiResponseHistory.find({ User: userId }).sort({ updatedAt: -1 });
    },

    /**
     * Fetch a single AI chat by its unique ID
     */
    getAiChatById: async (_: unknown, { chatId }: GetChatArgs) => {
      const chat = await AiResponseHistory.findById(chatId);
      if (!chat) throw new Error('Chat not found');
      return chat;
    },
  },

  Mutation: {
    /**
     * Create a new AI chat document for a given user
     */
    addAiResponse: async (_: unknown, { userId, name = 'New chat' }: AddAiResponseArgs): Promise<IAiResponseHistoryDocument> => {
      const newHistory = new AiResponseHistory({
        name,
        User: userId,
      });
      await newHistory.save();
      return newHistory;
    },

    /**
     * Update the name/title of an existing chat
     */
    updateChatName: async (_: unknown, { chatId, name }: UpdateChatNameArgs) => {
      return await AiResponseHistory.findByIdAndUpdate(
        chatId,
        { name },
        { new: true } // Return the updated document
      );
    },

    /**
     * Append a new message to an existing chat conversation
     */
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

    /**
     * Permanently delete a chat by its ID
     */
    deleteChat: async (_: unknown, { chatId }: DeleteChatArgs) => {
      const result = await AiResponseHistory.findByIdAndDelete(chatId);
      return !!result; // Return true if deletion was successful
    },
  },
};

// Export the GraphQL resolvers
export default Airesolvers;
