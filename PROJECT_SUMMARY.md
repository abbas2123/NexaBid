# NexaBid - Project Summary

## 📋 Project Overview

**NexaBid** is a comprehensive online bidding and procurement platform that combines **property auctions** and **tender management** systems. It facilitates real-time property auctions, government/publisher tenders, vendor management, and payment processing.

---

## 🏗️ Architecture & Technology Stack

### Backend Framework
- **Node.js** with **Express.js 5.1.0** (Server-side framework)
- **MongoDB** with **Mongoose 9.0.0** (Database)
- **Socket.io 4.8.1** (Real-time communication)
- **EJS 3.1.10** (View template engine)

### Key Technologies
- **Authentication**: JWT (jsonwebtoken), Passport.js, Google OAuth 2.0
- **Payment Gateway**: Razorpay integration
- **File Processing**: Multer, PDFKit (PDF generation)
- **AI/ML**: Google Cloud Vision API, Tesseract.js (OCR for document scanning)
- **Email**: Nodemailer
- **Real-time**: Socket.io for live auctions and notifications
- **Validation**: Zod schema validation
- **Security**: bcrypt (password hashing), rate limiting, session management

---

## 📊 Project Statistics

- **Total JavaScript Files**: 133 files
- **Total Lines of Code**: ~10,912 lines
- **View Templates (EJS)**: 69 files
- **Database Models**: 24 models
- **Controllers**: 24 controllers
- **Services**: 23 service files
- **Routes**: 24 route files
- **Middlewares**: 16 middleware files
- **Utility Functions**: 7 utility modules

---

## 🎯 Core Features

### 1. **User Management & Authentication**
- Multi-role system (User, Vendor, Admin)
- Email/Password authentication
- Google OAuth 2.0 integration
- OTP verification system
- Password reset functionality
- JWT-based session management
- User blocking/unblocking (Admin)

### 2. **Property Auction System** ⭐
- Real-time live property auctions using Socket.io
- Automatic auction extension (last-minute bidding)
- Property listing and management
- Bid placement with escrow payment
- Property verification workflow (Admin approval)
- Auction result pages (winner/loser views)
- Publisher/seller dashboard for auction management
- Auto-bid functionality

### 3. **Tender Management System** ⭐
- Tender creation and publishing
- Vendor application for tenders
- Technical and Financial bid submission
- Bid evaluation workflow
- Tender status management (Draft → Submitted → Published → Awarded → Closed)
- Post-award management (PO, Agreement, Work Order)
- Contract management

### 4. **Vendor Management**
- Vendor application system with document upload
- OCR-based document scanning (Google Vision API, Tesseract)
- Fraud detection system
- Vendor approval/rejection workflow
- Vendor profile management
- Vendor participation tracking

### 5. **Payment System**
- Razorpay payment gateway integration
- Wallet system (add funds, transactions)
- Escrow payment for auctions
- Participation fees for tenders/properties
- Coupon/discount code system
- Transaction history

### 6. **Admin Dashboard**
- User management (block/unblock users)
- Property management (approve/reject properties)
- Tender management (approve/reject/update status)
- Vendor management (approve/reject vendor applications)
- Contract management
- Coupon management
- Dashboard statistics (users, properties, tenders, vendors)
- Recent activities and pending tasks

### 7. **Real-time Features**
- Live auction bidding (Socket.io)
- Real-time notifications
- Chat system between users
- Live bid updates
- Auction status updates

### 8. **Communication & Notifications**
- In-app notification system
- Email notifications (Nodemailer)
- Real-time Socket.io notifications
- Chat/messaging system

### 9. **Document Management**
- File upload system (Multer)
- PDF generation (PDFKit for PO, Work Orders)
- Document storage and retrieval
- Agreement management
- Work Order generation

### 10. **Additional Features**
- Search functionality
- Wallet system with transaction history
- Profile management
- Property status tracking
- Tender participation tracking
- Cron jobs for auction updates (every 30 seconds)
- Rate limiting for API protection
- Error handling and validation

---

## 📁 Project Structure

```
NexaBid/
├── config/              # Configuration files (DB, Passport, Multer)
├── controllers/         # Request handlers (24 files)
│   ├── admin/          # Admin controllers
│   ├── auction/        # Auction controllers
│   ├── chat/           # Chat controllers
│   ├── payment/        # Payment controllers
│   ├── user/           # User controllers
│   └── vendor/         # Vendor controllers
├── services/           # Business logic (23 files)
│   ├── admin/         # Admin services
│   ├── auction/       # Auction services
│   ├── chat/          # Chat services
│   ├── payment/       # Payment services
│   ├── profile/       # Profile services
│   ├── property/      # Property services
│   ├── tender/        # Tender services
│   ├── user/          # User services
│   └── vendor/        # Vendor services
├── models/             # Database models (24 models)
├── routes/             # Route definitions (24 files)
├── middlewares/        # Custom middlewares (16 files)
├── views/              # EJS templates (69 files)
├── utils/              # Utility functions (7 files)
│   ├── constants.js   # Centralized constants (ERROR_MESSAGES, SUCCESS_MESSAGES)
│   ├── statusCode.js  # HTTP status codes
│   ├── email.js       # Email utilities
│   ├── ocr.js         # OCR utilities
│   ├── fraudFlag.js   # Fraud detection
│   └── ...
├── scoket/             # Socket.io handlers
├── validators/         # Zod validation schemas
├── cron/               # Cron job tasks
├── public/             # Static assets
├── uploads/            # Uploaded files
└── scripts/            # Utility scripts
```

---

## 🔐 User Roles & Permissions

### 1. **User** (Default Role)
- Register and login
- Browse properties and tenders
- Participate in property auctions
- View tender details
- Manage profile
- Wallet management
- View participation history

### 2. **Vendor**
- All user permissions
- Create and publish tenders
- Submit bids on tenders
- Upload documents (technical/financial)
- Vendor application management
- Post-award management (PO, Agreement, Work Order)

### 3. **Admin**
- Full system access
- User management (block/unblock)
- Property approval/rejection
- Tender approval/rejection
- Vendor approval/rejection
- Contract management
- Coupon management
- Dashboard analytics

---

## 🗄️ Database Models (24 Models)

1. **User** - User accounts and authentication
2. **Property** - Property listings and auctions
3. **PropertyBid** - Auction bids
4. **PropertyParticipant** - Property participants
5. **Tender** - Tender documents
6. **TenderBid** - Vendor bids on tenders
7. **TenderParticipants** - Tender participants
8. **VendorApplication** - Vendor applications
9. **Payment** - Payment records
10. **Wallet** - User wallets
11. **WalletTransaction** - Wallet transactions
12. **PurchaseOrder (PO)** - Purchase orders
13. **Agreement** - Contracts and agreements
14. **WorkOrder** - Work orders
15. **File** - File storage references
16. **Notification** - Notifications
17. **ChatThread** - Chat conversations
18. **ChatMessage** - Chat messages
19. **Otp** - OTP verification
20. **Coupon** - Discount coupons
21. **CouponRedemption** - Coupon usage
22. **OCR_Result** - OCR scan results
23. **FraudFlag** - Fraud detection flags
24. **VenderProfile** - Vendor profiles

---

## 🔄 Key Workflows

### Property Auction Workflow
1. Seller creates property listing
2. Admin reviews and approves property
3. Property published with auction dates
4. Buyers browse and join auction
5. Real-time bidding during auction
6. Automatic extension if bids in last 2 minutes
7. Auction ends, winner determined
8. Payment processing (escrow)
9. Property transferred to winner

### Tender Workflow
1. Vendor creates tender
2. Admin reviews and publishes tender
3. Vendors apply and submit technical bids
4. Publisher evaluates technical bids
5. Approved vendors submit financial bids
6. Publisher selects winner
7. Purchase Order (PO) generated
8. Agreement signing process
9. Work Order issuance
10. Contract completion

### Vendor Application Workflow
1. User applies to become vendor
2. Uploads business documents
3. OCR scans documents for data extraction
4. Fraud detection analysis
5. Admin reviews application
6. Admin approves/rejects vendor
7. User role updated to vendor

---

## 🔧 Key Utilities & Constants

### Status Codes (utils/statusCode.js)
- Standardized HTTP status codes (OK, CREATED, BAD_REQUEST, UNAUTHORIZED, FORBIDDEN, NOT_FOUND, CONFLICT, INTERNAL_ERROR)

### Constants (utils/constants.js)
- **118 ERROR_MESSAGES** - Centralized error messages
- **33 SUCCESS_MESSAGES** - Centralized success messages
- VIEWS, LAYOUTS, REDIRECTS, ROUTES constants
- Payment statuses, auction statuses, tender statuses
- Notification messages, coupon messages, validation messages

### All messages and status codes are centralized and properly organized!

---

## 🚀 Server Features

- **Real-time Communication**: Socket.io for live auctions and notifications
- **Cron Jobs**: Automatic auction status updates (every 30 seconds)
- **Session Management**: Express sessions with JWT tokens
- **Rate Limiting**: API protection
- **File Upload**: Multer for handling file uploads
- **Email Service**: Nodemailer for notifications
- **PDF Generation**: PDFKit for generating PO and Work Orders
- **Error Handling**: Centralized error handling middleware
- **Security**: bcrypt, JWT, rate limiting, input validation

---

## 📱 Views & Frontend

- **69 EJS Template Files**
- Responsive layouts (User Layout, Admin Layout)
- Real-time updates using Socket.io client
- SweetAlert2 for user-friendly notifications
- Modern UI with Tailwind CSS (implied from class names)

---

## 🔒 Security Features

- Password hashing (bcrypt)
- JWT authentication
- Session management
- Rate limiting
- Input validation (Zod)
- File upload restrictions
- Role-based access control
- CORS configuration
- Error handling

---

## 📈 Current Status

✅ **Completed Features:**
- Full authentication system
- Property auction system with real-time bidding
- Tender management system
- Vendor management system
- Payment integration (Razorpay)
- Admin dashboard
- Chat/messaging system
- Notification system
- Wallet system
- Document management
- OCR and fraud detection
- All error/success messages centralized
- All status codes standardized

---

## 🛠️ Development Setup

- **Main Entry**: `app.js`
- **Database Config**: `config/db.js`
- **Environment**: Uses `.env` for configuration
- **Scripts**: 
  - `npm start` - Production server
  - `npm run dev` - Development with nodemon
  - `npm run lint` - Code linting

---

## 📝 Notes

- **Centralized Constants**: All error messages, success messages, and status codes are centralized in `utils/constants.js` and `utils/statusCode.js`
- **Real-time Updates**: Auction status updates run every 30 seconds via cron jobs
- **Document Processing**: Uses Google Cloud Vision API and Tesseract.js for OCR
- **Payment Security**: Escrow system for auction payments
- **Scalable Architecture**: MVC pattern with clear separation of concerns

---

**Project Version**: 1.0.0  
**Last Updated**: 2025  
**Framework**: Node.js + Express.js  
**Database**: MongoDB (Mongoose)  
**Real-time**: Socket.io  
**Payment**: Razorpay

