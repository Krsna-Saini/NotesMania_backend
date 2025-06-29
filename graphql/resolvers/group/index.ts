// Import necessary models and types
import group from "../../../models/group";
import user from "../../../models/user";
import attachment from "../../../models/attachment";
import mongoose from "mongoose";
import { pubsub } from "../../../config/pubsub";
import messageResolvers from "../message";
import {
  IAddMemberInput,
  ICreateGroupInput,
  IGetGroupArgs,
  IGroupDocument
} from "../../types/groupTypes";

// In-memory store to track typing users per group for real-time feedback
const TYPING_USERS = new Map<string, Set<string>>();
const TYPING_USERS_TOPIC_PREFIX = "TYPING_USERS_";

// Group GraphQL resolvers
export const GroupResolver = {
  Query: {
    /**
     * Get detailed group information by group ID.
     * Includes members, admins, leader, messages, pinned items, and attachments.
     */
    getGroup: async (_: unknown, { groupId }: IGetGroupArgs): Promise<IGroupDocument | null> => {
      console.log("Fetching group with ID:", groupId);
      return await group.findById(groupId)
        .populate("leader", "id username email profileImageUrl description")
        .populate("admins.admin", "id username email profileImageUrl description")
        .populate("members.member", "id username email profileImageUrl description")
        .populate({
          path: "messages.message",
          populate: [
            {
              path: "sender",
              select: "id username email profileImageUrl",
            },
            {
              path: "attachments",
              select: "fileUrl fileType fileName uploadedAt",
            },
          ],
        })
        .populate("pinnedMessages")
        .populate("announcements")
        .populate("attachments")
        .populate("inviteRequests.user", "id username email profileImageUrl")
        .exec();
    },

    /**
     * List all available groups, sorted by creation date (latest first).
     */
    listGroups: async (): Promise<IGroupDocument[]> => {
      return group.find()
        .populate("leader")
        .populate("members.member")
        .sort({ createdAt: -1 });
    },
  },

  Mutation: {
    /**
     * Create a new group with the leader as the initial member.
     */
    createGroup: async (_: unknown, input: ICreateGroupInput): Promise<IGroupDocument> => {
      const User = await user.findById(input.leader);
      if (!User) throw new Error("User not found");

      const groupData = {
        ...input,
        leader: new mongoose.Types.ObjectId(input.leader),
        members: [{
          member: new mongoose.Types.ObjectId(input.leader),
          joinedAt: new Date(),
          status: "leader",
        }],
      };

      const newGroup = new group(groupData);
      const savedGroup = await newGroup.save();

      // Add group reference to user's document
      User.groups.push({ group: savedGroup._id, joinedAt: new Date() });
      await User.save();

      return savedGroup.populate("leader");
    },

    /**
     * Search groups by partial name (case-insensitive).
     */
    searchGroups: async (_: unknown, { groupName }: { groupName: string }) => {
      return await group.find({
        name: { $regex: groupName, $options: "i" }
      })
        .select("name profilePicture description id")
        .limit(10);
    },

    /**
     * Request to join a group.
     */
    handleInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const isMember = Group.members.find((item) => item.member._id.equals(userId));
      if (isMember) throw new Error("User already in group");

      Group.inviteRequests.push({
        user: new mongoose.Types.ObjectId(userId),
        status: "pending",
      });

      await Group.save();
      return true;
    },

    /**
     * Accept a user's invite request and add them to the group.
     */
    acceptInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      const User = await user.findById(userId);
      if (!Group || !User) throw new Error("Group or user not found");

      const invite = Group.inviteRequests.find((req) => req.user.equals(userId));
      if (!invite) throw new Error("Invite request not found");
      if (invite.status === "accepted") throw new Error("Invite already accepted");

      invite.status = "accepted";

      Group.members.push({
        member: new mongoose.Types.ObjectId(userId),
        status: "member",
        joinedAt: new Date(),
      });

      User.groups.push({ group: Group._id, joinedAt: new Date() });

      await Group.save();
      await User.save();

      return true;
    },

    /**
     * Reject a user's invite request.
     */
    rejectInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const invite = Group.inviteRequests.find((req) => req.user.equals(userId));
      if (!invite) throw new Error("Invite request not found");
      if (invite.status === "rejected") throw new Error("Invite already rejected");

      invite.status = "rejected";
      await Group.save();
      return true;
    },

    /**
     * Add a user to the group and log a critical system message.
     */
    addMember: async (_: unknown, { input }: { input: IAddMemberInput }): Promise<IGroupDocument | null> => {
      const { userId, groupId } = input;

      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const userObjectId = new mongoose.Types.ObjectId(userId);
      const isAlreadyMember = Group.members.some((m) => m.member.equals(userObjectId));
      if (isAlreadyMember) throw new Error("User already in group");

      Group.members.push({
        member: userObjectId,
        status: "member",
        joinedAt: new Date(),
      });
      await Group.save();

      await messageResolvers.Mutation.sendMessage(_, {
        senderId: userId,
        groupId,
        content: "Added to the group.",
        type: "critical",
        attachments: undefined,
        createdAt: new Date(),
      });

      const User = await user.findById(userId);
      if (User && !User.groups.some((g) => g.group.equals(groupId))) {
        User.groups.push({ group: new mongoose.Types.ObjectId(groupId), joinedAt: new Date() });
        await User.save();
      }

      return (await Group.populate("leader")).populate("members.member");;
    },

    /**
     * Promote a group member to admin status.
     */
    promoteAdmin: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const userObjId = new mongoose.Types.ObjectId(userId);
      const member = Group.members.find((m) => m.member.equals(userObjId));
      if (!member) throw new Error("User not in group");

      if (Group.admins.some((a) => a.admin.equals(userObjId))) {
        throw new Error("User already admin");
      }

      member.status = "admin";
      Group.admins.push({ admin: userObjId, promotedAt: new Date() });

      await Group.save();
      await messageResolvers.Mutation.sendMessage(_, {
        senderId: userId,
        groupId,
        content: "Promoted to admin.",
        type: "critical",
        attachments: undefined,
        createdAt: new Date(),
      });

      return (await Group.populate("leader")).populate("members.member");
    },

    /**
     * Demote an admin back to a regular member.
     */
    demoteAdmin: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const userObjId = new mongoose.Types.ObjectId(userId);
      const member = Group.members.find((m) => m.member.equals(userObjId));
      if (!member) throw new Error("User not in group");

      const isAdmin = Group.admins.some((a) => a.admin.equals(userObjId));
      if (!isAdmin) throw new Error("User not admin");

      member.status = "member";
      Group.admins = Group.admins.filter((a) => !a.admin.equals(userObjId));

      await Group.save();
      await messageResolvers.Mutation.sendMessage(_, {
        senderId: userId,
        groupId,
        content: "Demoted to member.",
        type: "critical",
        attachments: undefined,
        createdAt: new Date(),
      });

      return (await Group.populate("leader")).populate("members.member");;
    },

    /**
     * Remove a user from the group. Leader and admins must be demoted first.
     */
    removeMember: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const Group = await group.findById(groupId);
      if (!Group) throw new Error("Group not found");

      const userObjId = new mongoose.Types.ObjectId(userId);

      if (Group.leader.equals(userObjId)) {
        throw new Error("You cannot remove the group leader");
      }

      const isAdmin = Group.admins.some((a) => a.admin.equals(userObjId));
      if (isAdmin) throw new Error("User is admin, demote first");

      Group.members = Group.members.filter((m) => !m.member.equals(userObjId));

      await Group.save();
      await messageResolvers.Mutation.sendMessage(_, {
        senderId: userId,
        groupId,
        content: "Removed from the group.",
        type: "critical",
        attachments: undefined,
        createdAt: new Date(),
      });

      const User = await user.findById(userId);
      if (User) {
        User.groups = User.groups.filter((g) => g.group.toString() !== groupId);
        await User.save();
      }

      return (await Group.populate("leader")).populate("members.member");;
    },

    /**
     * Retrieve all attachments associated with a specific group.
     */
    getAttachments: async (_: unknown, { groupId }: { groupId: string }) => {
      return await attachment.find({ group: groupId }).populate("user");
    },

    /**
     * Add a user to the "currently typing" list and broadcast via pubsub.
     */
    userTyping: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;

      if (!TYPING_USERS.has(topic)) {
        TYPING_USERS.set(topic, new Set());
      }

      const typingUsers = TYPING_USERS.get(topic)!;
      typingUsers.add(userId);

      pubsub.publish(topic, { typingUser: Array.from(typingUsers) });
      return Array.from(typingUsers);
    },

    /**
     * Remove a user from the typing list and broadcast via pubsub.
     */
    userStoppedTyping: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
      const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;
      const typingUsers = TYPING_USERS.get(topic);

      if (typingUsers) {
        typingUsers.delete(userId);
        pubsub.publish(topic, { typingUser: Array.from(typingUsers) });
      }

      return Array.from(typingUsers || []);
    },
  },

  Subscription: {
    /**
     * Subscription for tracking typing users in a specific group.
     */
    typingUser: {
      subscribe: (_: unknown, { groupId }: { groupId: string }) => {
        const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;
        if (!TYPING_USERS.has(topic)) {
          TYPING_USERS.set(topic, new Set<string>());
        }
        return pubsub.asyncIterableIterator([topic]);
      },
    },
  },
};
