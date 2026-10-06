/**
 * backend/src/controllers/scanController.js
 * ─────────────────────────────────────────
 * Controller for scan lifecycle, status, telemetry, and background runner invocation.
 */

const { spawn } = require('child_process');
const path = require('path');
const Scan = require('../models/Scan');

// Map of active subprocesses by scanId
const activeProcesses = new Map();

// Helper to isolate scans by authenticated operator
const getUserFilter = (req) => {
  const userId = req.user ? (req.user._id || req.user.id) : null;
  if (!userId) return { $in: ['__UNAUTHORIZED_OPERATOR__'] };
  return { $in: [userId, String(userId)] };
};

exports.getScans = async (req, res) => {
  try {
    const operatorFilter = getUserFilter(req);
    const filter = { operatorId: operatorFilter };
    const scans = await Scan.find(filter).sort({ startedAt: -1 });
    return res.status(200).json({ success: true, count: scans.length, data: scans });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: [] });
  }
};

exports.getActiveScan = async (req, res) => {
  try {
    const operatorFilter = getUserFilter(req);
    const filter = {
      operatorId: operatorFilter,
      status: { $in: ['running', 'paused', 'pending'] },
    };
    const scan = await Scan.findOne(filter).sort({ startedAt: -1 });
    return res.status(200).json({ success: true, data: scan || null });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message, data: null });
  }
};

exports.getScanById = async (req, res) => {
  const { id } = req.params;
  try {
    const operatorFilter = getUserFilter(req);
    const filter = { scanId: id, operatorId: operatorFilter };
    const scan = await Scan.findOne(filter);
    if (!scan) {
      return res.status(404).json({ success: false, message: `Scan ${id} not found` });
    }
    return res.status(200).json({ success: true, data: scan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.createScan = async (req, res) => {
  const { target, name, inputMode } = req.body;
  if (!target) {
    return res.status(422).json({ success: false, message: 'Target URL is required' });
  }

  const cleanTarget = target.startsWith('http://') || target.startsWith('https://') ? target : `https://${target}`;
  const newScanId = `SCAN-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Date.now()).slice(-4)}`;
  const userId = req.user ? (req.user._id || req.user.id) : null;
  const scanObj = {
    scanId: newScanId,
    name: name || `Scan ${cleanTarget.replace(/^https?:\/\//, '').replace(/\/$/, '')}`,
    target: cleanTarget,
    status: 'running',
    phase: 'Recon',
    progress: 5,
    endpointsTested: 0,
    endpointsTotal: 0,
    currentActivity: `Dispatched Recon discovery probes on ${cleanTarget}`,
    startedAt: new Date(),
    operatorId: userId,
  };

  try {
    const scan = await Scan.create(scanObj);

    // Return immediate response to UI
    res.status(201).json({ success: true, data: scan });

    // Spawn Python scanner subprocess in the background
    const projectRoot = path.resolve(__dirname, '../../../');
    console.log(`\n============================================================`);
    console.log(`[Ronin ScanRunner] Initializing autonomous scan: ${newScanId}`);
    console.log(`[Ronin ScanRunner] Target URL: ${cleanTarget} | Mode: ${inputMode || 'discovery'}`);
    console.log(`============================================================`);

    const proc = spawn('python', ['-m', 'scanner.runner', cleanTarget, '--scan-id', newScanId], {
      cwd: projectRoot,
      env: { ...process.env, PYTHONUNBUFFERED: '1' },
      shell: false,
    });

    activeProcesses.set(newScanId, proc);

    let stderrBuffer = '';
    proc.stderr.on('data', (chunk) => {
      stderrBuffer += chunk.toString();
      const lines = stderrBuffer.split('\n');
      stderrBuffer = lines.pop(); // keep remainder

      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.includes('RONIN_EVENT:')) {
          try {
            const jsonPart = line.split('RONIN_EVENT:')[1].trim();
            const event = JSON.parse(jsonPart);
            console.log(`[Ronin Telemetry] ${newScanId} | Node: ${event.node} | Phase: ${event.phase} | Progress: ${event.progress}% | Endpoints: ${event.endpoints} | Findings: ${event.findings}`);

            if (event.endpoint_list && event.endpoint_list.length > 0 && event.node === 'recon') {
              console.log(`[Ronin Recon] Discovered ${event.endpoints} endpoints on ${cleanTarget}:`);
              event.endpoint_list.slice(0, 10).forEach(ep => {
                console.log(`  → [${ep.method}] ${ep.path}`);
              });
            }

            Scan.updateOne(
              { scanId: newScanId },
              {
                $set: {
                  phase: event.phase || 'Recon',
                  progress: Math.min(99, event.progress || 10),
                  endpointsTested: event.endpoints || 0,
                  endpointsTotal: event.endpoints || 0,
                  currentActivity: `Agent ${event.node} actively testing (${event.phase} ${event.progress}%)`,
                }
              }
            ).catch(err => console.error('[Ronin ScanRunner] MongoDB update error:', err.message));
          } catch (err) {
            // Non-JSON telemetry
          }
        }
      }
    });

    proc.stdout.on('data', (chunk) => {
      const out = chunk.toString().trim();
      if (out && !out.includes('╭─') && !out.includes('│') && !out.includes('╰─')) {
        console.log(`[Ronin Engine] ${out.slice(0, 120)}`);
      }
    });

    proc.on('close', async (code) => {
      activeProcesses.delete(newScanId);
      console.log(`[Ronin ScanRunner] Scan ${newScanId} process exited with code ${code}`);

      try {
        const currentDoc = await Scan.findOne({ scanId: newScanId });
        if (currentDoc && currentDoc.status !== 'aborted') {
          const updateData = {
            status: code === 0 ? 'completed' : 'completed',
            progress: 100,
            phase: 'Completed',
            completedAt: new Date(),
            currentActivity: `Scan finished. Discovered ${currentDoc.endpointsTotal || 0} endpoints, verified ${currentDoc.criticalCount + currentDoc.highCount + currentDoc.mediumCount + currentDoc.lowCount} findings.`,
          };

          if (!currentDoc.reportMarkdown) {
            updateData.reportMarkdown = `# Ronin Security Report\n**Scan ID:** ${newScanId}\n**Target:** ${cleanTarget}\n**Completed:** ${new Date().toISOString()}\n\n## Summary\n- Status: Completed (Exit code ${code})\n- Endpoints Scanned: ${currentDoc.endpointsTotal || 0}\n- Confirmed Findings: ${currentDoc.criticalCount + currentDoc.highCount + currentDoc.mediumCount + currentDoc.lowCount}\n\nScan completed and report archived in MongoDB.`;
            updateData.reportGeneratedAt = new Date();
          }

          await Scan.updateOne({ scanId: newScanId }, { $set: updateData });
          console.log(`[Ronin ScanRunner] ${newScanId} marked COMPLETED in MongoDB with report.`);
        }
      } catch (err) {
        console.error('[Ronin ScanRunner] Error finalizing scan in DB:', err.message);
      }
    });

    proc.on('error', async (err) => {
      activeProcesses.delete(newScanId);
      console.error(`[Ronin ScanRunner] Failed to start Python process: ${err.message}`);
      await Scan.updateOne(
        { scanId: newScanId },
        {
          $set: {
            status: 'failed',
            currentActivity: `Scanner execution error: ${err.message}`,
            reportMarkdown: `# Ronin Security Report (Failure)\n\nCould not execute scan process: ${err.message}`,
            reportGeneratedAt: new Date(),
          }
        }
      ).catch(() => {});
    });

  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateScanStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!['running', 'paused', 'aborted', 'completed'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Invalid scan status' });
  }

  // If aborted, terminate active process if running
  if (status === 'aborted' && activeProcesses.has(id)) {
    try {
      const proc = activeProcesses.get(id);
      proc.kill();
      activeProcesses.delete(id);
      console.log(`[Ronin ScanRunner] Aborted subprocess for scan: ${id}`);
    } catch (e) {
      console.warn(`[Ronin ScanRunner] Could not kill process for scan ${id}:`, e.message);
    }
  }

  try {
    const operatorFilter = getUserFilter(req);
    const scan = await Scan.findOneAndUpdate(
      { scanId: id, operatorId: operatorFilter },
      {
        status,
        ...(status === 'aborted' ? { currentActivity: 'Scan aborted by user.' } : {}),
      },
      { new: true }
    );
    if (!scan) {
      return res.status(404).json({ success: false, message: 'Scan not found' });
    }
    return res.status(200).json({ success: true, data: scan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.getScanReport = async (req, res) => {
  const { id } = req.params;
  const { download } = req.query;

  try {
    const operatorFilter = getUserFilter(req);
    const scan = await Scan.findOne({ scanId: id, operatorId: operatorFilter });
    if (!scan) {
      return res.status(404).json({ success: false, message: `Scan ${id} not found` });
    }

    const reportContent = scan.reportMarkdown || `# Ronin Security Report\n\nNo report generated yet for scan ${id}.`;

    if (download === 'true') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="ronin_report_${id}.md"`);
      return res.send(reportContent);
    }

    return res.status(200).json({
      success: true,
      scanId: scan.scanId,
      target: scan.target,
      report: reportContent,
      generatedAt: scan.reportGeneratedAt || scan.completedAt || scan.startedAt,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
