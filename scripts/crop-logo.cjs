const sharp = require("sharp");
// Deterministic crop of the supplied screenshot: no redraw or AI alteration.
sharp(
  "C:/Users/User/AppData/Local/Temp/codex-clipboard-184de361-9530-4e37-8b6a-32f110674e9e.png",
)
  .extract({ left: 45, top: 535, width: 590, height: 590 })
  .composite([
    {
      input: Buffer.from(
        '<svg width="590" height="590"><circle cx="295" cy="295" r="294" fill="white"/></svg>',
      ),
      blend: "dest-in",
    },
  ])
  .png()
  .toFile("public/sbk-logo.png");
