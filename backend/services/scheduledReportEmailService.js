function buildReportEmailPayload(schedule, reportData) {
  const title = schedule.title || 'ConMat Scheduled Report';
  const summaryLines = [
    `Report Type: ${schedule.reportType}`,
    `Frequency: ${schedule.frequency}`,
    `Generated At: ${new Date().toLocaleString('en-PK')}`,
    `Total Records: ${Array.isArray(reportData.records) ? reportData.records.length : 0}`,
  ];

  return {
    to: Array.isArray(schedule.recipients) ? schedule.recipients.join(',') : schedule.recipients,
    subject: `${title} - ${new Date().toLocaleDateString('en-PK')}`,
    html: `
      <div style="font-family:Arial,sans-serif;color:#0f172a">
        <h2>${title}</h2>
        <p>Your scheduled ConMat report is ready.</p>
        <ul>${summaryLines.map((line) => `<li>${line}</li>`).join('')}</ul>
        <p>Please open the admin dashboard for detailed charts and exports.</p>
      </div>
    `,
  };
}

module.exports = {
  buildReportEmailPayload,
};
