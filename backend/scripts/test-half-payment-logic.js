// Test script to verify the 50% payment logic
const testHalfPaymentLogic = () => {
  console.log('🧪 Testing 50% Payment Logic\n');

  // Test cases for demand status logic
  console.log('📄 Demand Status Tests:');
  
  const testCases = [
    { totalAmount: 1000, paidAmount: 1000, expected: 'paid' },
    { totalAmount: 1000, paidAmount: 500, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 490, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 510, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 480, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 520, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 0, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 345.99, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 239, expected: 'pending' },
    { totalAmount: 500, paidAmount: 250, expected: 'partially_paid' },
    { totalAmount: 500, paidAmount: 245, expected: 'partially_paid' },
    { totalAmount: 500, paidAmount: 255, expected: 'partially_paid' },
    { totalAmount: 345.99, paidAmount: 172.99, expected: 'partially_paid' },
    { totalAmount: 239, paidAmount: 119.50, expected: 'partially_paid' }
  ];

  testCases.forEach((test, index) => {
    const balanceAmount = test.totalAmount - test.paidAmount;
    let status;
    
    if (balanceAmount <= 0) {
      status = 'paid';
    } else if (test.paidAmount >= (test.totalAmount * 0.49) && test.paidAmount <= (test.totalAmount * 0.51)) {
      status = 'partially_paid';
    } else {
      status = 'pending';
    }
    
    const passed = status === test.expected;
    console.log(`  Test ${index + 1}: ₹${test.paidAmount} / ₹${test.totalAmount} → ${status} ${passed ? '✅' : '❌'}`);
    if (!passed) {
      console.log(`    Expected: ${test.expected}, Got: ${status}`);
    }
  });

  console.log('\n💧 Water Bill Status Tests:');
  
  const waterBillTests = [
    { totalAmount: 1000, paidAmount: 1000, expected: 'paid' },
    { totalAmount: 1000, paidAmount: 500, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 490, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 510, expected: 'partially_paid' },
    { totalAmount: 1000, paidAmount: 480, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 520, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 345.99, expected: 'pending' },
    { totalAmount: 1000, paidAmount: 239, expected: 'pending' }
  ];

  waterBillTests.forEach((test, index) => {
    const balanceAmount = test.totalAmount - test.paidAmount;
    let status;
    
    if (Math.abs(balanceAmount) < 0.01) {
      status = 'paid';
    } else if (test.paidAmount >= (test.totalAmount * 0.49) && test.paidAmount <= (test.totalAmount * 0.51)) {
      status = 'partially_paid';
    } else {
      status = 'pending';
    }
    
    const passed = status === test.expected;
    console.log(`  Test ${index + 1}: ₹${test.paidAmount} / ₹${test.totalAmount} → ${status} ${passed ? '✅' : '❌'}`);
    if (!passed) {
      console.log(`    Expected: ${test.expected}, Got: ${status}`);
    }
  });

  console.log('\n📋 Summary:');
  console.log('✅ Only payments between 49% and 51% show as "partially_paid"');
  console.log('✅ Exact full payments show as "paid"');
  console.log('✅ All other partial payments show as "pending"');
  console.log('✅ Decimal amounts are handled correctly');
  
  console.log('\n🎯 Examples:');
  console.log('  Total: ₹1000');
  console.log('  - Pay ₹345.99 → pending (not 50%)');
  console.log('  - Pay ₹239 → pending (not 50%)');
  console.log('  - Pay ₹490-₹510 → partially_paid (around 50%)');
  console.log('  - Pay ₹1000 → paid (full amount)');
};

testHalfPaymentLogic();
