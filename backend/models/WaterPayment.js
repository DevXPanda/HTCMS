import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const WaterPayment = sequelize.define('WaterPayment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true,
    comment: 'Unique water payment number'
  },
  waterBillId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'WaterBills',
      key: 'id'
    },
    comment: 'Foreign key to water_bills table'
  },
  waterConnectionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'WaterConnections',
      key: 'id'
    },
    comment: 'Foreign key to water_connections table'
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    comment: 'Payment amount'
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'cheque', 'dd', 'online', 'card', 'upi'),
    allowNull: false,
    defaultValue: 'cash',
    comment: 'Payment mode'
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: 'Date of payment'
  },
  chequeNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'Cheque number (if payment mode is cheque or DD)'
  },
  chequeDate: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Cheque date'
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Bank name'
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Transaction ID for online/card payments'
  },
  razorpayOrderId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Razorpay order ID for online payments'
  },
  razorpayPaymentId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'Razorpay payment ID for online payments'
  },
  razorpaySignature: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: 'Razorpay signature for payment verification'
  },
  receiptNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    unique: true,
    comment: 'Receipt number'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending',
    comment: 'Payment status'
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'User who received the payment (cashier)'
  },
  remarks: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  receiptPdfUrl: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Path/URL to generated receipt PDF'
  },
  receiptGeneratedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Timestamp when receipt PDF was generated'
  }
}, {
  tableName: 'water_payments',
  timestamps: true
});
