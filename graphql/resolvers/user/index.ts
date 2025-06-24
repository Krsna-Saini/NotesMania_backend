import { IUserDocument, IUserUpdateProfile, IUserGroupParent, IGetUserArgs, ICreateUserArgs, IUpdateUserArgs, IDeleteUserArgs, IAddUserToGroupArgs } from "../../types/userTypes";
import User from "../../../models/user";
import Group from "../../../models/group";
import bcrypt from "bcrypt";
import { pubsub } from "../../../config/pubsub";
import attachment from "../../../models/attachment";
const ONLINE_USERS: Set<string> = new Set();
const ONLINE_USERS_TOPIC = "ONLINE_USERS";
export const userResolvers = {
  DateTime: {

  },

  UserGroup: {
    group: async (parent: IUserGroupParent) => {
      return await Group.findById(parent.group);
    },
  },

  Query: {
    getUser: async (_: unknown, { id }: IGetUserArgs): Promise<IUserDocument | null> => {
      return await User.findById(id).populate("groups.group");
    },
    getUsers: async (): Promise<IUserDocument[]> => {
      return await User.find().populate("groups.group");
    },
  },

  Mutation: {
    createUser: async (_: unknown, { input }: ICreateUserArgs): Promise<IUserDocument> => {
      try {
        const existingUser = await User.findOne({
          $or: [{ username: input.username }, { email: input.email }]
        });

        if (existingUser) {
          throw new Error("Username or email already exists");
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const user = new User({
          ...input,
          password: hashedPassword,
        });

        await user.save();
        return user;
      } catch (error) {
        console.error("Error creating user:", error);
        throw new Error("Failed to create user");
      }
    },
    authenticateUser: async (_: unknown, { email, password }: { email: string, password: string }): Promise<IUserDocument | null> => {
      const user = await User.findOne({ email });
      console.log(email, password);
      if (!user) {
        throw new Error("User not found");
      }
      if (!user.password) {
        throw new Error("User does not have a password set");
      }
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        throw new Error("Invalid password");
      }
      return user;
    },

    deleteUser: async (
      _: unknown,
      { id }: IDeleteUserArgs
    ): Promise<boolean> => {
      await User.findByIdAndDelete(id);
      return true;
    },
    userOnline: async (_: unknown, { userId }: { userId: string }) => {
      ONLINE_USERS.add(userId);
      pubsub.publish(ONLINE_USERS_TOPIC, { onlineUsers: Array.from(ONLINE_USERS) });
      return true;
    },
    userOffline: async (_: unknown, { userId }: { userId: string }) => {
      ONLINE_USERS.delete(userId);
      pubsub.publish(ONLINE_USERS_TOPIC, { ONLINE_USERS: Array.from(ONLINE_USERS) })
      return true;
    },
    searchUser: async (_: unknown, { username }: { username: string }) => {
      const Users = await User.find({
        username: { $regex: username, $options: "i" }
      })
        .select(" username email profileImageUrl id")
        .limit(10)
      return Users || []
    },
    UpdateProfile: async (_: unknown, { input }: IUserUpdateProfile) => {
      const ProfileAttachment = await attachment.findById(input.AttchmentUrl)

      if (!ProfileAttachment) {
        throw new Error("Attachment not found");
      }
      const UserData = await User.findByIdAndUpdate(input.userId,
        {
          username: input.username,
          description: input.description,
          profileImageUrl: ProfileAttachment?.fileUrl,
        }
      );
      if (!UserData) throw new Error("User not found")
      console.log(UserData)
      return UserData
    }

  },
  Subscription: {
    onlineUsers: {
      subscribe: () => pubsub.asyncIterableIterator([ONLINE_USERS_TOPIC])
    },
  },
};