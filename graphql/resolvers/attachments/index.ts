import attachment from "../../../models/attachment";
import user from "../../../models/user";

export const attachmentsResolvers = {
  Query: {
    getAttachments: async (_: unknown, { userId }: { userId: string }) => {
      const userDoc = await user.findById(userId).lean();
      if (!userDoc) return [];

      // Get user's own attachments
      const userAttachments = await attachment.find({ user: userId,group:null })
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
      // Get all group-level attachments
      const groupIds = userDoc.groups.map((g) => g.group);
      const groupAttachments = await attachment.find({ group: { $in: groupIds } })
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
      const allAttachments = [...userAttachments, ...groupAttachments];

      const formatted = allAttachments.map((att) => {
        const group = att.group as any;
        const uploader = att.user as any;
        const members = group?.members || [];

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
            name: group?.name,
            totalMembers: members.length,
            sampleMembers,
          },
        };
      });

      return formatted;
    },
  },
};  