// Check authentication status
const token = localStorage.getItem('cms_jwt_token');
const userDataRaw = localStorage.getItem('cms_user_data');

if (!token || !userDataRaw) {
    localStorage.clear();
    window.location.href = 'login.html';
}

const user = JSON.parse(userDataRaw);

// Globals
let allComplaints = []; // Local cache
let staffList = [];     // Available staff list for admins
let categoryChartInstance = null;
let statusChartInstance = null;
let priorityChartInstance = null;

// DOM Elements
const sidebarUsername = document.getElementById('sidebar-username');
const sidebarRole = document.getElementById('sidebar-role');
const sidebarDept = document.getElementById('sidebar-dept');
const sidebarNavLinks = document.getElementById('sidebar-nav-links');
const navbarTitle = document.getElementById('navbar-title');
const navbarWelcome = document.getElementById('navbar-welcome');
const logoutBtn = document.getElementById('logout-btn');

// Initialize layout based on Role
document.addEventListener('DOMContentLoaded', () => {
    sidebarUsername.textContent = user.username;
    sidebarRole.textContent = user.role;
    navbarWelcome.textContent = `Welcome, ${user.username}`;
    
    if (user.department) {
        sidebarDept.textContent = `Dept: ${user.department}`;
        sidebarDept.style.display = 'block';
    }

    // Set up navigation and load corresponding panel
    buildNavigation();
    loadInitialPanel();
    
    // File upload change handler
    const fileInput = document.getElementById('comp-evidence');
    const fileChosenName = document.getElementById('file-chosen-name');
    if (fileInput) {
        fileInput.addEventListener('change', () => {
            if (fileInput.files.length > 0) {
                fileChosenName.textContent = `Selected: ${fileInput.files[0].name}`;
            } else {
                fileChosenName.textContent = '';
            }
        });
    }

    // Modal elements listeners
    const modalCloseBtn = document.getElementById('modal-close-btn');
    const reassignModal = document.getElementById('reassign-modal');
    if (modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            reassignModal.style.display = 'none';
        });
    }
});

// Build Sidebar Navigation dynamically
function buildNavigation() {
    let navHTML = '';
    if (user.role === 'Complainant') {
        navHTML = `
            <a class="nav-item active" data-target="complainant-overview">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/>
                    <rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/>
                </svg>
                Overview
            </a>
            <a class="nav-item" data-target="complainant-tracker">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <circle cx="12" cy="12" r="3"/>
                </svg>
                My Complaints
            </a>
        `;
    } else if (user.role === 'Staff') {
        navHTML = `
            <a class="nav-item active" data-target="staff-queue">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
                My Queue
            </a>
        `;
    } else if (user.role === 'Admin') {
        navHTML = `
            <a class="nav-item active" data-target="admin-registry">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                    <polyline points="10 9 9 9 8 9"/>
                </svg>
                All Records
            </a>
            <a class="nav-item" data-target="admin-users">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                User Directory
            </a>
            <a class="nav-item" data-target="admin-analytics">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10"/>
                    <line x1="12" y1="20" x2="12" y2="4"/>
                    <line x1="6" y1="20" x2="6" y2="14"/>
                </svg>
                System Analytics
            </a>
        `;
    }
    sidebarNavLinks.innerHTML = navHTML;

    // Navigation item click events
    document.querySelectorAll('.nav-item').forEach(link => {
        link.addEventListener('click', (e) => {
            document.querySelectorAll('.nav-item').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            const targetPanel = link.getAttribute('data-target');
            switchPanel(targetPanel);
        });
    });
}

// Switch view dashboards
function switchPanel(panelId) {
    document.querySelectorAll('.dashboard-panel').forEach(panel => {
        panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
        targetPanel.classList.add('active');
    }

    // Set Header titles
    const titlesMap = {
        'complainant-overview': 'Filing & Overview',
        'complainant-tracker': 'My Filed Complaints Tracker',
        'staff-queue': 'Assigned Tasks Queue',
        'admin-registry': 'Complaint Records Store',
        'admin-users': 'User Management Directory',
        'admin-analytics': 'System Analytics Reports'
    };
    navbarTitle.textContent = titlesMap[panelId] || 'Dashboard';

    // Trigger data refreshes on switch
    refreshPanelData(panelId);
}

// Load initial panel based on User Role
function loadInitialPanel() {
    if (user.role === 'Complainant') {
        switchPanel('complainant-overview');
    } else if (user.role === 'Staff') {
        switchPanel('staff-queue');
    } else if (user.role === 'Admin') {
        switchPanel('admin-registry');
    }
}

// Refresh operations
function refreshPanelData(panelId) {
    if (panelId === 'complainant-overview') {
        loadComplainantOverview();
    } else if (panelId === 'complainant-tracker') {
        loadComplainantTracker();
    } else if (panelId === 'staff-queue') {
        loadStaffQueue();
    } else if (panelId === 'admin-registry') {
        loadAdminRegistry();
    } else if (panelId === 'admin-users') {
        loadAdminUsers();
    } else if (panelId === 'admin-analytics') {
        loadAdminAnalytics();
    }
}

// Log out handler
logoutBtn.addEventListener('click', () => {
    localStorage.clear();
    window.location.href = 'login.html';
});


/* ==========================================================================
   COMPLAINANT CONTROLS
   ========================================================================== */

// Submit a new complaint
const complaintForm = document.getElementById('complaint-form');
if (complaintForm) {
    complaintForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fileAlert = document.getElementById('file-alert');
        const submitBtn = document.getElementById('file-submit-btn');

        fileAlert.style.display = 'none';

        if (!complaintForm.checkValidity()) {
            showFormAlert('file-alert', 'Please complete all required fields.', 'error');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Uploading details...';

        const formData = new FormData(complaintForm);

        try {
            const response = await fetch('/api/complaints', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await response.json();

            if (response.ok) {
                showFormAlert('file-alert', 'Complaint filed and assigned successfully!', 'success');
                complaintForm.reset();
                document.getElementById('file-chosen-name').textContent = '';
                
                // Refresh list
                loadComplainantOverview();
            } else {
                showFormAlert('file-alert', data.message || 'Submission error.', 'error');
            }
        } catch (error) {
            showFormAlert('file-alert', 'Failed to reach backend API.', 'error');
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Submit Secure Complaint';
        }
    });
}

// Load complainant overview stats and list
async function loadComplainantOverview() {
    try {
        const response = await fetch('/api/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        allComplaints = data;

        // Calculate stats
        const total = data.length;
        const active = data.filter(c => c.status !== 'Resolved').length;
        const resolved = data.filter(c => c.status === 'Resolved').length;

        document.getElementById('comp-stat-active').textContent = active;
        document.getElementById('comp-stat-resolved').textContent = resolved;
        document.getElementById('comp-stat-total').textContent = total;

        // Render recent list (max 5)
        const listContainer = document.getElementById('comp-recent-list');
        if (data.length === 0) {
            listContainer.innerHTML = '<div class="no-data-msg">No complaints filed yet. Use the form to submit one.</div>';
            return;
        }

        let html = '';
        data.slice(0, 5).forEach(c => {
            html += `
                <div class="ticket-item" onclick="switchPanel('complainant-tracker'); selectComplainantTicket(${c.id})">
                    <div class="ticket-info">
                        <div class="ticket-title">${escapeHTML(c.title)}</div>
                        <div class="ticket-meta">
                            <span class="badge badge-status-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span>
                            <span class="badge badge-prio-${c.priority.toLowerCase()}">${c.priority}</span>
                            <span>Cat: ${c.category}</span>
                            <span>${new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                    <span style="color: var(--text-secondary); font-size: 1.2rem;">&rsaquo;</span>
                </div>
            `;
        });
        listContainer.innerHTML = html;

    } catch (e) {
        console.error(e);
    }
}

// Load complainant full complaints list in tracker
async function loadComplainantTracker() {
    try {
        const response = await fetch('/api/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        allComplaints = data;

        const listContainer = document.getElementById('comp-tracker-list');
        if (data.length === 0) {
            listContainer.innerHTML = '<div class="no-data-msg">No complaints registered.</div>';
            document.getElementById('comp-detail-panel').innerHTML = '<div class="no-data-msg">Select a complaint from the left panel list.</div>';
            return;
        }

        let html = '';
        data.forEach(c => {
            html += `
                <div class="ticket-item" id="comp-item-${c.id}" onclick="selectComplainantTicket(${c.id})">
                    <div class="ticket-info">
                        <div class="ticket-title">${escapeHTML(c.title)}</div>
                        <div class="ticket-meta">
                            <span class="badge badge-status-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span>
                            <span class="badge badge-prio-${c.priority.toLowerCase()}">${c.priority}</span>
                            <span>${new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
        
        // Auto select first complaint in list if available
        if (data.length > 0) {
            selectComplainantTicket(data[0].id);
        }
    } catch (e) {
        console.error(e);
    }
}

// Click ticket logic in Complainant panel
async function selectComplainantTicket(id) {
    // Toggle active item indicator in left list
    document.querySelectorAll('#comp-tracker-list .ticket-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.getElementById(`comp-item-${id}`);
    if (selectedItem) selectedItem.classList.add('active');

    const detailPanel = document.getElementById('comp-detail-panel');
    detailPanel.innerHTML = '<div class="no-data-msg">Loading ticket parameters...</div>';

    try {
        const response = await fetch(`/api/complaints/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            detailPanel.innerHTML = '<div class="no-data-msg">Error loading complaint.</div>';
            return;
        }

        const complaint = await response.json();
        
        // Render timeline progress width
        const statusMap = { 'Filed': 0, 'In Progress': 33, 'Escalated': 66, 'Resolved': 100 };
        const percent = statusMap[complaint.status] !== undefined ? statusMap[complaint.status] : 0;
        
        // Check active / completed timeline nodes
        const activeNode = complaint.status;
        const timelineSteps = ['Filed', 'In Progress', 'Escalated', 'Resolved'];

        let timelineNodesHTML = '';
        timelineSteps.forEach(step => {
            let stepClass = '';
            if (step === activeNode) {
                stepClass = 'active';
            } else if (timelineSteps.indexOf(step) < timelineSteps.indexOf(activeNode)) {
                stepClass = 'completed';
            }
            timelineNodesHTML += `
                <div class="timeline-step ${stepClass}">
                    <div class="step-node">${timelineSteps.indexOf(step) + 1}</div>
                    <div class="step-label">${step}</div>
                </div>
            `;
        });

        // Audit Logs Timeline
        let auditLogsHTML = '<div class="no-data-msg">No timeline mutations registered.</div>';
        if (complaint.audit_logs && complaint.audit_logs.length > 0) {
            auditLogsHTML = '<div class="audit-list">';
            complaint.audit_logs.forEach(log => {
                auditLogsHTML += `
                    <div class="audit-item">
                        <div class="audit-action">${escapeHTML(log.action)}</div>
                        <div class="audit-meta">By ${escapeHTML(log.staff_name)} on ${new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                `;
            });
            auditLogsHTML += '</div>';
        }

        // Evidence check
        let evidenceHTML = '<span class="detail-value">No attachment evidence uploaded</span>';
        if (complaint.evidence_url) {
            evidenceHTML = `
                <a href="/api/complaints/${complaint.id}/evidence" target="_blank" class="evidence-file-btn" download>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Attachment Evidence
                </a>
            `;
        }

        detailPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <h3 style="margin-bottom: 0; border: none; padding-bottom: 0;">${escapeHTML(complaint.title)}</h3>
                <div>
                    <span class="badge badge-status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span>
                    <span class="badge badge-prio-${complaint.priority.toLowerCase()}">${complaint.priority}</span>
                </div>
            </div>

            <!-- Tracking Timeline Pipeline -->
            <div class="timeline-container">
                <div class="timeline">
                    <div class="timeline-progress" style="width: ${percent}%;"></div>
                    ${timelineNodesHTML}
                </div>
            </div>

            <div class="section-card" style="margin-top: 1.5rem; background: rgba(255,255,255,0.01);">
                <div class="detail-grid">
                    <div class="detail-label">Description</div>
                    <div class="detail-value" style="white-space: pre-wrap;">${escapeHTML(complaint.description)}</div>
                    
                    <div class="detail-label">Category</div>
                    <div class="detail-value">${complaint.category}</div>
                    
                    <div class="detail-label">Assigned Staff</div>
                    <div class="detail-value">${escapeHTML(complaint.assigned_staff_name || 'Awaiting Routing allocation')}</div>
                    
                    <div class="detail-label">Filed On</div>
                    <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>

                    <div class="detail-label">Evidence</div>
                    <div>${evidenceHTML}</div>
                </div>
            </div>

            <div class="section-card" style="background: rgba(255,255,255,0.01); margin-bottom: 0;">
                <h4 style="font-size: 0.95rem; margin-bottom: 1rem;">Mutation Activity Logs</h4>
                ${auditLogsHTML}
            </div>
        `;

    } catch (e) {
        detailPanel.innerHTML = '<div class="no-data-msg">Network error loading complaint.</div>';
    }
}


/* ==========================================================================
   STAFF CONTROLS
   ========================================================================== */

// Load assigned complaints for Staff
async function loadStaffQueue() {
    try {
        const response = await fetch('/api/complaints', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        allComplaints = data;

        // Stats calculation
        const unresolved = data.filter(c => c.status !== 'Resolved').length;
        const resolved = data.filter(c => c.status === 'Resolved').length;
        const escalated = data.filter(c => c.status === 'Escalated').length;

        document.getElementById('staff-stat-unresolved').textContent = unresolved;
        document.getElementById('staff-stat-resolved').textContent = resolved;
        document.getElementById('staff-stat-escalated').textContent = escalated;

        // Apply local filter dropdown
        renderStaffQueueHTML();

        // Listen for filter mutations
        const filterSelect = document.getElementById('staff-status-filter');
        filterSelect.replaceWith(filterSelect.cloneNode(true)); // remove listeners
        document.getElementById('staff-status-filter').addEventListener('change', renderStaffQueueHTML);

    } catch (e) {
        console.error(e);
    }
}

// Render queue list inside Staff dashboard
function renderStaffQueueHTML() {
    const listContainer = document.getElementById('staff-queue-list');
    const filterStatus = document.getElementById('staff-status-filter').value;
    
    let filtered = allComplaints;
    if (filterStatus) {
        filtered = allComplaints.filter(c => c.status === filterStatus);
    }

    if (filtered.length === 0) {
        listContainer.innerHTML = '<div class="no-data-msg">No complaints in queue matching filter.</div>';
        document.getElementById('staff-detail-panel').innerHTML = '<div class="no-data-msg">Select a complaint from the queue list.</div>';
        return;
    }

    let html = '';
    filtered.forEach(c => {
        html += `
            <div class="ticket-item" id="staff-item-${c.id}" onclick="selectStaffTicket(${c.id})">
                <div class="ticket-info">
                    <div class="ticket-title">${escapeHTML(c.title)}</div>
                    <div class="ticket-meta">
                        <span class="badge badge-status-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span>
                        <span class="badge badge-prio-${c.priority.toLowerCase()}">${c.priority}</span>
                        <span>By: ${escapeHTML(c.complainant_name)}</span>
                    </div>
                </div>
            </div>
        `;
    });
    listContainer.innerHTML = html;

    // Auto select first complaint
    if (filtered.length > 0) {
        selectStaffTicket(filtered[0].id);
    }
}

// Click ticket logic in Staff panel
async function selectStaffTicket(id) {
    document.querySelectorAll('#staff-queue-list .ticket-item').forEach(item => {
        item.classList.remove('active');
    });
    const selectedItem = document.getElementById(`staff-item-${id}`);
    if (selectedItem) selectedItem.classList.add('active');

    const detailPanel = document.getElementById('staff-detail-panel');
    detailPanel.innerHTML = '<div class="no-data-msg">Loading ticket parameters...</div>';

    try {
        const response = await fetch(`/api/complaints/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            detailPanel.innerHTML = '<div class="no-data-msg">Error loading complaint.</div>';
            return;
        }

        const complaint = await response.json();

        // Audit logs list
        let auditLogsHTML = '<div class="no-data-msg">No logs registered yet.</div>';
        if (complaint.audit_logs && complaint.audit_logs.length > 0) {
            auditLogsHTML = '<div class="audit-list">';
            complaint.audit_logs.forEach(log => {
                auditLogsHTML += `
                    <div class="audit-item">
                        <div class="audit-action">${escapeHTML(log.action)}</div>
                        <div class="audit-meta">By ${escapeHTML(log.staff_name)} on ${new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                `;
            });
            auditLogsHTML += '</div>';
        }

        // Evidence download button
        let evidenceHTML = '<span class="detail-value">No attachment evidence uploaded</span>';
        if (complaint.evidence_url) {
            evidenceHTML = `
                <a href="/api/complaints/${complaint.id}/evidence" target="_blank" class="evidence-file-btn" download>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Attachment Evidence
                </a>
            `;
        }

        detailPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <h3 style="margin-bottom: 0; border: none; padding-bottom: 0;">${escapeHTML(complaint.title)}</h3>
                <div>
                    <span class="badge badge-status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span>
                    <span class="badge badge-prio-${complaint.priority.toLowerCase()}">${complaint.priority}</span>
                </div>
            </div>

            <div class="dashboard-grid" style="grid-template-columns: 1.2fr 0.8fr; gap: 1.5rem;">
                <div>
                    <div class="section-card" style="background: rgba(255,255,255,0.01); padding: 1.25rem;">
                        <div class="detail-grid" style="grid-template-columns: 110px 1fr;">
                            <div class="detail-label">Complainant</div>
                            <div class="detail-value">${escapeHTML(complaint.complainant_name)}</div>

                            <div class="detail-label">Category</div>
                            <div class="detail-value">${complaint.category}</div>

                            <div class="detail-label">Description</div>
                            <div class="detail-value" style="white-space: pre-wrap;">${escapeHTML(complaint.description)}</div>

                            <div class="detail-label">Filed On</div>
                            <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>

                            <div class="detail-label">Evidence</div>
                            <div>${evidenceHTML}</div>
                        </div>
                    </div>

                    <div class="section-card" style="background: rgba(255,255,255,0.01); margin-bottom: 0; padding: 1.25rem;">
                        <h4 style="font-size: 0.9rem; margin-bottom: 1rem;">Audit log and activities</h4>
                        ${auditLogsHTML}
                    </div>
                </div>

                <!-- Update Status pane -->
                <div class="section-card" style="padding: 1.25rem;">
                    <h4 style="font-size: 0.95rem; margin-bottom: 1rem;">Update Complaint Status</h4>
                    <div id="staff-update-alert" class="alert" style="display: none;"></div>
                    
                    <form id="staff-status-form">
                        <div class="form-group">
                            <label for="update-status-select">Set Status</label>
                            <select id="update-status-select" class="input-control" required>
                                <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Escalated" ${complaint.status === 'Escalated' ? 'selected' : ''}>Escalated</option>
                                <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" id="staff-status-submit-btn">Commit Update</button>
                    </form>
                </div>
            </div>
        `;

        // Attach listener to staff status form
        document.getElementById('staff-status-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertId = 'staff-update-alert';
            const alertEl = document.getElementById(alertId);
            const submitBtn = document.getElementById('staff-status-submit-btn');
            
            alertEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Commiting...';

            const statusVal = document.getElementById('update-status-select').value;

            try {
                const response = await fetch(`/api/complaints/${complaint.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: statusVal })
                });
                
                const data = await response.json();

                if (response.ok) {
                    showFormAlert(alertId, 'Status updated successfully!', 'success');
                    setTimeout(() => {
                        loadStaffQueue();
                    }, 500);
                } else {
                    showFormAlert(alertId, data.message || 'Failed to update.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Commit Update';
                }
            } catch (err) {
                showFormAlert(alertId, 'Failed to connect to backend.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Commit Update';
            }
        });

    } catch (e) {
        detailPanel.innerHTML = '<div class="no-data-msg">Network error.</div>';
    }
}


/* ==========================================================================
   ADMIN CONTROLS
   ========================================================================== */

// Load Admin list and search filters
async function loadAdminRegistry() {
    try {
        // Load staff choices list for modal reassign dropdown (cache once)
        if (staffList.length === 0) {
            const staffResp = await fetch('/api/staff', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (staffResp.ok) {
                staffList = await staffResp.json();
            }
        }

        // Fetch registry table with current filters
        await fetchAdminRegistryData();

        // Bind filter event listeners (clone and bind to avoid duplicate listeners)
        const filters = ['admin-search', 'admin-filter-category', 'admin-filter-priority', 'admin-filter-status'];
        filters.forEach(id => {
            const el = document.getElementById(id);
            const newEl = el.cloneNode(true);
            el.replaceWith(newEl);
        });

        document.getElementById('admin-search').addEventListener('input', debounce(fetchAdminRegistryData, 300));
        document.getElementById('admin-filter-category').addEventListener('change', fetchAdminRegistryData);
        document.getElementById('admin-filter-priority').addEventListener('change', fetchAdminRegistryData);
        document.getElementById('admin-filter-status').addEventListener('change', fetchAdminRegistryData);

    } catch (e) {
        console.error(e);
    }
}

// Fetch Admin registry dataset with API filters
async function fetchAdminRegistryData() {
    const searchVal = document.getElementById('admin-search').value;
    const catVal = document.getElementById('admin-filter-category').value;
    const priVal = document.getElementById('admin-filter-priority').value;
    const staVal = document.getElementById('admin-filter-status').value;

    const url = `/api/complaints?search=${encodeURIComponent(searchVal)}&category=${catVal}&priority=${priVal}&status=${staVal}`;

    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        
        // Calculate Stats
        const total = data.length;
        const resolved = data.filter(c => c.status === 'Resolved').length;
        const active = total - resolved;
        const rate = total > 0 ? Math.round((resolved / total) * 100) : 0;

        document.getElementById('admin-stat-active').textContent = active;
        document.getElementById('admin-stat-rate').textContent = `${rate}%`;

        // Render table
        const tbody = document.getElementById('admin-table-body');
        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="no-data-msg">No complaints registered in system.</td></tr>';
            return;
        }

        let html = '';
        data.forEach(c => {
            const staffName = c.assigned_staff_name ? escapeHTML(c.assigned_staff_name) : '<em style="color: var(--text-secondary)">Unassigned</em>';
            html += `
                <tr onclick="selectAdminTicket(${c.id})" style="cursor: pointer;" id="admin-row-${c.id}">
                    <td>#${c.id}</td>
                    <td><strong>${escapeHTML(c.title)}</strong></td>
                    <td>${escapeHTML(c.complainant_name)}</td>
                    <td>${c.category}</td>
                    <td><span class="badge badge-prio-${c.priority.toLowerCase()}">${c.priority}</span></td>
                    <td>${staffName}</td>
                    <td><span class="badge badge-status-${c.status.toLowerCase().replace(' ', '')}">${c.status}</span></td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Auto select first complaint in registry if available
        if (data.length > 0) {
            selectAdminTicket(data[0].id);
        } else {
            document.getElementById('admin-detail-panel').innerHTML = '<div class="no-data-msg">Select a complaint from the registry table to view details.</div>';
        }

    } catch (e) {
        console.error(e);
    }
}

// Click ticket in Admin Panel - Renders details panel with progress timeline tracking and direct updates
async function selectAdminTicket(id) {
    document.querySelectorAll('#admin-table-body tr').forEach(row => {
        row.style.background = ''; // reset highlight
    });
    const selectedRow = document.getElementById(`admin-row-${id}`);
    if (selectedRow) {
        selectedRow.style.background = '#eef2f7'; // highlight active row
    }

    const detailPanel = document.getElementById('admin-detail-panel');
    detailPanel.innerHTML = '<div class="no-data-msg">Loading ticket details...</div>';

    try {
        const response = await fetch(`/api/complaints/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            detailPanel.innerHTML = '<div class="no-data-msg">Error loading complaint.</div>';
            return;
        }

        const complaint = await response.json();

        // 1. Timeline tracking progress
        const statusMap = { 'Filed': 0, 'In Progress': 33, 'Escalated': 66, 'Resolved': 100 };
        const percent = statusMap[complaint.status] !== undefined ? statusMap[complaint.status] : 0;
        
        const activeNode = complaint.status;
        const timelineSteps = ['Filed', 'In Progress', 'Escalated', 'Resolved'];

        let timelineNodesHTML = '';
        timelineSteps.forEach(step => {
            let stepClass = '';
            if (step === activeNode) {
                stepClass = 'active';
            } else if (timelineSteps.indexOf(step) < timelineSteps.indexOf(activeNode)) {
                stepClass = 'completed';
            }
            timelineNodesHTML += `
                <div class="timeline-step ${stepClass}">
                    <div class="step-node">${timelineSteps.indexOf(step) + 1}</div>
                    <div class="step-label">${step}</div>
                </div>
            `;
        });

        // 2. Audit logs list
        let auditLogsHTML = '<div class="no-data-msg">No logs registered yet.</div>';
        if (complaint.audit_logs && complaint.audit_logs.length > 0) {
            auditLogsHTML = '<div class="audit-list">';
            complaint.audit_logs.forEach(log => {
                auditLogsHTML += `
                    <div class="audit-item">
                        <div class="audit-action">${escapeHTML(log.action)}</div>
                        <div class="audit-meta">By ${escapeHTML(log.staff_name)} on ${new Date(log.timestamp).toLocaleString()}</div>
                    </div>
                `;
            });
            auditLogsHTML += '</div>';
        }

        // 3. Evidence link
        let evidenceHTML = '<span class="detail-value">No attachment evidence uploaded</span>';
        if (complaint.evidence_url) {
            evidenceHTML = `
                <a href="/api/complaints/${complaint.id}/evidence" target="_blank" class="evidence-file-btn" download>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                        <polyline points="7 10 12 15 17 10"/>
                        <line x1="12" y1="15" x2="12" y2="3"/>
                    </svg>
                    Download Attachment Evidence
                </a>
            `;
        }

        // 4. Staff assignment options list
        let staffOptionsHTML = '<option value="" disabled selected>Select Staff Target</option>';
        staffList.forEach(s => {
            const isSelected = s.id === complaint.assigned_to ? 'selected' : '';
            staffOptionsHTML += `<option value="${s.id}" ${isSelected}>${escapeHTML(s.username)} (${s.department})</option>`;
        });

        detailPanel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 1.5rem; flex-wrap: wrap; gap: 1rem;">
                <h3 style="margin-bottom: 0; border: none; padding-bottom: 0;">#${complaint.id} - ${escapeHTML(complaint.title)}</h3>
                <div>
                    <span class="badge badge-status-${complaint.status.toLowerCase().replace(' ', '')}">${complaint.status}</span>
                    <span class="badge badge-prio-${complaint.priority.toLowerCase()}">${complaint.priority}</span>
                </div>
            </div>

            <!-- Tracking Status Pipeline -->
            <div class="timeline-container" style="margin-bottom: 1.5rem;">
                <div class="timeline">
                    <div class="timeline-progress" style="width: ${percent}%;"></div>
                    ${timelineNodesHTML}
                </div>
            </div>

            <!-- Parameters Grid -->
            <div class="section-card" style="background: rgba(0,0,0,0.01); border-color: var(--border-color); padding: 12px; margin-bottom: 1.5rem;">
                <div class="detail-grid" style="grid-template-columns: 110px 1fr; gap: 8px;">
                    <div class="detail-label">Complainant</div>
                    <div class="detail-value">${escapeHTML(complaint.complainant_name)}</div>

                    <div class="detail-label">Category</div>
                    <div class="detail-value">${complaint.category}</div>

                    <div class="detail-label">Description</div>
                    <div class="detail-value" style="white-space: pre-wrap;">${escapeHTML(complaint.description)}</div>

                    <div class="detail-label">Assigned Staff</div>
                    <div class="detail-value" style="font-weight: bold; color: var(--academic-blue);">${escapeHTML(complaint.assigned_staff_name || 'Unassigned / Awaiting Allocation')}</div>

                    <div class="detail-label">Filed On</div>
                    <div class="detail-value">${new Date(complaint.created_at).toLocaleString()}</div>

                    <div class="detail-label">Evidence</div>
                    <div>${evidenceHTML}</div>
                </div>
            </div>

            <!-- Update Actions -->
            <div class="dashboard-grid" style="grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 1.5rem;">
                <!-- Status Updater -->
                <div class="section-card" style="padding: 10px; margin-bottom: 0; border-color: var(--border-color);">
                    <h4 style="font-size: 0.85rem; margin-bottom: 8px;">Update Status / Resolve</h4>
                    <div id="admin-status-alert" class="alert" style="display: none; padding: 5px 10px; font-size: 0.75rem; margin-bottom: 8px;"></div>
                    <form id="admin-status-form">
                        <div class="form-group" style="margin-bottom: 8px;">
                            <select id="admin-status-select" class="input-control" style="padding: 5px; font-size: 0.8rem; background-color: white;" required>
                                <option value="Filed" ${complaint.status === 'Filed' ? 'selected' : ''}>Filed</option>
                                <option value="In Progress" ${complaint.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                                <option value="Escalated" ${complaint.status === 'Escalated' ? 'selected' : ''}>Escalated</option>
                                <option value="Resolved" ${complaint.status === 'Resolved' ? 'selected' : ''}>Resolved</option>
                            </select>
                        </div>
                        <button type="submit" class="btn btn-primary" style="padding: 5px 10px; font-size: 0.8rem; width: 100%;" id="admin-status-submit-btn">Update Status</button>
                    </form>
                </div>

                <!-- Assignment Re-routing -->
                <div class="section-card" style="padding: 10px; margin-bottom: 0; border-color: var(--border-color);">
                    <h4 style="font-size: 0.85rem; margin-bottom: 8px;">Override Assignment</h4>
                    <div id="admin-reassign-alert" class="alert" style="display: none; padding: 5px 10px; font-size: 0.75rem; margin-bottom: 8px;"></div>
                    <form id="admin-reassign-form">
                        <div class="form-group" style="margin-bottom: 8px;">
                            <select id="admin-reassign-select" class="input-control" style="padding: 5px; font-size: 0.8rem; background-color: white;" required>
                                ${staffOptionsHTML}
                            </select>
                        </div>
                        <button type="submit" class="btn btn-secondary" style="padding: 5px 10px; font-size: 0.8rem; width: 100%; border-color: var(--academic-blue); color: var(--academic-blue);" id="admin-reassign-submit-btn">Apply Override</button>
                    </form>
                </div>
            </div>

            <!-- Audit Activity Logs -->
            <div class="section-card" style="background: rgba(0,0,0,0.01); border-color: var(--border-color); padding: 12px; margin-bottom: 0;">
                <h4 style="font-size: 0.9rem; margin-bottom: 8px;">Activity Logs</h4>
                ${auditLogsHTML}
            </div>
        `;

        // Bind update status form listener
        document.getElementById('admin-status-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBoxId = 'admin-status-alert';
            const alertEl = document.getElementById(alertBoxId);
            const submitBtn = document.getElementById('admin-status-submit-btn');

            alertEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';

            const statusVal = document.getElementById('admin-status-select').value;

            try {
                const res = await fetch(`/api/complaints/${complaint.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: statusVal })
                });
                const responseData = await res.json();
                if (res.ok) {
                    showFormAlert(alertBoxId, 'Status updated successfully!', 'success');
                    setTimeout(() => {
                        fetchAdminRegistryData(); // refresh list
                        selectAdminTicket(complaint.id); // reload panel
                    }, 500);
                } else {
                    showFormAlert(alertBoxId, responseData.message || 'Update failed.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Update Status';
                }
            } catch (err) {
                showFormAlert(alertBoxId, 'Failed to connect to server.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Status';
            }
        });

        // Bind assignment override form listener
        document.getElementById('admin-reassign-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertBoxId = 'admin-reassign-alert';
            const alertEl = document.getElementById(alertBoxId);
            const submitBtn = document.getElementById('admin-reassign-submit-btn');

            alertEl.style.display = 'none';
            submitBtn.disabled = true;
            submitBtn.textContent = 'Applying...';

            const staffIdVal = document.getElementById('admin-reassign-select').value;

            try {
                const res = await fetch(`/api/complaints/${complaint.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ assigned_to: staffIdVal })
                });
                const responseData = await res.json();
                if (res.ok) {
                    showFormAlert(alertBoxId, 'Override saved successfully!', 'success');
                    setTimeout(() => {
                        fetchAdminRegistryData();
                        selectAdminTicket(complaint.id);
                    }, 500);
                } else {
                    showFormAlert(alertBoxId, responseData.message || 'Override failed.', 'error');
                    submitBtn.disabled = false;
                    submitBtn.textContent = 'Apply Override';
                }
            } catch (err) {
                showFormAlert(alertBoxId, 'Failed to connect to server.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Apply Override';
            }
        });

    } catch (err) {
        detailPanel.innerHTML = '<div class="no-data-msg">Network error.</div>';
    }
}

// Load Admin analytics charts
async function loadAdminAnalytics() {
    try {
        const response = await fetch('/api/analytics', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const data = await response.json();
        const total = data.total;
        
        // Find resolved count
        const resolvedObj = data.status_distribution.find(d => d.status === 'Resolved');
        const resolvedCount = resolvedObj ? resolvedObj.count : 0;
        const activeCount = total - resolvedCount;
        const resolvedPercent = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;

        // Populate KPIs
        document.getElementById('kpi-total-complaints').textContent = total;
        document.getElementById('kpi-resolved-cases').textContent = resolvedCount;
        document.getElementById('kpi-resolved-percent').textContent = `${resolvedPercent}% Resolution Rate`;
        document.getElementById('kpi-active-backlog').textContent = activeCount;
        document.getElementById('analytics-avg-resolution').textContent = `${data.avg_resolution_hours} Hours`;

        const speedEl = document.getElementById('admin-stat-speed');
        if (speedEl) speedEl.textContent = `${data.avg_resolution_hours}h`;

        // 1. Render Category Chart (Bar Chart)
        const categories = data.category_distribution.map(d => d.category);
        const categoryCounts = data.category_distribution.map(d => d.count);
        
        if (categoryChartInstance) categoryChartInstance.destroy();
        categoryChartInstance = new Chart(document.getElementById('category-chart').getContext('2d'), {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Count',
                    data: categoryCounts,
                    backgroundColor: 'rgba(15, 45, 89, 0.65)', // Academic navy shade
                    borderColor: '#0f2d59',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#666666', font: { size: 9 } } },
                    x: { ticks: { color: '#666666', font: { size: 9 } } }
                },
                plugins: { legend: { display: false } }
            }
        });

        // 2. Render Status Chart (Pie Chart)
        const statuses = data.status_distribution.map(d => d.status);
        const statusCounts = data.status_distribution.map(d => d.count);
        const statusColors = {
            'Filed': '#3b82f6',
            'In Progress': '#eab308',
            'Escalated': '#a855f7',
            'Resolved': '#10b981'
        };
        const statusBackgrounds = statuses.map(s => statusColors[s] || '#94a3b8');

        if (statusChartInstance) statusChartInstance.destroy();
        statusChartInstance = new Chart(document.getElementById('status-chart').getContext('2d'), {
            type: 'pie',
            data: {
                labels: statuses,
                datasets: [{
                    data: statusCounts,
                    backgroundColor: statusBackgrounds,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#666666', boxWidth: 10, font: { size: 8 } } }
                }
            }
        });

        // 3. Render Priority Chart (Doughnut Chart)
        const priorities = data.priority_distribution.map(d => d.priority);
        const priorityCounts = data.priority_distribution.map(d => d.count);
        const priorityColors = {
            'Low': '#10b981',
            'Medium': '#f59e0b',
            'High': '#ef4444',
            'Critical': '#7f1d1d'
        };
        const priorityBackgrounds = priorities.map(p => priorityColors[p] || '#94a3b8');

        if (priorityChartInstance) priorityChartInstance.destroy();
        priorityChartInstance = new Chart(document.getElementById('priority-chart').getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: priorities,
                datasets: [{
                    data: priorityCounts,
                    backgroundColor: priorityBackgrounds,
                    borderWidth: 1,
                    borderColor: 'rgba(0,0,0,0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#666666', boxWidth: 10, font: { size: 8 } } }
                }
            }
        });

        // 4. Populate Statistical Ledger Tables
        // Category
        const tblCategory = document.getElementById('tbl-category-breakdown');
        if (data.category_distribution.length === 0) {
            tblCategory.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary);">No records</td></tr>';
        } else {
            tblCategory.innerHTML = data.category_distribution.map(d => {
                const ratio = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return `<tr><td><strong>${escapeHTML(d.category)}</strong></td><td>${d.count}</td><td>${ratio}%</td></tr>`;
            }).join('');
        }

        // Status
        const tblStatus = document.getElementById('tbl-status-breakdown');
        if (data.status_distribution.length === 0) {
            tblStatus.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary);">No records</td></tr>';
        } else {
            tblStatus.innerHTML = data.status_distribution.map(d => {
                const ratio = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return `<tr><td><strong>${escapeHTML(d.status)}</strong></td><td>${d.count}</td><td>${ratio}%</td></tr>`;
            }).join('');
        }

        // Priority
        const tblPriority = document.getElementById('tbl-priority-breakdown');
        if (data.priority_distribution.length === 0) {
            tblPriority.innerHTML = '<tr><td colspan="3" style="text-align:center; color:var(--text-secondary);">No records</td></tr>';
        } else {
            tblPriority.innerHTML = data.priority_distribution.map(d => {
                const ratio = total > 0 ? Math.round((d.count / total) * 100) : 0;
                return `<tr><td><strong>${escapeHTML(d.priority)}</strong></td><td>${d.count}</td><td>${ratio}%</td></tr>`;
            }).join('');
        }

        // 5. Generate System Analytical Insights Reports
        let insightHTML = '<ul style="margin: 0; padding-left: 15px;">';
        
        // Insight 1: Workload balance
        if (total > 0 && data.category_distribution.length > 0) {
            let maxCat = data.category_distribution[0];
            data.category_distribution.forEach(d => {
                if (d.count > maxCat.count) maxCat = d;
            });
            const maxPercent = Math.round((maxCat.count / total) * 100);
            insightHTML += `<li style="margin-bottom: 8px;"><strong>Workload Balance</strong>: The <strong>${escapeHTML(maxCat.category)}</strong> department carries the heaviest workload in the system, accounting for <strong>${maxCat.count} cases</strong> (${maxPercent}% of total logged tickets).</li>`;
        } else {
            insightHTML += '<li style="margin-bottom: 8px;"><strong>Workload Balance</strong>: No logged complaints found in registry to compute department balances.</li>';
        }

        // Insight 2: Severity check
        const criticalObj = data.priority_distribution.find(d => d.priority === 'Critical') || { count: 0 };
        const highObj = data.priority_distribution.find(d => d.priority === 'High') || { count: 0 };
        const severeCount = (criticalObj.count || 0) + (highObj.count || 0);
        if (severeCount > 0) {
            insightHTML += `<li style="margin-bottom: 8px; color: #b45309;"><strong>Critical Severity Alert</strong>: There are currently <strong>${severeCount} active High or Critical</strong> tickets in backlog. Immediate resource allocation is advised to mitigate structural risks.</li>`;
        } else {
            insightHTML += '<li style="margin-bottom: 8px; color: #047857;"><strong>Severity Profile</strong>: Excellent. No Critical or High severity backlog incidents currently logged in registry.</li>';
        }

        // Insight 3: Resolution rates & throughput
        if (total > 0) {
            insightHTML += `<li style="margin-bottom: 8px;"><strong>Resolution Throughput</strong>: System resolution rate is at <strong>${resolvedPercent}%</strong> with an average duration of <strong>${data.avg_resolution_hours} hours</strong> per case, satisfying default response latency criteria.</li>`;
        } else {
            insightHTML += '<li style="margin-bottom: 8px;"><strong>Resolution Throughput</strong>: Insufficient resolved metrics to calculate average throughput performance benchmarks.</li>';
        }

        insightHTML += '</ul>';
        document.getElementById('analytics-insights-content').innerHTML = insightHTML;

    } catch (e) {
        console.error(e);
    }
}


/* ==========================================================================
   ADMIN USER MANAGEMENT CONTROLS
   ========================================================================== */

// Load Admin User Directory list
async function loadAdminUsers() {
    try {
        const response = await fetch('/api/admin/users', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) return;

        const usersList = await response.json();
        
        const tbody = document.getElementById('admin-users-table-body');
        if (usersList.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="no-data-msg">No users registered in system.</td></tr>';
            return;
        }

        let html = '';
        usersList.forEach(u => {
            const isSelf = u.id === user.id;
            const deleteBtn = isSelf 
                ? `<span style="font-size: 0.8rem; color: var(--text-secondary); font-style: italic;">Active Session</span>`
                : `<button class="btn btn-secondary" style="padding: 0.3rem 0.6rem; font-size: 0.75rem; border-color: var(--prio-high); color: var(--prio-high);" onclick="deleteAdminUser(${u.id}, '${escapeHTML(u.username)}')">Delete User</button>`;
            
            html += `
                <tr>
                    <td>#${u.id}</td>
                    <td><strong>${escapeHTML(u.username)}</strong></td>
                    <td><span class="badge ${u.role === 'Admin' ? 'badge-status-escalated' : u.role === 'Staff' ? 'badge-status-inprogress' : 'badge-status-filed'}">${u.role}</span></td>
                    <td>${u.department ? escapeHTML(u.department) : '<em>None</em>'}</td>
                    <td>${new Date(u.created_at).toLocaleDateString()}</td>
                    <td>${deleteBtn}</td>
                </tr>
            `;
        });
        tbody.innerHTML = html;

        // Toggles department selection on the right hand create form
        const roleSelect = document.getElementById('admin-user-role');
        
        roleSelect.replaceWith(roleSelect.cloneNode(true)); // reset listeners
        document.getElementById('admin-user-role').addEventListener('change', (e) => {
            if (e.target.value === 'Staff') {
                document.getElementById('admin-user-dept-group').style.display = 'block';
            } else {
                document.getElementById('admin-user-dept-group').style.display = 'none';
            }
        });

        // Intercept create user form submission
        const form = document.getElementById('admin-create-user-form');
        form.replaceWith(form.cloneNode(true)); // reset listeners
        
        document.getElementById('admin-create-user-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            const alertId = 'admin-user-create-alert';
            const alertEl = document.getElementById(alertId);
            const submitBtn = document.getElementById('admin-user-submit-btn');

            alertEl.style.display = 'none';
            
            const usernameVal = document.getElementById('admin-user-username').value;
            const passwordVal = document.getElementById('admin-user-password').value;
            const roleVal = document.getElementById('admin-user-role').value;
            const deptVal = roleVal === 'Staff' ? document.getElementById('admin-user-dept').value : null;

            if (!usernameVal || !passwordVal || !roleVal) {
                showFormAlert(alertId, 'Please complete all required fields.', 'error');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Registering Account...';

            try {
                const res = await fetch('/api/admin/users', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({
                        username: usernameVal,
                        password: passwordVal,
                        role: roleVal,
                        department: deptVal
                    })
                });
                
                const responseData = await res.json();
                
                if (res.ok) {
                    showFormAlert(alertId, 'Account registered successfully!', 'success');
                    document.getElementById('admin-create-user-form').reset();
                    document.getElementById('admin-user-dept-group').style.display = 'none';
                    setTimeout(() => {
                        loadAdminUsers(); // reload list
                    }, 500);
                } else {
                    showFormAlert(alertId, responseData.message || 'Registration failed.', 'error');
                }
            } catch (err) {
                showFormAlert(alertId, 'Failed to connect to backend server.', 'error');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Create User Account';
            }
        });

    } catch (e) {
        console.error(e);
    }
}

// Delete user request
async function deleteAdminUser(id, name) {
    const listAlertId = 'admin-users-list-alert';
    const listAlert = document.getElementById(listAlertId);
    listAlert.style.display = 'none';

    if (!confirm(`Are you sure you want to permanently delete user '${name}'?`)) {
        return;
    }

    try {
        const response = await fetch(`/api/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const data = await response.json();
        
        if (response.ok) {
            showFormAlert(listAlertId, `User '${name}' deleted successfully!`, 'success');
            setTimeout(() => {
                loadAdminUsers();
            }, 500);
        } else {
            showFormAlert(listAlertId, data.message || 'Failed to delete user.', 'error');
        }
    } catch (err) {
        showFormAlert(listAlertId, 'Network error deleting user.', 'error');
    }
}


/* ==========================================================================
   UTILITY HELPER FUNCTIONS
   ========================================================================== */

function showFormAlert(elementId, message, type) {
    const alertBox = document.getElementById(elementId);
    if (!alertBox) return;
    alertBox.textContent = message;
    alertBox.className = `alert alert-${type}`;
    alertBox.style.display = 'block';
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}
