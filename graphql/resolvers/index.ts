import { mergeResolvers } from "@graphql-tools/merge";
import messageResolversAlias from "./message/index";
import {userResolvers} from "./user/index";
import { GroupResolver } from "./group";
import Airesolvers from "./AiResponse";
import { attachmentsResolvers } from "./attachments";
import { queryResolver } from "./queries";
import { blogResolvers } from "./blogs";
const resolvers = mergeResolvers([blogResolvers,messageResolversAlias, userResolvers,GroupResolver,Airesolvers,attachmentsResolvers,queryResolver]);

export default resolvers;
