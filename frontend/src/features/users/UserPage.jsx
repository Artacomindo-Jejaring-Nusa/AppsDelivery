import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function UserPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All Roles');
  const [statusFilter, setStatusFilter] = useState('All Status');

  // Add User Form State
  const [addForm, setAddForm] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    role: 'dispatcher',
    phone: '',
  });

  // Edit User Form State
  const [editForm, setEditForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    role: 'dispatcher',
    is_active: true,
  });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/users?per_page=100');
      setUsers(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/auth/register', addForm);
      setShowAddModal(false);
      setAddForm({
        username: '',
        email: '',
        password: '',
        full_name: '',
        role: 'dispatcher',
        phone: '',
      });
      fetchUsers();
      alert('User baru berhasil didaftarkan.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mendaftarkan user baru');
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditForm({
      full_name: user.full_name || '',
      email: user.email || '',
      phone: user.phone || '',
      role: user.role || 'dispatcher',
      is_active: user.is_active,
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.put(`/users/${selectedUser.id}`, editForm);
      setShowEditModal(false);
      fetchUsers();
      alert('User berhasil diupdate.');
    } catch (err) {
      alert(err.response?.data?.message || 'Gagal mengupdate user');
    }
  };

  const toggleUserStatus = async (user) => {
    const action = user.is_active ? 'nonaktifkan' : 'aktifkan';
    if (window.confirm(`Apakah Anda yakin ingin me-${action} user ${user.full_name}?`)) {
      try {
        await api.put(`/users/${user.id}`, {
          is_active: !user.is_active,
        });
        fetchUsers();
      } catch (err) {
        alert(err.response?.data?.message || 'Gagal mengubah status user');
      }
    }
  };

  // Filter logic
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.username?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'All Roles' ||
      u.role?.toLowerCase() === roleFilter.toLowerCase();

    const matchesStatus =
      statusFilter === 'All Status' ||
      (statusFilter === 'Aktif' && u.is_active) ||
      (statusFilter === 'Inaktif' && !u.is_active);

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Stats calculation
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;

  return (
    <div className="space-y-lg animate-in fade-in duration-300">
      {/* ─── Header Actions ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-md mb-xl">
        <div>
          <p className="font-label-sm text-label-sm text-primary font-semibold uppercase tracking-wider mb-xs">Administration</p>
          <h3 className="font-headline-lg text-headline-lg text-on-surface">User Management</h3>
          <p className="text-on-surface-variant mt-xs">Manage system access for administrators, dispatchers, and drivers.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-sm bg-primary text-on-primary px-lg py-sm rounded-lg font-semibold hover:bg-opacity-90 active:scale-[0.98] transition-all duration-150 shadow-sm"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span>Add New User</span>
        </button>
      </div>

      {/* ─── Filter and Search Section ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-xl shadow-sm flex flex-wrap items-center gap-md">
        <div className="flex-1 min-w-[200px] relative">
          <span className="material-symbols-outlined absolute left-sm top-1/2 -translate-y-1/2 text-outline">search</span>
          <input 
            type="text" 
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-xl pr-md py-sm bg-surface-container border-none rounded-lg text-body-md focus:ring-2 focus:ring-primary focus:bg-surface transition-all"
          />
        </div>
        <div className="flex items-center gap-sm">
          <span className="font-label-md text-label-md text-on-surface-variant">Role:</span>
          <select 
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded px-md py-sm text-body-md focus:ring-primary focus:border-primary"
          >
            <option value="All Roles">All Roles</option>
            <option value="admin">Admin</option>
            <option value="dispatcher">Dispatcher</option>
            <option value="driver">Driver</option>
            <option value="data_entry">Data Entry</option>
          </select>
        </div>
        <div className="flex items-center gap-sm">
          <span className="font-label-md text-label-md text-on-surface-variant">Status:</span>
          <select 
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-surface-container-low border border-outline-variant rounded px-md py-sm text-body-md focus:ring-primary focus:border-primary"
          >
            <option value="All Status">All Status</option>
            <option value="Aktif">Aktif</option>
            <option value="Inaktif">Inaktif</option>
          </select>
        </div>
      </div>

      {/* ─── User Data Table ─── */}
      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">
                <th className="px-lg py-md">Nama</th>
                <th className="px-lg py-md">Role</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md">Terakhir Login</th>
                <th className="px-lg py-md text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant font-body-md text-body-md text-on-surface">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-xl text-center text-secondary">
                    <div className="flex justify-center items-center gap-sm">
                      <span className="material-symbols-outlined animate-spin">progress_activity</span>
                      <span>Memuat data pengguna...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-surface-container transition-colors group">
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-md">
                        <div className="w-10 h-10 rounded-full bg-primary-fixed text-primary flex items-center justify-center font-bold">
                          {getInitials(user.full_name)}
                        </div>
                        <div>
                          <p className="font-semibold text-on-surface">{user.full_name}</p>
                          <p className="text-body-sm text-on-surface-variant">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-lg py-md capitalize">
                      <span className="px-sm py-1 bg-primary-fixed-dim/20 text-primary-fixed-dim border border-primary-fixed-dim/30 rounded text-label-sm font-semibold">
                        {user.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-lg py-md">
                      <div className="flex items-center gap-xs">
                        <span className={`w-2 h-2 rounded-full ${user.is_active ? 'bg-green-500' : 'bg-outline'}`}></span>
                        <span className={`text-body-md ${user.is_active ? 'text-green-700' : 'text-on-surface-variant'}`}>
                          {user.is_active ? 'Aktif' : 'Inaktif'}
                        </span>
                      </div>
                    </td>
                    <td className="px-lg py-md">
                      <p className="font-data-mono text-data-mono text-on-surface-variant">
                        {user.updated_at ? new Date(user.updated_at).toISOString().replace('T', ' ').slice(0, 16) : 'Belum Login'}
                      </p>
                    </td>
                    <td className="px-lg py-md text-right">
                      <div className="flex justify-end gap-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleEditClick(user)}
                          className="p-xs hover:text-primary transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">edit</span>
                        </button>
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className={`p-xs ${user.is_active ? 'hover:text-error' : 'hover:text-success'} transition-colors`}
                        >
                          <span className="material-symbols-outlined text-[20px]">
                            {user.is_active ? 'block' : 'check_circle'}
                          </span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-xl text-center text-secondary">
                    Tidak ada data user ditemukan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Table Footer / Pagination */}
        <div className="px-lg py-md bg-surface-container-low border-t border-outline-variant flex items-center justify-between">
          <p className="text-body-sm text-on-surface-variant">Showing {filteredUsers.length} of {users.length} users</p>
          <div className="flex items-center gap-xs">
            <button className="p-sm rounded hover:bg-surface-container-high text-on-surface-variant disabled:opacity-50" disabled>
              <span className="material-symbols-outlined">chevron_left</span>
            </button>
            <button className="w-8 h-8 rounded bg-primary text-on-primary font-semibold text-label-md">1</button>
            <button className="p-sm rounded hover:bg-surface-container-high text-on-surface-variant">
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── Quick Summary Cards (Asymmetric Layout) ─── */}
      <div className="mt-xl grid grid-cols-1 md:grid-cols-4 gap-lg">
        <div className="md:col-span-1 bg-primary text-on-primary p-lg rounded-xl shadow-lg flex flex-col justify-between">
          <div>
            <span className="material-symbols-outlined text-[32px] mb-md text-white">group</span>
            <h4 className="text-label-md uppercase tracking-wider opacity-85 text-white">Total Users</h4>
          </div>
          <p className="text-[40px] font-bold leading-none mt-lg text-white">{loading ? '...' : totalCount}</p>
        </div>
        <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-md">
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex justify-between items-start mb-md">
              <span className="w-10 h-10 rounded-lg bg-green-100 text-green-700 flex items-center justify-center">
                <span className="material-symbols-outlined">check_circle</span>
              </span>
            </div>
            <h4 className="text-on-surface-variant text-label-md uppercase">Active Now</h4>
            <p className="text-headline-md font-bold text-headline-md">{loading ? '...' : activeCount}</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex justify-between items-start mb-md">
              <span className="w-10 h-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                <span className="material-symbols-outlined">pending</span>
              </span>
            </div>
            <h4 className="text-on-surface-variant text-label-md uppercase">Pending Invites</h4>
            <p className="text-headline-md font-bold text-headline-md">0</p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant p-lg rounded-xl">
            <div className="flex justify-between items-start mb-md">
              <span className="w-10 h-10 rounded-lg bg-red-100 text-red-700 flex items-center justify-center">
                <span className="material-symbols-outlined">block</span>
              </span>
            </div>
            <h4 className="text-on-surface-variant text-label-md uppercase">Suspended / Inactive</h4>
            <p className="text-headline-md font-bold text-headline-md">{loading ? '...' : inactiveCount}</p>
          </div>
        </div>
      </div>

      {/* ─── Add User Modal ─── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Register New User</h3>
              <button onClick={() => setShowAddModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Aditya Baskoro"
                  value={addForm.full_name}
                  onChange={(e) => setAddForm({ ...addForm, full_name: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Username</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: aditya.baskoro"
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="aditya.b@aksx.id"
                    value={addForm.email}
                    onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Phone Number</label>
                  <input
                    type="text"
                    placeholder="081299887766"
                    value={addForm.phone}
                    onChange={(e) => setAddForm({ ...addForm, phone: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Password</label>
                <input
                  type="password"
                  required
                  placeholder="Min. 6 karakter"
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">System Role</label>
                <select
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="driver">Driver</option>
                  <option value="data_entry">Data Entry</option>
                </select>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Register User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Edit User Modal ─── */}
      {showEditModal && (
        <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-xs flex items-center justify-center p-md z-50 animate-in fade-in duration-200">
          <div className="bg-surface-container-lowest p-xl rounded-xl border border-outline-variant max-w-lg w-full space-y-lg shadow-xl">
            <div className="flex justify-between items-center border-b border-outline-variant pb-md">
              <h3 className="font-headline-sm text-headline-sm text-on-surface">Edit User Account</h3>
              <button onClick={() => setShowEditModal(false)} className="text-secondary hover:text-on-surface">
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-md">
              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Full Name</label>
                <input
                  type="text"
                  required
                  value={editForm.full_name}
                  onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-md">
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">Phone Number</label>
                  <input
                    type="text"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                    className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="font-label-sm text-label-sm text-on-surface-variant block mb-xs">System Role</label>
                <select
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                  className="w-full h-10 bg-surface px-md border border-outline-variant rounded-lg font-body-md outline-none focus:border-primary"
                >
                  <option value="admin">Admin</option>
                  <option value="dispatcher">Dispatcher</option>
                  <option value="driver">Driver</option>
                  <option value="data_entry">Data Entry</option>
                </select>
              </div>

              <div className="flex items-center gap-sm">
                <input
                  type="checkbox"
                  id="edit-is-active"
                  checked={editForm.is_active}
                  onChange={(e) => setEditForm({ ...editForm, is_active: e.target.checked })}
                  className="h-4 w-4 text-primary border-outline-variant rounded focus:ring-primary"
                />
                <label htmlFor="edit-is-active" className="font-label-md text-label-md text-on-surface cursor-pointer">
                  User account is active
                </label>
              </div>

              <div className="flex justify-end gap-md pt-md border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-md py-sm bg-surface-container text-secondary font-label-md rounded-lg hover:bg-surface-container-high"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-md py-sm bg-primary text-on-primary font-label-md rounded-lg hover:bg-primary-container shadow-sm"
                >
                  Update User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
