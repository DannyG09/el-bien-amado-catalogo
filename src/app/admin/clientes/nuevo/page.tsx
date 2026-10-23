import AdminPageHeader from "../../AdminPageHeader";
import ClienteForm from "../ClienteForm";

export default function NuevoClientePage() {
  return (
    <main className="admin-page min-h-screen">
      <div className="mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <AdminPageHeader
          title="Agregar cliente"
          description="Registra los datos de contacto y licencia del cliente."
        />
        <ClienteForm />
      </div>
    </main>
  );
}
