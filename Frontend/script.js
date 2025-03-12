const backendURL = "https://your-app.onrender.com"; // Replace with your Render backend URL

document.getElementById("checkPayment").addEventListener("click", async () => {
    const walletAddress = document.getElementById("walletAddress").value;

    if (!walletAddress) {
        alert("Please enter your wallet address.");
        return;
    }

    document.getElementById("paymentStatus").innerText = "Checking payment...";
    
    try {
        const response = await fetch(`${backendURL}/api/payment/check-payment/${walletAddress}`);
        const data = await response.json();
        
        if (data.success) {
            document.getElementById("paymentStatus").innerText = "Payment verified!";
        } else {
            document.getElementById("paymentStatus").innerText = "Payment not found.";
        }
    } catch (error) {
        console.error("Error checking payment:", error);
        document.getElementById("paymentStatus").innerText = "Error verifying payment.";
    }
});

document.getElementById("generateBtn").addEventListener("click", async () => {
    const phraseLength = document.getElementById("phraseLength").value;
    const response = await fetch(`${backendURL}/api/seedphrase/${phraseLength}`);
    const data = await response.json();
    
    document.getElementById("seedPhrase").innerText = data.seedPhrase;
});

document.addEventListener("DOMContentLoaded", function () {
    const phraseLengthSelect = document.getElementById("phrase-length");
    const payWithBankButton = document.getElementById("pay-with-bank");
    const payWithCryptoButton = document.getElementById("pay-with-crypto");
    const progressBar = document.getElementById("progress-bar");
    const statusMessage = document.getElementById("status-message");
    const seedPhraseDisplay = document.getElementById("seed-phrase");
    
    const backendUrl = "https://your-render-backend-url.com";
    
    function checkPaymentStatus(walletAddress) {
        statusMessage.textContent = "Verifying payment...";
        document.querySelector(".progress-container").style.display = "block";
        progressBar.style.width = "50%";
        
        fetch(`${backendUrl}/api/payment/check-payment/${walletAddress}`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    progressBar.style.width = "100%";
                    statusMessage.textContent = "Payment confirmed! Generating seed phrase...";
                    generateSeedPhrase();
                } else {
                    statusMessage.textContent = "Payment not confirmed. Please try again.";
                    progressBar.style.width = "0%";
                }
            })
            .catch(error => {
                console.error("Error checking payment:", error);
                statusMessage.textContent = "Error verifying payment.";
            });
    }
    
    function generateSeedPhrase() {
        const length = phraseLengthSelect.value;
        fetch(`${backendUrl}/api/seedphrase/${length}`)
            .then(response => response.json())
            .then(data => {
                seedPhraseDisplay.textContent = data.seedPhrase;
                seedPhraseDisplay.classList.remove("hidden");
            })
            .catch(error => {
                console.error("Error generating seed phrase:", error);
                statusMessage.textContent = "Error generating seed phrase.";
            });
    }
    
    payWithBankButton.addEventListener("click", function () {
        statusMessage.textContent = "Proceed with bank transfer...";
    });
    
    payWithCryptoButton.addEventListener("click", function () {
        const trustWalletUrl = "https://link.trustwallet.com/send?asset=BNB&to=0x7a40370E5449E3e02F3165f6669cC396A98C4366&amount=5";
        window.location.href = trustWalletUrl;
        
        setTimeout(() => {
            checkPaymentStatus("0x7a40370E5449E3e02F3165f6669cC396A98C4366");
        }, 15000);
    });
});
