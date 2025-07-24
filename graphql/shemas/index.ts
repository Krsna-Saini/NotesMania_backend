import { mergeTypeDefs } from "@graphql-tools/merge";
import {messageTypedefs} from "./messageShema/index";
import {userTypeDefs} from "./userShema/index";
import { groupTypeDefs } from "./groupShemas";
import AiResponsetypeDefs from "./AiResponse";
import AttachmentDefs from "./attachment";
import {queriesTypeDefs} from "./queries";
import { blogTypeDefs } from "./blog";
import { searchSchema } from "./search";
const typeDefs = mergeTypeDefs([blogTypeDefs,searchSchema,messageTypedefs,queriesTypeDefs, userTypeDefs,groupTypeDefs,AiResponsetypeDefs,AttachmentDefs]);

export default typeDefs;
