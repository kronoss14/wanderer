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

export function getBankDetails() {
  return BANK_ACCOUNTS;
}
