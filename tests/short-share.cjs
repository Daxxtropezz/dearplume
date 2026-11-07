// Compatibility launcher for older checkouts and package scripts.
// The share tests now use ESM in short-share.mjs.
import("./short-share.mjs").catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
