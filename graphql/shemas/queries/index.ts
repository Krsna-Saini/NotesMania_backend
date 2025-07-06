import { gql } from "apollo-server-express";

export const queriesTypeDefs=gql`

    type Queries {
        Question:String!
        User:User!
    }

    type Query{
        getQueries:[Queries!]!
    }

    type Mutation{
        CreateQuery(userId:String,Question:String):Queries!
    }
`