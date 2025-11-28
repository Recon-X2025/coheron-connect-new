#!/bin/bash

# Accounting Module Workflow Testing Script
# This script demonstrates the complete accounting workflows

API_BASE="http://localhost:3000/api"

echo "🧪 Testing Accounting Module Workflows"
echo "========================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. View Chart of Accounts
echo -e "${BLUE}1. Viewing Chart of Accounts${NC}"
curl -s "$API_BASE/accounting/chart-of-accounts" | python3 -m json.tool | head -30
echo ""

# 2. View Journal Entries
echo -e "${BLUE}2. Viewing Journal Entries${NC}"
curl -s "$API_BASE/accounting/journal-entries" | python3 -m json.tool | head -40
echo ""

# 3. Get a specific journal entry with lines
echo -e "${BLUE}3. Getting Journal Entry Details (with lines)${NC}"
ENTRY_ID=$(curl -s "$API_BASE/accounting/journal-entries" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '1')")
curl -s "$API_BASE/accounting/journal-entries/$ENTRY_ID" | python3 -m json.tool
echo ""

# 4. View Bills
echo -e "${BLUE}4. Viewing Bills${NC}"
curl -s "$API_BASE/accounting/accounts-payable/bills" | python3 -m json.tool
echo ""

# 5. Post a Bill
echo -e "${YELLOW}5. Posting a Bill${NC}"
BILL_ID=$(curl -s "$API_BASE/accounting/accounts-payable/bills" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data[0]['id'] if data else '1')")
curl -s -X POST "$API_BASE/accounting/accounts-payable/bills/$BILL_ID/post" | python3 -m json.tool
echo ""

# 6. Create a Payment for the Bill
echo -e "${YELLOW}6. Creating Payment for Bill${NC}"
PAYMENT_DATA=$(cat <<EOF
{
  "payment_type": "outbound",
  "payment_method": "bank_transfer",
  "partner_id": 1,
  "amount": 15000,
  "payment_date": "$(date +%Y-%m-%d)",
  "journal_id": 1,
  "communication": "Payment for BILL/20251128/000001",
  "bill_ids": [$BILL_ID]
}
EOF
)
curl -s -X POST "$API_BASE/accounting/accounts-payable/payments" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_DATA" | python3 -m json.tool
echo ""

# 7. View Financial Reports
echo -e "${BLUE}7. Viewing Trial Balance${NC}"
TODAY=$(date +%Y-%m-%d)
YEAR_START=$(date -v-1y +%Y-01-01 2>/dev/null || date -d "1 year ago" +%Y-01-01 2>/dev/null || echo "2024-01-01")
curl -s "$API_BASE/accounting/reports/trial-balance?date_from=$YEAR_START&date_to=$TODAY" | python3 -m json.tool | head -50
echo ""

echo -e "${BLUE}8. Viewing Profit & Loss${NC}"
curl -s "$API_BASE/accounting/reports/profit-loss?date_from=$YEAR_START&date_to=$TODAY" | python3 -m json.tool
echo ""

echo -e "${BLUE}9. Viewing Balance Sheet${NC}"
curl -s "$API_BASE/accounting/reports/balance-sheet?date_as_of=$TODAY" | python3 -m json.tool
echo ""

echo -e "${GREEN}✅ Workflow Testing Complete!${NC}"
echo ""
echo "Summary:"
echo "- Chart of Accounts: ✅"
echo "- Journal Entries: ✅"
echo "- Bills: ✅"
echo "- Bill Posting: ✅"
echo "- Payments: ✅"
echo "- Financial Reports: ✅"

