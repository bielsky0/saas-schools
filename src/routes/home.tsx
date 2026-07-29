import { ArrowRight, Code, Globe } from "lucide-react";

export default function Home() {
  const navigationItems = [
    {
      title: "Demo Page Builder",
      description: "Default page builder. A simple React component. No backend.",
      icon: Code,
      path: "/builder",
      color: "from-blue-500 to-cyan-500",
      buttonText: "Launch Builder",
    },
    {
      title: "NextJS + Supabase Starter",
      description:
        "An opinionated starter kit for building ChaiBuilder websites with Next.js (App Router) and Supabase.",
      icon: Globe,
      path: "https://github.com/chaibuilder/chaibuilder-next-supabase-starter",
      color: "from-purple-500 to-pink-500",
      buttonText: "Get Started",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold text-slate-900">ChaiBuilder SDK</h1>
          <p className="mx-auto max-w-2xl text-lg text-slate-600">
            Choose your builder experience. Each option provides different features and capabilities for creating
            amazing web experiences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <div
                key={item.path}
                className="group relative transform cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:border-slate-300 hover:shadow-2xl">
                <div
                  className={`absolute inset-0 bg-gradient-to-br ${item.color} opacity-0 transition-opacity duration-300 group-hover:opacity-10`}
                />

                <div className="p-10">
                  <div className={`inline-flex rounded-xl bg-gradient-to-br p-4 ${item.color} mb-8 shadow-lg`}>
                    <Icon className="h-8 w-8 text-white" />
                  </div>

                  <h3 className="mb-4 text-2xl font-bold text-slate-900 transition-colors group-hover:text-slate-800">
                    {item.title}
                  </h3>

                  <p className="mb-8 text-lg leading-relaxed text-slate-600">{item.description}</p>

                  <a href={item.path} target={item.path.startsWith("http") ? "_blank" : "_self"}>
                    <button
                      className={`w-full bg-gradient-to-r px-6 py-4 ${item.color} group/btn flex transform items-center justify-center rounded-xl font-semibold text-white transition-all duration-200 hover:scale-105 hover:shadow-lg`}>
                      <span>{item.buttonText ?? "Launch Builder"}</span>
                      <ArrowRight className="ml-2 h-5 w-5 transform transition-transform duration-200 group-hover/btn:translate-x-1" />
                    </button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-16 text-center">
          <div className="inline-flex items-center rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-600">
            <div className="mr-2 h-2 w-2 animate-pulse rounded-full bg-green-500" />
            Ready to build something amazing?
          </div>
        </div>
      </div>
    </div>
  );
}
