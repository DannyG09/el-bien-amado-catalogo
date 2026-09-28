import Link from "next/link";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-gray-100">

      <header className="border-b bg-white">

        <div className="mx-auto max-w-7xl px-6 py-6">

          <p className="text-sm text-gray-500">
            El Bien Amado Rent A Car
          </p>

          <h1 className="mt-1 text-3xl font-bold">
            Panel administrativo
          </h1>

        </div>

      </header>


      <section className="mx-auto max-w-7xl px-6 py-10">

        <div className="grid gap-6 md:grid-cols-3">

          <Link
            href="/admin/vehiculos"
            className="rounded-2xl bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >

            <div className="text-4xl">
              🚘
            </div>

            <h2 className="mt-5 text-xl font-bold">
              Vehículos
            </h2>

            <p className="mt-2 text-sm text-gray-500">
              Agregar, editar y administrar los vehículos del catálogo.
            </p>

          </Link>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="text-4xl">
              👤
            </div>

            <h2 className="mt-5 text-xl font-bold">
              Clientes
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Próximamente
            </p>

          </div>


          <div className="rounded-2xl bg-white p-6 shadow-sm">

            <div className="text-4xl">
              📋
            </div>

            <h2 className="mt-5 text-xl font-bold">
              Rentas
            </h2>

            <p className="mt-2 text-sm text-gray-400">
              Próximamente
            </p>

          </div>

        </div>

      </section>

    </main>
  );
}