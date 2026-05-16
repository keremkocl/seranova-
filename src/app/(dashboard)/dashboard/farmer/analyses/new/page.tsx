import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import SoilAnalysisForm from "@/components/analyses/SoilAnalysisForm";

export default async function NewAnalysisPage() {
  const session = await auth();
  const userId = session!.user.id;

  const fields = await prisma.field.findMany({
    where: { userId },
    include: { crops: { orderBy: { name: "asc" } } },
    orderBy: { name: "asc" },
  });

  const fieldOptions = fields.map((f) => ({
    id:    f.id,
    name:  f.name,
    crops: f.crops.map((c) => ({ id: c.id, name: c.name })),
  }));

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Yeni Toprak Analizi</h1>
        <p className="text-sm text-gray-500 mt-1">
          Laboratuvar analiz değerlerini girin, gübre önerisi otomatik oluşturulsun.
        </p>
      </div>
      <SoilAnalysisForm fields={fieldOptions} />
    </div>
  );
}
