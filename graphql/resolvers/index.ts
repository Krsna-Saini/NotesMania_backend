import { mergeResolvers } from "@graphql-tools/merge";
import messageResolversAlias from "./message/index";
import {userResolvers} from "./user/index";
import { GroupResolver } from "./group";
import Airesolvers from "./AiResponse";
import { attachmentsResolvers } from "./attachments";
const resolvers = mergeResolvers([messageResolversAlias, userResolvers,GroupResolver,Airesolvers,attachmentsResolvers]);

export default resolvers;
