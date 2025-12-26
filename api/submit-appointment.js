const { GoogleSpreadsheet } = require('google-spreadsheet');

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Just test if it works
    const trackingNumber = 'TRK-' + Date.now();
    
    return res.status(200).json({
      success: true,
      message: 'درخواست ثبت شد',
      trackingNumber: trackingNumber
    });
    
  } catch (error) {
    return res.status(200).json({
      success: true,
      message: 'تست موفق',
      trackingNumber: 'TRK-TEST-123'
    });
  }
}
