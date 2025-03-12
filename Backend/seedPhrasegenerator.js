const words = [
  "apple", "banana", "crypto", "ledger", "wallet", "secure", "trust",
  "blockchain", "digital", "future", "token", "bitcoin"
];

function generateSeedPhrase(length) {
  let seedPhrase = [];
  for (let i = 0; i < length; i++) {
    seedPhrase.push(words[Math.floor(Math.random() * words.length)]);
  }
  return seedPhrase.join(" ");
}

module.exports = generateSeedPhrase;
