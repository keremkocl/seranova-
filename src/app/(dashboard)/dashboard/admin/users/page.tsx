import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Role } from "@/types";

const ROLE_COLORS: Record<Role, string> = {
  FARMER:     "bg-green-100 text-green-700 hover:bg-green-100",
  CONSULTANT: "bg-blue-100 text-blue-700 hover:bg-blue-100",
  ADMIN:      "bg-rose-100 text-rose-700 hover:bg-rose-100",
};

const ROLE_LABELS: Record<Role, string> = {
  FARMER:     "Üretici",
  CONSULTANT: "Danışman",
  ADMIN:      "Admin",
};

const mockUsers = [
  { id: "1", name: "Ahmet Yılmaz",   email: "ahmet@demo.com",   role: "FARMER"     as Role, joined: "1 Ocak 2026",    analyses: 12 },
  { id: "2", name: "Fatma Kaya",     email: "fatma@demo.com",   role: "FARMER"     as Role, joined: "15 Ocak 2026",   analyses:  7 },
  { id: "3", name: "Ali Güzel",      email: "ali@demo.com",     role: "CONSULTANT" as Role, joined: "5 Şubat 2026",   analyses:  0 },
  { id: "4", name: "Admin Kullanıcı",email: "admin@demo.com",   role: "ADMIN"      as Role, joined: "1 Ocak 2026",    analyses:  0 },
];

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Kullanıcılar</h1>
        <p className="text-sm text-gray-500 mt-1">{mockUsers.length} kayıtlı kullanıcı</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <th className="text-left px-5 py-3">İsim</th>
                <th className="text-left px-4 py-3">E-posta</th>
                <th className="text-left px-4 py-3">Rol</th>
                <th className="text-left px-4 py-3">Kayıt Tarihi</th>
                <th className="text-right px-5 py-3">Analiz</th>
              </tr>
            </thead>
            <tbody>
              {mockUsers.map((u) => (
                <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-500">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge className={ROLE_COLORS[u.role]}>{ROLE_LABELS[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{u.joined}</td>
                  <td className="px-5 py-3 text-right text-gray-700">{u.analyses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
