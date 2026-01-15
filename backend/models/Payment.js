import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

export const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  paymentNumber: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  demandId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Demands',
      key: 'id'
    }
  },
  propertyId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'Properties',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  paymentMode: {
    type: DataTypes.ENUM('cash', 'cheque', 'dd', 'online', 'card'),
    allowNull: false,
    defaultValue: 'cash'
  },
  paymentDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  chequeNumber: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: 'If payment mode is cheque or DD'
  },
  chequeDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  bankName: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: 'For online/card payments'
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
    unique: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed', 'cancelled'),
    defaultValue: 'pending'
  },
  receivedBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'Users',
      key: 'id'
    },
    comment: 'Cashier who received the payment'
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
  tableName: 'payments',
  timestamps: true
});
