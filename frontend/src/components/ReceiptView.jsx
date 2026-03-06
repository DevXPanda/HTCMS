/**
 * Unified receipt view for download/print across modules (payment, water payment).
 * Same structure as backend PDF: Receipt Details, Property/Connection, Owner, Payment Details, footer.
 */
const ReceiptSection = ({ title, children }) => (
  <div className="border border-gray-800 rounded-none mb-4">
    <div className="bg-gray-100 px-3 py-2 border-b border-gray-800 font-semibold text-sm">
      {title}
    </div>
    <div className="px-3 py-3 text-sm">{children}</div>
  </div>
);

const ReceiptRow = ({ label, value, valueClass = '' }) => (
  <div className="flex justify-between items-start gap-4 py-1.5 border-b border-gray-100 last:border-0">
    <span className="text-gray-600 shrink-0">{label}</span>
    <span className={`text-right font-medium ${valueClass}`}>{value ?? '—'}</span>
  </div>
);

export function PaymentReceiptView({ payment, formatAmt }) {
  const property = payment?.property;
  const owner = property?.owner || payment?.property?.owner;
  const ward = property?.ward;
  const demand = payment?.demand;

  return (
    <div className="receipt-view">
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
        <h2 className="text-xl font-bold uppercase">Municipal Corporation</h2>
        <p className="text-sm text-gray-600">House Tax Collection & Management System</p>
        <p className="text-lg font-bold mt-2">PAYMENT RECEIPT</p>
      </div>

      <ReceiptSection title="Receipt Details">
        <ReceiptRow label="Receipt Number" value={payment?.receiptNumber || payment?.paymentNumber} />
        <ReceiptRow
          label="Payment Date"
          value={payment?.paymentDate ? new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) : null}
        />
        <ReceiptRow label="Payment ID" value={payment?.paymentNumber} />
        <ReceiptRow label="Location" value={ward ? `${ward.wardNumber} - ${ward.wardName}` : null} />
      </ReceiptSection>

      <ReceiptSection title="Property Details">
        <ReceiptRow label="Property Number" value={property?.propertyNumber} />
        <ReceiptRow
          label="Address"
          value={[property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ')}
        />
      </ReceiptSection>

      <ReceiptSection title="Owner Details">
        <ReceiptRow
          label="Name"
          value={owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null}
        />
        <ReceiptRow label="Email" value={owner?.email} />
        <ReceiptRow label="Phone" value={owner?.phone} />
      </ReceiptSection>

      <ReceiptSection title="Payment Details">
        <ReceiptRow label="Financial Year" value={demand?.financialYear} />
        <ReceiptRow label="Demand Number" value={demand?.demandNumber} />
        <ReceiptRow label="Payment Mode" value={payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null} />
        <ReceiptRow label="Amount Paid" value={formatAmt ? formatAmt(payment?.amount) : `₹${Number(payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} valueClass="font-bold text-green-700" />
        <ReceiptRow label="Total Paid" value={formatAmt ? formatAmt(payment?.amount) : `₹${Number(payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} valueClass="font-bold underline" />
        {(payment?.chequeNumber || payment?.transactionId) && (
          <ReceiptRow
            label={payment?.paymentMode === 'cheque' || payment?.paymentMode === 'dd' ? 'Cheque/DD Number' : 'Transaction ID'}
            value={payment?.chequeNumber || payment?.transactionId}
          />
        )}
      </ReceiptSection>

      {payment?.cashier && (
        <div className="mb-3 text-sm">
          <span className="text-gray-600">Received By: </span>
          <span className="font-medium">{payment.cashier.firstName} {payment.cashier.lastName}</span>
        </div>
      )}

      <div className="border-t border-gray-300 pt-3 text-center text-xs text-gray-600">
        <p>This is a system-generated receipt. No signature required. Valid only if payment is successful and confirmed.</p>
        <p className="mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}

export function WaterPaymentReceiptView({ payment, waterBill, waterConnection, property, formatAmt }) {
  const owner = property?.owner;
  const connectionLabel = waterConnection?.connectionNumber
    ? (property?.propertyNumber ? `${waterConnection.connectionNumber} · ${property.propertyNumber}` : waterConnection.connectionNumber)
    : property?.propertyNumber;

  return (
    <div className="receipt-view">
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
        <h2 className="text-xl font-bold uppercase">Municipal Corporation</h2>
        <p className="text-sm text-gray-600">House Tax Collection & Management System</p>
        <p className="text-lg font-bold mt-2">WATER PAYMENT RECEIPT</p>
      </div>

      <ReceiptSection title="Receipt Details">
        <ReceiptRow label="Receipt Number" value={payment?.receiptNumber || payment?.paymentNumber} />
        <ReceiptRow
          label="Payment Date"
          value={payment?.paymentDate ? new Date(payment.paymentDate).toLocaleString('en-IN', { dateStyle: 'long', timeStyle: 'short' }) : null}
        />
        <ReceiptRow label="Payment ID" value={payment?.paymentNumber} />
      </ReceiptSection>

      <ReceiptSection title="Connection & Property">
        <ReceiptRow label="Connection / Property" value={connectionLabel} />
        <ReceiptRow
          label="Address"
          value={[property?.address, property?.city, property?.state, property?.pincode].filter(Boolean).join(', ')}
        />
        <ReceiptRow label="Bill Number" value={waterBill?.billNumber} />
        {waterBill?.billingPeriod && <ReceiptRow label="Billing Period" value={waterBill.billingPeriod} />}
      </ReceiptSection>

      <ReceiptSection title="Owner Details">
        <ReceiptRow
          label="Name"
          value={owner ? `${owner.firstName || ''} ${owner.lastName || ''}`.trim() : null}
        />
        <ReceiptRow label="Email" value={owner?.email} />
        <ReceiptRow label="Phone" value={owner?.phone} />
      </ReceiptSection>

      <ReceiptSection title="Payment Details">
        <ReceiptRow label="Payment Mode" value={payment?.paymentMode ? String(payment.paymentMode).toUpperCase() : null} />
        <ReceiptRow label="Amount Paid" value={formatAmt ? formatAmt(payment?.amount) : `₹${Number(payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} valueClass="font-bold text-green-700" />
        <ReceiptRow label="Total Paid" value={formatAmt ? formatAmt(payment?.amount) : `₹${Number(payment?.amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`} valueClass="font-bold underline" />
        {(payment?.chequeNumber || payment?.transactionId) && (
          <ReceiptRow
            label={payment?.paymentMode === 'cheque' || payment?.paymentMode === 'dd' ? 'Cheque/DD Number' : 'Transaction ID'}
            value={payment?.chequeNumber || payment?.transactionId}
          />
        )}
      </ReceiptSection>

      {payment?.cashier && (
        <div className="mb-3 text-sm">
          <span className="text-gray-600">Received By: </span>
          <span className="font-medium">{payment.cashier.firstName} {payment.cashier.lastName}</span>
        </div>
      )}

      <div className="border-t border-gray-300 pt-3 text-center text-xs text-gray-600">
        <p>This is a system-generated receipt. No signature required. Valid only if payment is successful and confirmed.</p>
        <p className="mt-1">Generated on: {new Date().toLocaleString('en-IN')}</p>
      </div>
    </div>
  );
}
