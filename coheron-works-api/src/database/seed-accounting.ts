import { connectDB } from './connection.js';
import mongoose from './connection.js';
import AccountAccount from '../models/AccountAccount.js';
import AccountJournal from '../models/AccountJournal.js';
import AccountMove from '../models/AccountMove.js';
import { Partner } from '../shared/models/Partner.js';
import AccountVendor from '../models/AccountVendor.js';
import AccountBill from '../models/AccountBill.js';

async function seedAccounting() {
  try {
    await connectDB();
    console.log('Seeding Accounting Module with sample data...');

    // 1. Create Chart of Accounts
    console.log('Creating Chart of Accounts...');

    const cashAccount = await AccountAccount.findOneAndUpdate(
      { code: '1000' },
      { code: '1000', name: 'Cash', account_type: 'asset_cash', level: 0, reconcile: true },
      { upsert: true, new: true }
    );

    const arAccount = await AccountAccount.findOneAndUpdate(
      { code: '1200' },
      { code: '1200', name: 'Accounts Receivable', account_type: 'asset_receivable', level: 0, internal_type: 'receivable' },
      { upsert: true, new: true }
    );

    const apAccount = await AccountAccount.findOneAndUpdate(
      { code: '2000' },
      { code: '2000', name: 'Accounts Payable', account_type: 'liability_payable', level: 0, internal_type: 'payable' },
      { upsert: true, new: true }
    );

    const equityAccount = await AccountAccount.findOneAndUpdate(
      { code: '3000' },
      { code: '3000', name: 'Equity', account_type: 'equity', level: 0 },
      { upsert: true, new: true }
    );

    const revenueAccount = await AccountAccount.findOneAndUpdate(
      { code: '4000' },
      { code: '4000', name: 'Sales Revenue', account_type: 'income', level: 0 },
      { upsert: true, new: true }
    );

    const expenseAccount = await AccountAccount.findOneAndUpdate(
      { code: '5000' },
      { code: '5000', name: 'Operating Expenses', account_type: 'expense', level: 0 },
      { upsert: true, new: true }
    );

    console.log('Chart of Accounts created');

    // 2. Get or create a journal
    const journal = await AccountJournal.findOneAndUpdate(
      { code: 'MISC' },
      { name: 'Miscellaneous Operations', code: 'MISC', type: 'general', active: true },
      { upsert: true, new: true }
    );

    // 3. Create opening balance journal entry
    console.log('Creating opening balance journal entry...');
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    const moveName = `MISC/${dateStr.replace(/-/g, '')}/000001`;

    const openingMove = await AccountMove.findOneAndUpdate(
      { name: moveName },
      {
        name: moveName,
        journal_id: journal._id,
        date: today,
        move_type: 'entry',
        amount_total: 100000,
        state: 'posted',
        posted_at: today,
        lines: [
          { account_id: cashAccount._id, name: 'Opening Balance - Cash', debit: 100000, credit: 0, balance: 100000, date: today },
          { account_id: equityAccount._id, name: 'Opening Balance - Equity', debit: 0, credit: 100000, balance: -100000, date: today },
        ],
      },
      { upsert: true, new: true }
    );
    console.log('Opening balance journal entry created and posted');

    // 4. Create a sample revenue transaction
    console.log('Creating sample revenue transaction...');
    const revenueMoveName = `MISC/${dateStr.replace(/-/g, '')}/000002`;

    await AccountMove.findOneAndUpdate(
      { name: revenueMoveName },
      {
        name: revenueMoveName,
        journal_id: journal._id,
        date: today,
        move_type: 'entry',
        amount_total: 50000,
        state: 'posted',
        posted_at: today,
        lines: [
          { account_id: arAccount._id, name: 'Sales Invoice #001', debit: 50000, credit: 0, balance: 50000, date: today },
          { account_id: revenueAccount._id, name: 'Sales Revenue', debit: 0, credit: 50000, balance: -50000, date: today },
        ],
      },
      { upsert: true, new: true }
    );
    console.log('Revenue transaction created and posted');

    // 5. Create a sample expense transaction
    console.log('Creating sample expense transaction...');
    const expenseMoveName = `MISC/${dateStr.replace(/-/g, '')}/000003`;

    await AccountMove.findOneAndUpdate(
      { name: expenseMoveName },
      {
        name: expenseMoveName,
        journal_id: journal._id,
        date: today,
        move_type: 'entry',
        amount_total: 20000,
        state: 'posted',
        posted_at: today,
        lines: [
          { account_id: expenseAccount._id, name: 'Office Supplies', debit: 20000, credit: 0, balance: 20000, date: today },
          { account_id: cashAccount._id, name: 'Cash Payment', debit: 0, credit: 20000, balance: -20000, date: today },
        ],
      },
      { upsert: true, new: true }
    );
    console.log('Expense transaction created and posted');

    // 6. Create a sample partner for AP/AR testing
    console.log('Creating sample partner...');
    const partnerDoc = await Partner.findOneAndUpdate(
      { email: 'customer@example.com' },
      { name: 'Sample Customer', email: 'customer@example.com' },
      { upsert: true, new: true }
    );

    // 7. Create a sample vendor
    console.log('Creating sample vendor...');
    const vendor = await AccountVendor.findOneAndUpdate(
      { vendor_code: 'VEND001' },
      { partner_id: partnerDoc._id, vendor_code: 'VEND001', is_active: true },
      { upsert: true, new: true }
    );

    // 8. Create a sample bill (draft)
    console.log('Creating sample bill...');
    const billName = `BILL/${dateStr.replace(/-/g, '')}/000001`;
    const dueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await AccountBill.findOneAndUpdate(
      { name: billName },
      {
        name: billName,
        vendor_id: vendor._id,
        invoice_date: today,
        due_date: dueDate,
        amount_total: 15000,
        amount_residual: 15000,
        state: 'draft',
        payment_state: 'not_paid',
        lines: [
          { name: 'Office Supplies', quantity: 1, price_unit: 15000, price_subtotal: 15000, account_id: expenseAccount._id },
        ],
      },
      { upsert: true, new: true }
    );
    console.log('Sample bill created (draft)');

    console.log('\nAccounting Module seeded successfully!');
    console.log('\nSample Data Created:');
    console.log('- 6 Chart of Accounts (Cash, AR, AP, Equity, Revenue, Expenses)');
    console.log('- 3 Journal Entries (all posted)');
    console.log('- 1 Sample Vendor');
    console.log('- 1 Sample Bill (draft)');
    console.log('\nYou can now test the Accounting Module!');

  } catch (error) {
    console.error('Error seeding accounting data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('seed-accounting')) {
  seedAccounting()
    .then(() => {
      console.log('Seeding complete');
      return mongoose.disconnect();
    })
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedAccounting;
