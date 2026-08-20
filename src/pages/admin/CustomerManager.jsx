import React, { useEffect, useMemo, useState } from "react";
import { userService } from "../../services/api";
import { Users, Search, MoreHorizontal, Loader2 } from "lucide-react";

export const CustomerManager = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    userService.getAll({ itemsPerPage: 100 })
      .then((data) => setUsers(data?.["hydra:member"] || []))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const customers = useMemo(() => {
    const onlyCustomers = users.filter((user) => (user.roles || []).includes("ROLE_USER"));
    return onlyCustomers.filter((user) => {
      const fullName = user.fullName || `${user.firstName || ""} ${user.lastName || ""}`.trim();
      const haystack = `${fullName} ${user.email || ""}`.toLowerCase();
      return !search || haystack.includes(search.toLowerCase());
    });
  }, [users, search]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Customers</h1>
          <p className="text-gray-400">Live customer list from the API.</p>
        </div>
      </div>

      <div className="bg-[#161616] border border-[#2a2a2a] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#2a2a2a] flex justify-between items-center bg-[#1a1a1a]">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 w-4 h-4" />
            <input
              type="text"
              placeholder="Search customers..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#222] border border-[#333] text-sm text-white rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-[#d90429]"
            />
          </div>
        </div>

        {error && <div className="px-6 py-4 text-sm text-red-400 border-b border-[#2a2a2a]">{error}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#222] text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-[#2a2a2a]">
                <th className="px-6 py-4">Customer</th>
                <th className="px-6 py-4">Email</th>
                <th className="px-6 py-4">Roles</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2a2a2a]">
              {loading ? (
                <tr>
                  <td colSpan={5} className="text-center py-10">
                    <Loader2 className="w-6 h-6 text-[#d90429] animate-spin mx-auto" />
                  </td>
                </tr>
              ) : customers.map((customer) => {
                const fullName = customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || customer.email;
                return (
                  <tr key={customer.id} className="hover:bg-[#1a1a1a] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-[#222] flex items-center justify-center text-white font-bold border border-[#333]">
                          {(fullName || "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="font-bold text-white text-sm">{fullName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-300">{customer.email || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(customer.roles || []).map((role) => (
                          <span
                            key={role}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#d90429]/10 text-[#d90429] border border-[#d90429]/20"
                          >
                            {role.replace("ROLE_", "")}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        customer.isActive !== false ? "bg-emerald-500/10 text-emerald-400" : "bg-gray-500/10 text-gray-400"
                      }`}>
                        {customer.isActive !== false ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="p-2 text-gray-400 hover:text-white rounded-lg transition-colors">
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {!loading && customers.length === 0 && (
          <div className="text-center py-10 text-gray-500">Aucun client trouvé.</div>
        )}
      </div>
    </div>
  );
};
