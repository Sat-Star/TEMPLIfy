// Get product details from URL
const params = new URLSearchParams(window.location.search);
const templateId = params.get("id");
const API_BASE_URL = "https://templify-zhhw.onrender.com";

let isFree = false;
let productName = "Creative Portfolio Template - Stand Out Online";
let originalPrice = 199;
let discountedPrice = 149;
let finalPrice = 149;
let templateFileUrl = null;
let template = null;
let appliedCoupon = null;
let downloadToken = null;

// Set product info (will be updated after fetching template details)
function updatePriceDisplay() {
  if (document.getElementById("productName"))
    document.getElementById("productName").textContent = productName;
  if (document.getElementById("originalPrice"))
    document.getElementById("originalPrice").textContent =
      isFree || originalPrice === discountedPrice ? "" : `₹${originalPrice}`;
  const roundedFinalPrice = Math.round(finalPrice * 100) / 100;
  if (document.getElementById("finalPrice"))
    document.getElementById("finalPrice").textContent = isFree
      ? "FREE"
      : `₹${roundedFinalPrice}`;
  if (document.getElementById("purchaseDetails"))
    document.getElementById("purchaseDetails").textContent = isFree
      ? `Thank you for downloading ${productName} (FREE)`
      : `Thank you for purchasing ${productName} (₹${roundedFinalPrice})`;
  if (
    (isFree || originalPrice === discountedPrice) &&
    document.getElementById("discountBadge")
  ) {
    document.getElementById("discountBadge").style.display = "none";
  }

  // Apply free template UI changes if needed
  const urlParams = new URLSearchParams(window.location.search);
  const urlIsFree =
    urlParams.get("free") === "true" || urlParams.get("price") === "0";
  if (isFree || urlIsFree) {
    const couponSection = document.getElementById("couponSection");
    if (couponSection) couponSection.style.display = "none";

    document.getElementById("originalPrice").style.display = "none";
    document.getElementById("discountBadge").style.display = "none";

    if (isFree) {
      document.getElementById("finalPrice").textContent = "FREE";
      document.getElementById("finalPrice").style.color =
        "var(--success-green)";
    }

    const payBtnIcon = document.getElementById("payBtnIcon");
    if (payBtnIcon) payBtnIcon.className = "fas fa-download";

    const payBtnText = document.getElementById("payBtnText");
    if (payBtnText) payBtnText.textContent = "Download";
  }
}

// Razorpay configuration
const RAZORPAY_KEY_ID = "rzp_live_sx5YOFYvieWsEx";

// Fetch template details (including fileUrl) before payment
async function fetchTemplateDetails() {
  if (!templateId) return;
  try {
    const res = await fetch(`${API_BASE_URL}/api/templates/${templateId}`);
    template = await res.json();
    templateFileUrl = template.fileUrl;
    productName =
      template.name || "Creative Portfolio Template - Stand Out Online";
    isFree = !!template.isFree;
    originalPrice = Number(template.price) || 199;
    discountedPrice =
      typeof template.discountedPrice !== "undefined" &&
      template.discountedPrice !== null &&
      template.discountedPrice !== "" &&
      Number(template.discountedPrice) < Number(template.price)
        ? Number(template.discountedPrice)
        : Number(template.price);
    finalPrice = discountedPrice;
    updatePriceDisplay();

    // Update discount badge if there's a discount
    const discountBadge = document.getElementById("discountBadge");
    if (originalPrice > discountedPrice) {
      const discountPercent = Math.round(
        ((originalPrice - discountedPrice) / originalPrice) * 100,
      );
      discountBadge.textContent = `${discountPercent}% OFF`;
      discountBadge.style.display = "inline";
    }
  } catch (err) {
    templateFileUrl = null;
    console.error("Error fetching template details:", err);
  }
}

fetchTemplateDetails();

const razorpayConfig = {
  key: RAZORPAY_KEY_ID,
  amount: 0, // will be set before payment
  currency: "INR",
  name: "TEMPLIfy",
  description: `Purchase: ${productName}`,
  image: "https://your-logo-url.com/logo.png",
  order_id: "",
  handler: async function (response) {
    document.getElementById("rzp-button").innerHTML =
      '<span class="loading"></span> Verifying Payment...';
    const verificationResult = await verifyPayment(response);
    // verificationResult is the parsed JSON from the server
    if (verificationResult && verificationResult.success) {
      // if server returned a downloadToken, save it and build the protected download URL
      if (verificationResult.downloadToken) {
        downloadToken = verificationResult.downloadToken;
        templateFileUrl = `${API_BASE_URL}/api/download/${verificationResult.downloadToken}`;
      }
      // If coupon was applied, increment its usage in backend
      if (appliedCoupon && appliedCoupon.code) {
        try {
          await fetch(`${API_BASE_URL}/api/coupons/increment`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ code: appliedCoupon.code }),
          });
        } catch (err) {
          // Optionally log error, but don't block user
        }
      }
      showSuccess();
      startDownload();
    } else {
      showError("Payment verification failed. Please contact support.");
    }
  },
  prefill: {
    name: "Customer Name",
    email: "customer@example.com",
    contact: "9999999999",
  },
  notes: {
    product: productName,
    price: originalPrice,
  },
  theme: {
    color: "#2563eb",
  },
};

// Initialize Razorpay or Download for free
if (document.getElementById("rzp-button")) {
  document.getElementById("rzp-button").onclick = async function (e) {
    e.preventDefault();
    // Validate customer details
    const nameInput = document.getElementById("customerName");
    const emailInput = document.getElementById("customerEmail");
    const contactInput = document.getElementById("customerContact");
    if (
      !nameInput.value.trim() ||
      !emailInput.value.trim() ||
      !contactInput.value.trim()
    ) {
      showError("Please fill in all customer details.");
      return;
    }
    // Basic email and contact validation
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const contactPattern = /^[0-9]{10,15}$/;
    if (!emailPattern.test(emailInput.value.trim())) {
      showError("Please enter a valid email address.");
      return;
    }
    if (!contactPattern.test(contactInput.value.trim())) {
      showError("Please enter a valid contact number (10-15 digits).");
      return;
    }
    if (isFree || finalPrice === 0) {
      // For free templates or 100% discount, just start download
      this.innerHTML = '<span class="loading"></span> Preparing Download...';
      setTimeout(() => {
        showSuccess();
        startDownload();
        this.innerHTML = '<i class="fas fa-download"></i> Download';
      }, 800);
      return;
    }
    // ...existing payment logic for paid templates...
    this.innerHTML = '<span class="loading"></span> Processing...';
    try {
      razorpayConfig.prefill.name = nameInput.value.trim();
      razorpayConfig.prefill.email = emailInput.value.trim();
      razorpayConfig.prefill.contact = contactInput.value.trim();
      // Update amount with coupon discount if applied, always integer paise
      razorpayConfig.amount = Math.round(finalPrice * 100);
      razorpayConfig.notes.finalPrice = finalPrice;
      razorpayConfig.notes.product = productName;
      razorpayConfig.notes.price = originalPrice;
      if (appliedCoupon) {
        razorpayConfig.notes.couponCode = appliedCoupon.code;
        razorpayConfig.notes.discount = appliedCoupon.discount;
      }
      const orderId = await createRazorpayOrder();
      if (!orderId) {
        showError("Could not create payment order");
        return;
      }
      razorpayConfig.order_id = orderId;
      const rzp = new Razorpay(razorpayConfig);
      rzp.open();
      rzp.on("payment.failed", function (response) {
        showError("Payment failed. Please try again.");
      });
    } catch (err) {
      showError("An error occurred. Please try again.");
    } finally {
      this.innerHTML = '<i class="fas fa-lock"></i> Secure Payment';
    }
  };
}

// Create Razorpay order (replace with actual backend call)
async function createRazorpayOrder() {
  // Call backend to create real Razorpay order
  const response = await fetch(`${API_BASE_URL}/api/create-razorpay-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      amount: razorpayConfig.amount,
      currency: razorpayConfig.currency,
      receipt: `receipt_${templateId}_${Date.now()}`,
      coupon: appliedCoupon ? appliedCoupon.code : null,
    }),
  });
  const data = await response.json();
  return data.orderId;
}

// Simulate payment verification (replace with actual API call)
async function verifyPayment(paymentResponse) {
  // In production, call your backend to verify
  // Razorpay sends: razorpay_payment_id, razorpay_order_id, razorpay_signature
  try {
    const response = await fetch(`${API_BASE_URL}/api/verify-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpay_payment_id: paymentResponse.razorpay_payment_id,
        razorpay_order_id: paymentResponse.razorpay_order_id,
        razorpay_signature: paymentResponse.razorpay_signature,
        templateId: templateId,
      }),
    });
    const data = await response.json();
    return data;
  } catch (err) {
    return { success: false };
  }
}

function showSuccess() {
  document.getElementById("paymentSection").style.display = "none";
  document.getElementById("errorSection").style.display = "none";
  document.getElementById("successSection").style.display = "block";
}

function showError(message) {
  document.getElementById("errorMessage").textContent = message;
  document.getElementById("paymentSection").style.display = "none";
  document.getElementById("successSection").style.display = "none";
  document.getElementById("errorSection").style.display = "block";
}

function showPaymentSection() {
  document.getElementById("paymentSection").style.display = "block";
  document.getElementById("errorSection").style.display = "none";
  document.getElementById("successSection").style.display = "none";
}

function startDownload() {
  // Prefer explicit templateFileUrl; fallback to downloadToken if present
  let finalUrl = templateFileUrl;
  if (!finalUrl && downloadToken) {
    finalUrl = `${API_BASE_URL}/api/download/${downloadToken}`;
    // cache it for future retries
    templateFileUrl = finalUrl;
  }
  if (!finalUrl) {
    // show clearer UI message instead of simple alert
    showError(
      "No downloadable file available. If you just completed payment, please wait a few seconds and try again or contact support.",
    );
    return;
  }

  setTimeout(() => {
    const link = document.createElement("a");
    link.href = finalUrl;
    link.download = `${productName.replace(/\s+/g, "_")}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    if (document.getElementById("downloadBtn"))
      document.getElementById("downloadBtn").innerHTML =
        '<i class="fas fa-check"></i> Download Started!';
  }, 1000);
}

// Manual download trigger
if (document.getElementById("downloadBtn"))
  document
    .getElementById("downloadBtn")
    .addEventListener("click", startDownload);

// Coupon System Implementation (disable for free templates)
if (document.getElementById("applyCouponBtn")) {
  document
    .getElementById("applyCouponBtn")
    .addEventListener("click", applyCoupon);
}

async function applyCoupon() {
  const couponCode = document.getElementById("couponCode").value.trim();
  const couponMessage = document.getElementById("couponMessage");
  if (!couponCode) {
    couponMessage.textContent = "Please enter a coupon code";
    couponMessage.className = "coupon-message coupon-error";
    return;
  }
  document.getElementById("applyCouponBtn").innerHTML =
    '<span class="loading"></span>';
  document.getElementById("applyCouponBtn").disabled = true;
  try {
    const response = await fetch(`${API_BASE_URL}/api/coupons/validate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: couponCode }),
    });
    const data = await response.json();
    if (!response.ok) {
      couponMessage.textContent = data.error || "Invalid coupon code.";
      couponMessage.className = "coupon-message coupon-error";
      appliedCoupon = null;
      finalPrice = discountedPrice;
      updatePriceDisplay();
      document.getElementById("discountBadge").style.display = "none";
    } else {
      appliedCoupon = {
        code: data.code,
        discount: data.discount,
        type: data.type,
      };
      // Calculate discounted price
      if (data.type === "percentage") {
        finalPrice = discountedPrice - (discountedPrice * data.discount) / 100;
      } else if (data.type === "fixed") {
        finalPrice = Math.max(discountedPrice - data.discount, 0);
      }
      updatePriceDisplay();
      document.getElementById("discountBadge").textContent = `${data.discount}${
        data.type === "percentage" ? "%" : "₹"
      } OFF`;
      document.getElementById("discountBadge").style.display = "inline";
      couponMessage.textContent = `Coupon applied successfully! You saved ${
        data.type === "percentage" ? data.discount + "%" : "₹" + data.discount
      }.`;
      couponMessage.className = "coupon-message coupon-success";
    }
  } catch (err) {
    couponMessage.textContent = "Error validating coupon. Please try again.";
    couponMessage.className = "coupon-message coupon-error";
    appliedCoupon = null;
    finalPrice = originalPrice;
    document.getElementById("finalPrice").textContent = `₹${finalPrice}`;
    document.getElementById("discountBadge").style.display = "none";
  }
  document.getElementById("applyCouponBtn").innerHTML = "Apply";
  document.getElementById("applyCouponBtn").disabled = false;
}
