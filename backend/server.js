const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST"],
        credentials: true
    },
    // EXTENDED TIMEOUTS - NO AUTO DISCONNECT
    pingTimeout: 60000,        // 60 seconds
    pingInterval: 30000,       // 30 seconds
    // NO connection state recovery (it can cause issues)
    connectionStateRecovery: false,
    // BETTER TRANSPORT HANDLING
    transports: ['websocket', 'polling'],
    allowUpgrades: true,
    // DISABLE COMPRESSION for better stability
    perMessageDeflate: false,
    httpCompression: false,
    // VERY LONG CONNECTION TIMEOUTS
    connectTimeout: 60000,
    upgradeTimeout: 30000,
    // ADDITIONAL STABILITY OPTIONS
    allowEIO3: true,
    cookie: false,
});

// 30 Minutes Cooldown
const COOLDOWN_TIME = 30 * 60 * 1000; 

const waitingQueue = []; 
const chatHistory = new Map();
const userSessions = new Map();

// DISABLED: Cleanup function to remove expired cooldown records
// const cleanupExpiredRecords = () => {
//     const now = Date.now();
//     for (const [fingerprint, historySet] of chatHistory.entries()) {
//         const validRecords = [...historySet].filter(record => record.expiry > now);
//         if (validRecords.length === 0) {
//             chatHistory.delete(fingerprint);
//         } else {
//             chatHistory.set(fingerprint, new Set(validRecords));
//         }
//     }
// };

// DISABLED: No automatic cleanup
// setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

// DISABLED: No dead session cleanup
// const cleanupDeadSessions = () => {
//     const now = Date.now();
//     let cleaned = 0;
//     
//     for (const [fingerprint, session] of userSessions.entries()) {
//         // NO cleanup - sessions stay forever
//     }
// };

// DISABLED: No interval cleanup
// setInterval(cleanupDeadSessions, 30000);

io.on('connection', (socket) => {
    const clientIp = socket.handshake.address;
    const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
    const deviceId = socket.handshake.auth?.fingerprint || socket.handshake.query?.fingerprint || 'unknown';
    
    console.log(`[CONN] New connection: ${socket.id} | Device: ${deviceId} | IP: ${clientIp}`);
    
    // NO heartbeat monitoring - keep connection alive forever
    // let isAlive = true;
    // let missedPings = 0;
    // const maxMissedPings = 3;
    
    // DISABLED: No heartbeat interval
    // const heartbeatInterval = setInterval(() => {
    //     // NO automatic disconnection
    // }, 10000);
    
    // Listen for pong response (but don't disconnect on failure)
    socket.conn.on("pong", () => {
        console.log(`[PONG] ${deviceId} responded to ping`);
        // Don't track missed pings
    });
    
    // Handle disconnection ONLY when client disconnects
    socket.on('disconnect', (reason) => {
        console.log(`[DISCONNECT] ${deviceId} (${socket.id}) manually disconnected. Reason: ${reason}`);
        
        // Clear any intervals (none active now)
        // if (heartbeatInterval) clearInterval(heartbeatInterval);
        
        // Find user by socket ID
        for (const [fingerprint, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                console.log(`[DISCONNECT] Removing user ${fingerprint} (manual disconnect)`);
                
                // If user was in a chat room, notify partner
                if (session.room && session.partnerFingerprint) {
                    const partnerSession = userSessions.get(session.partnerFingerprint);
                    if (partnerSession && partnerSession.socketId) {
                        console.log(`[DISCONNECT] Notifying partner ${session.partnerFingerprint} about manual disconnect`);
                        io.to(partnerSession.socketId).emit('partner_disconnected');
                        
                        // Clean up partner's room info (partner stays connected though)
                        partnerSession.room = null;
                        partnerSession.partnerFingerprint = null;
                    }
                }
                
                // Remove user from waiting queue if they were there
                const queueIndex = waitingQueue.findIndex(u => u.fingerprint === fingerprint);
                if (queueIndex !== -1) {
                    waitingQueue.splice(queueIndex, 1);
                    console.log(`[DISCONNECT] Removed ${fingerprint} from waiting queue`);
                }
                
                // Remove the session (ONLY on manual disconnect)
                userSessions.delete(fingerprint);
                break;
            }
        }
    });

    // Handle errors (don't disconnect on error)
    socket.on('error', (error) => {
        console.log(`[ERROR] ${deviceId}:`, error.message);
        // NO auto-disconnect on error
    });

    socket.on('find_partner', ({ fingerprint, userData }) => {
        if (!fingerprint) return console.log("[ERR] No fingerprint received");

        const { gender, partnerGender, showGender, username } = userData || {};
        console.log(`[DEBUG] ${fingerprint} (${gender || 'anonymous'}) looking for ${partnerGender || 'any'}`);

        // Update or create user session (NO expiry)
        const now = Date.now();
        const userSession = {
            socketId: socket.id,
            lastActive: now,
            room: null,
            partnerFingerprint: null,
            userData: { gender, partnerGender, showGender, username },
            deviceId: deviceId,
            connectedAt: now // Track when they connected
        };
        userSessions.set(fingerprint, userSession);

        // If user is already in a room, leave it first
        if (userSession.room) {
            console.log(`[WARN] ${fingerprint} already in room ${userSession.room}. Leaving first.`);
            
            // Notify partner if exists
            if (userSession.partnerFingerprint) {
                const partnerSession = userSessions.get(userSession.partnerFingerprint);
                if (partnerSession && partnerSession.socketId) {
                    io.to(partnerSession.socketId).emit('partner_disconnected');
                    
                    // Clean partner's session (but keep them connected)
                    partnerSession.room = null;
                    partnerSession.partnerFingerprint = null;
                }
            }
            
            userSession.room = null;
            userSession.partnerFingerprint = null;
        }

        // Remove from queue if already there
        const existingIdx = waitingQueue.findIndex(u => u.fingerprint === fingerprint);
        if (existingIdx !== -1) {
            waitingQueue.splice(existingIdx, 1);
            console.log(`[QUEUE] Removed duplicate ${fingerprint} from queue`);
        }

        // Find a matching partner
        const partnerIndex = waitingQueue.findIndex(potentialPartner => {
            if (potentialPartner.fingerprint === fingerprint) return false;
            
            // If current user specified gender preference
            if (partnerGender && partnerGender !== 'any') {
                if (partnerGender !== potentialPartner.gender) return false;
            }
            
            // If partner specified gender preference
            if (potentialPartner.partnerGender && potentialPartner.partnerGender !== 'any') {
                if (potentialPartner.partnerGender !== gender) return false;
            }

            // Check 30-minute cooldown
            const myHistory = chatHistory.get(fingerprint);
            if (myHistory) {
                const blocked = [...myHistory].find(h => h.id === potentialPartner.fingerprint && now < h.expiry);
                if (blocked) {
                    console.log(`[DEBUG] Blocked reconnect between ${fingerprint} and ${blocked.id} (cooldown active)`);
                    return false;
                }
            }
            return true;
        });

        if (partnerIndex !== -1) {
            const partner = waitingQueue.splice(partnerIndex, 1)[0];
            const roomName = `room_${Date.now()}_${fingerprint}_${partner.fingerprint}`;

            // Set 30 min cooldown
            const expiry = now + COOLDOWN_TIME;
            const recordMatch = (u1, u2) => {
                if (!chatHistory.has(u1)) chatHistory.set(u1, new Set());
                chatHistory.get(u1).add({ id: u2, expiry });
            };
            recordMatch(fingerprint, partner.fingerprint);
            recordMatch(partner.fingerprint, fingerprint);

            // Join room
            socket.join(roomName);
            partner.socket.join(roomName);

            // Update user sessions with room info
            userSession.room = roomName;
            userSession.partnerFingerprint = partner.fingerprint;
            userSession.lastActive = now;
            
            const partnerSession = userSessions.get(partner.fingerprint) || {
                socketId: partner.socket.id,
                lastActive: now,
                room: null,
                partnerFingerprint: null,
                userData: { 
                    gender: partner.gender, 
                    partnerGender: partner.partnerGender, 
                    showGender: partner.showGender, 
                    username: partner.username 
                },
                deviceId: partner.deviceId || 'unknown',
                connectedAt: partner.connectedAt || now
            };
            partnerSession.room = roomName;
            partnerSession.partnerFingerprint = fingerprint;
            partnerSession.lastActive = now;
            userSessions.set(partner.fingerprint, partnerSession);

            console.log(`[MATCH] ${fingerprint} (${gender || 'anonymous'}) <-> ${partner.fingerprint} (${partner.gender || 'anonymous'}) in room ${roomName}`);
            
            // Send partner info to both users
            socket.emit('partner_found', { 
                room: roomName,
                partnerInfo: {
                    gender: partner.showGender ? partner.gender : null,
                    username: partner.username || 'Stranger',
                    showGender: partner.showGender
                }
            });
            
            partner.socket.emit('partner_found', { 
                room: roomName,
                partnerInfo: {
                    gender: showGender ? gender : null,
                    username: username || 'Stranger',
                    showGender: showGender
                }
            });
        } else {
            waitingQueue.push({ 
                socket, 
                fingerprint, 
                gender, 
                partnerGender, 
                showGender, 
                username,
                deviceId: deviceId,
                joinedAt: now
            });
            console.log(`[QUEUE] Added ${fingerprint} to queue. Size: ${waitingQueue.length}`);
            socket.emit('waiting', 'Searching for partner...');
        }
    });

    socket.on('cancel_search', ({ fingerprint }) => {
        console.log(`[CANCEL] ${fingerprint} cancelled search`);
        
        // Remove user from waiting queue
        const index = waitingQueue.findIndex(u => u.fingerprint === fingerprint);
        if (index !== -1) {
            waitingQueue.splice(index, 1);
            console.log(`[QUEUE] Removed ${fingerprint}. Queue size: ${waitingQueue.length}`);
        }
        
        // Keep session alive, just update last active
        if (userSessions.has(fingerprint)) {
            userSessions.get(fingerprint).lastActive = Date.now();
        }
    });

    socket.on('send_message', ({ room, message }) => {
        socket.to(room).emit('receive_message', message);
        console.log(`[MSG] ${socket.id} -> ${room}: ${message.substring(0, 50)}...`);
        
        // Update last active time (but don't cleanup based on this)
        for (const [fingerprint, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                session.lastActive = Date.now();
                break;
            }
        }
    });

    socket.on('typing', ({ room, isTyping }) => {
        socket.to(room).emit('partner_typing', isTyping);
        console.log(`[TYPING] ${socket.id} in ${room}: ${isTyping ? 'typing...' : 'stopped'}`);
        
        // Update last active time (but don't cleanup based on this)
        for (const [fingerprint, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                session.lastActive = Date.now();
                break;
            }
        }
    });

    socket.on('leave_chat', ({ room, fingerprint }) => {
        console.log(`[LEAVE] ${fingerprint} manually leaving room ${room}`);
        
        if (room && fingerprint) {
            // Update user's session
            const userSession = userSessions.get(fingerprint);
            if (userSession) {
                // Notify partner if exists
                if (userSession.partnerFingerprint) {
                    const partnerSession = userSessions.get(userSession.partnerFingerprint);
                    if (partnerSession && partnerSession.socketId) {
                        console.log(`[LEAVE] Notifying partner ${userSession.partnerFingerprint} about manual leave`);
                        io.to(partnerSession.socketId).emit('partner_disconnected');
                        
                        // Clean partner's session (but keep connected)
                        partnerSession.room = null;
                        partnerSession.partnerFingerprint = null;
                    }
                }
                
                // Clean user's session (but keep connected)
                userSession.room = null;
                userSession.partnerFingerprint = null;
                userSession.lastActive = Date.now();
            }
            
            // Leave the room
            socket.leave(room);
        }
    });

    // Optional: Heartbeat for monitoring only (NO DISCONNECT)
    socket.on('heartbeat', ({ fingerprint }) => {
        if (fingerprint && userSessions.has(fingerprint)) {
            userSessions.get(fingerprint).lastActive = Date.now();
            console.log(`[HEARTBEAT] ${fingerprint} still alive`);
        }
    });
});

// Debug endpoint to see ALL connections (including "dead" ones)
app.get('/debug/connections', (req, res) => {
    const activeSockets = [];
    
    io.of("/").sockets.forEach((socket) => {
        activeSockets.push({
            id: socket.id,
            connected: socket.connected,
            deviceId: socket.handshake.auth?.fingerprint || socket.handshake.query?.fingerprint,
            handshake: {
                address: socket.handshake.address,
                time: new Date(socket.handshake.time).toISOString(),
                userAgent: socket.handshake.headers['user-agent']
            },
            rooms: Array.from(socket.rooms),
            connectedFor: Date.now() - socket.handshake.time
        });
    });
    
    res.json({
        serverTime: new Date().toISOString(),
        totalConnections: activeSockets.length,
        connections: activeSockets,
        waitingQueue: waitingQueue.map(u => ({
            fingerprint: u.fingerprint,
            deviceId: u.deviceId,
            gender: u.gender,
            inQueueSince: Date.now() - (u.joinedAt || Date.now()),
            waitingTime: Math.floor((Date.now() - (u.joinedAt || Date.now())) / 1000) + 's'
        })),
        userSessions: Array.from(userSessions.entries()).map(([fp, session]) => ({
            fingerprint: fp,
            deviceId: session.deviceId,
            socketId: session.socketId,
            lastActive: session.lastActive ? Math.floor((Date.now() - session.lastActive) / 1000) + 's ago' : 'never',
            connectedFor: Math.floor((Date.now() - (session.connectedAt || Date.now())) / 1000) + 's',
            room: session.room,
            partner: session.partnerFingerprint,
            status: session.room ? 'In Chat' : session.connectedAt ? 'Connected' : 'Unknown'
        }))
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'UP',
        timestamp: new Date().toISOString(),
        connections: io.engine.clientsCount,
        waitingQueue: waitingQueue.length,
        userSessions: userSessions.size
    });
});

// Handle process termination
process.on('SIGTERM', () => {
    console.log('[SHUTDOWN] Server shutting down...');
    
    // Notify all connected users
    for (const [fingerprint, session] of userSessions.entries()) {
        if (session.socketId) {
            io.to(session.socketId).emit('server_shutdown');
        }
    }
    
    server.close(() => {
        console.log('[SHUTDOWN] Server closed');
        process.exit(0);
    });
});

server.listen(3001, () => {
    console.log("🚀 Server active on port 3001");
    console.log("📊 Debug endpoint: http://localhost:3001/debug/connections");
    console.log("❤️  Health check: http://localhost:3001/health");
    console.log("⚠️  NO AUTO-DISCONNECT MODE: Sessions stay until manual disconnect");
});