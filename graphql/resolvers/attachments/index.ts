// Import Mongoose models
import attachment from "../../../models/attachment";
import user from "../../../models/user";

// GraphQL resolvers for managing attachments
export const attachmentsResolvers = {
  Query: {
    /**
     * Retrieves both personal and group attachments associated with a specific user.
     * 
     * @param _ - Unused parent argument in GraphQL resolver signature
     * @param userId - The ID of the user whose attachments are being fetched
     * @returns An array of formatted attachment objects with uploader and group details
     */
    getAttachments: async (_: unknown, { userId }: { userId: string }) => {
      // Fetch the user document to access group membership
      const userDoc = await user.findById(userId).lean();
      if (!userDoc) return [];

      // ---------- Personal Attachments ----------

      const userAttachments = await attachment.find({
        user: userId,
        group: null, // Ensures it's not a group attachment
      })
        .select("fileUrl fileName fileType uploadedAt tags group user")
        .populate([
          {
            path: "group",
            model: "Group",
            select: "name members",
            populate: {
              path: "members.member",
              model: "User",
              select: "_id username profileImageUrl",
            },
          },
          {
            path: "user",
            model: "User",
            select: "_id username profileImageUrl",
          },
        ])
        .lean();

      // ---------- Group Attachments ----------

      // Extract group IDs the user is a part of
      const groupIds = userDoc.groups.map((g) => g.group);

      const groupAttachments = await attachment.find({
        group: { $in: groupIds },
      })
        .select("fileUrl fileName fileType uploadedAt tags group user")
        .populate([
          {
            path: "group",
            model: "Group",
            select: "name members",
            populate: {
              path: "members.member",
              model: "User",
              select: "_id username profileImageUrl",
            },
          },
          {
            path: "user",
            model: "User",
            select: "_id username profileImageUrl",
          },
        ])
        .lean();

      // Combine personal and group attachments
      const allAttachments = [...userAttachments, ...groupAttachments];

      // ---------- Format the Final Output ----------

      const formatted = allAttachments.map((att) => {
        const group = att.group as any;
        const uploader = att.user as any;
        const members = group?.members || [];

        // Extract up to 3 sample members for display
        const sampleMembers = members
          .filter((m: any) => m?.member)
          .slice(0, 3)
          .map((m: any) => ({
            _id: m.member._id,
            username: m.member.username,
            profileImageUrl: m.member.profileImageUrl,
          }));

        return {
          _id: att._id,
          fileUrl: att.fileUrl,
          fileName: att.fileName,
          fileType: att.fileType,
          tags: att.tags,
          uploadedAt: att.uploadedAt,
          uploadedBy: {
            _id: uploader._id,
            username: uploader.username,
            profileImageUrl: uploader.profileImageUrl,
          },
          Att_group: {
            name: group?.name || null,
            totalMembers: members.length,
            sampleMembers,
          },
        };
      });

      // Return formatted attachments to the client
      return formatted;
    },
  },
};
