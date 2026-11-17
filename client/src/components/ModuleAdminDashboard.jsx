import React, { useEffect, useState } from 'react';
import { Activity, Bell, ExternalLink, ShieldCheck } from 'lucide-react';

const workspaceByModule = {
  navigation: { label: 'Campus Navigation', href: '/navigation/' },
  campus_navigation: { label: 'Campus Navigation', href: '/navigation/' },
  lost_found: { label: 'Lost & Found', href: '/admin/lost-found' },
  canteen: { label: 'Smart Canteen', href: '/canteen-admin/dashboard' },
  smart_canteen: { label: 'Smart Canteen', href: '/canteen-admin/dashboard' },
  examination: { label: 'Examination System', href: '/admin/exam-schedule' },
  exam: { label: 'Examination System', href: '/admin/exam-schedule' },
  exam_system: { label: 'Examination System', href: '/admin/exam-schedule' },
};

async function request(path, options = {}) {
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
    const error = new Error(data.message || `Admin request failed (${response.status}).`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export default function ModuleAdminDashboard({ currentUser, onLogout }) {
  const [assignments, setAssignments] = useState([]);
  const [activity, setActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [audience, setAudience] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [reloadVersion, setReloadVersion] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([
      request('/me'),
      request('/activity'),
      request('/notifications'),
    ])
      .then(([meData, activityData, notificationData]) => {
        if (!active) return;
        const currentAssignments = meData.admin_modules || meData.assignments || meData.admin_assignments || [];
        setAssignments(currentAssignments.filter((assignment) => assignment.status === 'active'));
        setActivity(activityData.activity || activityData.logs || []);
        setNotifications(notificationData.notifications || []);
      })
      .catch((requestError) => {
        if (!active) return;
        if (requestError.status === 401 || requestError.status === 403) {
          setError('Your module-admin permission is no longer active. Please sign in again.');
          window.setTimeout(onLogout, 1500);
          return;
        }
        setError(requestError.message || 'Could not load your module dashboard.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [onLogout, reloadVersion]);

  const sendNotification = async (event, assignment) => {
    event.preventDefault();
    setError('');
    setFeedback('');
    try {
      await request('/notifications', {
        method: 'POST',
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          module_slug: assignment.module_slug || assignment.slug,
          audience,
        }),
      });
      setTitle('');
      setDescription('');
      setFeedback('Notification published to the selected audience.');
      setReloadVersion((version) => version + 1);
    } catch (requestError) {
      setError(requestError.message || 'Could not publish the notification.');
    }
  };

  const assignedModules = assignments.map((assignment) => {
    const slug = assignment.key || assignment.module_slug || assignment.slug;
    return {
      ...assignment,
      slug,
      name: assignment.module_name || assignment.name || slug,
      workspace: workspaceByModule[slug],
    };
  });

  return (
    <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:px-6">
      <header className="rounded-3xl border border-cyan-400/30 bg-[#09152b]/90 p-5 shadow-[0_0_25px_rgba(6,182,212,0.12)] sm:p-7">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-300">
          <ShieldCheck className="h-4 w-4" />
          Module Administration
        </div>
        <h1 className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
          Welcome, {currentUser?.name || 'Administrator'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Your access is limited to the module assignments listed below. Permissions are checked against the live account record.
        </p>
      </header>

      {error && <p role="alert" className="rounded-xl border border-rose-400/30 bg-rose-950/30 p-3 text-xs text-rose-200">{error}</p>}
      {feedback && <p role="status" className="rounded-xl border border-emerald-400/30 bg-emerald-950/30 p-3 text-xs text-emerald-200">{feedback}</p>}
      {loading && <p className="text-xs text-slate-400">Loading assigned modules…</p>}

      <section className="grid gap-4 md:grid-cols-2">
        {assignedModules.map((assignment) => (
          <article key={assignment.id || assignment.slug} className="space-y-4 rounded-2xl border border-cyan-400/25 bg-[#09152b]/90 p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">{assignment.name}</h2>
                <p className="mt-1 text-[11px] text-slate-400">Permissions: {(assignment.permissions || []).join(', ') || 'view'}</p>
              </div>
              {assignment.workspace && (
                <a href={assignment.workspace.href} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-cyan-500/15 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/25">
                  Open workspace
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
            {assignment.permissions?.includes('notifications:send') && (
              <form onSubmit={(event) => sendNotification(event, assignment)} className="space-y-2 border-t border-cyan-400/15 pt-3">
                <h3 className="flex items-center gap-2 text-xs font-bold text-slate-200">
                  <Bell className="h-4 w-4 text-cyan-300" />
                  Publish module notification
                </h3>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="w-full rounded-lg border border-cyan-400/20 bg-[#060e20] px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
                  placeholder="Notification title"
                  required
                />
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  className="w-full rounded-lg border border-cyan-400/20 bg-[#060e20] px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
                  placeholder="Update details"
                  rows={3}
                  required
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <select value={audience} onChange={(event) => setAudience(event.target.value)} className="rounded-lg border border-cyan-400/20 bg-[#060e20] px-3 py-2 text-xs text-white">
                    <option value="all">All registered users</option>
                    <option value="students">Students</option>
                    <option value="faculty">Faculty</option>
                  </select>
                  <button type="submit" className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 px-3 py-2 text-xs font-bold text-cyan-200 hover:bg-cyan-500/20">
                    Send notification
                  </button>
                </div>
              </form>
            )}
          </article>
        ))}
        {!assignedModules.length && !loading && (
          <p className="rounded-xl border border-amber-400/30 bg-amber-950/20 p-4 text-xs text-amber-200">
            No active module assignments were found for this account.
          </p>
        )}
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="space-y-3 rounded-2xl border border-cyan-400/20 bg-[#09152b]/90 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Activity className="h-4 w-4 text-cyan-300" />Recent Module Activity</h2>
          <div className="max-h-80 space-y-2 overflow-auto">
            {activity.map((entry) => (
              <article key={entry.id} className="rounded-lg bg-[#060e20] p-3 text-[11px]">
                <div className="font-bold text-white">{entry.action || entry.event_type} <span className="font-normal text-cyan-200">· {entry.module || entry.module_slug}</span></div>
                <div className="mt-1 text-slate-500">{entry.created_at || entry.timestamp}</div>
              </article>
            ))}
            {!activity.length && <p className="text-xs text-slate-500">No module activities recorded.</p>}
          </div>
        </section>
        <section className="space-y-3 rounded-2xl border border-cyan-400/20 bg-[#09152b]/90 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white"><Bell className="h-4 w-4 text-cyan-300" />Notification History</h2>
          <div className="max-h-80 space-y-2 overflow-auto">
            {notifications.map((notice) => (
              <article key={notice.id} className="rounded-lg bg-[#060e20] p-3 text-[11px]">
                <div className="font-bold text-white">{notice.title}</div>
                <div className="mt-1 text-slate-400">{notice.module_name || notice.module} · {notice.created_by_name || notice.creator} · {notice.created_at}</div>
                <p className="mt-1 text-slate-300">{notice.description || notice.body}</p>
              </article>
            ))}
            {!notifications.length && <p className="text-xs text-slate-500">No notifications to display.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
