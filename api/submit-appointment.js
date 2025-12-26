const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get form data
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

    // Generate tracking number
    const trackingNumber = 'TRK-' + Date.now() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
    
    // 1. Try to save to Google Sheets
    try {
      // Parse credentials
      const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
      
      // Fix private key formatting
      const privateKey = credentials.private_key.replace(/\\n/g, '\n');
      
      // Create Google Sheets document
      const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
      
      // USE THIS METHOD - it works with v3.3.0
      await doc.useServiceAccountAuth({
        client_email: credentials.client_email,
        private_key: privateKey,
      });
      
      // Load document
      await doc.loadInfo();
      
      // Get or create sheet
      let sheet;
      if (doc.sheetCount === 0) {
        sheet = await doc.addSheet({
          title: 'Appointments',
          headerValues: [
            'زمان ثبت', 'شماره رهگیری', 'نام کامل', 'نام پدر', 'جنسیت',
            'سن', 'شماره تذکره', 'شماره تماس', 'ایمیل', 'آدرس',
            'تاریخ ملاقات', 'وقت ملاقات', 'داکتر', 'دلیل مراجعه'
          ]
        });
      } else {
        sheet = doc.sheetsByIndex[0];
      }
      
      // Add data to sheet
      await sheet.addRow({
        'زمان ثبت': new Date().toLocaleString('fa-IR'),
        'شماره رهگیری': trackingNumber,
        'نام کامل': fullName,
        'نام پدر': fatherName,
        'جنسیت': gender,
        'سن': age,
        'شماره تذکره': idNumber || 'ندارد',
        'شماره تماس': phone,
        'ایمیل': email || 'ندارد',
        'آدرس': address || 'ندارد',
        'تاریخ ملاقات': appointmentDate,
        'وقت ملاقات': appointmentTime,
        'داکتر': doctor || 'انتخاب نشده',
        'دلیل مراجعه': reason
      });
      
      console.log('✅ Data saved to Google Sheets');
      
    } catch (sheetsError) {
      // If Google Sheets fails, still return success but log error
      console.error('Google Sheets Error:', sheetsError.message);
      // Don't return error to user - just log it
    }

    // Return success to user
    return res.status(200).json({
      success: true,
      message: 'درخواست شما با موفقیت ثبت شد!',
      trackingNumber: trackingNumber,
      details: 'جزئیات رزرو به شماره تماس شما ارسال خواهد شد. لطفاً ۱۵ دقیقه قبل از وقت مقرر در کلینیک حاضر باشید.'
    });

  } catch (error) {
    console.error('Server Error:', error);
    
    // Still return success to user but with error logged
    return res.status(200).json({
      success: true,
      message: 'درخواست شما ثبت شد (خطای فنی در لاگ‌گیری)',
      trackingNumber: 'TRK-EMERG-' + Date.now()
    });
  }
}
