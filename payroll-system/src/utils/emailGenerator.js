/**
 * Role-to-Department Mapping Matrix
 * Maps application role codes to standardized corporate department tags.
 */
const DEPARTMENT_CODES = {
  admin: 'admin',
  ceo: 'exec',
  hr: 'hr',
  accountant: 'fin',
  site_clerk: 'site',
};

/**
 * Generates a standardized enterprise email address based on user credentials.
 * 
 * Formula: [first_initial].[sanitized_lastname].[dept_code]@[domain]
 * 
 * @param {string} firstName - Employee's first name
 * @param {string} lastName - Employee's surname/last name
 * @param {string} roleCode - Unique role identifier ('admin', 'ceo', 'hr', 'accountant', 'site_clerk')
 * @param {string} domain - Corporate domain name (defaults to 'perriscope.ac.bw')
 * @returns {string} Standardized email address or empty string if inputs are invalid
 */
export function generateCorporateEmail(
  firstName = '',
  lastName = '',
  roleCode = 'site_clerk',
  domain = 'perriscope.ac.bw'
) {
  // 1. Input Validation: Ensure names exist and are not empty spaces
  const cleanFirst = firstName.trim().toLowerCase();
  const cleanLast = lastName.trim().toLowerCase();

  if (!cleanFirst || !cleanLast) {
    return '';
  }

  // 2. Extract First Initial
  const firstInitial = cleanFirst.charAt(0);

  // 3. Sanitize Surname (removes spaces, hyphens, and non-alphanumeric characters)
  const sanitizedLastName = cleanLast.replace(/[^a-z0-9]/g, '');

  // 4. Resolve Department Tag (defaults to 'gen' if role code is unrecognized)
  const deptCode = DEPARTMENT_CODES[roleCode] || 'gen';

  // 5. Assemble Final Address
  return `${firstInitial}.${sanitizedLastName}.${deptCode}@${domain}`;
}