/**
 * Format INR values in Lakhs (Lacs)
 * 1 Lakh = 100,000
 */

export const formatInLakhs = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '₹0.00 L';
  }

  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d.-]/g, '')) || 0
    : Number(value) || 0;

  if (numValue === 0) {
    return '₹0.00 L';
  }

  const lakhs = numValue / 100000;
  return `₹${lakhs.toFixed(2)} L`;
};

export const formatInLakhsCompact = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined) {
    return '₹0 L';
  }

  const numValue = typeof value === 'string' 
    ? parseFloat(value.replace(/[^\d.-]/g, '')) || 0
    : Number(value) || 0;

  if (numValue === 0) {
    return '₹0 L';
  }

  const lakhs = numValue / 100000;
  
  // If less than 0.01 Lakhs, show in thousands
  if (lakhs < 0.01) {
    const thousands = numValue / 1000;
    return `₹${thousands.toFixed(2)} K`;
  }
  
  // If whole number, don't show decimals
  if (lakhs % 1 === 0) {
    return `₹${lakhs.toFixed(0)} L`;
  }
  
  // Show 2 decimal places
  return `₹${lakhs.toFixed(2)} L`;
};

