/**
 * Shared mathematical utility functions for payroll calculations.
 */

/**
 * Calculates gross pay based on total hours worked and hourly rate.
 * 
 * @param {number|string} hours - Total hours worked from paper logbook
 * @param {number|string} rate - Hourly rate in BWP
 * @returns {number} Calculated gross pay rounded to 2 decimal places
 */
export function calculatePay(hours, rate) {
  const parsedHours = parseFloat(hours) || 0;
  const parsedRate = parseFloat(rate) || 0;

  const grossPay = parsedHours * parsedRate;
  return Math.round(grossPay * 100) / 100;
}

/**
 * Calculates net pay after applying deductions (e.g., tax, advance deductions).
 * 
 * @param {number|string} grossPay - Gross earnings amount
 * @param {number|string} deductions - Total deductions
 * @returns {number} Calculated net pay
 */
export function calculateNetPay(grossPay, deductions = 0) {
  const parsedGross = parseFloat(grossPay) || 0;
  const parsedDeductions = parseFloat(deductions) || 0;

  const netPay = parsedGross - parsedDeductions;
  return Math.max(0, Math.round(netPay * 100) / 100);
}

/**
 * Formats a numeric amount to standard Botswana Pula currency string.
 * 
 * @param {number|string} amount - The monetary value to format
 * @returns {string} Formatted currency string (e.g., "P1,250.00")
 */
export function formatPula(amount) {
  const parsedAmount = parseFloat(amount) || 0;
  return `P${parsedAmount.toLocaleString('en-BW', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}