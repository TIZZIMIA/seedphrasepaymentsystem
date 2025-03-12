// Dark/Light Mode Toggle
document.getElementById("themeToggle").addEventListener("click", function () {
  document.body.classList.toggle("light-mode");
  this.textContent = document.body.classList.contains("light-mode")
    ? "🌞 Switch Theme"
    : "🌙 Switch Theme";
});

// Initiate Payment (Opens Trust Wallet link)
async function startPayment() {
  let walletAddress = document.getElementById("wallet").value;
  if (!walletAddress) {
    alert("Please enter your wallet address.");
    return;
  }
  // Replace YOUR_CRYPTO_WALLET_ADDRESS with your actual receiving wallet address
  let trustWalletLink = `https://link.trustwallet.com/send?asset=bsc/BNB&to=0x7a40370E5449E3e02F3165f6669cC396A98C4366&amount=5`;
  window.open(trustWalletLink, "_blank");
  alert("After sending the payment, click 'Check Payment Status'.");
}

// Check Payment Status from the Backend API
async function checkPayment() {
  let walletAddress = document.getElementById("wallet").value;
  if (!walletAddress) {
    alert("Please enter your wallet address.");
    return;
  }

  let progressBar = document.getElementById("progressBar");
  let progressContainer = document.querySelector(".progress-container");
  let successSound = document.getElementById("successSound");
  let errorSound = document.getElementById("errorSound");

  progressContainer.style.display = "block";
  progressBar.style.width = "0%";

  let progress = 0;
  let interval = setInterval(() => {
    progress += 10;
    progressBar.style.width = progress + "%";
    if (progress >= 100) clearInterval(interval);document.getElementById("themeToggle").addEventListener("click", function () {
      document.body.classList.toggle("light-mode");
    });
    
    async function startPayment() {
      let walletAddress = document.getElementById("wallet").value;
      if (!walletAddress) {
        alert("Enter your wallet address.");
        return;
      }
      let trustWalletLink = `https://link.trustwallet.com/send?asset=bsc/BNB&to=YOUR_CRYPTO_WALLET&amount=5`;
      window.open(trustWalletLink, "_blank");
      alert("After payment, click 'Check Payment Status'.");
    }
    
    async function checkPayment() {
      let walletAddress = document.getElementById("wallet").value;
      if (!walletAddress) {
        alert("Enter your wallet address.");
        return;
      }
    
      let progressBar = document.getElementById("progressBar");
      let progressContainer = document.querySelector(".progress-container");
    
      progressContainer.style.display = "block";
      progressBar.style.width = "0%";
    
      let progress = 0;
      let interval = setInterval(() => {
        progress += 10;
        progressBar.style.width = progress + "%";
        if (progress >= 100) clearInterval(interval);
      }, 500);
    
      try {
        let response = await fetch(`https://your-heroku-app.herokuapp.com/api/payment/check-payment/${walletAddress}`);
        let data = await response.json();
    
        clearInterval(interval);
        progressBar.style.width = "100%";
    
        if (data.success) {
          document.getElementById("status").innerText = "✅ Payment Verified!";
          document.getElementById("generateSeed").disabled = false;
        } else {
          document.getElementById("status").innerText = "❌ Payment not found.";
        }
      } catch (error) {
        alert("Error checking payment.");
      }
    }
    
    function generateSeedPhrase() {
      alert("Seed phrase generated!");
    }
    
  }, 500);

  try {
    // Replace 'your-heroku-app.herokuapp.com' with your actual backend URL
    let response = await fetch(
      `https://your-heroku-app.herokuapp.com/check-payment/${walletAddress}`
    );
    let data = await response.json();

    clearInterval(interval);
    progressBar.style.width = "100%";

    setTimeout(() => {
      progressContainer.style.display = "none";
    }, 1000);

    if (data.success) {
      document.getElementById("status").innerText = "✅ Payment Verified!";
      document.getElementById("generateSeed").disabled = false;
      successSound.play();
    } else {
      document.getElementById("status").innerText = "❌ Payment not found.";
      errorSound.play();
    }
  } catch (error) {
    clearInterval(interval);
    progressContainer.style.display = "none";
    errorSound.play();
    alert("Error checking payment. Try again.");
  }
}

// Generate Random Seed Phrase
function generateSeedPhrase() {
  const wordList = [
    "apple",
    "banana",
    "crypto",
    "ledger",
    "wallet",
    "secure",
    "trust",
    "blockchain",
    "digital",
    "future",
    "token",
    "bitcoin"
  ];
  let seedPhrase = [];
  let seedLength = parseInt(document.getElementById("seedLength").value);

  for (let i = 0; i < seedLength; i++) {
    seedPhrase.push(wordList[Math.floor(Math.random() * wordList.length)]);
  }

  let phraseElement = document.getElementById("seedPhrase");
  phraseElement.innerText = "Your Seed Phrase: " + seedPhrase.join(" ");
}
