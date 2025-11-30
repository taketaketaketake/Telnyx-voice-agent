const express = require('express');
const path = require('path');
const fs = require('fs');
const { supabase } = require('../db/client');
const router = express.Router();

// CSV Export endpoint
router.get('/export-leads', async (req, res) => {
  try {
    let data = [];
    let error = null;

    if (supabase) {
      const result = await supabase
        .from('service_requests_va')
        .select('*')
        .order('created_at', { ascending: false });
      
      data = result.data || [];
      error = result.error;
    }

    if (error) {
      console.warn('Database connection unavailable for export:', error.message);
      return res.status(503).send('Database temporarily unavailable. Please try again later.');
    }

    if (!data || data.length === 0) {
      return res.status(404).send('No leads found to export');
    }

    // Create CSV headers
    const headers = [
      'ID', 'Date', 'Phone Number', 'Customer Name', 'Email', 'Address', 
      'Home Size', 'Issue Description', 'Urgency Level', 'Last Service Date',
      'Preferred Time', 'Additional Notes', 'Contact Method', 'Status'
    ];

    // Convert data to CSV format
    const csvRows = [
      headers.join(','), // Header row
      ...data.map(lead => [
        lead.id || '',
        new Date(lead.created_at).toLocaleDateString() || '',
        `"${lead.phone_number || ''}"`,
        `"${lead.customer_name || ''}"`,
        `"${lead.email || ''}"`,
        `"${lead.address || ''}"`,
        `"${lead.home_size || ''}"`,
        `"${(lead.issue_description || '').replace(/"/g, '""')}"`,
        lead.urgency_level || '',
        lead.last_service_date || '',
        `"${lead.preferred_time || ''}"`,
        `"${(lead.additional_notes || '').replace(/"/g, '""')}"`,
        lead.contact_method || '',
        lead.status || ''
      ].join(','))
    ];

    const csv = csvRows.join('\n');
    
    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=voice-leads-${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

    console.log(`📊 Exported ${data.length} voice leads to CSV`);

  } catch (error) {
    console.error('Error exporting leads:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Admin Dashboard
router.get('/dashboard', async (req, res) => {
  try {
    let leads = [];
    let error = null;

    if (supabase) {
      const result = await supabase
        .from('service_requests_va')
        .select('*')
        .order('created_at', { ascending: false });
      
      leads = result.data || [];
      error = result.error;
    }

    if (error) {
      console.warn('Database connection unavailable, showing demo dashboard:', error.message);
      // Show demo data when database is unavailable
      leads = [];
    }

    // Calculate stats
    const totalLeads = leads?.length || 0;
    const pendingLeads = leads?.filter(l => l.status === 'pending').length || 0;
    const emergencyLeads = leads?.filter(l => l.urgency_level === 'emergency').length || 0;
    const todayLeads = leads?.filter(l => {
      const today = new Date().toDateString();
      const leadDate = new Date(l.created_at).toDateString();
      return today === leadDate;
    }).length || 0;

    // Read HTML template
    const templatePath = path.join(__dirname, '../views/dashboard.html');
    let template = fs.readFileSync(templatePath, 'utf8');

    // Replace template variables
    template = template.replace('{{TOTAL_LEADS}}', totalLeads);
    template = template.replace('{{PENDING_LEADS}}', pendingLeads);
    template = template.replace('{{EMERGENCY_LEADS}}', emergencyLeads);
    template = template.replace('{{TODAY_LEADS}}', todayLeads);
    template = template.replace('{{LAST_UPDATED}}', new Date().toLocaleString());

    // Generate table rows
    const tableRows = totalLeads === 0 ? `
      <tr>
        <td colspan="7" style="text-align: center; padding: 40px; color: #7f8c8d;">
          <h3>No leads found</h3>
          <p>Customer data will appear here once Charlotte starts taking calls</p>
        </td>
      </tr>
    ` : leads.map(lead => `
      <tr>
        <td>${new Date(lead.created_at).toLocaleDateString()} ${new Date(lead.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
        <td>
          <strong>${lead.customer_name || 'Unknown'}</strong>
          ${lead.address ? `<br><small style="color: #666;">${lead.address}</small>` : ''}
        </td>
        <td>
          <a href="tel:${lead.phone_number}" style="color: #3498db; text-decoration: none;">
            ${lead.phone_number}
          </a>
        </td>
        <td>
          ${lead.issue_description || 'No issue specified'}
          ${lead.additional_notes ? `<br><small style="color: #666;">${lead.additional_notes}</small>` : ''}
        </td>
        <td>
          <span class="urgency-${lead.urgency_level || 'routine'}">
            ${(lead.urgency_level || 'routine').toUpperCase()}
          </span>
        </td>
        <td>${(lead.contact_method || 'voice').toUpperCase()}</td>
        <td>
          <span class="status-${lead.status || 'pending'}">
            ${(lead.status || 'pending').toUpperCase()}
          </span>
        </td>
      </tr>
    `).join('');

    template = template.replace('{{TABLE_ROWS}}', tableRows);

    res.send(template);

  } catch (error) {
    console.error('Error loading dashboard:', error);
    res.status(500).send('Internal Server Error');
  }
});

module.exports = router;