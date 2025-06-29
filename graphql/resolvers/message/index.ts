// Imports
import mongoose from "mongoose";
import Message from "../../../models/message";
import Group from "../../../models/group";
import User from "../../../models/user";
import { IMessage, IMessageInput } from "../../types/messageTypes";
import { pubsub } from "../../../config/pubsub";

// GraphQL resolvers for managing messages
const messageResolvers = {
  Query: {
    /**
     * Retrieve all messages for a given group, sorted by creation date (latest first).
     * @param groupId - The group whose messages are to be fetched
     */
    messages: async (_: any, { groupId }: { groupId: string }): Promise<IMessage[]> => {
      return await Message.find({ group: groupId })
        .populate("sender")
        .populate("group")
        .sort({ createdAt: -1 });
    },

    /**
     * Retrieve a specific message by its ID.
     * @param messageId - The ID of the message to retrieve
     */
    message: async (_: any, { messageId }: { messageId: string }): Promise<IMessage> => {
      const message = await Message.findById(messageId)
        .populate("sender")
        .populate("group");
      if (!message) throw new Error("Message not found");
      return message;
    },
  },

  Mutation: {
    /**
     * Send a new message in a group.
     * Handles optional attachments, detects links in content, updates the group,
     * and publishes a real-time message event via pubsub.
     * 
     * @param senderId - User sending the message
     * @param groupId - Target group
     * @param content - Message text content
     * @param type - Message type (e.g., "normal", "critical")
     * @param attachments - Array of stringified attachment IDs
     */
    sendMessage: async (
      _: any,
      { senderId, groupId, content, type, attachments }: IMessageInput
    ): Promise<IMessage> => {
      // Parse and validate attachment IDs
      const attachmentsArray = attachments ? attachments[0].split(",") : [];
      const cleanAttachments = attachmentsArray.filter(
        (att) => att && mongoose.Types.ObjectId.isValid(att)
      );

      // Extract all valid URLs from message content
      const urlRegex = /https?:\/\/[^\s]+/g;
      const links = content?.match(urlRegex);

      // Create new message document
      const newMessage = new Message({
        sender: senderId,
        group: groupId,
        content,
        type,
        attachments: cleanAttachments,
        createdAt: new Date(),
      });

      await newMessage.save();

      // Populate sender and attachment data before returning
      const populatedMessage = await (await newMessage.populate({
        path: "sender",
        select: "username profileImageUrl id",
      })).populate("attachments");

      // Real-time pubsub notification to subscribed clients
      await pubsub.publish(`MESSAGE_SENT_${groupId}`, {
        messageSent: populatedMessage,
      });

      // Update message and links in group metadata
      const group = await Group.findById(groupId);
      if (!group) throw new Error("Group not found");

      group.messages.push({ message: newMessage._id });

      if (links) {
        links.forEach((link) => {
          group.links.push({ link });
        });
      }

      await group.save();

      return populatedMessage;
    },
  },

  Subscription: {
    /**
     * Subscription for receiving new messages in real time for a given group.
     * Uses dynamic channel name based on groupId.
     */
    messageSent: {
      subscribe: (_: any, { groupId }: { groupId: string }) => {
        return pubsub.asyncIterableIterator([`MESSAGE_SENT_${groupId}`]);
      },
    },
  },
};

export default messageResolvers;
