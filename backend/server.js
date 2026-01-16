const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    cors: { 
        origin: "*",
        methods: ["GET", "POST"]
    },
    pingTimeout: 10000, // 10 seconds
    pingInterval: 5000, // 5 seconds
    connectionStateRecovery: {
        maxDisconnectionDuration: 2000, // Only 2 seconds for recovery
        skipMiddlewares: true,
    }
});

// 30 Minutes Cooldown
const COOLDOWN_TIME = 30 * 60 * 1000; 

const waitingQueue = []; 
const chatHistory = new Map(); // fingerprint -> Set of { id, expiry }
const userSessions = new Map(); // fingerprint -> { socketId, lastActive, room, partnerFingerprint }

// Cleanup function to remove expired cooldown records
const cleanupExpiredRecords = () => {
    const now = Date.now();
    for (const [fingerprint, historySet] of chatHistory.entries()) {
        const validRecords = [...historySet].filter(record => record.expiry > now);
        if (validRecords.length === 0) {
            chatHistory.delete(fingerprint);
        } else {
            chatHistory.set(fingerprint, new Set(validRecords));
        }
    }
};

// Run cleanup every 5 minutes
setInterval(cleanupExpiredRecords, 5 * 60 * 1000);

// Clean up dead user sessions
const cleanupDeadSessions = () => {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [fingerprint, session] of userSessions.entries()) {
        // If session hasn't been active for 30 seconds, clean it up
        if (now - session.lastActive > 30000) {
            console.log(`[CLEANUP] Removing dead session for ${fingerprint}`);
            
            // If user was in a room, notify partner
            if (session.room && session.partnerFingerprint) {
                const partnerSession = userSessions.get(session.partnerFingerprint);
                if (partnerSession && partnerSession.socketId) {
                    io.to(partnerSession.socketId).emit('partner_disconnected');
                    console.log(`[CLEANUP] Notified partner ${session.partnerFingerprint}`);
                    
                    // Clean up partner's session
                    userSessions.delete(session.partnerFingerprint);
                }
            }
            
            userSessions.delete(fingerprint);
            cleaned++;
        }
    }
    
    if (cleaned > 0) {
        console.log(`[CLEANUP] Removed ${cleaned} dead sessions`);
    }
};

setInterval(cleanupDeadSessions, 15000); // Every 15 seconds

io.on('connection', (socket) => {
    console.log(`[CONN] New socket connected: ${socket.id}`);

    // Handle disconnection immediately
    socket.on('disconnect', (reason) => {
        console.log(`[DISCONNECT] ${socket.id} disconnected. Reason: ${reason}`);
        
        // Find user by socket ID
        for (const [fingerprint, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                console.log(`[DISCONNECT] Found user ${fingerprint} with socket ${socket.id}`);
                
                // If user was in a chat room, notify partner
                if (session.room && session.partnerFingerprint) {
                    const partnerSession = userSessions.get(session.partnerFingerprint);
                    if (partnerSession && partnerSession.socketId) {
                        console.log(`[DISCONNECT] Notifying partner ${session.partnerFingerprint}`);
                        io.to(partnerSession.socketId).emit('partner_disconnected');
                        
                        // Clean up partner's room info
                        partnerSession.room = null;
                        partnerSession.partnerFingerprint = null;
                        partnerSession.lastActive = Date.now();
                    }
                }
                
                // Remove user from waiting queue if they were there
                const queueIndex = waitingQueue.findIndex(u => u.fingerprint === fingerprint);
                if (queueIndex !== -1) {
                    waitingQueue.splice(queueIndex, 1);
                    console.log(`[DISCONNECT] Removed ${fingerprint} from waiting queue`);
                }
                
                // Remove the session
                userSessions.delete(fingerprint);
                break;
            }
        }
    });

    socket.on('find_partner', ({ fingerprint, userData }) => {
        if (!fingerprint) return console.log("[ERR] No fingerprint received");

        const { gender, partnerGender, showGender, username } = userData || {};
        console.log(`[DEBUG] ${fingerprint} (${gender || 'anonymous'}) looking for ${partnerGender || 'any'}`);

        // Update or create user session
        const now = Date.now();
        const userSession = {
            socketId: socket.id,
            lastActive: now,
            room: null,
            partnerFingerprint: null,
            userData: { gender, partnerGender, showGender, username }
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
                    
                    // Clean partner's session
                    partnerSession.room = null;
                    partnerSession.partnerFingerprint = null;
                    partnerSession.lastActive = now;
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
                }
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
                username 
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
        
        // Update last active but keep session
        if (userSessions.has(fingerprint)) {
            userSessions.get(fingerprint).lastActive = Date.now();
        }
    });

    socket.on('send_message', ({ room, message }) => {
        socket.to(room).emit('receive_message', message);
        console.log(`[MSG] ${socket.id} -> ${room}: ${message.substring(0, 50)}...`);
        
        // Update last active time
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
        
        // Update last active time
        for (const [fingerprint, session] of userSessions.entries()) {
            if (session.socketId === socket.id) {
                session.lastActive = Date.now();
                break;
            }
        }
    });

    socket.on('leave_chat', ({ room, fingerprint }) => {
        console.log(`[LEAVE] ${fingerprint} leaving room ${room}`);
        
        if (room && fingerprint) {
            // Update user's session
            const userSession = userSessions.get(fingerprint);
            if (userSession) {
                // Notify partner if exists
                if (userSession.partnerFingerprint) {
                    const partnerSession = userSessions.get(userSession.partnerFingerprint);
                    if (partnerSession && partnerSession.socketId) {
                        console.log(`[LEAVE] Notifying partner ${userSession.partnerFingerprint}`);
                        io.to(partnerSession.socketId).emit('partner_disconnected');
                        
                        // Clean partner's session
                        partnerSession.room = null;
                        partnerSession.partnerFingerprint = null;
                        partnerSession.lastActive = Date.now();
                    }
                }
                
                // Clean user's session
                userSession.room = null;
                userSession.partnerFingerprint = null;
                userSession.lastActive = Date.now();
            }
            
            // Leave the room
            socket.leave(room);
        }
    });

    // Heartbeat to keep sessions alive
    socket.on('heartbeat', ({ fingerprint }) => {
        if (fingerprint && userSessions.has(fingerprint)) {
            userSessions.get(fingerprint).lastActive = Date.now();
        }
    });

    // Handle errors
    socket.on('error', (error) => {
        console.log(`[ERROR] ${socket.id}:`, error);
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

server.listen(3001, () => console.log("🚀 Server active on port 3001"));