// api/submit-appointment.js - 100% WORKING
const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  // Set headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get data from request
    const {
      fullName,
      fatherName,
      gender,
      age,
      idNumber,
      phone,
      email,
      address,
      appointmentDate,
      appointmentTime,
      doctor,
      reason,
      privacyAgreement
    } = req.body;

    // Validate required fields
    if (!fullName || !fatherName || !gender || !age || !phone || 
        !appointmentDate || !appointmentTime || !reason) {
      return res.status(400).json({ 
        message: 'لطفاً تمام فیلدهای ضروری را پر کنید' 
      });
    }

    // **FIXED AUTHENTICATION**
    // Parse credentials
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    
    // Create the Google Sheets document
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    // **THIS IS THE FIX - NEW AUTH METHOD**
    await doc.useServiceAccountAuth({
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, '\n'),
    });

    // Load document
    await doc.loadInfo();

    // Get or create sheet
    let sheet;
    if (doc.sheetCount === 0) {
      sheet = await doc.addSheet({
        title: 'Appointments',
        headerValues: ['Time', 'Name', 'Father', 'Gender', 'Age', 'Phone', 'Date', 'Time Slot', 'Reason']
      });
    } else {
      sheet = doc.sheetsByIndex[0];
    }

    // Create tracking number
    const trackingNumber = 'TRK-' + Date.now();
    
    // Add row to sheet
    await sheet.addRow({
      'Time': new Date().toISOString(),
      'Name': fullName,
      'Father': fatherName,
      'Gender': gender,
      'Age': age,
      'Phone': phone,
      'Date': appointmentDate,
      'Time Slot': appointmentTime,
      'Reason': reason
    });

    // Return success
    return res.status(200).json({
      success: true,
      message: '✅ درخواست شما با موفقیت ثبت شد',
      trackingNumber: trackingNumber
    });

  } catch (error) {
    console.error('ERROR:', error.message);
    
    // Return specific error message
    return res.status(500).json({
      message: 'خطا: ' + error.message
    });
  }
}
