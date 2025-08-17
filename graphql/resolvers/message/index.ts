import mongoose from "mongoose";
import Message from "../../../models/message";
import Group from "../../../models/group";
import { IMessage, IMessageInput } from "../../types/messageTypes";
import { pubsub } from "../../../config/pubsub";

const messageResolvers = {
  Query: {
    messages: async (_: any, { groupId }: { groupId: string }): Promise<IMessage[]> => {

      return await Message.find({ group: groupId })
        .populate("sender", "username profileImageUrl id")
        .populate("group")
        .populate({
          path: "ReplyOf",
          select: "content type createdAt sender",
          populate: {
            path: "sender",
            select: "username profileImageUrl id"
          }
        })
        .sort({ createdAt: -1 });

    },
    message: async (_: any, { messageId }: { messageId: string }): Promise<IMessage> => {

      const message = await Message.findById(messageId)
        .populate("sender", "username profileImageUrl id")
        .populate("group")
        .populate({
          path: "ReplyOf",
          select: "content type createdAt sender",
          populate: {
            path: "sender",
            select: "username profileImageUrl id"
          }
        });

      if (!message) throw new Error('Message not found');
      return message;

    },
  },

  Mutation: {
    sendMessage: async (
      _: any,
      { senderId, groupId, content, type, attachments, ReplyOf }: IMessageInput
    ): Promise<IMessage> => {

      // the attachments is an attachments[0] is an string with refrence id 
      // of the attchment seperated by comma
      const attachmentsArray = attachments ? attachments[0].split(',') : [];

      // filtering Attachments ids with proper type 
      const cleanAttachments = attachmentsArray.filter(att =>
        att && mongoose.Types.ObjectId.isValid(att)
      );

      // Extracting Links
      const urlRegex = /https?:\/\/[^\s]+/g;
      const links = content?.match(urlRegex)

      // creating newMessage 
      const newMessage = new Message({
        sender: senderId,
        group: groupId,
        content,
        type,
        ReplyOf,
        attachments: cleanAttachments,
        createdAt: new Date(),
      });

      await newMessage.save();

      const populatedMessage = await newMessage.populate([
        { path: "sender", select: "username profileImageUrl id" },
        { path: "attachments" },
        {
          path: "ReplyOf",
          select: "content type createdAt",
          populate: {
            path: "sender",
            select: "username profileImageUrl id"
          }
        },
      ]);

      // publishing message across server
      await pubsub.publish(`MESSAGE_SENT_${groupId}`, {
        messageSent: populatedMessage,
      });

      // ********* Saving Message to group ***************
      const group = await Group.findById(groupId);

      if (!group) throw new Error("Group not found");

      group.messages.push({ message: newMessage._id });

      if (links) {
        links.forEach((link) => group.links.push({ link: link }))
      }

      await group.save();

      return populatedMessage;
    },
  },

  Subscription: {
    messageSent: {
      subscribe: (_: any, { groupId }: { groupId: string }) => {
        return pubsub.asyncIterableIterator([`MESSAGE_SENT_${groupId}`]);
      }
    },
  }
};

export default messageResolvers; 