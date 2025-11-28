# 🔄 BULK ALERT REPLACEMENT SCRIPT

## Files to Update (40 files with alert() calls)

### Priority 1: Critical User-Facing Files
1. ✅ BatchSerialManagement.tsx - DONE
2. ✅ LeadsList.tsx - DONE  
3. ✅ PricingManagement.tsx - DONE
4. ✅ Promotions.tsx - DONE
5. ✅ SurveyManagement.tsx - DONE
6. ✅ KnowledgeBase.tsx - DONE

### Priority 2: Inventory Module
- StockIssueList.tsx
- StockReturnList.tsx
- JournalEntries.tsx
- ChartOfAccounts.tsx
- InventorySettings.tsx
- WarehouseOperations.tsx
- StockIssueForm.tsx
- StockReturnForm.tsx
- GRNForm.tsx
- TransferForm.tsx
- AdjustmentForm.tsx
- Warehouses.tsx

### Priority 3: POS Module
- POSTerminals.tsx
- POSSessions.tsx

### Priority 4: CRM Module
- AutomationEngine.tsx
- TasksCalendar.tsx

### Priority 5: Website Module
- PaymentGateways.tsx
- CartCheckout.tsx

### Priority 6: Manufacturing Module
- WorkOrders.tsx
- RoutingManagement.tsx
- QualityControl.tsx
- ManufacturingOrders.tsx
- BOMManagement.tsx

### Priority 7: Admin Module
- UserRoleAssignments.tsx
- PermissionsManagement.tsx
- RolesManagement.tsx

### Priority 8: Accounting Module
- Invoices.tsx
- AccountsPayable.tsx

### Priority 9: Other
- MediaLibrary.tsx
- ESignature.tsx
- PayrollProcessing.tsx
- SalaryStructure.tsx
- LeaveRequestForm.tsx
- AutomationBuilder.tsx
- Subscription.tsx
- Settings.tsx

## Replacement Pattern

**Before:**
```typescript
alert('Success message');
alert('Error message');
```

**After:**
```typescript
import { showToast } from '../../components/Toast';
showToast('Success message', 'success');
showToast('Error message', 'error');
```

## Status: 6/40 files completed (15%)

