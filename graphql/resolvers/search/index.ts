import user from "../../../models/user";
import group from "../../../models/group";
import attachment from "../../../models/attachment";
import blog from "../../../models/blog";
import message from "../../../models/message";
import { PubSub } from "graphql-subscriptions";
import { subscribe } from "graphql";
const pubsub = new PubSub();
export const SearchResolver = {
    Query: {
        search: async (_: unknown, { query, userId }: { query: string, userId: string }) => {
            try {
                // serachig for users
                setTimeout(async () => {
                    const Users = await user.find({
                        $or: [
                            { username: { $regex: query, $options: 'i' } },
                            { email: { $regex: query, $options: 'i' } },
                            { description: { $regex: query, $options: 'i' } }
                        ]
                    })
                        .lean()

                    await pubsub.publish('SEARCH_USERS', {
                        searchProgress: {
                            type: "user",
                            status: "done",
                            data: Users
                        }
                    })
                }, 300);


                // searching for groups
                setTimeout(async () => {
                    const Groups = await group.find({
                        $or: [
                            { name: { $regex: query, $options: 'i' } },
                            { description: { $regex: query, $options: 'i' } }
                        ]
                    })
                        .populate("leader", "id username email profileImageUrl description")
                        .lean()

                    await pubsub.publish('SEARCH_GROUPS', {
                        searchProgress: {
                            type: "group",
                            status: "done",
                            data: Groups
                        }
                    })
                }, 600);

                // searching for attachments
                setTimeout(async () => {
                    const Attachments = await attachment.find({
                        $or: [
                            { fileName: { $regex: query, $options: 'i' } },
                            { fileType: { $regex: query, $options: 'i' } },
                            {tags: { $regex: query, $options: "i" }}
                        ]
                    })
                        .select("fileUrl fileName fileType uploadedAt tags group user")
                        .lean()

                    await pubsub.publish('SEARCH_ATTACHMENTS', {
                        searchProgress: {
                            type: "attachment",
                            status: "done",
                            data: Attachments
                        }
                    })
                }, 900);

                // searching for blogs
                setTimeout(async () => {
                    const Blogs = await blog.find({
                        $or: [
                            { heading: { $regex: query, $options: 'i' } },
                            { content: { $regex: query, $options: 'i' } },
                            { tags: { $regex: query, $options: "i" }},
                        ]
                    })
                        .populate("creator", "_id username email profileImageUrl")
                        .populate("coverImage", "fileUrl")
                        .lean()

                    await pubsub.publish('SEARCH_BLOGS', {
                        searchProgress: {
                            type: "blog",
                            status: "done",
                            data: Blogs
                        }
                    })
                }, 1200);

                // searching for messages
                setTimeout(async () => {
                    const Messages = await message.find({
                        $and: [
                            { sender: userId },
                            {
                                content: { $regex: query, $options: 'i' },
                            }]
                    })
                        .populate('sender')
                        .populate('group')
                        .lean()

                    await pubsub.publish('SEARCH_MESSAGES', {
                        searchProgress: {
                            type: "message",
                            status: "done",
                            data: Messages
                        }
                    })
                }, 1500);
                return true;
            } catch (error) {
                throw new Error(`Search failed`);
            }
        }
    },
    Subscription: {
        searchProgress: {
            subscribe: () => {
                return pubsub.asyncIterableIterator(['SEARCH_USERS', 'SEARCH_GROUPS', 'SEARCH_ATTACHMENTS', 'SEARCH_BLOGS', 'SEARCH_MESSAGES']);
            }
        }
    },
    SearchResultData: {
        __resolveType(obj: { username: any; email: any; name: any; leader: any; heading: any; content: any; fileUrl: any; fileName: any; sender: any; }) {
            if (obj.username && obj.email) return "User";
            if (obj.name && obj.leader) return "Group";
            if (obj.heading && obj.content) return "Blog";
            if (obj.fileUrl && obj.fileName) return "Attachment";
            if (obj.content && obj.sender) return "Message";
            return null;
        }
    }
}