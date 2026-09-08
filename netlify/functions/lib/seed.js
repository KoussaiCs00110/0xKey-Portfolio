// =================================================
// CTF challenge store — seed data (migration).
// These are the previously-hardcoded challenges, migrated
// verbatim (same ids, salts, hashes) so existing links keep
// working. Plaintext flags were never in the repo.
// =================================================

const SEED_CHALLENGES = [
  {
    id: "web-01",
    title: "Cookie Monster",
    description: "A login page claims 'admin only'. Find a way in.",
    category: "web",
    difficulty: "easy",
    salt: "82ff14beaeed80a7f82af57f16b8401ac87fa4b6904db0ca801c8391e2108fac",
    flagHash: "04760e228fa64096699a8c642b7feb7dbe216848b8398359d2b989f145ec4277",
    writeup: "The application stored the role in a base64-encoded cookie. Decoding and changing user to admin, then re-encoding, granted access.",
    attachments: [],
    status: "published",
    deleted: false,
    order: 1,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "crypto-01",
    title: "Broken Cipher",
    description: "An encrypted message was intercepted. The key is weaker than it looks.",
    category: "crypto",
    difficulty: "medium",
    salt: "fc539435db8ab4a57d69e2bfeeaf4ede823f0d9d3640e5f1883fb4c1e0ff5cfd",
    flagHash: "fe94458e66529fc6be475609da91e23a95c5095de5b26746bcff58638815ca50",
    writeup: "The cipher used a simple XOR with a repeating single-byte key. Frequency analysis on the ciphertext revealed the key byte.",
    attachments: [],
    status: "published",
    deleted: false,
    order: 2,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "rev-01",
    title: "Patchwork",
    description: "This binary refuses to print the secret. Make it cooperate.",
    category: "reverse",
    difficulty: "medium",
    salt: "241bb891474e3159abc94b2ccf52caddfa959abfbb20f3a20bed280fc30d1dfc",
    flagHash: "40b264d20e0be07ff60305bfe4374d5c2177ea16ec37311b78f59bd01aec1cf2",
    writeup: "Ghidra showed a conditional jump that skipped the flag print. Patching the JZ to JNZ revealed the flag.",
    attachments: [],
    status: "published",
    deleted: false,
    order: 3,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "forensics-01",
    title: "Hidden in Plain Sight",
    description: "A disk image was recovered. Something was deleted... or was it?",
    category: "forensics",
    difficulty: "hard",
    salt: "c3d909f4557a56298b01d159b4bc2a04267b3ab8ab0a4807bfa4ee07f0949001",
    flagHash: "2cede71afcfb59a3b3f4e6b6a6b960a3730cf42f78bae0a303a1cb9bf2972c2c",
    writeup: "Using Autopsy, a deleted file was recovered from unallocated space. The flag was embedded in the alternate data stream.",
    attachments: [],
    status: "published",
    deleted: false,
    order: 4,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  },
  {
    id: "pwn-01",
    title: "Overflow Express",
    description: "This service takes your name. Give it something extra.",
    category: "pwn",
    difficulty: "hard",
    salt: "a781e9145c3a48181b5b9b4edc1ed2d60c3a7719c0678b2ded67eee814380ae0",
    flagHash: "d1dc7006dcb142e7760984b1dabe3a797d2ea41a01ebf4839e32adc24f13fd09",
    writeup: "The gets() call had no bounds checking. A 64-byte input overwrote the return address to point to the win() function.",
    attachments: [],
    status: "published",
    deleted: false,
    order: 5,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z"
  }
];

module.exports = { SEED_CHALLENGES };
