import user from "../../../models/user";
import group from "../../../models/group";
import attachment from "../../../models/attachment";
import blog from "../../../models/blog";
import message from "../../../models/message";
import { PubSub } from "graphql-subscriptions";
import AiResponseHistory from "../../../models/AiResponseHistory";
import Queries from "../../../models/Queries";
import mongoose from "mongoose";
const pubsub = new PubSub();
export const SearchResolver = {
    Query: {
        search: async (_: unknown, { query, userId }: { query: string, userId: string }) => {
            try {
                // serachig for users
                console.log("hello")
                const Users = await user.find({
                    $or: [
                        { username: { $regex: query, $options: 'i' } },
                        { email: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ]
                })
                    .lean()
                    .limit(10)

                await pubsub.publish('SEARCH_USERS', {
                    searchProgress: {
                        type: "user",
                        status: "done",
                        data: Users
                    }
                })


                // searching for groups

                const Groups = await group.find({
                    $or: [
                        { name: { $regex: query, $options: 'i' } },
                        { description: { $regex: query, $options: 'i' } }
                    ]
                })
                    .populate("leader", "id username email profileImageUrl description")
                    .lean()
                    .limit(10)

                await pubsub.publish('SEARCH_GROUPS', {
                    searchProgress: {
                        type: "group",
                        status: "done",
                        data: Groups
                    }
                })

                // searching for attachments

                const Attachments = await attachment.find({
                    $or: [
                        { fileName: { $regex: query, $options: 'i' } },
                        { fileType: { $regex: query, $options: 'i' } },
                        { tags: { $regex: query, $options: "i" } }
                    ]
                })
                    .select("fileUrl fileName fileType uploadedAt tags group user")
                    .lean()
                    .limit(10)

                await pubsub.publish('SEARCH_ATTACHMENTS', {
                    searchProgress: {
                        type: "attachment",
                        status: "done",
                        data: Attachments
                    }
                })

                // searching for blogs

                const Blogs = await blog.find({
                    $or: [
                        { heading: { $regex: query, $options: 'i' } },
                        { content: { $regex: query, $options: 'i' } },
                        { tags: { $regex: query, $options: "i" } },
                    ]
                })
                    .populate("creator", "_id username email profileImageUrl")
                    .populate("coverImage", "fileUrl")
                    .lean()
                    .limit(10)

                await pubsub.publish('SEARCH_BLOGS', {
                    searchProgress: {
                        type: "blog",
                        status: "done",
                        data: Blogs
                    }
                })

                // searching for messages

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
                    .limit(10)

                await pubsub.publish('SEARCH_MESSAGES', {
                    searchProgress: {
                        type: "message",
                        status: "done",
                        data: Messages
                    }
                })

                // searching for queries by user
                const userQueries = await Queries.find({
                    userId: new mongoose.Types.ObjectId(userId),
                    Question: { $regex: query, $options: 'i' }
                })
                .lean()
                .limit(10);
               
                await pubsub.publish('SEARCH_USER_QUERIES', {
                    searchProgress: {
                        type: "userQuery",
                        status: "done",
                        data: userQueries
                    }
                })

                // searching for AI - question by user history

                const AiResponses = await AiResponseHistory.aggregate([
                    {
                        $match: {
                            User: new mongoose.Types.ObjectId(userId),
                            name: { $regex: query, $options: 'i' },
                            Messages: {
                                $elemMatch: {
                                    role: "user",
                                    $or: [
                                        { content: { $regex: query, $options: "i" } },
                                        { selectedText: { $regex: query, $options: "i" } }
                                    ]
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            _id:1,
                            name: 1,
                            User: 1,
                            Messages: {
                                $filter: {
                                    input: "$Messages",
                                    as: "msg",
                                    cond: {
                                        $and: [
                                            { $eq: ["$$msg.role", "user"] },
                                            {
                                                $or: [
                                                    { $regexMatch: { input: "$$msg.content", regex: query, options: "i" } },
                                                    { $regexMatch: { input: "$$msg.selectedText", regex: query, options: "i" } }
                                                ]
                                            }
                                        ]
                                    }
                                }
                            }
                        }
                    },
                    {
                        $lookup: {
                            from: "users",
                            localField: "User",
                            foreignField: "_id",
                            as: "User"
                        }
                    },
                    {
                        $unwind: "$User"
                    },
                    {
                        $project: {
                            _id:1,
                            name: 1,
                            Messages: 1,
                            User: {
                                _id: 1,
                                username: 1,
                                email: 1,
                                profileImageUrl: 1
                            }
                        }
                    }
                ]);
                await pubsub.publish('SEARCH_USER_AI_QUERIES', {
                    searchProgress: {
                        type: "aiQuery",
                        status: "done",
                        data: AiResponses
                    }
                })

                // serach for ai-responses from all users
                const AiResponseHistoryData = await AiResponseHistory.find({
                    Messages: {
                        $elemMatch: {
                            content: { $regex: query, $options: 'i' },
                            role: "user"
                        }
                    }
                })
                .populate("User", "_id username email profileImageUrl")
                .lean()
                .limit(10);

                await pubsub.publish('SEARCH_COMPLETE', {
                    searchProgress: {
                        type: "aiResponse",
                        status: "done",
                        data: AiResponseHistoryData
                    }
                })
                
                return true;
            } catch (error) {
                throw new Error(`Search failed`);
            }
        }
    },
    Subscription: {
        searchProgress: {
            subscribe: () => {
                return pubsub.asyncIterableIterator([
                    'SEARCH_USERS',
                    'SEARCH_GROUPS',
                    'SEARCH_ATTACHMENTS',
                    'SEARCH_BLOGS',
                    'SEARCH_MESSAGES',
                    'SEARCH_USER_QUERIES',
                    'SEARCH_USER_AI_QUERIES',
                    'SEARCH_COMPLETE'
                ]);
            },
        },
    },


    SearchResultData: {
        __resolveType(obj: {query:any, Messages: any, User: any, username: any; email: any; name: any; leader: any; heading: any; content: any; fileUrl: any; fileName: any; sender: any; }) {
            if (obj.username && obj.email) return "User";
            if (obj.name && obj.leader) return "Group";
            if (obj.heading && obj.content) return "Blog";
            if (obj.fileUrl && obj.fileName) return "Attachment";
            if (obj.content && obj.sender) return "Message";
            if (obj.Messages && obj.User) return "AiResponseHistory";
            if (obj.query) return "Queries";
            return null;
        }
    }
}