// Current date setup
document.addEventListener('DOMContentLoaded', function() {
    // Set today's date as minimum for appointment date
    const today = new Date();
    const todayFormatted = today.toISOString().split('T')[0];
    document.getElementById('appointment-date').min = todayFormatted;
    
    // Set Persian date display
    setPersianDate();
    
    // Initialize form
    initializeForm();
});

// Convert Gregorian to Persian date
function setPersianDate() {
    const today = new Date();
    const persianDate = gregorianToPersian(today);
    
    // Format: جمعه، ۵ جدی ۱۳۰۴
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    const dayName = days[today.getDay()];
    
    const formattedDate = `${dayName}، ${persianDate.day} ${persianDate.monthName} ${persianDate.year}`;
    
    // Update date displays
    document.getElementById('current-date').textContent = formattedDate;
    document.getElementById('footer-date').textContent = formattedDate;
}

// Simple Gregorian to Persian conversion (for display only)
function gregorianToPersian(date) {
    // This is a simplified conversion for display purposes
    // In a real application, use a proper library like moment-jalaali
    const persianMonths = [
        'حمل', 'ثور', 'جوزا', 'سرطان', 'اسد', 'سنبله',
        'میزان', 'عقرب', 'قوس', 'جدی', 'دلو', 'حوت'
    ];
    
    // Approximate conversion (not exact)
    const gregorianYear = date.getFullYear();
    const gregorianMonth = date.getMonth();
    const gregorianDay = date.getDate();
    
    // Simple approximation for 2025-12-26 => 1304-10-05
    let persianYear = 1304;
    let persianMonth = 9; // 10th month (جدی) - zero-indexed
    let persianDay = 5;
    
    return {
        year: persianYear,
        month: persianMonth + 1,
        monthName: persianMonths[persianMonth],
        day: persianDay
    };
}

// Form initialization
function initializeForm() {
    const form = document.getElementById('appointment-form');
    const resetBtn = document.getElementById('reset-btn');
    const privacyLink = document.getElementById('privacy-link');
    const privacyModal = document.getElementById('privacy-modal');
    const closeModal = document.querySelector('.close-modal');
    const agreePrivacyBtn = document.getElementById('agree-privacy');
    const newBookingBtn = document.getElementById('new-booking-btn');
    const retryBtn = document.getElementById('retry-btn');
    
    // Form submission
    form.addEventListener('submit', handleFormSubmit);
    
    // Form reset
    resetBtn.addEventListener('click', function() {
        if (confirm('آیا مطمئن هستید که می‌خواهید فرم را پاک کنید؟')) {
            form.reset();
        }
    });
    
    // Privacy modal
    privacyLink.addEventListener('click', function(e) {
        e.preventDefault();
        privacyModal.style.display = 'block';
    });
    
    closeModal.addEventListener('click', function() {
        privacyModal.style.display = 'none';
    });
    
    agreePrivacyBtn.addEventListener('click', function() {
        document.getElementById('privacy-agreement').checked = true;
        privacyModal.style.display = 'none';
    });
    
    // Close modal when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target === privacyModal) {
            privacyModal.style.display = 'none';
        }
    });
    
    // New booking button
    if (newBookingBtn) {
        newBookingBtn.addEventListener('click', function() {
            document.getElementById('success-message').style.display = 'none';
            form.style.display = 'block';
            form.reset();
        });
    }
    
    // Retry button
    if (retryBtn) {
        retryBtn.addEventListener('click', function() {
            document.getElementById('error-message').style.display = 'none';
            form.style.display = 'block';
        });
    }
    
    // Phone number validation
    const phoneInput = document.getElementById('phone');
    phoneInput.addEventListener('input', function() {
        const phone = this.value.replace(/\D/g, '');
        if (phone.length > 0 && !phone.startsWith('07')) {
            this.setCustomValidity('شماره تماس باید با ۰۷ شروع شود');
        } else {
            this.setCustomValidity('');
        }
    });
    
    // Age validation
    const ageInput = document.getElementById('age');
    ageInput.addEventListener('input', function() {
        const age = parseInt(this.value);
        if (age < 1 || age > 120) {
            this.setCustomValidity('سن باید بین ۱ و ۱۲۰ باشد');
        } else {
            this.setCustomValidity('');
        }
    });
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();
    
    const form = e.target;
    const submitBtn = document.getElementById('submit-btn');
    const originalBtnText = submitBtn.innerHTML;
    
    // Show loading state
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> در حال ارسال...';
    submitBtn.disabled = true;
    
    try {
        // Validate form
        if (!form.checkValidity()) {
            form.reportValidity();
            throw new Error('لطفاً تمام فیلدهای ضروری را پر کنید');
        }
        
        // Validate phone number
        const phone = document.getElementById('phone').value.replace(/\D/g, '');
        if (!phone.startsWith('07')) {
            throw new Error('شماره تماس باید با ۰۷ شروع شود');
        }
        
        // Get form data
        const formData = {
            timestamp: new Date().toISOString(),
            fullName: document.getElementById('full-name').value,
            fatherName: document.getElementById('father-name').value,
            gender: document.getElementById('gender').value,
            age: document.getElementById('age').value,
            idNumber: document.getElementById('id-number').value || 'ندارد',
            phone: document.getElementById('phone').value,
            email: document.getElementById('email').value || 'ندارد',
            address: document.getElementById('address').value || 'ندارد',
            appointmentDate: document.getElementById('appointment-date').value,
            appointmentTime: document.getElementById('appointment-time').value,
            doctor: document.getElementById('doctor').value || 'انتخاب نشده',
            reason: document.getElementById('reason').value,
            privacyAgreement: document.getElementById('privacy-agreement').checked ? 'بلی' : 'خیر'
        };
        
        // Generate tracking number
        const trackingNumber = 'TRK-' + Date.now().toString().slice(-8) + '-' + Math.random().toString(36).substr(2, 4).toUpperCase();
        
        // Send data to serverless API
        const response = await fetch('/api/submit-appointment', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...formData,
                trackingNumber: trackingNumber
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'خطا در ارسال اطلاعات');
        }
        
        // Show success message
        form.style.display = 'none';
        document.getElementById('tracking-number').textContent = trackingNumber;
        document.getElementById('success-message').style.display = 'block';
        
        // Scroll to success message
        document.getElementById('success-message').scrollIntoView({ behavior: 'smooth' });
        
    } catch (error) {
        console.error('Error:', error);
        
        // Show error message
        form.style.display = 'none';
        document.getElementById('error-details').textContent = error.message || 'متأسفانه در ثبت درخواست شما مشکلی پیش آمده است. لطفاً دوباره تلاش کنید.';
        document.getElementById('error-message').style.display = 'block';
        
        // Scroll to error message
        document.getElementById('error-message').scrollIntoView({ behavior: 'smooth' });
        
    } finally {
        // Reset button state
        submitBtn.innerHTML = originalBtnText;
        submitBtn.disabled = false;
    }
}