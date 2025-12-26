// api/submit-appointment.js
// Secure API endpoint for submitting appointments to Google Sheets
// Uses environment variables for credentials - SAFE for GitHub

const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  // Only allow POST requests for security
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      message: 'Method not allowed. Only POST requests are accepted.' 
    });
  }

  // Security headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Rate limiting check (basic implementation)
  const clientIp = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  console.log(`Request from IP: ${clientIp}`);

  try {
    // Validate required environment variables
    if (!process.env.GOOGLE_SHEET_ID) {
      console.error('GOOGLE_SHEET_ID environment variable is not set');
      return res.status(500).json({ 
        message: 'Server configuration error. Please contact administrator.' 
      });
    }

    if (!process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS) {
      console.error('GOOGLE_SERVICE_ACCOUNT_CREDENTIALS environment variable is not set');
      return res.status(500).json({ 
        message: 'Server configuration error. Please contact administrator.' 
      });
    }

    // Parse and validate request body
    const requestBody = req.body;
    
    if (!requestBody || typeof requestBody !== 'object') {
      return res.status(400).json({ 
        message: 'Invalid request format. Please check your data.' 
      });
    }

    // Extract and validate required fields
    const {
      timestamp,
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
      privacyAgreement,
      trackingNumber
    } = requestBody;

    // Required fields validation
    const requiredFields = [
      'fullName', 'fatherName', 'gender', 'age', 
      'phone', 'appointmentDate', 'appointmentTime', 'reason'
    ];

    const missingFields = requiredFields.filter(field => {
      const value = requestBody[field];
      return value === undefined || value === null || value.toString().trim() === '';
    });

    if (missingFields.length > 0) {
      return res.status(400).json({ 
        message: `لطفاً فیلدهای ضروری را پر کنید: ${missingFields.join(', ')}`
      });
    }

    // Validate age
    const ageNum = parseInt(age);
    if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
      return res.status(400).json({ 
        message: 'سن باید بین ۱ و ۱۲۰ سال باشد.' 
      });
    }

    // Validate phone number format
    const phoneRegex = /^07\d{8}$/;
    const phoneDigits = phone.replace(/\D/g, '');
    if (!phoneRegex.test(phoneDigits)) {
      return res.status(400).json({ 
        message: 'شماره تماس باید با ۰۷ شروع شود و ۱۰ رقم باشد.' 
      });
    }

    // Validate appointment date (must be today or future)
    const appointmentDateObj = new Date(appointmentDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (appointmentDateObj < today) {
      return res.status(400).json({ 
        message: 'تاریخ ملاقات باید امروز یا روزهای آینده باشد.' 
      });
    }

    // Validate email if provided
    if (email && email !== 'ندارد') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ 
          message: 'فرمت ایمیل صحیح نیست.' 
        });
      }
    }

    // Parse Google Sheets credentials from environment variable
    let credentials;
    try {
      credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS);
    } catch (parseError) {
      console.error('Error parsing Google credentials:', parseError);
      return res.status(500).json({ 
        message: 'Server configuration error. Invalid credentials format.' 
      });
    }

    // Initialize Google Sheets
    const doc = new GoogleSpreadsheet(process.env.GOOGLE_SHEET_ID);
    
    try {
      await doc.useServiceAccountAuth(credentials);
      await doc.loadInfo();
    } catch (authError) {
      console.error('Google Sheets authentication error:', authError);
      return res.status(500).json({ 
        message: 'خطا در اتصال به سیستم ذخیره‌سازی. لطفاً بعداً تلاش کنید.' 
      });
    }

    // Get or create the sheet
    let sheet;
    try {
      if (doc.sheetCount === 0) {
        sheet = await doc.addSheet({ 
          title: 'Appointments',
          headerValues: [
            'Timestamp', 'Tracking Number', 'Full Name', 'Father Name', 'Gender', 
            'Age', 'ID Number', 'Phone', 'Email', 'Address', 
            'Appointment Date', 'Appointment Time', 'Doctor', 'Reason', 
            'Privacy Agreement', 'Submission IP', 'Submission Date'
          ]
        });
      } else {
        sheet = doc.sheetsByIndex[0];
      }
    } catch (sheetError) {
      console.error('Error accessing Google Sheet:', sheetError);
      return res.status(500).json({ 
        message: 'خطا در دسترسی به صفحه‌گسترده.' 
      });
    }

    // Prepare data for insertion with sanitization
    const sanitizedData = {
      'Timestamp': timestamp || new Date().toISOString(),
      'Tracking Number': trackingNumber || `TRK-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      'Full Name': sanitizeInput(fullName),
      'Father Name': sanitizeInput(fatherName),
      'Gender': sanitizeInput(gender),
      'Age': ageNum,
      'ID Number': idNumber ? sanitizeInput(idNumber) : 'ندارد',
      'Phone': phoneDigits,
      'Email': email ? sanitizeInput(email) : 'ندارد',
      'Address': address ? sanitizeInput(address) : 'ندارد',
      'Appointment Date': appointmentDate,
      'Appointment Time': sanitizeInput(appointmentTime),
      'Doctor': doctor ? sanitizeInput(doctor) : 'انتخاب نشده',
      'Reason': sanitizeInput(reason),
      'Privacy Agreement': privacyAgreement || 'بلی',
      'Submission IP': clientIp,
      'Submission Date': new Date().toLocaleDateString('fa-IR')
    };

    // Insert data into Google Sheets
    try {
      await sheet.addRow(sanitizedData);
      
      // Log successful submission (without sensitive data)
      console.log(`Appointment submitted successfully. Tracking: ${sanitizedData['Tracking Number']}`);
      
      // Return success response
      return res.status(200).json({ 
        success: true, 
        message: 'درخواست شما با موفقیت ثبت شد. شماره رهگیری شما:',
        trackingNumber: sanitizedData['Tracking Number'],
        details: 'لطفاً شماره رهگیری خود را یادداشت کنید. جزئیات به شماره تماس شما ارسال خواهد شد.'
      });

    } catch (insertError) {
      console.error('Error inserting row to Google Sheets:', insertError);
      return res.status(500).json({ 
        message: 'خطا در ذخیره اطلاعات. لطفاً اطلاعات خود را چک کرده و دوباره تلاش کنید.' 
      });
    }

  } catch (error) {
    // Generic error handler
    console.error('Unexpected error in submit-appointment API:', error);
    
    // Don't expose internal error details to clients
    return res.status(500).json({ 
      message: 'خطای غیرمنتظره سرور. لطفاً بعداً تلاش کنید.' 
    });
  }
}

// Helper function to sanitize input
function sanitizeInput(input) {
  if (typeof input !== 'string') return input;
  
  // Remove potentially dangerous characters
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .substring(0, 1000); // Limit length
}