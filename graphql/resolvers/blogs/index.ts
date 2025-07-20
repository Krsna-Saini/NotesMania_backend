import mongoose from "mongoose"
import blog from "../../../models/blog"
import { inputCreateBlog } from "../../types/blog"
export const blogResolvers = {
    Query: {

        getBlogs: async (_: unknown, { page = 1 }) => {

            const limit = 6;
            const skip = (page - 1) * limit;

            const [blogs, total, topViewed, topVisited] = await Promise.all([

                // collecting blogs
                blog.find()
                    .sort({ createdAt: -1 })
                    .skip(skip)
                    .limit(limit)
                    .populate("creator", "_id username email profileImageUrl")
                    .populate("coverImage", "fileUrl")
                    .lean(),

                // total blogs
                blog.countDocuments(),

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
        }

    }

}