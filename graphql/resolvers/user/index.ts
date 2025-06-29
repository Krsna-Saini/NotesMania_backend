import {
  IUserDocument,
  IUserUpdateProfile,
  IUserGroupParent,
  IGetUserArgs,
  ICreateUserArgs,
  IDeleteUserArgs,
} from "../../types/userTypes";

import User from "../../../models/user";
import Group from "../../../models/group";
import bcrypt from "bcrypt";
import { pubsub } from "../../../config/pubsub";
import attachment from "../../../models/attachment";

// Store online user IDs for real-time presence tracking
const ONLINE_USERS: Set<string> = new Set();
const ONLINE_USERS_TOPIC = "ONLINE_USERS";

export const userResolvers = {
  // Placeholder for custom scalars like DateTime (if needed)
  DateTime: {},

  // Resolver for the group inside a user's group array
  UserGroup: {
    group: async (parent: IUserGroupParent) => {
      return await Group.findById(parent.group);
    },
  },

  Query: {
    /**
     * Fetch a user by ID and populate their group memberships.
     */
    getUser: async (_: unknown, { id }: IGetUserArgs): Promise<IUserDocument | null> => {
      return await User.findById(id).populate("groups.group");
    },

    /**
     * Fetch all users and populate their group memberships.
     */
    getUsers: async (): Promise<IUserDocument[]> => {
      return await User.find().populate("groups.group");
    },
  },

  Mutation: {
    /**
     * Create a new user after validating uniqueness and hashing the password.
     */
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

    /**
     * Authenticate a user by email and password.
     */
    authenticateUser: async (_: unknown, { email, password }: { email: string, password: string }): Promise<IUserDocument | null> => {
      const user = await User.findOne({ email });
      if (!user) throw new Error("User not found");

      if (!user.password) throw new Error("User does not have a password set");

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) throw new Error("Invalid password");

      return user;
    },

    /**
     * Permanently delete a user by their ID.
     */
    deleteUser: async (_: unknown, { id }: IDeleteUserArgs): Promise<boolean> => {
      await User.findByIdAndDelete(id);
      return true;
    },

    /**
     * Mark a user as online and notify all subscribers.
     */
    userOnline: async (_: unknown, { userId }: { userId: string }) => {
      ONLINE_USERS.add(userId);
      pubsub.publish(ONLINE_USERS_TOPIC, { onlineUsers: Array.from(ONLINE_USERS) });
      return true;
    },

    /**
     * Mark a user as offline and notify all subscribers.
     */
    userOffline: async (_: unknown, { userId }: { userId: string }) => {
      ONLINE_USERS.delete(userId);
      pubsub.publish(ONLINE_USERS_TOPIC, { onlineUsers: Array.from(ONLINE_USERS) }); // fixed key
      return true;
    },

    /**
     * Search users by username (case-insensitive, partial match).
     */
    searchUser: async (_: unknown, { username }: { username: string }) => {
      const users = await User.find({
        username: { $regex: username, $options: "i" }
      })
        .select("username email profileImageUrl id")
        .limit(10);

      return users || [];
    },

    /**
     * Update a user's profile (username, description, profile image).
     */
    UpdateProfile: async (_: unknown, { input }: IUserUpdateProfile) => {
      if (!input.userId) throw new Error("User ID is required");

      const profileAttachment = await attachment.findById(input.AttchmentUrl);
      const userData = await User.findById(input.userId);

      if (!userData) throw new Error("User not found");

      if (profileAttachment) {
        userData.profileImageUrl = profileAttachment.fileUrl;
      }

      if (input.username) {
        userData.username = input.username;
      }

      if (input.description) {
        userData.description = input.description;
      }

      await userData.save();
      return userData;
    }
  },

  Subscription: {
    /**
     * Subscribe to real-time list of online users.
     */
    onlineUsers: {
      subscribe: () => pubsub.asyncIterableIterator([ONLINE_USERS_TOPIC])
    },
  },
};
