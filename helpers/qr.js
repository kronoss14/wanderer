import QRCode from 'qrcode';

// Bank account details for payment
const BANK_ACCOUNTS = {
  bog: {
    name: 'BOG (Bank of Georgia)',
    iban: 'GE24BG0000000103101387',
    bic: 'BAGAGE22',
    holder: 'გელაშვილი თამარ / Gelashvili Tamar'
  },
  tbc: {
    name: 'TBC Bank',
    iban: 'GE97TB7322845061100069',
    bic: 'TBCBGE22',
    holder: 'გელაშვილი თამარ / Gelashvili Tamar'
  }
};

/**
 * Get bank details for display
 * @returns {{ bog: object, tbc: object }}
 */
export function getBankDetails() {
  return BANK_ACCOUNTS;
}

/**
 * Generate a payment QR code as a data URI (PNG base64)
 *
 * Uses EPC/GiroCode QR format (EPC069-12) which is recognized by
 * European banking apps. Georgian bank apps (BOG, TBC) will parse
 * the IBAN and amount from the QR code.
 *
 * @param {{ amount: number, reference: string, bank?: 'bog'|'tbc' }} opts
 * @returns {Promise<string>} data URI string (data:image/png;base64,...)
 */
export async function generatePaymentQR({ amount, reference, bank = 'bog' }) {
  const account = BANK_ACCOUNTS[bank] || BANK_ACCOUNTS.bog;

  // EPC QR code payload (EPC069-12 standard)
  const lines = [
    'BCD',                          // Service Tag
    '002',                          // Version
    '1',                            // Character set (UTF-8)
    'SCT',                          // Identification (SEPA Credit Transfer)
    account.bic,                    // BIC
    account.holder,                 // Beneficiary name
    account.iban,                   // IBAN
    `GEL${amount.toFixed(2)}`,      // Amount
    '',                             // Purpose (empty)
    reference,                      // Remittance reference
    '',                             // Remittance text
    ''                              // Information
  ];

  const payload = lines.join('\n');

  return QRCode.toDataURL(payload, {
    width: 300,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
    errorCorrectionLevel: 'M'
  });
}
