// api/submit-appointment.js - SIMPLEST VERSION
const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({message: 'Method not allowed'});
  
  try {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    // FIXED AUTH
    await doc.useServiceAccountAuth(creds);
    
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0] || await doc.addSheet({title: 'Appointments'});
    
    const row = {
      'Time': new Date().toLocaleString('fa-IR'),
      'Name': req.body.fullName || '',
      'Phone': req.body.phone || '',
      'Date': req.body.appointmentDate || '',
      'Reason': req.body.reason || ''
    };
    
    await sheet.addRow(row);
    res.status(200).json({success: true, message: 'ثبت شد'});
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({message: 'خطا: ' + error.message});
  }
}
