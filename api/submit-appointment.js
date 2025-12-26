// api/submit-appointment.js - WORKING VERSION
const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // 1. Parse credentials
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    
    // 2. Create the sheet object
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    // 3. NEW AUTHENTICATION METHOD - FIXED
    await doc.useServiceAccountAuth({
      client_email: credentials.client_email,
      private_key: credentials.private_key.replace(/\\n/g, '\n'),
    });
    
    // 4. Load sheet
    await doc.loadInfo();
    
    // 5. Get or create sheet
    let sheet = doc.sheetsByIndex[0];
    if (!sheet) {
      sheet = await doc.addSheet({ 
        title: 'Appointments',
        headerValues: ['Timestamp', 'Tracking Number', 'Full Name', 'Father Name', 'Gender', 'Age', 'ID Number', 'Phone', 'Email', 'Address', 'Appointment Date', 'Appointment Time', 'Doctor', 'Reason', 'Privacy Agreement']
      });
    }
    
    // 6. Add row
    const rowData = {
      'Timestamp': new Date().toISOString(),
      'Tracking Number': `TRK-${Date.now()}`,
      'Full Name': req.body.fullName || '',
      'Father Name': req.body.fatherName || '',
      'Gender': req.body.gender || '',
      'Age': req.body.age || '',
      'ID Number': req.body.idNumber || 'ندارد',
      'Phone': req.body.phone || '',
      'Email': req.body.email || 'ندارد',
      'Address': req.body.address || 'ندارد',
      'Appointment Date': req.body.appointmentDate || '',
      'Appointment Time': req.body.appointmentTime || '',
      'Doctor': req.body.doctor || 'انتخاب نشده',
      'Reason': req.body.reason || '',
      'Privacy Agreement': req.body.privacyAgreement || 'بلی'
    };
    
    await sheet.addRow(rowData);
    
    return res.status(200).json({ 
      success: true, 
      message: 'درخواست ثبت شد',
      trackingNumber: rowData['Tracking Number']
    });
    
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      message: 'خطا در ثبت اطلاعات' 
    });
  }
}
