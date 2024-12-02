async function retryPayment(orderId, razorpayId) {

  try {
    const response = await axios.post('/retryPayment', {
      orderId,
      razorpayId
    })

    if (response.data.success) {
      const { orderId, amount, currency, name, email, phoneNumber, order } = response.data;
      const orderid = order._id;


      const options = {
        key: "rzp_test_X9NFs9mKeaCGys",
        amount: amount,
        currency: currency,
        name: "WatchPro",
        description: "Order Payment",
        order_id: orderId,
        handler: async function (response) {
          if (response.razorpay_payment_id && response.razorpay_order_id && response.razorpay_signature) {

            const orderId = response.razorpay_order_id;
            const result = await axios.post('/paymentSuccess', { orderid })
            if (result.data.success) {
              window.location.href = result.data.redirectUrl;
            } else {
              console.error("Payment success but server response indicates failure.");
              alert("Payment verification failed on server. Please contact support.");
            }
          } else {
            console.error("Missing Razorpay response values.");
            alert("Payment verification failed. Please try again.");
          }
        },
        prefill: {
          name: name || '',
          email: email || '',
          contact: phoneNumber || ''
        },
        theme: {
          color: "#3399cc"
        },
      };

      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function (response) {
        console.log("Payment failed:", response.error);
        const retryUrl = `/retryPaymentPage/${orderid}`;
        window.location.href = retryUrl;
      });

      rzp.open();
    } else {
      Toastify({
        text: "Order creation failed. Please try again.",
        duration: 3000,
        close: true,
        gravity: "top",
        position: "right",
        backgroundColor: "#FF0000",
        stopOnFocus: true,
      }).showToast();
    }
  } catch (error) {
    console.log(error);

  }
}
