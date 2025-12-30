const Property = require('../models/property');
const PropertyBid = require('../models/propertyBid');
const Payment = require('../models/payment');
const mongoose = require('mongoose');
const ChatService = require('../services/chat/chatService');
const ChatThread = require('../models/chatThread');

const LAST_MINUTE_WINDOW = 2 * 60 * 1000;
const EXTENSION_TIME = 2 * 60 * 1000;

const lastBidMap = new Map();

module.exports = (io, socket) => {
  
  const isAuthenticated = !!socket.user;
  const userId = socket.user?._id?.toString();

  console.log(
    `🔌 Socket connected: ${socket.user?.name || 'Guest'} (${socket.id})`
  );

  
  socket.on('join', () => {
    if (!isAuthenticated) return;
    socket.join(userId);
    console.log(`✅ User ${userId} joined personal room`);
  });

  
  socket.on('join_auction', ({ propertyId }, cb) => {
    if (!mongoose.Types.ObjectId.isValid(propertyId)) return;

    const room = `auction_${propertyId}`;
    socket.join(room);

    console.log(`🏠 ${socket.user.name} joined ${room}`);

    
    cb?.({ success: true, room });

   
    socket.emit('auction_joined', { room });
  });
  socket.on('place_bid', async ({ propertyId, amount }) => {
    try {
     
      if (!isAuthenticated) {
        return socket.emit('bid_error', { message: 'Authentication required' });
      }

      if (!mongoose.Types.ObjectId.isValid(propertyId)) {
        return socket.emit('bid_error', { message: 'Invalid auction' });
      }

      const now = Date.now();
      const last = lastBidMap.get(socket.id) || 0;
      if (now - last < 500) return;
      lastBidMap.set(socket.id, now);

      const property = await Property.findById(propertyId);
      if (!property || !property.isAuction) {
        return socket.emit('bid_error', {
          message: 'Invalid auction property',
        });
      }

      if (new Date() > property.auctionEndsAt) {
        return socket.emit('bid_error', { message: 'Auction ended' });
      }

      // Seller cannot bid
      if (property.sellerId.toString() === userId) {
        return socket.emit('bid_error', { message: 'Seller cannot bid' });
      }

      // Participation fee check
      const payment = await Payment.findOne({
        userId,
        contextId: propertyId,
        contextType: 'property',
        type: 'participation_fee',
        status: 'success',
      });

      if (!payment) {
        return socket.emit('bid_error', {
          message: 'Pay participation fee first',
        });
      }

      // Bid validation
      const current = property.currentHighestBid || 0;
      const min = current === 0 ? property.basePrice + 1 : current + 1;
      const max = current === 0 ? null : current + property.auctionStep;

      if (amount < min || (max && amount > max)) {
        return socket.emit('bid_error', {
          message: `Bid must be between ₹${min} and ₹${max}`,
        });
      }

      // Save bid
      await PropertyBid.findOneAndUpdate(
        { propertyId, bidderId: userId },
        {
          propertyId,
          bidderId: userId,
          amount,
          escrowPaymentId: payment._id,
          isAutoBid: false,
          bidStatus: 'active',
        },
        { upsert: true }
      );

      property.currentHighestBid = amount;
      property.currentHighestBidder = userId;

      // Extend auction if needed
      const timeLeft = property.auctionEndsAt - Date.now();
      let extended = false;

      if (timeLeft <= LAST_MINUTE_WINDOW) {
        property.auctionEndsAt = new Date(
          property.auctionEndsAt.getTime() + EXTENSION_TIME
        );
        extended = true;
      }

      await property.save();

      // Broadcast new bid to all in auction room
      io.to(`auction_${propertyId}`).emit('new_bid', {
        amount,
        bidderId: userId,
        bidderName: socket.user.name,
        time: new Date(),
      });

      console.log(
        `✅ Bid placed: ₹${amount} by ${socket.user.name} on property ${propertyId}`
      );

      // Broadcast auction extension if applicable
      if (extended) {
        io.to(`auction_${propertyId}`).emit('auction_extended', {
          newEndTime: property.auctionEndsAt,
          extendedBy: EXTENSION_TIME / 60000,
        });
        console.log(
          `⏰ Auction ${propertyId} extended by ${EXTENSION_TIME / 60000} minutes`
        );
      }
    } catch (err) {
      console.error('❌ Socket bid error:', err);
      socket.emit('bid_error', { message: 'Bid failed' });
    }
  });

  //  CHAT SOCKET HANDLERS 

  socket.on('joinUser', (userIdParam) => {
    if (!isAuthenticated) return;

    const roomUserId = userIdParam || userId;
    socket.join(`user_${roomUserId}`);
    console.log(`✅ User ${roomUserId} joined their personal room for chat`);
  });

  
  socket.on('join_chat', async (threadId) => {
    try {
      if (!isAuthenticated) return;
      if (!threadId) return;

      socket.join(threadId.toString());
      console.log(`💬 User ${userId} joined chat thread ${threadId}`);

     
      const lastMsg = await ChatService.markThreadRead(threadId, userId);

      io.to(threadId.toString()).emit('messages_seen', {
        threadId: threadId.toString(),
        seenBy: userId,
        lastMessageId: lastMsg?._id?.toString() || null,
      });

      io.to(`user_${userId}`).emit('updateChatBadge');
    } catch (e) {
      console.error('❌ join_chat error:', e);
    }
  });

  socket.on('send_message', async (data) => {
    try {
      if (!isAuthenticated) return;
      if (!data?.threadId || !data?.message) return;

      // Save message to database
      const doc = await ChatService.send({
        threadId: data.threadId,
        senderId: userId,
        message: data.message,
      });

      // Get thread info to find receiver
      const thread = await ChatThread.findById(data.threadId).lean();
      const receiverId = thread.participants
        .map(String)
        .find((id) => id !== userId);

      // Prepare message object
      const msg = {
        _id: doc._id.toString(),
        threadId: doc.threadId.toString(),
        senderId: userId,
        message: doc.message,
        fileUrl: doc.fileUrl,
        fileName: doc.fileName,
        fileType: doc.fileType,
        createdAt: doc.createdAt,
        deliveredTo: doc.deliveredTo?.map(String) || [],
        readBy: doc.readBy?.map(String) || [],
      };

      // Emit new message to all participants in the thread
      io.to(data.threadId.toString()).emit('new_message', msg);

      // Notify receiver
      if (receiverId) {
        console.log(`📨 Sending message notification to user ${receiverId}`);

        // Update receiver's inbox list
        io.to(`user_${receiverId}`).emit('inbox_message', {
          threadId: doc.threadId.toString(),
          fromUserId: userId,
          preview: doc.message || doc.fileName || 'Attachment',
          createdAt: doc.createdAt,
        });

        // Update receiver's chat badge
        io.to(`user_${receiverId}`).emit('updateChatBadge');
      }

      console.log(`✅ Message sent successfully in thread ${data.threadId}`);
    } catch (err) {
      console.error('❌ send_message error:', err);
      socket.emit('message_error', { message: 'Failed to send message' });
    }
  });

  // Mark messages as delivered
  socket.on('mark_delivered', async ({ threadId }) => {
    try {
      if (!isAuthenticated) return;
      if (!threadId) return;

      await ChatService.markThreadDelivered(threadId, userId);

      io.to(threadId.toString()).emit('messages_delivered', {
        threadId: threadId.toString(),
        deliveredBy: userId,
      });

      console.log(`✅ Messages delivered in thread ${threadId}`);
    } catch (e) {
      console.error('❌ mark_delivered error:', e);
    }
  });

  // Mark messages as read
  socket.on('mark_read', async ({ threadId }) => {
    try {
      if (!isAuthenticated) return;
      if (!threadId) return;

      const lastMsg = await ChatService.markThreadRead(threadId, userId);

      // Notify all participants
      io.to(threadId.toString()).emit('messages_seen', {
        threadId: threadId.toString(),
        seenBy: userId,
        lastMessageId: lastMsg?._id?.toString() || null,
      });

      // Update badge for the user who read the messages
      io.to(`user_${userId}`).emit('updateChatBadge');

      console.log(`✅ Messages marked as read in thread ${threadId}`);
    } catch (e) {
      console.error('❌ mark_read error:', e);
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(
      `❌ Socket disconnected: ${socket.user?.name || 'Guest'} (${socket.id})`
    );

    // Clean up bid rate limiting
    lastBidMap.delete(socket.id);
  });
};
