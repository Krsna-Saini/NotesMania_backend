import group from "../../../models/group";
import message from "../../../models/message";
import { IAddMemberInput, ICreateGroupInput, IGetGroupArgs, IGroupDocument } from "../../types/groupTypes";
import mongoose from "mongoose";
import { pubsub } from "../../../config/pubsub";
import attachment from "../../../models/attachment";
const TYPING_USERS = new Map<string, Set<string>>();
const TYPING_USERS_TOPIC_PREFIX = "TYPING_USERS_";
import messageResolvers from "../message";
import user from "../../../models/user";
export const GroupResolver = {
    Query: {
        getGroup: async (_: unknown, { groupId }: IGetGroupArgs): Promise<IGroupDocument | null> => {
          
            const groupdata = await group.findById(groupId)
                .populate("leader", "id username email profileImageUrl description")
                .populate("admins.admin", "id username email profileImageUrl description")
                .populate("members.member", "id username email profileImageUrl description")
                .populate("pinnedMessages")
                .populate("announcements")
                .populate("inviteRequests.user", "id username email profileImageUrl")
                .lean()
                .exec();
            return groupdata;
        },
        listGroups: async (_: unknown): Promise<IGroupDocument[]> => {
            return group.find().populate("leader").populate("members.member").sort({ createdAt: -1 });

        },
        listMessages: async (
            _: unknown,
            {
                groupId,
                cursor,
                limit = 20,
            }: { groupId: string; cursor?: string; limit?: number }
        ): Promise<{ messages: any[]; hasMore: boolean }> => {
            console.log("Fetching messages for group:", groupId);

            const query: any = { group: groupId };

            if (cursor) {
                query._id = { $lt: cursor };
            }

            let messages = await message.find(query)
                .sort({ _id: -1 })
                .limit(limit)
                .populate({
                    path: "sender",
                    select: "id username email profileImageUrl",
                })
                .populate({
                    path: "attachments",
                    select: "fileUrl fileType fileName uploadedAt",
                })
                .lean();

            // boundary condion for first time 
            if (!cursor) {
                messages = messages.reverse()
            }

            const hasMore = messages.length === limit;

            return {
                messages,
                hasMore,
            };
        },

    },
    Mutation: {
        createGroup: async (_: unknown, input: ICreateGroupInput): Promise<IGroupDocument> => {
            console.log("Creating group with input:", input);
            const User = await user.findById(input.leader);
            if (!User) {
                throw new Error("User not found");
            }
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

            User.groups.push({ group: savedGroup._id, joinedAt: new Date() });
            await User.save();

            return savedGroup.populate("leader");
        },
        searchGroups: async (_: unknown, { groupName }: { groupName: string }) => {
            const Groups = await group.find({
                name: { $regex: groupName, $options: "i" }
            })
                .select("name profilePicture description id")
                .limit(10)
            return Groups || []
        },
        handleInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string, userId: string }) => {
            const Group = await group.findById(groupId);
            if (!Group) {
                throw new Error("Group not found");
            }
            const isMember = Group.members.find((item) => item.member._id.equals(userId))

            if (isMember) {
                throw new Error("User already in group");
            }
            const user = new mongoose.Types.ObjectId(userId)
            Group.inviteRequests.push({
                user: user,
                status: "pending",
            })
            await Group.save()
            return true;

        },
        acceptInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
            const Group = await group.findById(groupId);
            if (!Group) {
                throw new Error("Group not found");
            }
            const User = await user.findById(userId);
            if (!User) {
                throw new Error("User not found");
            }

            const invite = Group.inviteRequests.find((req) => req.user.equals(userId));

            if (!invite) {
                throw new Error("Invite request not found");
            }

            if (invite.status === "accepted") {
                throw new Error("Invite already accepted");
            }

            invite.status = "accepted";
            const UserId = new mongoose.Types.ObjectId(userId)
            Group.members.push({ member: UserId, status: "member", joinedAt: new Date() })
            User.groups.push({ group: new mongoose.Types.ObjectId(groupId), joinedAt: new Date() });
            await Group.save();
            return true;
        },
        rejectInviteRequest: async (_: unknown, { groupId, userId }: { groupId: string; userId: string }) => {
            const Group = await group.findById(groupId);
            if (!Group) {
                throw new Error("Group not found");
            }

            const invite = Group.inviteRequests.find((req) => req.user.equals(userId));

            if (!invite) {
                throw new Error("Invite request not found");
            }

            if (invite.status === "rejected") {
                throw new Error("Invite already rejected");
            }

            invite.status = "rejected";

            await Group.save();
            return true;
        },
        addMember: async (_: unknown, args: { input: IAddMemberInput }): Promise<IGroupDocument | null> => {
            const { userId, groupId } = args.input;


            const groupToUpdate = await group.findById(groupId);
            if (!groupToUpdate) throw new Error("Group not found");

            const userObjectId = new mongoose.Types.ObjectId(userId);


            const userAlreadyInGroup = groupToUpdate.members.some((member) =>
                member.member.equals(userObjectId)
            );
            if (userAlreadyInGroup) throw new Error("User already in group");


            groupToUpdate.members.push({
                member: userObjectId,
                joinedAt: new Date(),
                status: "member",
            });
            await groupToUpdate.save();


            await messageResolvers.Mutation.sendMessage(_, {
                senderId: userId,
                groupId: groupId,
                content: "Added to the group.",
                type: "critical",
                attachments: undefined,
                createdAt: new Date(),
            });

            const existingUser = await user.findById(userId);
            if (existingUser) {
                const alreadyJoined = existingUser.groups.some((g) => g.group.equals(groupId));
                if (!alreadyJoined) {
                    existingUser.groups.push({ group: new mongoose.Types.ObjectId(groupId), joinedAt: new Date() });
                    await existingUser.save();
                }
            }

            return await group
                .findById(groupId)
                .populate("leader", "_id username profileImageUrl")
                .populate("members.member", "_id username profileImageUrl");
        },

        promoteAdmin: async (_: unknown, args: { groupId: string, userId: string }): Promise<IGroupDocument | null> => {
            const groupToUpdate = await group.findById(args.groupId);
            if (!groupToUpdate) {
                throw new Error("Group not found");
            }
            const userId = new mongoose.Types.ObjectId(args.userId);
            const userAlreadyInGroup = groupToUpdate.members.some((member) => member.member.equals(userId));
            if (!userAlreadyInGroup) {
                throw new Error("User not in group");
            }
            const memberToUpdate = groupToUpdate.members.find((member) => member.member.equals(userId));
            if (memberToUpdate) {
                memberToUpdate.status = "admin";
            }
            const AdminStatus = groupToUpdate.admins.find((admin) => admin.admin.equals(userId))
            if (AdminStatus) {
                throw new Error("User already admin")
            }
            groupToUpdate.admins.push({ admin: userId, promotedAt: new Date() });
            await groupToUpdate.save();
            await messageResolvers.Mutation.sendMessage(_, {
                senderId: args.userId,
                groupId: args.groupId,
                content: "promoted to admin.",
                type: "critical",
                attachments: undefined,
                createdAt: new Date()
            });

            return (await groupToUpdate.populate('leader')).populate('members.member');
        },
        demoteAdmin: async (_: unknown, args: { groupId: string, userId: string }): Promise<IGroupDocument | null> => {
            const groupToUpdate = await group.findById(args.groupId);
            if (!groupToUpdate) {
                throw new Error("Group not found");
            }
            const userId = new mongoose.Types.ObjectId(args.userId);
            const userAlreadyInGroup = groupToUpdate.members.some((member) => member.member.equals(userId));
            if (!userAlreadyInGroup) {
                throw new Error("User not in group");
            }
            const memberToUpdate = groupToUpdate.members.find((member) => member.member.equals(userId));
            if (memberToUpdate) {
                memberToUpdate.status = "member";
            }
            const AdminStatus = groupToUpdate.admins.find((admin) => admin.admin.equals(userId))
            if (!AdminStatus) {
                throw new Error("User not admin")
            }
            groupToUpdate.admins = groupToUpdate.admins.filter((admin) => !admin.admin.equals(userId))
            await groupToUpdate.save();
            await messageResolvers.Mutation.sendMessage(_, {
                senderId: args.userId,
                groupId: args.groupId,
                content: "demoted to admin.",
                type: "critical",
                attachments: undefined,
                createdAt: new Date()
            });
            return (await groupToUpdate.populate('leader')).populate('members.member');
        },
        removeMember: async (_: unknown, args: { groupId: string, userId: string }): Promise<IGroupDocument | null> => {
            const groupToUpdate = await group.findById(args.groupId);
            if (!groupToUpdate) {
                throw new Error("Group not found");
            }
            const userId = new mongoose.Types.ObjectId(args.userId);
            const userAlreadyInGroup = groupToUpdate.members.some((member) => member.member.equals(userId));
            if (!userAlreadyInGroup) {
                throw new Error("User not in group");
            }
            const isMemberAdmin = groupToUpdate.admins.some((admin) => admin.admin.equals(userId))
            if (isMemberAdmin) {
                throw new Error("User is admin, demote first")
            }
            const isleader = groupToUpdate.leader.equals(userId)
            if (isleader) {
                throw new Error("You cannot remove the group leader")
            }
            groupToUpdate.members = groupToUpdate.members.filter((member) => !member.member.equals(userId))
            await groupToUpdate.save();
            await messageResolvers.Mutation.sendMessage(_, {
                senderId: args.userId,
                groupId: args.groupId,
                content: "Removed From the group.",
                type: "critical",
                attachments: undefined,
                createdAt: new Date()
            });
            const User = await user.findById(userId);
            if (User) {
                User.groups = User.groups.filter((group) => group.group.toString() !== args.groupId);
                await User.save();
            }
            return (await groupToUpdate.populate('leader')).populate('members.member');;
        },
        getAttachments: async (_: unknown, { groupId }: { groupId: string }) => {
            const attachmentData = await attachment.find({ group: groupId }).lean()
            if (!attachmentData) {
                throw new Error("Group not found");
            }
            return attachmentData;
        },
        userTyping: async (_: unknown, { groupId, userId }: { groupId: string, userId: string }) => {
            const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;
            console.log(userId, "group", groupId)
            if (!TYPING_USERS.has(topic)) {
                TYPING_USERS.set(topic, new Set<string>());
            }
            const typingUsers = TYPING_USERS.get(topic);
            if (typingUsers) {
                typingUsers.add(userId);
                pubsub.publish(topic, { typingUser: Array.from(typingUsers) });
            }
            return Array.from(typingUsers || []);
        },
        userStoppedTyping: async (_: unknown, { groupId, userId }: { groupId: string, userId: string }) => {
            const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;
            if (TYPING_USERS.has(topic)) {
                const typingUsers = TYPING_USERS.get(topic);
                if (typingUsers) {
                    typingUsers.delete(userId);
                    pubsub.publish(topic, { typingUser: Array.from(typingUsers) });
                }
            }
            return Array.from(TYPING_USERS.get(topic) || []);
        }
    },
    Subscription: {
        typingUser: {
            subscribe: (_: unknown, { groupId }: { groupId: string }) => {
                const topic = `${TYPING_USERS_TOPIC_PREFIX}${groupId}`;
                if (!TYPING_USERS.has(topic)) {
                    TYPING_USERS.set(topic, new Set<string>());
                }
                return pubsub.asyncIterableIterator([topic]);
            }
        }
    }
} 