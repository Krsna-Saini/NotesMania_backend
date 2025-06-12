import mongoose from "mongoose";
import Message from "../../../models/message";
import Group from "../../../models/group";
import User from "../../../models/user";
import { IMessage, IMessageInput } from "../../types/messageTypes";
import { pubsub } from "../../../config/pubsub";

const messageResolvers = {
  Query: {
    messages: async (_: any, { groupId }: { groupId: string }): Promise<IMessage[]> => {
      return await Message.find({ group: groupId })
        .populate('sender')
        .populate('group')
        .sort({ createdAt: -1 });
    },
    message: async (_: any, { messageId }: { messageId: string }): Promise<IMessage> => {
      const message = await Message.findById(messageId)
        .populate('sender')
        .populate('group');
      if (!message) throw new Error('Message not found');
      return message;
    },
  },

  Mutation: {
   sendMessage: async (
      _: any,
      { senderId, groupId, content, type, attachments }: IMessageInput
    ): Promise<IMessage> => {
      const sender = await User.findById(senderId);
      if (!sender) throw new Error("Sender not found");

      const group = await Group.findById(groupId);
      if (!group) throw new Error("Group not found");

      const attachmentsArray = attachments ? attachments[0].split(',') : [];
      const cleanAttachments = attachmentsArray.filter(att =>
        att && mongoose.Types.ObjectId.isValid(att)
      );
      const urlRegex = /https?:\/\/[^\s]+/g;
      const links=content?.match(urlRegex)
      const newMessage = new Message({
        sender: senderId,
        group: groupId,
        content,
        type,
        attachments: cleanAttachments,
        createdAt: new Date(),
      });

      await newMessage.save();

      group.messages.push({ message: newMessage._id });
      if (links) {
        links.forEach((link)=>group.links.push({link:link}))
      }
      await group.save();

      const populatedMessage = (await newMessage.populate('sender')).populate('attachments');
      await pubsub.publish(`MESSAGE_SENT_${groupId}`, {
        messageSent: populatedMessage,
      });

      return populatedMessage;
    },
  },

  Subscription: {
    messageSent: {
      subscribe: (_: any, { groupId }: { groupId: string }) =>{
       return  pubsub.asyncIterableIterator([`MESSAGE_SENT_${groupId}`]);
      }
    },
  }
};

export default messageResolvers;
