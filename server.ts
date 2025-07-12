import express, { Express } from "express";
import cors from "cors";
import bodyParser from "body-parser";
import typeDefs from "./graphql/shemas";
import resolvers from "./graphql/resolvers";
import connectDB from "./config/db";
import handleChatWithAi from "./controller/deepseekApi";
import http from 'http';
import { json } from 'body-parser';
import { IContext } from "./graphql/types/userTypes";
import multer from 'multer'
import { uploadfile } from "./controller/uploadFile";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';
async function startServer() {
   const app: Express = express();
  const httpServer = http.createServer(app);

  // Create WebSocket server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  // Hand in the schema we just created and have the
  // WebSocketServer start listening.
  const serverCleanup = useServer({ schema }, wsServer);

  // Apollo Server setup
  const server = new ApolloServer<IContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
            },
          };
        },
      },
    ],
  });

  // Middleware setup
  app.use(cors());
  
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

 
  await connectDB();
  await server.start();

  // GraphQL endpoint
  app.use(
    "/graphql",
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.authorization }),
    })
  );

  // REST endpoint
  app.post("/api/chat", handleChatWithAi);
  app.post("/upload",upload.array('files'),uploadfile);
  app.get("/",(req,res)=>{
    res.send("hello")
  })
  // Error handling
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});