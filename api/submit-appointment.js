// api/submit-appointment.js - WORKING VERSION
const { GoogleSpreadsheet } = require('google-spreadsheet');
const { JWT } = require('google-auth-library');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Parse request body
    const body = req.body;
    
    // Validate required fields
    if (!body.fullName || !body.fatherName || !body.gender || !body.age || 
        !body.phone || !body.appointmentDate || !body.appointmentTime || !body.reason) {
      return res.status(400).json({ 
        message: 'لطفاً تمام فیلدهای ضروری را پر کنید' 
      });
    }

    // Parse credentials from environment variable
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    
    // Fix private key newlines
    const privateKey = credentials.private_key.replace(/\\n/g, '\n');
    
    // Create JWT auth client
    const authClient = new JWT({
      email: credentials.client_email,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    // Initialize Google Sheet
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID, authClient);
    
    // Load document info
    await doc.loadInfo();
    
    // Get first sheet or create it
    let sheet;
    if (doc.sheetCount === 0) {
      sheet = await doc.addSheet({ 
        title: 'Appointments',
        headerValues: [
          'Timestamp', 'Tracking Number', 'Full Name', 'Father Name', 'Gender', 
          'Age', 'ID Number', 'Phone', 'Email', 'Address', 
          'Appointment Date', 'Appointment Time', 'Doctor', 'Reason', 
          'Privacy Agreement', 'Submission Date'
        ]
      });
    } else {
      sheet = doc.sheetsByIndex[0];
    }

    // Generate tracking number
    const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // Prepare row data
    const rowData = {
      'Timestamp': new Date().toISOString(),
      'Tracking Number': trackingNumber,
      'Full Name': body.fullName || '',
      'Father Name': body.fatherName || '',
      'Gender': body.gender || '',
      'Age': body.age || '',
      'ID Number': body.idNumber || 'ندارد',
      'Phone': body.phone || '',
      'Email': body.email || 'ندارد',
      'Address': body.address || 'ندارد',
      'Appointment Date': body.appointmentDate || '',
      'Appointment Time': body.appointmentTime || '',
      'Doctor': body.doctor || 'انتخاب نشده',
      'Reason': body.reason || '',
      'Privacy Agreement': body.privacyAgreement || 'بلی',
      'Submission Date': new Date().toLocaleDateString('fa-IR')
    };

    // Add row to sheet
    await sheet.addRow(rowData);

    // Return success
    return res.status(200).json({
      success: true,
      message: 'درخواست شما با موفقیت ثبت شد',
      trackingNumber: trackingNumber
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      message: 'خطا در ثبت درخواست: ' + error.message
    });
  }
}