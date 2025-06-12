import { mergeTypeDefs } from "@graphql-tools/merge";
import messageSchema from "./messageShema/index";
import {userTypeDefs} from "./userShema/index";
import { groupTypeDefs } from "./groupShemas";
import AiResponsetypeDefs from "./AiResponse";
import AttachmentDefs from "./attachment";

const typeDefs = mergeTypeDefs([messageSchema, userTypeDefs,groupTypeDefs,AiResponsetypeDefs,AttachmentDefs]);

export default typeDefs;
