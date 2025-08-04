import mongoose from "mongoose"
import blog from "../../../models/blog"
import { inputCreateBlog } from "../../types/blog"
import Comment from "../../../models/comments";
export const blogResolvers = {
    Query: {
        getBlogs: async (_: unknown, { page = 1, query = "" }) => {

            const limit = 6;
            const skip = (page - 1) * limit;

            const filter = query
                ? {
                    $or: [
                        { heading: { $regex: query, $options: "i" } },
                        { content: { $regex: query, $options: "i" } }
                    ]
                }
                : {};

            const [blogs, total, topViewed, topVisited] = await Promise.all([

                // collecting blogs
                blog.find(filter)
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("creator", "_id username email profileImageUrl")
                    .populate("coverImage", "fileUrl")
                    .lean(),

                // total blogs
                blog.countDocuments(filter),

                // aggregating most viewed top 3 
                blog.find()
                    .sort({ viewsCount: -1 })
                    .limit(3)
                    .populate("creator", "_id username email profileImageUrl")
                    .populate("coverImage", "fileUrl")
                    .lean(),

                // aggregating most visited top 3 blogs
                blog.find()
                    .sort({ visitorsCount: -1 })
                    .limit(3)
                    .populate("creator", "_id username email profileImageUrl")
                    .populate("coverImage", "fileUrl")
                    .lean()
            ]);
            return {
                blogs,
                currentPage: page,
                totalPages: Math.ceil(total / limit),
                totalBlogs: total,
                topViewed,
                topVisited

            }
        },
        getComments: async (_: unknown, { blogId }: { blogId: string }) => {
            try {
                const blogPost = await blog.findById(blogId).populate({
                    path: 'comments',
                    populate: {
                        path: 'replies',
                        populate: {
                            path: 'replies',
                        },
                    },
                });

                if (!blogPost) {
                    throw new Error("Blog not found");
                }

                return blogPost.comments; // or format it if needed
            } catch (error: any) {
                console.error("Error getting comments:", error.message);
                throw new Error("Failed to fetch comments");
            }
        },

        getBlogsByUser: async (_: unknown, { userId }: { userId: string }) => {
            return await blog.find({ creator: userId })
                .populate("creator", "_id username email profileImageUrl")
                .populate("coverImage", "fileUrl")
                .lean()
        },
        getBlogById: async (_: unknown, { blogId }: { blogId: string }) => {
            return await blog.findById(blogId)
                .populate("creator", "_id username email profileImageUrl")
                .populate("coverImage", "fileUrl")
                .populate("visitors.user", "_id username email profileImageUrl")
                .populate("views.user", "_id username email profileImageUrl")
                .lean()
        }
    },
    Mutation: {

        createBlog: async (
            _: unknown,
            {
                creator,
                coverImage,
                tags,
                heading,
                content,
                externalLinks
            }: inputCreateBlog
        ) => {
            try {
                if (!creator || !heading || !coverImage) {
                    throw new Error("Missing required fields: creator, heading, or cover image");
                }
                const newBlog = new blog({
                    creator,
                    coverImage,
                    tags,
                    heading,
                    content,
                    externalLinks
                });
                return await newBlog.save();
            } catch (error: any) {
                console.error("Error creating blog:", error.message);
                throw new Error("Failed to create blog. Please try again later.");
            }
        },

        handleVisitor: async (_: unknown, { visitor, blogId }: { visitor: string, blogId: string }) => {
            try {
                const Blog = await blog.findById(blogId);
                if (!Blog) throw new Error(`Blog with ID ${blogId} not found`);



                // avoiding adding creator in visitor array
                if (Blog.creator.toString() !== visitor) {

                    const visitorId = new mongoose.Types.ObjectId(visitor);
                    Blog.views.push({ user: visitorId })

                    // avoiding adding visitors that are already in visitor array
                    if (!Blog.visitors?.some(item => item.user.toString() === visitorId.toString())) {

                        // adding visitor in visitors array
                        Blog.visitors?.push({ user: visitorId });
                    }
                }
                Blog.viewsCount = Blog.views.length;
                Blog.visitorsCount = Blog.visitors.length;
                return await Blog.save();
            } catch (error: any) {
                console.error("Error in handleVisitor:", error.message);
                throw new Error("Something went wrong while handling visitor.");
            }
        },

        handleDeleteBlog: async (_: unknown, { blogId }: { blogId: string }) => {
            try {
                const result = await blog.findByIdAndDelete(blogId);
                if (!result) {
                    throw new Error(`No blog found with ID: ${blogId}`);
                }
                return { message: "Blog deleted successfully" };
            } catch (error: any) {
                console.error("Error deleting blog:", error.message);
                throw new Error(`Failed to delete blog. Reason: ${error.message}`);
            }
        },
        addComment: async (_: unknown, { blogId, userId, comment }: { blogId: string, userId: string, comment: string },): Promise<string> => {
            try {
                const blogPost = await blog.findById(blogId);
                if (!blogPost) {
                    throw new Error(`Blog with ID ${blogId} not found`);
                }
                const newComment = new Comment({
                    user: userId,
                    comment
                })
                await newComment.save();
                blogPost.comments.push(newComment._id);
                await blogPost.save();
                return "Comment added successfully";
            } catch (error: any) {
                console.error("Error adding comment:", error.message);
                throw new Error("Failed to add comment. Please try again later.");
            }
        },
        addReply: async (_: unknown, { commentId, userId, reply }: { commentId: string, userId: string, reply: string }): Promise<string> => {
            try {
                const comment = await Comment.findById(commentId);
                if (!comment) {
                    throw new Error("Comment not found");
                }
                const replyComment = new Comment({
                    user: userId,
                    comment: reply
                })
                await replyComment.save();
                comment.replies?.push(replyComment.id);
                await comment.save();
                return "comment done sucessfully";
            } catch (error: any) {
                console.error("Error adding comment:", error.message);
                throw new Error("Failed to add comment. Please try again later.");
            }
        },
        deleteComment: async (_: unknown, { commentId }: { commentId: string }): Promise<string> => {
            try {
                const comment = await Comment.findById(commentId);
                if (!comment) {
                    throw new Error("Comment not found");
                }

                // Recursively delete all nested replies
                const deleteRepliesRecursively = async (commentId: string) => {
                    const comment = await Comment.findById(commentId);
                    if (!comment) return;

                    for (const replyId of comment.replies || []) {
                        await deleteRepliesRecursively(replyId.toString());
                    }

                    await Comment.findByIdAndDelete(commentId);
                };

                await deleteRepliesRecursively(commentId);

                // Also remove this comment from blog or parent comment
                await blog.updateMany({}, { $pull: { comments: commentId } });
                await Comment.updateMany({}, { $pull: { replies: commentId } });

                return "Comment and nested replies deleted successfully";
            } catch (error: any) {
                console.error("Error deleting comment:", error.message);
                throw new Error("Failed to delete comment");
            }
        },
        deleteReply: async (_: unknown, { parentCommentId, replyCommentId }: { parentCommentId: string, replyCommentId: string }): Promise<string> => {
            try {
                const parent = await Comment.findById(parentCommentId);
                if (!parent) {
                    throw new Error("Parent comment not found");
                }

                // Remove the reply from replies array
                parent.replies = parent.replies?.filter(id => id.toString() !== replyCommentId);
                await parent.save();

                // Delete the reply comment document itself
                await Comment.findByIdAndDelete(replyCommentId);

                return "Reply deleted successfully";
            } catch (error: any) {
                console.error("Error deleting reply:", error.message);
                throw new Error("Failed to delete reply");
            }
        },
    }
}