import pool from './connection.js';

async function seedAccounting() {
  try {
    console.log('🌱 Seeding Accounting Module with sample data...');

    // 1. Create Chart of Accounts
    console.log('Creating Chart of Accounts...');
    
    // Assets
    const cashAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level, reconcile)
       VALUES ('1000', 'Cash', 'asset_cash', 0, true)
       RETURNING id`,
    );
    const cashId = cashAccount.rows[0].id;

    const arAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level, internal_type)
       VALUES ('1200', 'Accounts Receivable', 'asset_receivable', 0, 'receivable')
       RETURNING id`,
    );
    const arId = arAccount.rows[0].id;

    // Liabilities
    const apAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level, internal_type)
       VALUES ('2000', 'Accounts Payable', 'liability_payable', 0, 'payable')
       RETURNING id`,
    );
    const apId = apAccount.rows[0].id;

    // Equity
    const equityAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level)
       VALUES ('3000', 'Equity', 'equity', 0)
       RETURNING id`,
    );
    const equityId = equityAccount.rows[0].id;

    // Income
    const revenueAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level)
       VALUES ('4000', 'Sales Revenue', 'income', 0)
       RETURNING id`,
    );
    const revenueId = revenueAccount.rows[0].id;

    // Expenses
    const expenseAccount = await pool.query(
      `INSERT INTO account_account (code, name, account_type, level)
       VALUES ('5000', 'Operating Expenses', 'expense', 0)
       RETURNING id`,
    );
    const expenseId = expenseAccount.rows[0].id;

    console.log('✅ Chart of Accounts created');

    // 2. Get or create a journal
    const journalResult = await pool.query(
      "SELECT id FROM account_journal WHERE code = 'MISC' LIMIT 1"
    );
    let journalId = journalResult.rows[0]?.id;
    
    if (!journalId) {
      const newJournal = await pool.query(
        `INSERT INTO account_journal (name, code, type, active)
         VALUES ('Miscellaneous Operations', 'MISC', 'general', true)
         RETURNING id`
      );
      journalId = newJournal.rows[0].id;
    }

    // 3. Create opening balance journal entry
    console.log('Creating opening balance journal entry...');
    const today = new Date().toISOString().split('T')[0];
    const moveName = `MISC/${today.replace(/-/g, '')}/000001`;

    const moveResult = await pool.query(
      `INSERT INTO account_move (name, journal_id, date, move_type, amount_total, state)
       VALUES ($1, $2, $3, 'entry', 100000, 'draft')
       RETURNING id`,
      [moveName, journalId, today]
    );
    const moveId = moveResult.rows[0].id;

    // Create move lines (opening balance: Cash = 100000, Equity = 100000)
    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Opening Balance - Cash', 100000, 0, 100000, $3)`,
      [moveId, cashId, today]
    );

    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Opening Balance - Equity', 0, 100000, -100000, $3)`,
      [moveId, equityId, today]
    );

    // Post the entry
    await pool.query(
      `UPDATE account_move SET state = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [moveId]
    );

    console.log('✅ Opening balance journal entry created and posted');

    // 4. Create a sample revenue transaction
    console.log('Creating sample revenue transaction...');
    const revenueMoveName = `MISC/${today.replace(/-/g, '')}/000002`;
    
    const revenueMoveResult = await pool.query(
      `INSERT INTO account_move (name, journal_id, date, move_type, amount_total, state)
       VALUES ($1, $2, $3, 'entry', 50000, 'draft')
       RETURNING id`,
      [revenueMoveName, journalId, today]
    );
    const revenueMoveId = revenueMoveResult.rows[0].id;

    // Revenue: AR debit, Revenue credit
    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Sales Invoice #001', 50000, 0, 50000, $3)`,
      [revenueMoveId, arId, today]
    );

    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Sales Revenue', 0, 50000, -50000, $3)`,
      [revenueMoveId, revenueId, today]
    );

    await pool.query(
      `UPDATE account_move SET state = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [revenueMoveId]
    );

    console.log('✅ Revenue transaction created and posted');

    // 5. Create a sample expense transaction
    console.log('Creating sample expense transaction...');
    const expenseMoveName = `MISC/${today.replace(/-/g, '')}/000003`;
    
    const expenseMoveResult = await pool.query(
      `INSERT INTO account_move (name, journal_id, date, move_type, amount_total, state)
       VALUES ($1, $2, $3, 'entry', 20000, 'draft')
       RETURNING id`,
      [expenseMoveName, journalId, today]
    );
    const expenseMoveId = expenseMoveResult.rows[0].id;

    // Expense: Expense debit, Cash credit
    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Office Supplies', 20000, 0, 20000, $3)`,
      [expenseMoveId, expenseId, today]
    );

    await pool.query(
      `INSERT INTO account_move_line (move_id, account_id, name, debit, credit, balance, date)
       VALUES ($1, $2, 'Cash Payment', 0, 20000, -20000, $3)`,
      [expenseMoveId, cashId, today]
    );

    await pool.query(
      `UPDATE account_move SET state = 'posted', posted_at = CURRENT_TIMESTAMP WHERE id = $1`,
      [expenseMoveId]
    );

    console.log('✅ Expense transaction created and posted');

    // 6. Create a sample partner for AP/AR testing
    console.log('Creating sample partner...');
    const partnerResult = await pool.query(
      `INSERT INTO partners (name, email, type)
       VALUES ('Sample Customer', 'customer@example.com', 'company')
       RETURNING id`
    );
    const partnerId = partnerResult.rows[0].id;

    // 7. Create a sample vendor
    console.log('Creating sample vendor...');
    const vendorResult = await pool.query(
      `INSERT INTO account_vendor (partner_id, vendor_code, is_active)
       VALUES ($1, 'VEND001', true)
       RETURNING id`,
      [partnerId]
    );
    const vendorId = vendorResult.rows[0].id;

    // 8. Create a sample bill (draft)
    console.log('Creating sample bill...');
    const billName = `BILL/${today.replace(/-/g, '')}/000001`;
    const billResult = await pool.query(
      `INSERT INTO account_bill (name, vendor_id, invoice_date, due_date, amount_total, amount_residual, state, payment_state)
       VALUES ($1, $2, $3, $4, 15000, 15000, 'draft', 'not_paid')
       RETURNING id`,
      [billName, vendorId, today, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]]
    );
    const billId = billResult.rows[0].id;

    // Create bill line
    await pool.query(
      `INSERT INTO account_bill_line (bill_id, name, quantity, price_unit, price_subtotal, account_id)
       VALUES ($1, 'Office Supplies', 1, 15000, 15000, $2)`,
      [billId, expenseId]
    );

    console.log('✅ Sample bill created (draft)');

    console.log('\n✅ Accounting Module seeded successfully!');
    console.log('\nSample Data Created:');
    console.log('- 6 Chart of Accounts (Cash, AR, AP, Equity, Revenue, Expenses)');
    console.log('- 3 Journal Entries (all posted)');
    console.log('- 1 Sample Vendor');
    console.log('- 1 Sample Bill (draft)');
    console.log('\nYou can now test the Accounting Module!');

  } catch (error) {
    console.error('❌ Error seeding accounting data:', error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.includes('seed-accounting')) {
  seedAccounting()
    .then(() => {
      console.log('Seeding complete');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

export default seedAccounting;

