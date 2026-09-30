const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { connectDB, getIsConnected } = require('./config/db');
const logger = require('./utils/logger');
const authRoutes = require('./routes/authRoutes');
const apiRoutes = require('./routes/apiRoutes');
const systemRoutes = require('./routes/systemRoutes');
const { initSockets } = require('./sockets/trackingSocket');
const { checkAiEngineHealth } = require('./services/aiEngineService');
const journal = require('./services/journal');
const snapshot = require('./services/snapshot');
const recoveryState = require('./services/recoveryState');

const app = express();
const server = http.createServer(app);

// Security & Middleware Stack
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());

// Connect Database
connectDB();

// Routes
app.use('/api/auth', authRoutes);
// The resilience console — mounted before /api and unauthenticated on purpose
// (a wiped `users` collection must not lock the recovery tools out of reach).
app.use('/api/system', systemRoutes);
app.use('/api', apiRoutes);

// Microservices Health & Status Route
app.get('/health', async (req, res) => {
  const pythonStatus = await checkAiEngineHealth();

  let resilience;
  try {
    const jstats = await journal.stats();
    const state = recoveryState.get();
    resilience = {
      mode: state.mode,
      journal: jstats.status,
      journalEvents: jstats.events,
      queued: await recoveryState.queueDepth(),
    };
  } catch (err) {
    resilience = { mode: 'unknown', error: err.message };
  }

  res.json({
    status: 'online',
    service: 'KrishiFlow Backend Orchestrator Core',
    timestamp: new Date().toISOString(),
    dbConnected: getIsConnected(),
    aiEngineStatus: pythonStatus.status || 'offline',
    pythonDetails: pythonStatus,
    resilience,
  });
});

// Socket.io Setup
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});
initSockets(io);

const indexer = require('./rag/ingestion/indexer');

const PORT = process.env.PORT || 5000;
server.listen(PORT, async () => {
  logger.info(`🚀 KrishiFlow Production Backend Core running on http://localhost:${PORT}`);

  // Resilience "black box": recover the journal write head, then make sure
  // there is a fresh snapshot and keep taking them every 15 minutes.
  // connectDB() runs unawaited above, so give Mongo a few seconds to land
  // before the first snapshot (which needs a live connection).
  try {
    await journal.init();
    for (let i = 0; i < 15 && !getIsConnected(); i += 1) {
      await new Promise((r) => setTimeout(r, 1000));
    }
    await snapshot.ensureFresh();
    setInterval(() => { snapshot.take('scheduled').catch(() => {}); }, 15 * 60 * 1000).unref();
  } catch (err) {
    logger.warn(`Startup resilience init notice: ${err.message}`);
  }

  // Index RAG Knowledge Base on startup
  try {
    await indexer.indexKnowledgeBase();
  } catch (err) {
    logger.warn(`Startup Knowledge Base indexing notice: ${err.message}`);
  }
}); 
