import express, { Express } from "express";
import cors from "cors";
import bodyParser, { json } from "body-parser";
import typeDefs from "./graphql/shemas";
import resolvers from "./graphql/resolvers";
import connectDB from "./config/db";
import handleChatWithAi from "./controller/deepseekApi";
import http from 'http';
import { IContext } from "./graphql/types/userTypes";
import multer from 'multer';
import { uploadfile } from "./controller/uploadFile";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/use/ws';

const startServer = async () => {
  const app: Express = express();
  const httpServer = http.createServer(app);

  // 1. Setup WebSocket Server
  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/graphql',
  });

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const serverCleanup = useServer({ schema }, wsServer);

  // 2. Setup Apollo Server
  const server = new ApolloServer<IContext>({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose();
              console.log("🧹 Cleaned up WebSocket server");
            },
          };
        },
      },
    ],
  });

  // 3. Setup Middleware
  app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  const upload = multer({ storage: multer.memoryStorage() });

  // 4. DB Connection
  try {
    await connectDB();
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err);
  }

  await server.start();

  // 5. GraphQL Endpoint
  app.use(
    "/graphql",
    json(),
    expressMiddleware(server, {
      context: async ({ req }) => ({ token: req.headers.authorization }),
    })
  );

  // 6. REST Endpoints
  app.post("/api/chat", handleChatWithAi);
  app.post("/upload", upload.array('files'), uploadfile);

  // ✅ Health check route
  app.get("/health", (req, res) => {
    res.status(200).json({
      ok: true,
      message: "Server is alive",
      timestamp: new Date().toISOString(),
      port: process.env.PORT,
      env: process.env.NODE_ENV || 'development'
    });
  });

  // Base route
  app.get("/", (req, res) => {
    res.send("🟢 Backend is running!");
  });

  // Error Handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: 'Internal server error' });
  });

  const PORT = process.env.PORT || 3000;
  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at http://localhost:${PORT}/graphql`);
    console.log(`📡 Health check at http://localhost:${PORT}/health`);
  });
};

startServer().catch(err => {
  console.error('💥 Failed to start server:', err);
  process.exit(1);
});
