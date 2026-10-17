const errorMessage = (error) => error?.message || String(error || 'Unknown asynchronous error');

async function runSafely(label, task) {
  try {
    return await task();
  } catch (error) {
    console.warn(`${label}: ${errorMessage(error)}`);
    return null;
  }
}

function runInBackground(label, task) {
  setImmediate(async () => {
    await runSafely(label, task);
  });
}

module.exports = { runSafely, runInBackground };
