import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Bell, CheckCircle2, Plus, Search, ShieldCheck, Users } from 'lucide-react';

async function adminApi(path, options = {}) {
  const token = localStorage.getItem('campus360_token');
  const response = await fetch(`/api/campus-admin${path}`, {
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error('Admin service returned an invalid response.');
  }
  if (!response.ok || data.success === false) {
    throw new Error(data.message || `Admin request failed (${response.status}).`);
  }
  return data;
}

function Panel({ title, icon: Icon, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-cyan-400/25 bg-[#09152b]/90 p-4 shadow-lg sm:p-5">
      <h2 className="flex items-center gap-2 text-sm font-bold text-white">
        <Icon className="h-4 w-4 text-cyan-300" />
        {title}
      </h2>
      {children}
    </section>
  );
}

function AssignmentPermissions({ assignment, onSave }) {
  const moduleKey = assignment.module?.key || assignment.module_slug || assignment.slug;
  const options = moduleKey === 'lost_found' ? lostFoundPermissionOptions : basePermissionOptions;
  const [permissions, setPermissions] = useState(assignment.permissions || []);

  useEffect(() => {
    setPermissions(assignment.permissions || []);
  }, [assignment.permissions]);

  return (
    <div className="min-w-56 space-y-1.5">
      <div className="grid gap-1">
        {options.map(([permission, label]) => (
          <label key={permission} className="flex items-center gap-1.5 text-[10px] text-slate-300">
            <input
              type="checkbox"
              checked={permissions.includes(permission)}
              onChange={() => setPermissions((current) => current.includes(permission)
                ? current.filter((value) => value !== permission)
                : [...current, permission])}
              className="accent-cyan-400"
            />
            {label}
          </label>
        ))}
      </div>
      <button type="button" className={buttonClass} onClick={() => onSave(permissions)}>
        Save permissions
      </button>
    </div>
  );
}

const fieldClass = 'w-full rounded-lg border border-cyan-400/20 bg-[#060e20] px-3 py-2 text-xs text-white outline-none focus:border-cyan-300';
const buttonClass = 'inline-flex items-center justify-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20 disabled:cursor-not-allowed disabled:opacity-50';
const basePermissionOptions = [
  ['notifications:read', 'Read notifications'],
  ['notifications:send', 'Send notifications'],
  ['activity:read', 'View module activity'],
];
const lostFoundPermissionOptions = [
  ...basePermissionOptions,
  ['reports:view', 'View all Lost & Found details'],
  ['reports:edit', 'Edit and verify reports'],
  ['reports:delete', 'Delete Lost & Found reports'],
];

export default function AdminManagement() {
  const [modules, setModules] = useState([]);
  const [users, setUsers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);
  const [userSearch, setUserSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedModule, setSelectedModule] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([
    'notifications:read',
    'notifications:send',
    'activity:read',
  ]);
  const [moduleName, setModuleName] = useState('');
  const [moduleSlug, setModuleSlug] = useState('');
  const [activityFilters, setActivityFilters] = useState({ role: '', module: '', action: '', from: '', to: '' });
  const [noticeModule, setNoticeModule] = useState('');
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeDescription, setNoticeDescription] = useState('');
  const [noticeAudience, setNoticeAudience] = useState('all');
  const [noticeRecipients, setNoticeRecipients] = useState([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    Promise.all([
      adminApi('/modules'),
      adminApi('/users'),
      adminApi('/assignments'),
      adminApi('/activity'),
      adminApi('/notifications'),
    ])
      .then(([moduleData, userData, assignmentData, activityData, notificationData]) => {
        if (!active) return;
        setModules(moduleData.modules || []);
        setUsers(userData.users || []);
        setAssignments(assignmentData.assignments || []);
        setActivity(activityData.activity || activityData.logs || []);
        setNotifications(notificationData.notifications || []);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || 'Could not load admin management data.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [reloadVersion]);

  const filteredUsers = useMemo(() => {
    const query = userSearch.trim().toLowerCase();
    const selectedModuleKey = modules.find((module) => String(module.id) === String(selectedModule))?.key;
    return users.filter((user) => {
      const registeredRole = ['student', 'faculty', 'teacher'].includes(user.role);
      const eligibleForModule = selectedModuleKey !== 'lost_found' || ['faculty', 'teacher'].includes(user.role);
      const searchable = `${user.name || user.full_name || ''} ${user.email || ''} ${user.identifier || user.usn_or_id || ''}`.toLowerCase();
      return registeredRole && eligibleForModule && user.is_active && user.is_verified && (!query || searchable.includes(query));
    });
  }, [users, userSearch, modules, selectedModule]);

  const submit = async (action, successMessage) => {
    setError('');
    setFeedback('');
    try {
      await action();
      setFeedback(successMessage);
      setReloadVersion((version) => version + 1);
    } catch (requestError) {
      setError(requestError.message || 'The requested admin action failed.');
    }
  };

  const createAssignment = (event) => {
    event.preventDefault();
    if (!selectedUser || !selectedModule || selectedPermissions.length === 0) {
      setError('Choose a registered person, module, and at least one permission.');
      return;
    }
    submit(() => adminApi('/assignments', {
      method: 'POST',
      body: JSON.stringify({
        user_id: Number(selectedUser),
        module_id: Number(selectedModule),
        permissions: selectedPermissions,
      }),
    }), 'Module administrator assigned. The account will receive its role notification.');
  };

  const updateAssignment = (assignment, updates, message) => {
    submit(() => adminApi(`/assignments/${assignment.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }), message);
  };

  const updateModule = (module, updates, message) => {
    submit(() => adminApi(`/modules/${module.id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    }), message);
  };

  const createModule = (event) => {
    event.preventDefault();
    if (!moduleName.trim() || !moduleSlug.trim()) {
      setError('Enter both a module name and a URL-safe module key.');
      return;
    }
    submit(() => adminApi('/modules', {
      method: 'POST',
      body: JSON.stringify({ name: moduleName.trim(), key: moduleSlug.trim().toLowerCase() }),
    }), 'Module added.');
    setModuleName('');
    setModuleSlug('');
  };

  const createNotification = (event) => {
    event.preventDefault();
    if (!noticeModule || !noticeTitle.trim() || !noticeDescription.trim()) {
      setError('Choose a module and enter a notification title and description.');
      return;
    }
    if (noticeAudience === 'selected' && noticeRecipients.length === 0) {
      setError('Select at least one recipient for a targeted notification.');
      return;
    }
    submit(() => adminApi('/notifications', {
      method: 'POST',
      body: JSON.stringify({
        title: noticeTitle.trim(),
        description: noticeDescription.trim(),
        module_slug: noticeModule,
        audience: noticeAudience,
        recipient_ids: noticeRecipients.map(Number),
      }),
    }), 'Notification sent and recorded in the system history.');
    setNoticeTitle('');
    setNoticeDescription('');
    setNoticeRecipients([]);
  };

  const refreshActivity = async (event) => {
    event.preventDefault();
    const query = new URLSearchParams();
    if (activityFilters.role) query.set('role', activityFilters.role);
    if (activityFilters.module) query.set('module', activityFilters.module);
    if (activityFilters.action) query.set('action', activityFilters.action);
    if (activityFilters.from) query.set('since', `${activityFilters.from}T00:00:00`);
    if (activityFilters.to) query.set('until', `${activityFilters.to}T23:59:59`);
    setError('');
    try {
      const result = await adminApi(`/activity?${query.toString()}`);
      setActivity(result.activity || result.logs || []);
    } catch (requestError) {
      setError(requestError.message || 'Could not filter activity logs.');
    }
  };

  const togglePermission = (permission) => {
    setSelectedPermissions((current) => current.includes(permission)
      ? current.filter((value) => value !== permission)
      : [...current, permission]);
  };

  const permissionOptions = modules.find((module) => String(module.id) === String(selectedModule))?.key === 'lost_found'
    ? lostFoundPermissionOptions
    : basePermissionOptions;

  return (
    <div className="space-y-5">
      <div>
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
          <ShieldCheck className="h-4 w-4" />
          Main Admin • Centralized Admin Management
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Assign verified existing accounts, configure modules, and review protected system activity.
        </p>
      </div>

      {error && <div role="alert" className="rounded-xl border border-rose-400/40 bg-rose-950/40 px-4 py-3 text-xs text-rose-200">{error}</div>}
      {feedback && <div role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 px-4 py-3 text-xs text-emerald-200">{feedback}</div>}
      {loading && <p className="text-xs text-slate-400">Loading live administration data…</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: 'Registered Users', value: users.length, icon: Users },
          { label: 'Configured Modules', value: modules.length, icon: ShieldCheck },
          { label: 'Admin Assignments', value: assignments.filter((item) => item.status === 'active').length, icon: CheckCircle2 },
          { label: 'Notifications', value: notifications.length, icon: Bell },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-xl border border-cyan-400/20 bg-[#060e20] p-3">
            <Icon className="mb-2 h-4 w-4 text-cyan-300" />
            <div className="text-xl font-black text-white">{value}</div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Create Module Administrator" icon={Users}>
            <p className="text-[11px] leading-relaxed text-slate-400">
            Only existing registered student or faculty accounts are eligible. Their base account role and credentials remain unchanged. Lost &amp; Found permissions control viewing, editing, and deleting reports.
          </p>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              value={userSearch}
              onChange={(event) => setUserSearch(event.target.value)}
              className={`${fieldClass} pl-9`}
              placeholder="Search registered name, ID, or email"
              aria-label="Search registered users"
            />
          </div>
          <form onSubmit={createAssignment} className="space-y-3">
            <select className={fieldClass} value={selectedUser} onChange={(event) => setSelectedUser(event.target.value)} required>
              <option value="">Select verified registered person</option>
              {filteredUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {(user.name || user.full_name)} — {user.role} — {user.email || user.identifier}
                </option>
              ))}
            </select>
            <select
              className={fieldClass}
              value={selectedModule}
              onChange={(event) => {
                const nextModule = event.target.value;
                setSelectedModule(nextModule);
                const selectedModuleRecord = modules.find((module) => String(module.id) === String(nextModule));
                const isLostFound = selectedModuleRecord?.key === 'lost_found';
                const selectedAccount = users.find((user) => String(user.id) === String(selectedUser));
                if (isLostFound && selectedAccount && !['faculty', 'teacher'].includes(selectedAccount.role)) {
                  setSelectedUser('');
                }
                setSelectedPermissions(isLostFound
                  ? lostFoundPermissionOptions.map(([permission]) => permission)
                  : basePermissionOptions.map(([permission]) => permission));
              }}
              required
            >
              <option value="">Select administrative module</option>
              {modules.filter((module) => module.is_active !== false).map((module) => (
                <option key={module.id} value={module.id}>{module.name}</option>
              ))}
            </select>
            <div className="flex flex-wrap gap-3">
              {permissionOptions.map(([permission, label]) => (
                <label key={permission} className="flex items-center gap-2 text-xs text-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(permission)}
                    onChange={() => togglePermission(permission)}
                    className="accent-cyan-400"
                  />
                  {label}
                </label>
              ))}
            </div>
            <button type="submit" className={buttonClass} disabled={loading}>
              <Plus className="h-4 w-4" />
              Confirm Appointment
            </button>
          </form>
          {filteredUsers.length === 0 && !loading && <p className="text-xs text-amber-200">No eligible registered accounts matched.</p>}
        </Panel>

        <Panel title="Configurable Modules" icon={ShieldCheck}>
          <form onSubmit={createModule} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
            <input className={fieldClass} value={moduleName} onChange={(event) => setModuleName(event.target.value)} placeholder="Module name" aria-label="New module name" />
            <input className={fieldClass} value={moduleSlug} onChange={(event) => setModuleSlug(event.target.value)} placeholder="module-key" aria-label="New module key" />
            <button type="submit" className={buttonClass}><Plus className="h-4 w-4" />Add</button>
          </form>
          <div className="space-y-2">
            {modules.map((module) => (
              <div key={module.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-cyan-400/15 bg-[#060e20] px-3 py-2">
                <div>
                  <div className="text-xs font-bold text-white">{module.name}</div>
                  <div className="text-[10px] text-slate-500">{module.key || module.slug}</div>
                </div>
                <button
                  type="button"
                  className={buttonClass}
                  onClick={() => updateModule(
                    module,
                    { is_active: module.is_active === false },
                    `Module ${module.is_active === false ? 'activated' : 'deactivated'}.`,
                  )}
                >
                  {module.is_active === false ? 'Inactive' : 'Active'}
                </button>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Assigned Administrators" icon={ShieldCheck}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-xs">
            <thead className="border-b border-cyan-400/15 text-[10px] uppercase text-slate-500">
              <tr><th className="p-2">Person</th><th className="p-2">Base Role</th><th className="p-2">Module</th><th className="p-2">Permissions</th><th className="p-2">Status</th><th className="p-2">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-cyan-400/10">
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td className="p-2 font-semibold text-white">{assignment.user_name || assignment.user?.name || assignment.name || assignment.user_email}</td>
                  <td className="p-2 text-slate-300">{assignment.base_role || assignment.user?.role || assignment.role}</td>
                  <td className="p-2 text-cyan-200">
                    <select
                      aria-label={`Change module for ${assignment.user_name || assignment.user?.name || 'administrator'}`}
                      className={`${fieldClass} min-w-36 py-1`}
                      value={assignment.module_id}
                      onChange={(event) => updateAssignment(
                        assignment,
                        { module_id: Number(event.target.value) },
                        'Administrator module assignment changed.',
                      )}
                    >
                      {modules.filter((module) => (
                        module.is_active !== false
                        && (module.key !== 'lost_found' || ['faculty', 'teacher'].includes(assignment.user?.role))
                      )).map((module) => (
                        <option key={module.id} value={module.id}>{module.name}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-2 text-slate-300">
                    <AssignmentPermissions
                      assignment={assignment}
                      onSave={(permissions) => updateAssignment(
                        assignment,
                        { permissions },
                        'Administrator permissions updated.',
                      )}
                    />
                  </td>
                  <td className="p-2 text-slate-300">{assignment.status}</td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1.5">
                      <select
                        aria-label={`Transfer ${assignment.user_name || 'administrator'} to another registered user`}
                        className={`${fieldClass} max-w-48 py-1`}
                        value={assignment.user_id}
                        onChange={(event) => updateAssignment(
                          assignment,
                          { action: 'transfer', target_user_id: Number(event.target.value) },
                          'Administrator assignment transferred.',
                        )}
                      >
                        {users.filter((user) => (
                          user.id !== assignment.user_id && user.is_active && user.is_verified
                          && ['student', 'faculty', 'teacher'].includes(user.role)
                          && (assignment.module?.key !== 'lost_found' || ['faculty', 'teacher'].includes(user.role))
                        )).map((user) => (
                          <option key={user.id} value={user.id}>{user.name || user.full_name}</option>
                        ))}
                      </select>
                      <button type="button" className={buttonClass} onClick={() => updateAssignment(
                        assignment,
                        { status: assignment.status === 'suspended' ? 'active' : 'suspended' },
                        `Assignment ${assignment.status === 'suspended' ? 'reactivated' : 'suspended'}.`,
                      )}>
                        {assignment.status === 'suspended' ? 'Reactivate' : 'Suspend'}
                      </button>
                      <button type="button" className="rounded-lg border border-rose-400/30 px-2 py-1 text-[10px] font-bold text-rose-200 hover:bg-rose-500/10" onClick={() => updateAssignment(assignment, { status: 'revoked' }, 'Admin permissions revoked.')}>
                        Revoke
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!assignments.length && <tr><td colSpan="6" className="p-4 text-center text-slate-500">No module administrators assigned.</td></tr>}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="System Activity & Notification Monitoring" icon={Activity}>
        <form onSubmit={refreshActivity} className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          <select className={fieldClass} value={activityFilters.role} onChange={(event) => setActivityFilters({ ...activityFilters, role: event.target.value })} aria-label="Filter activity by role">
            <option value="">All roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrators</option>
          </select>
          <select className={fieldClass} value={activityFilters.module} onChange={(event) => setActivityFilters({ ...activityFilters, module: event.target.value })} aria-label="Filter activity by module">
            <option value="">All modules</option>
            {modules.map((module) => <option key={module.id} value={module.key}>{module.name}</option>)}
          </select>
          <input className={fieldClass} value={activityFilters.action} onChange={(event) => setActivityFilters({ ...activityFilters, action: event.target.value })} placeholder="Activity type" aria-label="Filter activity type" />
          <input className={fieldClass} type="date" value={activityFilters.from} onChange={(event) => setActivityFilters({ ...activityFilters, from: event.target.value })} aria-label="Activity start date" />
          <input className={fieldClass} type="date" value={activityFilters.to} onChange={(event) => setActivityFilters({ ...activityFilters, to: event.target.value })} aria-label="Activity end date" />
          <button type="submit" className={buttonClass}>Filter Activity</button>
        </form>
        <div className="grid gap-4 xl:grid-cols-2">
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">Protected Activity Log</h3>
            <div className="max-h-72 space-y-2 overflow-auto">
              {activity.map((entry) => (
                <article key={entry.id} className="rounded-lg border border-cyan-400/10 bg-[#060e20] p-3 text-[11px]">
                  <div className="font-bold text-white">{entry.action || entry.event_type} <span className="font-normal text-cyan-200">• {entry.module || entry.module_slug || 'System'}</span></div>
                  <div className="mt-1 text-slate-400">{entry.actor_name || entry.user_name || entry.actor || 'System'} · {entry.created_at || entry.timestamp}</div>
                  {entry.details && <div className="mt-1 text-slate-500">{typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details)}</div>}
                </article>
              ))}
              {!activity.length && <p className="text-xs text-slate-500">No matching activities.</p>}
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-slate-300">Notifications</h3>
            <form onSubmit={createNotification} className="space-y-2 rounded-lg border border-cyan-400/10 bg-[#060e20] p-3">
              <select className={fieldClass} value={noticeModule} onChange={(event) => setNoticeModule(event.target.value)} required>
                <option value="">Select originating module</option>
                {modules.filter((module) => module.is_active !== false).map((module) => (
                  <option key={module.id} value={module.key}>{module.name}</option>
                ))}
              </select>
              <input className={fieldClass} value={noticeTitle} onChange={(event) => setNoticeTitle(event.target.value)} placeholder="Notification title" required />
              <textarea className={fieldClass} value={noticeDescription} onChange={(event) => setNoticeDescription(event.target.value)} placeholder="Notification description" rows={2} required />
              <select className={fieldClass} value={noticeAudience} onChange={(event) => setNoticeAudience(event.target.value)}>
                <option value="all">All registered users</option>
                <option value="students">Students</option>
                <option value="faculty">Faculty</option>
                <option value="selected">Selected registered users</option>
              </select>
              {noticeAudience === 'selected' && (
                <select
                  multiple
                  className={`${fieldClass} min-h-24`}
                  value={noticeRecipients}
                  onChange={(event) => setNoticeRecipients(Array.from(event.target.selectedOptions, (option) => option.value))}
                  aria-label="Notification recipients"
                >
                  {users.filter((user) => user.is_active && user.is_verified && ['student', 'faculty', 'teacher'].includes(user.role)).map((user) => (
                    <option key={user.id} value={user.id}>{user.name || user.full_name} · {user.email}</option>
                  ))}
                </select>
              )}
              <button type="submit" className={buttonClass}>Send notification</button>
            </form>
            <div className="max-h-72 space-y-2 overflow-auto">
              {notifications.map((notice) => (
                <article key={notice.id} className="rounded-lg border border-cyan-400/10 bg-[#060e20] p-3 text-[11px]">
                  <div className="font-bold text-white">{notice.title}</div>
                  <div className="mt-1 text-slate-400">
                    {notice.module_name || notice.originating_module || notice.module || 'Campus'} · {notice.created_by_name || notice.creator || 'System'} · {notice.created_at}
                    {notice.read_status && ` · ${notice.read_status}`}
                  </div>
                  <p className="mt-1 text-slate-300">{notice.description || notice.message || notice.body}</p>
                </article>
              ))}
              {!notifications.length && <p className="text-xs text-slate-500">No notifications to display.</p>}
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
